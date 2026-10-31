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

What it does not know: the height of the sensors (the radars of the plan have no floor, so **only the ground floor** is checked and the doors and windows of other floors are counted as "not checked"), furniture, the real materials of the walls, the tilt of a radar, or the sweep of a motorised camera (only its lens counts). The Alarm Designer is a wiring diagram with no floor plan, so the coverage check works on the site plan, where the radars have a range, an angle and a place.

### Parameters

The tuning is in `src/coverage/coverage.config.json`, not in the code: the safety margin (default and limits), the side of a square (`cellM`, 0.25 m), the limit of squares, the smallest blind area worth reporting (`minBlindAreaM2`, 1 m²), the share of overlap that raises a note (`overlapWarnRatio`), the floor checked, the kinds of opening that need a guard and the distances used for the suggestions.

## Tests

`src/alarm/characterization.test.ts` fixes what the alarm designer and the radar view did before these aids; `src/alarm/templates.test.ts` covers the templates; `src/coverage/engine.test.ts` covers the check, including properties with a fixed seed (no square is ever called covered unless a radar, shrunk by the margin, sees it; nothing is covered beyond a radar's range; a bigger margin never shows more covered); `src/coverage/CoveragePanel.test.tsx` covers the card, the export and the texts in the eight languages.
