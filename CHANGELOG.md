# Changelog

All notable changes to this project are documented here.

## [0.5.6] - Nodes you can see and find

- **Find nodes on the network** (Inverters, Batteries and Radar menus): a list of what the network node has found that looks like an ARMOR node - a host name starting with "armor-", or an Espressif maker - and is not yet a node of the menu, with a button to search now, a link to the node's own panel and, in the solar menus, a button that puts the node in the form of a new equipment.
- **Solar nodes** (Inverters and Batteries): one card per gateway node with what it reads (inverters, battery stacks), whether it is reporting and when it last did, and a note that says what the role of a node is against the equipment it reads.
- **Radar:** a note that explains the node against the radars of the design, and each node says how many radars of the design are linked to it.
- **Cameras:** going to another camera (in the grid, the wall, the large view and the full screen) keeps the picture on show until the new stream has its first frame, instead of black, and the cameras on either side of the large view start their video ahead of the step. Needs ARMOR-SERVER 0.4.0 or later.
- Texts in the seven languages; 3 new tests.

## [0.5.5] - Cameras that keep their stream, and fewer false alarms of "offline"

- **Cameras:** the list of cameras is read again every minute and that made every picture ask for a new stream address, dropping all the streams and starting them over, which is what made the cameras slow. An address is now asked once for each camera and kept while it stays live, and a camera whose address cannot be had no longer takes the others down. Needs ARMOR-SERVER 0.4.0 for the faster start of the video.
- **Offline demonstration:** the label in the top bar appeared when a single answer of the server was late; it now needs three in a row, and a status call that gets no answer in eight seconds is given up.
- **Weather:** a "Center on my place" button on the radar.
- **Network:** the list of outages of the last 24 hours (start, end and length) shows and hides when you press the "Outages, 24 h" card, which keeps its card look.

## [0.5.4] - The buttons keep answering, and every outage with its hours

- **The console no longer seems to die after a while:** a camera picture that went away (a menu change) kept its stream open until the browser collected it, and after several changes those streams used every connection the browser allows to the server, so calls waited for ever and no button answered until the page was reloaded. A live picture now closes its stream when it goes away, and every call of the console gives up after 30 seconds instead of waiting for ever.
- **Network:** the outages of the last 24 hours are listed under the state of the internet, each with its exact start, its end (with seconds) and how long it lasted; the "Outages, 24 h" figure opens the full list, which now also shows the end of each outage.

## [0.5.3] - The Weather menu

- **Weather** (below Overview): the weather of a place you choose - by name, or by its coordinates - because guessing it from the internet address would put Yecla in Madrid. It shows the weather now, the rain of the next hour, the warnings the forecast implies, the next 24 hours, 48 hours of temperature, rain, clouds and wind, ten days, the air quality and pollen, and the sun and the moon, with a live radar of rain (last two hours, animated) and of clouds (Meteosat infrared) over a map. Data from Open-Meteo, RainViewer, EUMETSAT and Esri's map tiles; nothing is requested until a place is chosen, and only its coordinates leave. The static host and the nginx template allow just those origins. Texts in the seven languages.
- **Tests:** weather model and policy tests added.

## [0.5.2] - The Services menu

- **Services** (below System): every program of the system and every field node, running or not, grouped by family (Core, Network, AI and voice, Field nodes) like HYDRA-UMC's services menu - a summary (total, active, not active, failed, not installed or unknown), a search, filters, and a card for each service with its state, its systemd unit, port, process, memory, restarts, whether it starts at boot and how long it has been up (for a field node, when it last reported). Read only. Needs ARMOR-SERVER 0.3.9. Texts in the seven languages.
- **Tests:** 269.

## [0.5.1] - The camera wall is the view you chose

- **Camera wall:** it was laid out by the number of cameras that were there, so six places with five cameras stacked into one column. It is now the chosen view: six places are 3 x 2, eight are 4 x 2, nine are 3 x 3, twelve are 4 x 3, sixteen are 4 x 4 (two are side by side, four 2 x 2). Every picture stays 16:9 and whole, with its name and buttons as in the normal view, the cameras touch each other with no gap, and the block fills the screen as far as the pictures' shape allows; a place with no camera stays black. Checked in a real browser with five, six, eight, nine, twelve and sixteen places.
- **Tests:** 266.

## [0.5.0] - The camera wall looks like the normal view, and the Site Designer's tool panel is in order

- **Camera wall:** it now has the look of the normal view - the same tiles with their name, state and buttons, in the same order, pictures never cropped - and only the space between the cameras is gone. (The first version cropped the pictures and drew nothing but the name.)
- **Site Designer, the floating tool panel (2D and 3D):** first what selects, moves and turns (select, move, elevate, and the turning buttons), then the other commands (undo, redo, delete, and the 3D view's own controls), then the objects grouped by what they are: the ground (terrain, paths, roads, pavement), a building and what is cut into it (walls, doors, windows, garage door, arch, chimney), roof and masts (panels on the roof, antenna, mast), light and energy (lamp, wall lamp, solar panel), the boundary and the ways in (fence, gate, entrance, pillar), the garden (tree, planter, fountain, pool, terrace, canopy, kennel, coop) and what ARMOR watches with (camera, sensor, device). Similar objects used to sit at opposite ends of the list.
- **Tests:** 266 (the new order of the tool groups).

## [0.4.9] - A full-screen wall of cameras

- **Cameras -> "Full-screen wall":** with a view of two or more cameras chosen, a button shows all of them on the whole screen, touching each other with no gap and cropped to fill their place, with only each camera's name drawn on it. Esc (or leaving full screen) goes back to the normal view. Where the browser refuses full screen the wall still covers the window and Esc still works. Texts in the seven languages.
- **Tests:** 265 (the columns of the wall for 1, 2, 4, 6, 9 and 16 cameras on a wide and on a tall screen).

## [0.4.8] - The camera view after the settings
- Documentation: the seven READMEs count sixteen themes (they said eleven) and describe the machine monitor, the orders and device logins of the Network menu and the server-address check.

- **Cameras:** coming back from "Configure cameras" the grid is laid out again; the frame that holds it is measured anew each time it appears, instead of keeping the size of the one that was removed.

## [0.4.7] - Check the server's address

- **Configuration -> General -> Server origin** has a "Check the address" button. If nothing answers over https but the server does over http (or the other way round), it says so and offers to switch, instead of leaving the generic network error behind a wrong scheme. Texts in the seven languages.

## [0.4.6] - Inspect a device with its web login

- **Network menu:** a device's detail keeps the user and password of its administration page (administrators only; the password is never shown again) and an "Inspect" button reads its model and firmware and warns about factory logins. Texts in the seven languages.

## [0.4.5] - The site designer gets garage doors, arches, pools, planters, terraces and masts that carry things

- **Walls:** a garage door (wide, sectional), a plain opening in a wall, any door, window or opening with an arched top, and a small balcony outside a door or a window of an upper floor.
- **Roofs:** a building's roof can be taken off to see the top floor from above (the layer switch for all roofs was already there).
- **Ground objects:** swimming pools (rectangular, round, oval or L-shaped), planters (box, round pot, long bed) and terraces or balconies (a slab, with or without a railing, raised to any height on legs).
- **Masts** carry a television antenna, satellite dishes and Wi-Fi dishes, several each, at their own height, turned and sized.
- **Network Designer:** tying an element to a device the nodes found fills what the element does not say yet (address, maker, name) and never replaces what was typed.
- 263 tests.

## [0.4.4] - Themes for the whole interface, cameras in their own menu, designers with more detail

- **Themes.** Sixteen themes that restyle the whole interface (sidebar, top bar, cards, buttons, fields, tabs, status bar, corners and letters), among them Metallic, Professional, Videogame, Terminal and Blueprint.
- **Cameras menu.** Double-click a camera to see it full screen (arrows, keyboard and a Back button); the number of views and the camera of each place are kept; "Configure cameras" opens the camera settings, the search for cameras and the connection data inside the menu. The Discovery, Video & PTZ and Cameras tabs of Configuration are gone.
- **Configuration: Server tab.** An administrator changes the address and ports of the server and of Studio.
- **Network and Electrical designers.** Toolbar in framed groups of icons with tooltips; every device has manufacturer and model (and, in the network, the administrator login); a rotation button above the selected element; a device can be replaced by another keeping the links; a switch draws only the ports it has; a modem/ONT and a router have separate 2.4 GHz and 5 GHz names; access points have a mode (access point, client, bridge, repeater); a camera has ethernet or Wi-Fi, ONVIF and RTSP ports and can be tied to a camera of the Cameras menu; new Camera server device.
- 258 tests.

## [0.4.3] - Alarms that say what happened, orders for the network node, the machine live

- **Alarms with their facts.** Each alarm shows what it is about (which device, its address and MAC, the port that opened, the two machines in an address clash), can be deleted one by one, the record can be emptied for good, and the "Internet is slow" warning only appears once the line has stayed degraded for a while.
- **Network menu: manual orders.** Sweep now, ping, traceroute, wake-up, look at the ports or the web page of one device, hide a device from the list and ask to be told when it comes back; the public address of the line is shown.
- **System menu: the machine live.** Processor, memory, temperatures, disks (card, USB, NVMe) and network cards with charts of the last five minutes, like a task manager.
- 250 tests.

## [0.4.2] - Arming that answers, an administrator that stays one, a design that cannot be lost

- **Arm and disarm ask in the page, and say why when they fail.** The question used the browser's own `confirm()`, which a browser can switch off ("stop this page from creating dialogs"), and then the button did nothing at all; it is now a dialog of Studio's. When the change fails it says whether the session had ended, the account is not allowed, the server refused (with its error) or it did not answer, instead of one sentence for everything.
- **The administrator role is no longer lost to a hiccup.** Studio asked who was signed in once, when it started, and any failed answer was read as "not an administrator" (the Users tab said so until the page was reloaded). Now it asks every minute and when the window comes back, and only the server saying "nobody" clears the user; a failed answer keeps the last one, and the Users tab says it could not ask and offers to try again.
- **Versions of the design, and no silent loss.** A Versions button in the Site Designer lists what the server kept (see ARMOR-SERVER 0.3.3) and takes one back. Changes that had not reached the server (it was off, the session ended) are also kept in the browser as a draft: at the next start a draft whose server copy has not changed is put back and saved, and one whose server copy has moved on is kept aside and offered in Versions. Before, the server's copy replaced them without a word.
- The phrases in the seven languages; 3 new tests (247 in all).

## [0.4.1] - Every button answers the pointer

- Some buttons gave no sign that the pointer was on them. Every hover rule was scoped to one panel's own buttons (`.device-actions button:hover`, `.camera-actions button:hover`...), and there was no rule for a button anywhere else: the primary and danger buttons (login, configuration, history, users, solar equipment), the big arm and disarm modes of the overview and the alarms, the link buttons, the previous and next of a camera, the close of a dialog, the history rows and about 140 buttons with no class of their own. `src/hover.css` gives every enabled button a brightening on hover and a darkening while pressed, written with `:where()` so it adds no specificity: the scoped rules keep their own colours and the theme is followed, because it only changes the brightness of what the button already looks like. It stops under prefers-reduced-motion.

## [0.4.0] - Chain-link mesh fences in the Site Designer

- **A new fence style, `mesh` (chain-link / metal mesh), now the default.** The Site Designer only offered a wooden picket, a rail, a few bare horizontal wires and a masonry wall, so a perimeter of metal mesh fencing - the usual one for a security installation - could not be drawn at all (the nearest, `wire`, is a few loose strands, not a woven fabric). Drawn in 3D as tension wires top and bottom with a dense diagonal crosshatch between the posts, in the plan as a grey strip; every new fence and the built-in sample site now start as mesh instead of wooden picket. The picket, rail, wire and wall styles are still in the Inspector's style list, and fences already saved keep the style they were saved with.
- The new style's name in the seven languages; two existing tests now cover it (the default style of a drawn fence and the colour of every fence style).

## [0.3.9] - TLS for this static host itself

- `tools/serve.mjs` can now serve Studio itself over HTTPS: `TLS_CERT_PATH`/`TLS_KEY_PATH` (both, or neither, same convention as ARMOR-SERVER) switch `wrapWithTls()` from plain `http.createServer()` to a real `https.createServer()` around the same request handler. Fixes a real bug: once ARMOR-SERVER's own API moved to HTTPS, opening Studio itself at `https://host:18081` (rather than its API) hit Firefox's `SSL_ERROR_RX_RECORD_TOO_LONG`, because the static host answering that port was still plain HTTP and could not even parse a TLS handshake.
- Also fixes the drift between `package.json` (still `0.3.7`) and `armor.project.json`/`native_version` (already `0.3.8`) left over from the previous release; both now agree.
- 3 new tests (244 in all): TLS off by default, refused start-up with only one of the two variables set, and a real HTTPS request against a real self-signed certificate.

## [0.3.8]

- A GitHub Actions CI baseline (`.github/workflows/ci.yml`): validates the manifest, the version, CHANGELOG.md's heading, the seven README translations' structure and its own local Markdown links, then runs this project's real build/test through `tools/armor_project_tool.py build-test .` (vendored from ARMOR-COMMON, alongside `tools/armor_ci_validate.py` and `tools/_armor_readme_parity.py`, which do the manifest/docs checking).

## [0.3.7] - The Network menu and the Network Designer

- **A Network menu** (a group of its own in the sidebar): the state of the internet and, when it fails, whose fault it is (the provider's or this side's), its latency, loss and outages; every device the ARMOR-NETWORK nodes found with its address, MAC, maker, kind, open ports (the ones a house rarely wants open in red) and last sighting, with a search and filters; the detail of a device, where an administrator names it, notes something, gives it a kind of its own and marks it as known (which ends the alarm of a new device); the traffic of the interface; and what changed. Charts of latency, loss and traffic from the server's history.
- **A Network Designer** (in the Design group): draw the provider's line, the modem, the router, switches and access points, and every kind of device (nineteen kinds), join their ports with links (a cable, the air and the provider's line are different and only join their own kind), group them in networks or rooms, and read the checks: two elements with one address, an address outside the router's network, an element with no link or no way out to the internet, a router with nothing on its line, a switch with more cables than ports, PoE the switch cannot give, a server only on Wi-Fi. Every element can be tied to the device the nodes found: the drawing shows whether it is there, and says what is drawn and not there and what is there and not drawn. **Draw what was found** adds every device that is not yet in the drawing, tied to what it is, joined to the router, a switch (one is added when there are more cables than ports) or an access point; the links are a guess to correct. Kept on the server and in the browser, like the electrical drawing; exported and imported as JSON, exported as SVG.
- The wording of both, of the seven alarms of the network and of the sidebar in the seven languages; 36 new tests (241 in all).

## [0.3.6] - The alarm of a switch

- The alarm `electrical_switch_fault` (a source switch of the electrical network has a fault and stays open) has its wording in the seven languages, and the type of an electrical reading knows the node's `switches` (read only: Studio sends no command).

## [0.3.5] - A second PV input and the units of a parallel system

- The four alarms of the electrical nodes (a meter's alarm, the mains out of range, the grid lost, a node that stopped answering) have their wording in the seven languages.
- An inverter's card shows its **second PV input** when the reading has one, and, for a parallel system, the **units** (mode, fault, output, load and battery of each) and the total of the system, in the seven languages. Studio has 205 tests.


## [0.3.4] - The Electrical Designer

- **A new menu, Electrical Designer** (under Design), with the idea of the Site Designer for the house's electrical network: a diagram editor with **36 kinds of element** in eight coloured groups (grid supply, PV array, generator; battery bank; hybrid inverter, MPPT controller, charger, DC-DC converter; circuit breaker, DC breaker, residual-current device, DC fuse, surge protector, isolator; contactor, relay module, electronic breaker with remote control, solar surplus diverter, source transfer switch; AC and DC busbars and junctions; energy meters and the ARMOR-ELECTRICAL node and the automation controller (PLC); loads: lighting, smart socket, electric water heater, EV charger, air conditioning, DC load), ports of three kinds (AC amber, DC rose, signal cyan), right-angle wires with their section and length, panel frames, undo and redo, zoom and pan, drag from the palette, and export and import as JSON and SVG.
- **Checks** that read the drawing: two sources feeding one line without a transfer switch, a breaker smaller than what can flow behind it, a cable protected by too large a breaker (with the usual maximum protection per section), loads without a breaker, a supply or a residual-current device in front, an inverter or the contracted power overloaded, DC voltages that do not match, open ports and lone elements. They are a guide to review a drawing with, not a substitute for the regulations or an installer.
- **Live values:** an inverter or a battery bank can be tied to the solar device the server reads and shows its mode, PV power or state of charge and voltage on the drawing. An element that will be switched from a node one day is marked; **nothing here switches or measures anything yet**.
- **An example to start from:** a house with the grid, its meter and main protections, a distribution board with circuits, and two hybrid inverters each with its PV field and battery bank. The drawing is kept in the browser and on the server (two people editing never overwrite each other silently), in the seven languages.
- **Tests:** 201 (23 new: the catalogue, the operations, the checks, the example, the storage and the rendering in every language).
- **An element can be tied to a node and one of its channels** (the drawing's Node and Channel fields): it shows the power and voltage the node measures, a channel that has not reported shows an ellipsis, and a switch the node sees open is drawn open.

## [0.3.3] - The new catalogue of inverters and batteries

- Declaring equipment offers the server's catalogue: the inverter families, the Pylontech models, the Pytes E-Box and the ANT-BMS combinations (cells by rated current), with their names; a model the console does not know is shown by its identifier, and an ANT-BMS combination is read from it.
- Declaring an inverter says which serial protocol to choose on the port of the node that reads it (PI30, REVO or PI18, or automatic), in the seven languages.
- A battery shows its **health** (green from 80 %, amber from 60 %, red below), for the stack and for each module, in the seven languages.

## [0.3.2] - Declare inverters and batteries

- **The Inverters and Batteries menus are no longer only for looking.** *Add an inverter* and *Add a battery* declare each piece of equipment: its name, model (Voltronic, MPP Solar, Pylontech US2000 / US3000 / US5000, ANT-BMS), connection (RS232, RS485, USB, CAN, Wi-Fi), gateway node and notes. A declared device shows as *waiting for its first reading* with its own logo, and can be edited or forgotten; the name you gave replaces its identifier in the tabs and titles.
- **Show example readings** fills a declared device with a plausible reading (a battery with its modules, cells and capacities according to its model), marked *example data*, so the menu can be tried before a gateway node exists; the first real reading replaces it.
- All the new words are in the seven languages. Tests: 176 (the menus are rendered with declared devices in every language).

## [0.3.1] - An animated shield and a logo that moves in every menu

- **The A.R.M.O.R. shield of the sidebar is animated:** a radar sweep turns inside it, a blip lights now and then and a ring of light leaves the shield.
- **Every menu has its own small animated logo** beside its title: a bell that swings and sends waves (alarms), a lens whose iris breathes and a blinking REC light (cameras), a radar that sweeps (radar), a chip with pulsing pins (devices), a bolt and a gear (automations), a player with a progress bar (record), a clock (history), a rack with running lights (system) and a turning gear (configuration). The icon of the open menu breathes, the views fade in and the cards glow under the pointer.
- All the movements stop for people who ask their system for less motion.

## [0.3.0] - The default theme is called Armor

- The default theme, near-black with cyan and amber, is now called **Armor** (it had another name); a setting saved under the old name falls back to the default, which looks the same. The README describes the solar menus.

## [0.2.9] - The Inverters and Batteries menus

- **A new group, Solar energy, with two menus.** *Inverters* draws the house as an animated picture (dashes run along the arrows that carry power, faster for more power), gauges for panels, load, battery and temperature, the readings of the grid, the output and the panels, the warnings in words and the history of the power and of the charge. *Batteries* draws each stack with a liquid level that rocks, arrows that rise while it charges or fall while it discharges, and shows the **capacities** (remaining and full, in Ah and kWh, cycles, model), each module with its own capacity and temperatures, and **every cell of every module** as a bar with its voltage, the lowest and the highest marked and the spread in millivolts; history of charge, voltage, current, cell range and temperature.
- The charts have a cursor that reads the nearest sample and a choice of 1, 6 or 24 hours; the animations stop for people who ask their system for less motion. The four solar alarms are worded in the seven languages.
- Tests: 176 (was 159), for the arithmetic of the cells, flows and charts and for both menus in every language.

## [0.2.8] - The colours of the design on the 2D plan

- **The 2D plan shows the colours you choose.** Before, only the ground and the walls wore their colour on the plan; now the ground objects (paths, roads, pillars, trees, masts, lamps, gates...), the doors and windows, the wall lamps, the roof items and the roof lines do too, the same as in the 3D view. Checked in a rendered session with coloured objects.

## [0.2.7] - Buttons that answer the press, and the LD2461 in the designer

- **Every button answers when it is pressed.** A pressed button sinks a little, brightens and shows an inset shadow and a halo, for a moment; a button that cannot be used looks greyed and the keyboard focus is outlined. It was missing on most buttons. Checked in a browser: the pressed button's transform changes.
- **Every button of every menu was pressed in a scripted browser session** (11 menus, 173 buttons, in the presence of a real server with a node, a device and an alarm): each one changed the page, asked the server for something or opened a dialog; the ten *Sign out* buttons, which end the session, were checked apart (the console closes and the login appears).
- **A radar of the design has a model**, LD2450 or LD2461, in the designer's inspector, the radar list and the *Add a 270° node* wizard. The model sets the field drawn on the 2D plan, the 3D view, the site map and the live radar map, and whether a target counts as inside the rated sector: LD2450 6 m and ±60°, LD2461 8 m and ±45° (the manufacturers' figures). Three LD2461 in a 270° node are mounted 90° apart instead of 75°.
- Tests: 159 (was 157), for the sensor models and the node spacing.

## [0.2.6] - A link from a radar node to its own panel

- In the Radar menu, *Radar nodes*, each node that has said where its web panel is shows a **Panel** link (the node's address, opened in a new tab) and the firmware it runs. The link is a private address: it opens from a computer on the node's network. The node's panel is described in ARMOR-RADAR.
- Tests: 157 (was 155), for the address and the words in the seven languages.

## [0.2.5] - One Studio, more than one address

- `ARMOR_SERVER_ORIGIN` may be a comma-separated list. The content-security policy then lets the browser talk to every server in it (before, only one), and `/armor-config.json` offers the visitor the server whose host name is the one they used to reach Studio, so a Studio reached from the Internet starts against the public address of the server and the same Studio at home against the LAN one. The first is the default.
- Why it mattered: a Studio opened from a public address, with the server given by its public address, could not sign in (*Could not sign in. Check the server, the user and the password*) because the browser refused the request twice, by the policy of Studio and by the server's list of allowed origins, with no hint of it in the message.
- Tests: 3 more, for the list, the policy and the choice by host name.

## [0.2.4] - Colours and more properties for every object of the designer

- **Colour** in the properties of the terrain (ground), buildings (walls and roof separately), doors and windows (leaf and frame), roof equipment, wall lamps (the colour of the light) and every ground object (trees in two tones, fences, gates, fountains, kennels, coops, sidewalks, roads, lamps, masts...). The picker starts from the colour on screen and *Default* goes back to the object's own look. It shows in the 3D view, and the ground and the walls also in the 2D plan; it is saved with the design and shared through the server.
- **Own name** for ground objects (for example *north gate*), shown in the properties and in the list of objects.
- **Cameras** have their own field of view (20 to 180 degrees) and range (2 to 60 m), drawn in the plan, the 3D view and the radar map instead of one fixed cone for all.
- Tests: 152 (was 145) for colour reading and shading, the defaults of every kind, and colours, names and camera view surviving a save, a reload and the server.

## [0.2.3] - A layout for a 1920x1080 screen, tabs, and the 270° node

- **Compact layout:** every menu reaches the sidebar and the right edge with a few pixels between them, the sidebar is narrower, the headings that repeated the title of the top bar are gone, and no menu scrolls the page at 1920x950 (the browser window of a 1080p screen): the overview fits one screen, the system audit trail and the history scroll inside their own panel.
- **Tabs where one screen is not enough:** the designer's panel has *Site objects* and *Properties* (selecting something opens its properties), the Radar side panel has *Radars* and *Radar nodes*, and History has *History* and *Alert rules*.
- **Bigger viewers:** the 2D plan and the 3D view take the whole area, and the 2D plan re-fits itself when the space changes until you zoom or pan it.
- **Add a 270° node** (Radar menu): creates the three radars of a node already wired to it as radars 1, 2 and 3, facing 75° apart so neighbours overlap by 45° and the outer edges cover 270°. 145 tests (was 141).

## [0.2.2] - Menus checked on every screen size and by tests

- Render tests for the overview, alarms, devices, automations, system and radar sensor menus in the seven languages (an untranslated phrase fails the test), for every alarm code the server can raise, for every family of phrases chosen at run time, and for the device presets and the state wording. 141 tests (was 119).
- The overview fits a phone: the hero and the tiles no longer run past the right edge, the arm button takes the full width and the tiles go two to a row. The device search box fills the width.
- The devices still to place in the designer read as a list like the rest of the site objects.

## [0.2.1] - A new overview, devices, alarms, automations and the radar configuration

- **Overview redesigned:** a hero with the state of the perimeter and the arm / disarm switch, one coloured tile per part of the system, the live map of the site design (buildings, trees, fences, cameras, radar coverage and targets, and every device with its state), alarms and devices that need attention, quick actions and the latest events.
- **New menus, in groups (Monitor, Control, Evidence, Design, Administration):** *Alarms* (what needs a person, acknowledge, the closed record, the big arm / disarm button), *Devices* (add, edit, test, command and place any sensor or actuator, with presets for Zigbee2MQTT, Tasmota, Shelly, plain MQTT, authenticated push and HTTP), *Automations* (rules with a trigger, a mode and up to six actions) and *System* (version, uptime, links, storage, and for an administrator the audit trail). The sidebar shows how many alarms are waiting.
- **Radar sensors (LD2450) can now be configured** in the Radar menu: name, field node and channel, position in metres, mounting height, facing, tilt and mirrored axis, ignore zones, add and delete. The LD2461 is not offered.
- **Devices in the designer:** a Device tool (key 9) places any device where it really is, turns it about X, Y and Z, and shows it in the plan and the 3D view with its state.
- **The design is kept on the server**: the first browser uploads its own, every change is saved a moment later, another browser's change is picked up, and a save that lost a race takes the newer version with a notice. A cloud mark in the top bar shows the state.
- A camera's tilt and mounting height are no longer dropped when the server's camera list is merged (only its facing was kept).
- Fullscreen leaves fullscreen when pressed again; sidewalks around a building, trees, fences in stretches, farm gates, fountains, kennels and coops; one toolbox shared by the 2D and 3D views.
- 119 tests (was 100).

## [0.2.0] - Terrains of any shape and things on roofs that move on their own

- **Terrain and building outlines:** a list of every corner with its coordinates, a button to add a corner after any of them (or on the longest side), remove a corner, and a double-click on a side of the selected shape adds one right there. Larger handles to grab. A terrain with more than four corners no longer offers the width and depth fields, which would have turned it back into a rectangle; a "Redraw in any shape" button starts the polygon tool.
- **Roof equipment and posts:** chimneys, roof solar panels, antenna poles, lamp posts, masts and pillars have a larger area to grab in the plan, so a thin pole can be picked up and moved on its own. In the 3D view an object that is already selected can be dragged across the ground with the Select tool (Move and Lift still always drag).

## [0.1.9] - Signed in stays signed in

- A slow answer, a rate limit or a network hiccup on the session check no longer throws you back to the sign-in page: only the server saying the session ended does. The check is repeated a minute later.

## [0.1.8] - A site designer built from the terrain up, users, a radar map on your design and cameras that fit their frame

- **Site designer, redesigned.** You draw the terrain first (a rectangle, or any shape line by line, with live lengths, angles and a typed length + Enter for exact sides), then place buildings inside it: rectangles or any outline, several floors of their own height, and roofs of five kinds (flat, one slope, gable, hip, pyramid) with slope, overhang and ridge direction. Doors and windows go on any wall of any floor at any height; wall lamps, chimneys, roof solar panels and antenna poles go on walls and roofs and follow the roof surface; lamp posts, masts, pillars, canopies, entrance steps, paths and roads stand on the ground. Cameras and radars go anywhere, at any height and facing.
- **Editing that behaves like a drawing tool.** Snapping to grid and corners, ortho with Shift, corner handles and a dot on every side to add a corner, a rotate handle, dimensions on every side, a floor selector, undo and redo (Ctrl+Z, Ctrl+Y), duplicate, arrow-key nudging, and a properties panel with exact numbers for everything, including each side of a building. A drag becomes one undo step, and only if it changed something.
- **3D you can turn around.** Orbit, pan and zoom, a turntable, preset views (isometric, top, four elevations), focus on the selection, a floor cut and see-through mode, layers, a compass and X/Y/Z-true objects: walls with real openings at their floor and height, roofs from the same geometry as the plan, lit lamps. Move and Lift tools drag the selected object on the ground or up and down; the 3D toolbox is a different one from the 2D toolbox. The orbit no longer locks after moving an object.
- The work area now grows by itself to hold the terrain and the buildings, and cameras and radars keep their place on the ground when it does. Saved designs from earlier releases are migrated (a closed loop of walls becomes a building); the design is also saved as you edit.
- **Users** (Configuration > Users): your own account (name and password, with the current password), and for an administrator the list of users with creation, renaming, a new password, the role and removal. Seven languages.
- **Radar view, from your design:** the terrain, buildings, cameras and every radar with its coverage, the targets the radars report right now (updated about every second) with their recent path, and the ignore zones. A radar of the design is wired to a field node in the designer (node, radar number, mirror). Nodes that report targets no radar is wired to are listed instead of guessed at. The sideways axis of a target is an assumption until measured on a real radar, and the view says so.
- **Cameras fit their frame:** for 1, 2, 4, 6, 8, 9, 12 and 16 views the tiles are 16:9 and as large as the window allows, the whole matrix is visible without scrolling and no picture is cropped; on a phone they stack and the frame scrolls.
- 100 tests (was 48): geometry, roofs, operations, migration, the camera grid, the radar map and the catalogues.

## [0.1.7] - PTZ in every camera view, a real history, a status bar and a professional site designer

- **PTZ:** a PTZ button on every camera view (tiles and the maximised view) shows and hides the controls over the picture. The buttons work by holding: pressing moves the camera and releasing stops it (a tap still moves for a moment), commands for one camera go out in order so a stop never overtakes its move, and when the camera refuses the command its own reason is shown next to the pad.
- **History:** summary cards, search, level and period filters (including custom dates), newest or oldest first, live or paused refresh, per-event details, CSV and JSON export, and clearing (older than 7, 30 or 90 days, or everything) with a confirmation that offers to export first.
- **Status bar** at the bottom in the family style: server, connection, nodes and cameras online, armed state, high alerts, server version and uptime, MQTT and video, latency, revision, sign out and a 24 hour clock with the date.
- **Site designer, rebuilt:** the tools are a floating panel you can drag anywhere over the canvas (position remembered), icons only with a tooltip that says what each does and its key, and keyboard shortcuts. The 2D plan is a CAD drawing with a metre grid, rulers, scale bar, north arrow, cursor readout, snapping to the grid and to wall ends, walls with thickness and dimensions, doors that swing, windows, top-down symbols for every object, the radars' rated 6 m, plus or minus 60 degree sector and the cameras' indicative field of view, both aimable with a handle. The 3D view is a lit, shadowed scene (three.js) with walls that have real openings, glazed windows and doors, roofs, solar panels, canopies, steps, roads, paths, cameras and radars, orbit, pan and zoom, and iso, top and front presets.
- The 3D engine is loaded only when the 3D view is opened. 48 tests (was 38).

## [0.1.6] - Zones drawn on a plane, camera reachability

- The zone plane is sized to the HLK-LD2450's documented detection area (6 m, azimuth plus or minus 60 degrees) and draws that sector for orientation.
- Ignore zones can be drawn by dragging on a plane of the sensor frame (millimetres, snapped to 10) instead of typing coordinates; the rectangle fills the form and existing zones are shown.
- Camera tiles say **Unreachable** when the server's watchdog cannot reach the camera, and the History view lists and filters camera events.
- The Radar view can forget a decommissioned node.
- Fixed the phone layout: the navigation strip scrolls sideways instead of stretching the whole page. 33 tests.

## [0.1.5] - History and alert rules

- New **History** view: every alert, node and mode change, newest first, filterable, refreshed every five seconds and paged.
- The alert rules editor: how long a condition must persist before HIGH, and ignore zones (name, optional node and sensor, rectangle in millimetres).
- All words are translated in the seven languages; 30 tests (was 25).

## [0.1.4] - Modular Studio, safer settings and the default theme

- Split the 1,000-line `App.tsx` into `domain`, `settings`, `cameras`, `hooks`, `components/*` and `views/*`, and removed about 20 KB of dead legacy designer code that was kept "for reference".
- Browser-local settings are parsed value by value: an invalid origin, theme, language or shape is dropped, positions are clamped and list sizes are capped, so a damaged or hand-edited value can no longer break Studio.
- The site export no longer includes camera usernames or credential flags.
- The top bar now says clearly when demonstration data is shown because the server cannot be reached; silent field nodes are shown as stale.
- New default theme (near-black, cyan and amber; its name is *Armor* since 0.3.0); the previous themes remain available.
- Removed the remote font import (a security console must not call a third party); local font stacks are used instead.
- The server address can be published by the deployment (`/armor-config.json`), and `tools/serve.mjs` serves the build with a strict Content-Security-Policy.
- 25 tests (previously 2), including the settings parser, camera merging, i18n completeness and the static host.

## [0.1.3]

- Verified build completed; release version advanced from `0.1.2` to `0.1.3`.

## Unreleased

- Added the initial Studio login screen backed by ARMOR-SERVER's dedicated
  HttpOnly Studio session; that session now also authorises privileged camera
  actions without exposing or requesting the server operator token.
- Added selected-camera maximize mode and an in-monitor PTZ pad with explicit
  stop, directional and zoom controls.
- Added the Record workspace with media filters, JPEG preview, MP4 playback,
  recording status, and confirmed single/bulk evidence deletion.
- Wired camera Snapshot and Record controls to the local ARMOR-SERVER media
  gateway rather than opening a browser-side camera URL.
- Split configuration into General, Cameras, Discovery and Video & PTZ tabs.
- Added camera connection fields for ONVIF, RTSP, authenticated RTSP paths and
  optional live MJPEG relay status without storing passwords in the browser.
- Retains credentials in the active browser session and restores public camera
  parameters from the local server after reload; added real RTSP path discovery.


## [0.1.2]

- Verified build completed; release version advanced from `0.1.1` to `0.1.2`.

## [0.1.1]

- Verified build completed; release version advanced from `0.1.0` to `0.1.1`.
- Rebuilt the seven-language catalogue in valid UTF-8 and connected all Studio
  workspaces: camera monitor, radar, 2D/3D site design, tooltips, dialogs,
  configuration controls, messages and accessible labels.
- Bound the Vite development server explicitly to IPv4 loopback, added local
  camera discovery through ARMOR-SERVER, and made configured camera names
  editable from Configuration.

## [0.1.0]

- Added a tested seven-language catalogue for application chrome, operational
  labels and configuration controls.
- Persisted and exported the browser-local site model: cameras, sensors and
  editable wall definitions, without credential data.

- Replaced the basic dashboard with a multi-workspace Studio console: camera,
  radar, 2D/3D site designer and connection configuration views.
- Added honest media-operation states: HTTP/HTTPS snapshots are supported,
  while discovery, streaming, power control and recording remain disabled until
  their server-side services are available.
- Added visual placement of configured cameras and sensor nodes in the site
  designer without persisting credentials in the browser.
- Split the site designer into dedicated 2D and 3D workspaces; added floating
  editing tools, marker hover data, collapsible navigation, full-screen action,
  About dialog, local preference persistence, language profiles and themes.
- Replaced the decorative 3D building with a shared editable XYZ wall model,
  including segment creation, selection, deletion, X/Y/Z movement and height
  or floor-elevation controls.
- Constrained the desktop shell for a 1920×1080 touchscreen workspace.
