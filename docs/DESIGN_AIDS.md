# Design aids: alarm templates and the coverage check

Two helpers for the designers, both **off by default**. Turn them on in Configuration > Preferences > Design aids (`designAids`, kept in this browser like the other preferences). While the option is off Studio behaves exactly as it always did: no template picker in the Alarm Designer, no Coverage button in the site designer, no change to any saved drawing.

They are guides. Neither one changes anything until you choose to apply it, and neither one is proof that a building is protected.

## Alarm templates

With the aids on, the Alarm Designer toolbar has a "Start from a template…" list with three starting points:

| Template | What it draws |
| --- | --- |
| Flat or home | A panel with a siren and keypad, the front and balcony doors and two windows on wired loops, motion in the hall and the living room, and smoke and flood sensors on the radio. |
| Shop or commercial unit | The shop door, the roller shutter and the shop-front glass, a dual-technology detector on the sales floor, the back door and the storeroom, a panic button, two sirens and a communicator. |
| Warehouse with a perimeter | The doors and a skylight of the building, two dual-technology detectors on the floor, four outdoor beams on a zone expander for the fence, two smoke detectors, an outdoor siren, the yard lights and a communicator. |

Choosing one replaces the drawing (Studio asks first when the drawing is not empty) and can be undone with Undo. The names of the elements and rooms are written in the language of the console.

### The files

A template is a data file, `src/alarm/templates/<id>.json`, checked against `src/alarm/templates/template.schema.json` (a subset of JSON Schema: types, patterns, ranges, required fields, closed objects). A file holds:

* `schema`, `id`, `version`, and `titleKey` / `descriptionKey` (keys of the interface text, translated at the time of use);
* `design.elements` (`id`, `kind`, `x`, `y`, optional `props`, `nameKey`, `locationKey`), `design.wires` (`from` and `to` as element and port) and `design.frames` (the rooms).

There is no drawing logic in the code: the template becomes a design through the same reader that cleans any design that comes back from the server, so a value outside what a property allows, an unknown kind or a link between different media cannot get in. The tests check that every template validates, that nothing is dropped by the reader, that every link follows the rules of the designer and that every text exists in the eight languages. To add a template, add a file, list it in `src/alarm/templates.ts` and add its texts to `src/coverageText.ts`.

## The coverage check

With the aids on, the site designer has a **Coverage** button that opens a card over the plan. It reads the buildings, their doors and windows, the radars and the cameras of the plan and reports:

* **Blind spots**: groups of squares of a building that no presence radar sees, with the area, the place and a position and heading for a radar that would see them;
* **Unwatched buildings**: no radar sees any part of them;
* **Doors and windows**: each is *guarded* (it has an alarm contact), *seen by a radar*, *in view of a camera only* (a camera does not raise an alarm by itself) or *not guarded*, with a suggestion for the last;
* **Overlap**: a building where more than half of the floor is watched by two radars or more, and a radar whose whole view the others already give;
* the figures of seen and blind square metres per building.

The blind squares can be drawn on the plan (the "Show the blind spots on the plan" switch), and the report is exported as JSON (`armor-studio/coverage/1`, codes and numbers, no translated text) or CSV (cells that a spreadsheet could take for a formula are quoted).

### How it errs on the safe side

The calculation is flat (2D), deterministic (the same plan gives the same report) and conservative:

1. each radar counts for less than it declares: its range and its half angle are cut by the **safety margin** (10 % by default, 0 to 30 % in Preferences);
2. a square of the floor counts as seen only when **one same radar** sees its centre and every one of its corners that lies inside the building;
3. **walls block the view**: a sight line that meets any wall of any building, even touching or running along it, is blocked; a radar outside a building never counts for its inside;
4. the sight line to a door or window stops a hair short of the wall it is cut in;
5. a cell grid coarser than the configured size is used, and the report says so, only when the buildings are so big that the limit of cells would be passed.

What it does not know (with the options below off): the height of the sensors (**only the ground floor** is checked and the doors and windows of other floors are counted as "not checked"), furniture, the real materials of the walls, the tilt of a radar, or the sweep of a motorised camera (only its lens counts). The Alarm Designer is a wiring diagram with no floor plan, so the coverage check works on the site plan, where the radars have a range, an angle and a place.

### Floors, height and the drawing (Preferences > Design aids, all off by default)

* **Look at each floor on its own**: every floor of a building is a zone of its own, with its figures and warnings (the warning names the floor), and a door or window is checked against the radars of its floor. A radar has an optional **floor** in its properties (0 is the ground floor). A design stored without it reads as before. Without a floor the floor follows from the mounting height inside the building under the radar; with neither, the ground floor is assumed and the check says so when the building has more than one floor. A floor beyond the top of the building sees nothing. A radar outside every building counts for the ground floor only (the walls block it anyway).
* **Take the height and tilt of the radars into account**: a point counts as seen only if, at the height of a person on its floor (`targetHeightM`), it is within the slant range of the radar and inside its vertical field (`verticalHalfAngleDeg`, 35 degrees, centred on the tilt and cut by the same safety margin). It never sees more than the flat check. Cameras keep the flat check, and without the floors option only the ground-floor plane is tested.
* **Paint only the unseen part of the blind squares next to a radar**: squares within `refineRadiusM` of a radar are split in `refineDivisions` x `refineDivisions` and only the parts no radar sees (by the same every-corner rule) are painted. It changes the drawing only: the figures, the warnings and the exports are the same as without it. With all floors shown, the plan paints the squares that are blind on any floor.

### Floor-plan templates

The coverage card has a list of three buildings that bring their own floor plan: a house of two floors, a shop with a back room and a small block of three floors, each with its doors and windows and its radars set on their floors. *Add to the plan* puts the building to the east of what is drawn (nothing already drawn is touched, the work area grows if needed) and one step of undo takes it away. They are typical buildings to adjust to the real one, not designs. They are defined in `src/coverage/siteTemplates.ts`.

### Parameters

The tuning is in `src/coverage/coverage.config.json`, not in the code: the safety margin (default and limits), the side of a square (`cellM`, 0.25 m), the limit of squares, the smallest blind area worth reporting (`minBlindAreaM2`, 1 m²), the share of overlap that raises a note (`overlapWarnRatio`), the floor checked when the floors option is off, the kinds of opening that need a guard, the distances used for the suggestions, the height of the target, the vertical half angle of a radar and the size of the finer drawing.

## Tests

`src/alarm/characterization.test.ts` fixes what the alarm designer and the radar view did before these aids; `src/alarm/templates.test.ts` covers the templates; `src/coverage/engine.test.ts` covers the check, including properties with a fixed seed (no square is ever called covered unless a radar, shrunk by the margin, sees it; nothing is covered beyond a radar's range; a bigger margin never shows more covered); `src/coverage/floors.test.ts` fixes the flat result as it was and covers the floors, the heights, the missing floor, the stored design, the preferences, the finer drawing and the templates; `src/coverage/CoveragePanel.test.tsx` covers the card, the export and the texts in the eight languages.
