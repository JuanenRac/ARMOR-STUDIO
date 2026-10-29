# Changelog

All notable changes to this project are documented here.

## [Unreleased]

- **The layout of the README is checked in the CI:** the validator runs the shared `tools/universal_readme_check.py` and lists, as a warning, what differs from the universal layout of the README.
- **The Overview of the README keeps its bullets apart:** two bullets that ran together are separate again, in the eight languages.
- **The camera editor is organised in four steps that fold:** connection (name, address, user and password, with the ports folded away), video stream, type of camera and lenses, and web page and notes; each step says in one line how it stands. One button, "Find the stream for me", saves the camera and tries the paths of its family, shows what answered as lines to use as the main or the lighter stream, and the paths can still be written by hand. The page explains the cameras that show two lenses in one picture.
- **The log of an update does not repeat lines:** when the server restarted in the middle of an update the questions about the job piled up and each answer was added again, so the same lines appeared three and five times. The lines of an answer are now put where they belong, whoever answers first.
- **The pictures of the README come from shared tools:** `tools/make_architecture.py` draws `images/architecture.svg` from `docs/architecture.json` and `tools/make_structure.py` draws the Repository Structure (the text tree and the animated picture) from `docs/structure.json`; both measure every text, and `--check` fails when a picture, its description or the code it points to disagree. They are vendored from ARMOR-COMMON like the shared CI checks.
- **The architecture picture of the README is generated:** `docs/architecture.json` describes the boxes and `images/architecture.svg` is drawn from it (the Mermaid diagram stays in the README as text).

## [0.8.1.0] - Camera kinds and lenses, alarms spoken by menu, the lens view apart from the sweep in 3D

- **The alarms that are spoken can be chosen, by menu and by severity:** in the voice card of the alarm settings, every kind of source (alarms, cameras, nodes, devices, solar, electrical and network) and every severity has a box; an alarm left out is passive, so it keeps its sound, its pop-up and its place in the list but is not read aloud, and when a burst arrives the first alarm that is not passive is the one that is spoken. The network starts passive (its changes are frequent) and everything else spoken, as before.
- **In the 3D site designer a motorised camera shows what its lens sees apart from everything it can turn to:** as in the 2D plan, the wide faint fan is the whole sweep of the motor and a brighter fan inside it, at the heading of the camera, is the field of view of the lens at that moment; a fixed camera keeps its single fan.
- **The camera form knows the kind of camera:** a list of kinds (fixed, fixed with motorised zoom, pan and tilt, motorised, two lenses in one stream fixed or motorised, several lenses with one stream each) fills in what the camera can do, and the two boxes "pans and tilts" and "zooms" can still be changed by hand. The movement buttons of the console follow them: a fixed camera shows none, one that only zooms shows only the zoom. A camera with several lenses is saved as one camera per lens, each with its own stream and its own movement; one stream with two lenses one above the other is shown in two windows, in the grid and in the full view.
- **The camera form always has a button to open the web page of the camera**, on the address noted or else on the address of the camera, and a folded section to note its internal parameters (Wi-Fi network, address, encoder, bitrate and resolution), in the eight languages.
- **A camera can be added again when Studio is opened over plain http:** saving a new camera failed before it reached the server on a local address without HTTPS, because the identifier came from a function that only exists in secure contexts. The identifier is now generated everywhere, a pasted address (with scheme, user, port or path) is reduced to the host the server accepts, and the failure message shows the server's answer.
- **The Inverters and Electrical menus are organised like the Batteries one:** a table of every inverter (or every electrical node) with its state and its figures at a glance, and the detail of the chosen one below, with the picture of the flow beside its gauges, the channels of a node in compact rows, the history charts side by side, and the nodes and equipment, the unit information, the energy and the devices of the house in sections that fold. They fit 1080p and tighten themselves on 768p and narrower windows, with the same information as before.
- **The example readings of the solar equipment can be taken away to use the real ones:** a bar above the table of the Inverters and Batteries menus says there are example readings and removes all of them, and the equipment card of a device with an example offers "Remove the example" (it asks the server to take it away: the device waits for its first real reading).
- **The Batteries menu is organised for many nodes with up to eight packs each:** a table of every battery stack of every node (node, state of charge as a bar, voltage, current, power, temperature, cell spread, modules and alarm) replaces the row of tabs, and choosing a row shows its detail below; the summary and the capacity sit side by side, the modules are tiles that unfold (one by one or all together) into everything the module reported, the five charts of the history sit side by side, and the nodes and equipment, the event log and the energy and alarms fold away. It fits a 1080p screen and tightens itself on a 768p one and on narrower windows, with the same information as before.
- **The tiles of the overview (alarms, panels, nodes, radar, cameras, devices, energy, network, system) fit in one row:** with the new tile of all the nodes there were nine of them and the last one fell to a second line; the row now makes a column for every tile, all of the same width, and a text that does not fit is cut with an ellipsis (the name of the tile is its tooltip).
- **The live map of the overview and the map of the Radar menu can be seen in 3D:** two small icon buttons (a plan and a cube) next to the title of each map switch between the 2D plan and the 3D model of the site (terrain, buildings with their floors and roofs, cameras, radars with their coverage and the placed devices), and the targets the radars see now are drawn in 3D where they stand, lit by the colour of their alert level. The 3D view can be orbited and zoomed, has its own small row of view buttons (isometric, from above, fit, turn, see through) and shows nothing editable; the 3D engine is loaded only the first time it is asked for, and each map remembers its mode in the browser.
- **A new menu, Touch panel (HMI), for the wall panels:** the touch screens of the wall (ARMOR-NODE-HMI) had no menu in Studio. The menu lists every wall panel that has reported its health, how many answer, and gives each the buttons of a field node (its own page, its parameters through the server, the details of its health, the orders, the pencil for the address of its page and forgetting it) and its health card. It has its Help section, its tour and its hint, in the eight languages.
- **The address of the panel of a node can be said by hand, and a node that still answers can be forgotten:** the pencil button of a node (radar, inverters, batteries, electrical) asks for the IP and the port of its own panel and registers them with the server, which reaches the panel through that address ("change the parameters" said `unknown_panel` while none was registered, and now asks for it first); the "open the panel" link uses the registered address before the one the node told, which can be an old one. An administrator can forget a node that is still on (it comes back when it speaks again).
- **Every list of field nodes has icon buttons to manage each node:** in Radar (active radar nodes), Inverters, Batteries and Electrical each node shows buttons to open its own panel, to change its parameters through the server from anywhere (its whole configuration page), to see the details of its health, to give it an order (restart, pause, resume, standby, identify, diagnostics, with the usual confirmation) and, when it does not answer, to forget it. The orders and the forgetting are for administrators; the panel of a solar or electrical node is found through the network node.
- **The overview and the bottom bar count every kind of node, not only the radar ones:** a new tile of the overview shows how many nodes answer out of all of them, with the figure of each kind (radar, solar, electrical, alarm and hmi); the bottom bar counts the same; a node of another kind that stopped reporting appears in "Needs attention" with its kind. The count takes the health every node reports and the radar stream, and a node that is in both is counted once.
- **Every password field has an eye button to see what is typed or to hide it again:** the sign-in, the elevation prompt, the users and their PINs, the security and two-factor panels, the console, the cameras, the firmware, the node adoption, the remote access token, the network designer and the admin secret use one component (`PasswordInput`) that starts hidden, keeps the attributes of the field and names the button in the eight languages.
- **A camera with a snapshot address and no live video shows its still picture through the server:** the tile asks the server for a ticket (`/preview-ticket`) and puts the picture address in the image, because the address Studio keeps carries no login; if the server cannot give one, the stored address is used as before.

## [0.8.0.9] - Languages fetched one by one, a versioned browser store, typed contract and the pairing text for the HTTPS

- **Studio is tried the way it is deployed:** a workflow of its own (`e2e.yml`, switched off with the repository variable `ARMOR_E2E=off`) builds Studio and the server, puts the nginx of the image (its own template and headers file) in front of the server and drives a real browser through the sign-in, the live channel, the saving of the design of the site and every menu, and checks the security headers of the page, of the assets and of the fallback, the health route, the configuration route and what the proxy tells the server about who is asking.
- **What this browser keeps for a person belongs to that person:** the copies of the drawings and the unsent draft of the site carry the id of the user, so a second person who signs in on the same browser never finds what the first left; signing out forgets the copies that are in step with the server and keeps the ones with changes it never got, and a copy kept before is taken over by the first person who signs in.
- **What the browser keeps has a version:** the layout of everything the console writes in the browser has a number (`armor-studio-storage-schema`), and at start the steps that are missing are run once, in order: the first takes the copies of the drawings that belonged to the whole browser to the person who last signed in to that server. A browser that has never held anything is given the current number, one a newer console used is left exactly as it is, and a step that fails is tried again at the next start.
- **The types of the server's contract are checked by the compiler:** the types generated from the OpenAPI document are kept in `src/api/contract`, a test fails when they are not what ARMOR-COMMON generates, and 26 of the types this console reads the server with are checked at compile time to accept what the contract says.
- **Pairing a phone with the house's HTTPS:** Configuration > Security (way in from outside) shows the text `armor-pin:<name>:<pin>` of the authority that signs the installation's own HTTPS, for the name the phone reaches the house by, with a copy button, the authority and the day it ends; the Android app takes that text to trust the authority the first time. It says so when the machine has no authority of its own. In the eight languages.
- **Each language is a file of its own, fetched when it is first chosen:** the phrases are still written one row per phrase in all eight languages, but `tools/build_locales.mjs` (`npm run locales`) now writes one table per language and the console loads English with the page and every other language the first time it is the language (the page of a person who reads Spanish never carries German, Japanese or the rest). The language the browser remembers is fetched before the first screen is drawn, a phrase a language lacks shows in English until its file arrives, and a test fails when a table is not what the sources say, when a language lacks a phrase of English or when a screen imports a table of phrases again.
- **The assistant is fetched on its own:** everything it knows how to answer, in every language, is a separate file that arrives after the page is drawn, and the mascot the guided tours draw is a small file of its own. Together with the language tables the first page went from 2.6 MB to 1.1 MB (925 kB to 333 kB compressed).
- **Electrical channels show how fresh their reading is:** under the name of each channel, how long ago the node read it and how many reads failed, when the node says it, in the eight languages.
- **A new alarm is told:** "the name used to reach the house from outside no longer points to its public address" (`network_dns_stale`), in the eight languages, for the day the address changed and the dynamic DNS did not follow.
- **Notifications show what each place has come to:** under every place the alarms go to, the messages delivered, failed, dropped and waiting since the server started and why the last one failed, in the eight languages.
- **Security options, one more:** Configuration > Security offers "Encryption of the secrets a node stores" (off by default): the alarm panels are asked to keep only the secrets they store (passwords, token, keys) encrypted in their flash, with no eFuse burned; turning it back off asks first. Its help and warning are in the eight languages.

## [0.8.0.8] - Diagnostics of the nodes, read-only access and the sensors of a radar node


- The repository has a security policy, a code of conduct, a contributing guide and a support file.
- The banner follows the animated style of the ecosystem banners, with the name, the kind and the technologies of the project.
- **The sizes of a spoken turn are fields in Configuration > Security:** the most audio the wall panel may send in one turn and the most spoken answer the server hands back in the binary form, as whole numbers checked against the ceilings of the server (3200 to 1920000 and 3200 to 1000000 bytes) before anything is sent, with the range and the seconds of speech it means beside them, in the eight languages. The server keeps them in its settings (the environment is where they start), they count at once, and raising one asks for confirmation because a longer turn costs the server more.
- **The PIN to disarm is also told to the alarm panels:** the option now says it reaches the panels (a panel can fix its own rule), and the note under the options counts four options for the panels instead of three.
- **Configuration > Diagnostics:** a new administrators' tab to ask a node for its diagnostic package or its log, read what it handed over and download both.
- **Read-only access for somebody else:** issue a diagnostic token for the nodes you choose, for 5 minutes up to 24 hours (2 hours by default), with a note; the screen says in plain words what a token can and cannot do.
- **The secret is shown once:** the token appears a single time with a Copy button and a clear warning, is never kept in the browser and is gone when the screen is closed.
- **The list of tokens:** state (active, expired, revoked), nodes, expiry, uses and last use, with a Revoke button that asks first.
- **The package of a node:** versions, why it last started, memory, the tasks with the least stack, the memory gate, the core dump summary and the settings it allows to be read, plus the log; the node can be asked again after 15 seconds.
- **Health card, last dirty start:** a node that restarted because of a fault now says why, how long it had been running, how much internal memory it had and whether a core dump was kept.
- **Health card, memory gate, core dump and settings check:** shows whether the gate is closed and how many times it closed, the core dump, and whether a saved copy of the settings was restored or a bad change was undone.
- **Sensors of a radar node:** a table with model, state, firmware and the Bluetooth of each sensor, an alert chip when it is open, and a notice for an LD2412 with a faulty or unknown firmware; the Bluetooth address is shown to administrators only.
- **Three new warnings** for radar nodes (a sensor with its Bluetooth open, sensors covered while the perimeter is on, Wi-Fi jamming suspected), each with its explanation and what to do, in the eight languages.
- **History:** the dirty starts, the sensor Bluetooth changes, the radar perimeter events and the issue, revocation, use and refusal of diagnostic tokens are written in words in the eight languages.
- **Radar > Perimeter of the node:** the state of the perimeter engine of each radar node, the recent events it raised (a sensor whose Bluetooth opens is highlighted) and a button that opens the panel of the node, where the zones are edited.
- **The server says what the person may do:** the session carries the capabilities of the server (arm, disarm, acknowledge, operate, camera control, administer, users, security options) and Studio shows, hides and disables from that one place instead of testing the role in many; a server that announces nothing is an older one and the role decides as it did before, and what needs a part only the new server has stays hidden.
- **Configuration > Security, security options of the server:** for an administrator of a server that offers them, six options with their help in the eight languages: the PIN to disarm or silence a siren (never, only users who have one, always; fixed and not editable when the server's environment sets it), what the voice assistant asks before it silences the alarm, the alarm panel's saved armed state tied to its zones and PIN, the Zigbee zone messages and their signature, and the local tunnel for the cameras. Each starts the way the server always behaved, a lowered one shows a warning, and lowering one asks first.
- **Help, tour and assistant:** new paragraphs in the Configuration, System and Radar help, a tour step for the Diagnostics tab and two assistant answers (temporary read-only access, and why a node crashed), in the eight languages.
- **The administration says how the admin agent protects the broker rules and the env files:** above the file editors and the broker accounts a note says whether the agent lets the server rewrite them with its own token alone (with how to lock them), asks for a second secret (a field to type it, kept in this window only and sent with each such change) or does not allow it from Studio at all; the refusals have their own words in the eight languages.
- **Security options, one more:** Configuration > Security offers "Device logins only over a secure connection" (off by default, as before) for the logins kept for the devices of the network, with its explanation and its warning in the eight languages; the note about the alarm panels now says that they apply the three options they are sent and that each panel can fix them on its own page.
- **Security options, one more:** Configuration > Security offers "Lock of the phone app" (the person decides in the app by default, as before): require the fingerprint, the face or the phone's PIN of the phone for arming, disarming and unlocking, or also to open the app. It only raises what the person chose, a phone with no lock is never shut out, and lowering it asks first. Its help and its words are in the eight languages.
- **Security options, one more:** Configuration > Security offers "Live channel for the wall panel" (on by default, as the server ships it): off, the panels that listen to the server's WebSocket for their summary are closed and ask as before. Its help and its warning are in the eight languages.
- **Security options, one more:** Configuration > Security offers "Spoken turns as binary audio" (on by default, as the server ships it) for the wall panel's audio: off, the server takes only the older raw request. Its help and its warning are in the eight languages.

## [0.8.0.7] - The status arrives live, lighter menus, wider help cards, four more logos and the keyboard of the designers

- **The status arrives live:** Studio opens the live channel of the server and takes the state it pushes at once, so an alarm, an arming or a node coming back shows in a fraction of a second; while the channel is open the status is asked only every twenty seconds as a safety net (every three without it, as before), and the bottom bar says Live. If the channel cannot be opened or is cut, Studio tries again after a longer wait each time and goes on as it always did.
- **The clock no longer redraws the whole console:** the menus that say how long ago something happened tick by themselves, only while they are shown, instead of making every menu draw anew each second; the console is lighter on a slow computer.
- **The cards that open a designer from Cameras, Radar, Electrical and Network:** the title and the button share the first row and the explanation runs across the whole card under them, in one line where the window is wide and wrapping by itself in any language, text size or window (1920x1080 and 1366x768).
- **The Cameras footer** no longer starts with the stray word of the menu before the hint about the double click.
- **Four more animated logos:** the Site, Alarm, Electrical and Network designers have a logo of their own beside the title, moved by CSS and still under the reduced-motion setting.
- **Keyboard in the designers:** F fits the drawing, plus and minus zoom around the middle, and Ctrl+D duplicates the selected element, in the Alarm, Electrical and Network designers; the key hint under the drawing lists them in the eight languages.
- **Tested whole:** the three designers are mounted in a browser-like page and driven by the keyboard: tools, Escape, delete, duplicate, zoom, keys typed in a field and a designer that is open but hidden behind another menu.
- **Help for Battery maintenance:** the Help of Configuration explains the four steps, what the node reads first, the serial number and the password asked, the switch that keeps writing off and the risk of an operation that cannot be stopped, in the eight languages.
- **Tour steps:** a new step in the Configuration tour for the Battery maintenance tab and a new step in the Batteries tour for the details of a module, the health of its cells, its event log and what an alert means.
- **Assistant:** a new task, how to change the clock or the limits of a Pylontech battery, answered with the steps and a link to the tour, in the eight languages.
- **European Portuguese:** the sign-in confirmation, the assistant's name for the person and the hints no longer use Brazilian forms.
- **Cleaner code:** unused imports, variables and obsolete lint directives removed and two lists made stable for their hooks; the lint warnings go from twenty-eight to four.

## [0.8.0.6] - Control of the nodes from the health card, the internal memory and the maintenance window of every node

- **Orders for each node, from the health card (administrators only):** every node has an Actions menu with the orders it can take in the state it is in: Restart, Pause or Resume, Standby or Power on, Identify, Diagnostics and Maintenance mode on or off. Nothing here erases a node or resets it to factory settings, and the server and the CM5 are never reached.
- **Orders for all the nodes:** the card header has Restart all, Pause all, Standby all and Resume all. A restart of all can be Now (every node at once) or Rolling, the recommended one: one after another, thirty seconds apart, the alarm panel last; both are explained where you choose.
- **Typed confirmation:** Restart, Pause and Standby ask for the name of the node (or the word RESTART, PAUSE or STANDBY for all) exactly as typed; the other orders need none. The server's request for a fresh proof of identity goes through the usual sign-in again.
- **Honest warnings:** a restart says the node is unwatched for about a minute and the alarm panel and the radars get their own line; a pause or a standby says the house is NOT protected while it lasts, with a stronger line for the alarm panel and the radars.
- **Standby means work off, still connected:** the node keeps answering, stays in standby after a restart until you press Power on, and is never described as a power-off.
- **Lengths with sensible limits:** a pause is 1 to 60 minutes (an hour by default, and it always resumes by itself), a maintenance window 1 minute to 8 hours and an identification 5 to 300 seconds; a value outside the range is refused before anything is sent.
- **State chips on every node card:** Paused with the time left, Standby since when and by whom, and Maintenance until when, shown to everybody who can see the health card.
- **Follow an order node by node:** each node shows its steps (sent, acknowledged, offline, back, or sent and done), the times, the new firmware after a restart, the state it was left in, the snapshot a diagnostics order returns and, when it did not work, the reason in words for each refusal (busy installing a firmware, receiving an upload, copying a slot or running a battery operation, restarted a moment ago, already in that state, no answer, did not come back).
- **One Maintenance chip, with the reason and the time left:** the window the server holds for a node (a node that announced a restart, an update, an upload, a pause or a standby, an operator's maintenance, or both) shows as a single Maintenance chip with the reason, who set it and how long is left, counted from the moment the server was asked; Maintenance off is offered only for an operator window, since a node's own announcement ends by itself.
- **History wording for the maintenance and the node orders:** `maintenance_started`, `maintenance_ended` and `maintenance_expired` ("maintenance expired without the node returning", with the reason) and the steps of a node order (`control_requested`, `control_acknowledged`, `control_applied`, `control_refused`, `control_back`, `control_lost`) are told in words in the eight languages.
- **Help, tour and assistant:** the maintenance wording now explains that a node announces it itself, that the card shows one chip, and that the alerts resume and the History says it expired if the node does not return in time.
- **Help, tour and assistant:** the System help, a new step of the System tour and a new assistant topic explain the orders, rolling against now, standby and the warnings, in the eight languages.
- **Eight languages and tests:** every text is written in English, Spanish, German, French, Italian, Japanese, Chinese and Portuguese; the confirmation, the lengths, the warnings, the steps of an order, the refusals, the errors and the screens are tested.
- **Internal memory of the nodes:** the health card of a node shows its internal memory on its own (free now, least since start, biggest block) and the external RAM, when the node tells them, with the bar judged by the internal level, and the history draws the internal memory; the details of the memory warning name the three figures. Texts in the eight languages.


## [0.8.0.5] - Battery maintenance, richer battery data and alerts, and the remote connection badge

- **The model and the versions of every battery module:** each module card shows the model the module reports (a stack may mix models) and the versions of its board and software, as its console says them.
- **Cells, allowed current and console speed per module:** the number of cells, the charge and discharge current the module says it allows and the speed of its console (an old unit says 19200) appear on the card.
- **The state of health of each cell:** a new fold-out lists the count of every cell as the battery's console reports it and marks the cell the console calls abnormal, opening by itself when there is one.
- **The event log of the modules, read-only:** the entries the gateway node reads from each module's own log are listed newest first with the battery's clock, the states and the protection fields exactly as the console prints them (never translated or decoded), and the mnemonics that repeat are counted.
- **Warnings about the models a group mixes:** the master of a group should be the newest model, only the C, UP and US5000 models are accepted from the 9th module on and a 24 V model does not share a group with 48 V ones; they are warnings from the makers' manuals, never a block.
- **Two new alarms:** a cell that the battery itself marks as abnormal and a module that carries more current than it says it allows, with their texts in the eight languages.
- **What an alert means and what to check:** eleven battery alerts (overvoltage, low charge, alarm, hot, cold, unbalanced cells, a protection counter that went up, an abnormal cell, overcurrent, a device that stopped answering and a worn battery) show two lines when they are opened, based on the makers' manuals and on what can be checked, in the eight languages.
- **The gap between cells, said honestly:** the help of the unbalanced-cells alert says that about 100 mV near full charge is a usual figure and not an official one, that the level is configurable and that the battery balances its cells while it cycles.
- **Labels for the details of an alarm:** the module, the cell, the current and the limit an alarm carries now have their own names in the eight languages instead of the raw keys.
- **Old batteries are understood:** the card and the help take into account that a battery of an old firmware may talk at 19200 on its console and that a silent one may be asleep.
- **Tests:** the rules of the group composition, the cells counted from 1, the repeated mnemonics, the alert help in the eight languages, and the Batteries menu drawn with the new details in every language.
- **Battery maintenance (Configuration, administrators only):** a guided screen to write to a Pylontech battery through the gateway node it is plugged into, as the maker's own tool does: the clock, the statistics counters and logs, restarting and shutting down, the charge level (the capacity the maker gives for the model), the limits and protections, the outputs (charge and discharge MOSFET, buzzer, heater), the serial number, the external memory and even the firmware. Four steps - battery and operation, values, confirmation, result - and nothing is a free command.
- **The battery is read before and after:** the node logs in, reads the battery and answers with exactly what it will do (the operation in words, its risk, the battery's model, serial number and firmware, and what the battery said); only then can it be done. Afterwards what was written is read back, the screen shows what changed and the transcript of the conversation (the battery's service password never appears in it), and a result that does not match is told as failed, with the real state.
- **It asks who you are, twice:** every order needs a fresh proof of identity (the password or the second factor, also inside the house) and the battery's serial number typed exactly as the battery reports it, so a wrong port or a wrong battery is caught. The operation can be withdrawn while it is only prepared, and stopped between two steps once it runs - never in the middle of the sequences that must not be cut (erasing the memory, writing the serial number, firmware).
- **Limits in volts and degrees, a whole group at a time:** the module voltages, the cell voltages and the temperatures are typed in volts and degrees, checked against the ranges and the order between values that the maker's tool states, and sent as a group; the protections are enabled or disabled one by one, and disabling one asks to accept the risk.
- **Firmware files:** a firmware file (.bin) is read by the server (board, version, size, SHA-256) and shown before anything is sent; the node refuses to send it unless it fits the battery's model and chip.
- **The operations are listed and kept:** who ordered what to which battery, when and how it ended, with the reads before and after. An output switched by mistake can be put back as it was.
- **History:** a new Batteries category in the System tab says who ordered an operation on which battery and how it ended.
- **Eight languages:** the screen, every refusal of the server and of the node, the operations and their warnings are written in English, Spanish, German, French, Italian, Japanese, Chinese and Portuguese.



## [0.8.0.4] - History of connections, node health, arming modes, daily cell extremes and a safer sign-in

- **Cell extremes of the day, per battery module:** each module card in Batteries shows today's lowest and highest cell with the cell number and the time, and the widest gap of the module; the stack card shows the widest gap of the whole bank today. The numbers come from the server, start again with its day and survive a restart.
- **Cell gap alarm that waits:** Solar alarm levels has a new field, how many minutes the gap between the cells must last before the alarm is raised (0 keeps the old behaviour, at once); it starts again whenever the gap drops back under its level.
- **The History has tabs:** All, Alarms, Connections, Devices, System and Settings. Each tab asks the server only for what it is about; Connections and System have their own filters (by kind of client, by category), the level filter belongs to the first tab, and "Clear history" and the export follow the tab you are on.
- **Who connects to the server:** the Connections tab lists every device and app the server has seen - Studio sessions, the Android app, the panels of the nodes, the voice service and anything else - with its version, when it was first and last seen, how many sessions it has open and how many sign-ins worked or were refused, refreshed while it is open; a client with refusals stands out.
- **Sign-ins in the history:** a line for every sign-in, refused sign-in, wrong code of the second factor, sign-out, session ended from the list of sessions or session that ran out, saying who, with what, from inside the house or outside, and whether the second factor was used.
- **What happened to the system:** nodes that appear, come back, change firmware or disappear (with the version), the link to the broker lost and back, services restarted, updates checked, installed or rolled back, and the alarm armed, disarmed or asked to arm, disarm or silence with its profile and who did it - in the System tab - and the settings that were changed, by whom and in which area (never the values) in the Settings tab.
- **Privacy by design:** the address and the user agent of a client are shown to administrators only (the columns do not even appear for anybody else), no password, token, cookie or PIN is ever recorded, and a name typed in a refused sign-in is kept only when it is a real account.
- **Studio says what it is:** every call carries the name and version of Studio, so the server's list of connections tells it from the phone and from other clients.
- **Readable events in eight languages:** the new events are written as sentences ("Android app - ana - signed in - v0.6.7 - from outside", "Alarm - alarm-1 - arming requested - profile night - by ana"), and the export to CSV and JSON includes them.
- **Help, tour and assistant:** the Help of the History explains the tabs, the tour of the menu has a step for them, and the assistant answers "which devices and apps connect to the server?".
- **Tests:** the query of every tab, the sentences of the new events in the eight languages, the export of them, the History drawn with its tabs in every language, and the phrases of the new screens.
- **"Remember me" on the sign-in, done the safe way for a browser:** the sign-in is a real form with named fields (`username`, `current-password`, and a numeric `one-time-code` for the second factor), so the browser's or system's password manager offers to save and fill it; an optional tick, off by default, remembers only the user name in this browser (forgotten as soon as it is unticked, and the page works with storage blocked), and a note in the eight languages says that the password is kept only by the password manager, never by Studio. The session cookie is unchanged.
- **Smaller source files:** the calls to the server (`api.ts`) are split by area into `api/` and the site designer operations (`designer/ops.ts`) by what they edit into `designer/ops/`, and the longest text lists (the assistant topics, the Help sections and the designer texts) are kept in several part files; the files that used to hold them keep the same names and exports, so nothing changes for the person using Studio.
- **The health of every node, in System:** a new card gives the same report for every radar, solar, electrical, alarm and wall-panel node - how long it has been up, why it last restarted (a crash, a watchdog or a brown-out is marked as unexpected), its free memory with a bar, its link (Wi-Fi with a signal that reads good, fair, weak or very weak, or the cable), how many times it connected to the broker, the restarts of the last day, the tasks short of stack and the last error it logged. The nodes that need a look come first; a filter picks one kind of node.
- **Four health warnings in Alarms:** a node short of memory, one that restarts too often or has crashed, one that keeps losing the broker and one with a weak Wi-Fi signal each raise a warning, with its text and the labels of its details in the eight languages. The levels the server judges by are written on the card.
- **Details of a node:** one press shows the history of its memory and its Wi-Fi signal as small lines and the log of its restarts, newest first, with the reason and how long it had been up. An administrator can forget a node that was taken away, with its warnings.
- **Nodes that have said nothing yet are listed:** a node the server knows from its other messages but that sends no health report (an older firmware, or a broker that does not let it write) is named as waiting, with what to do, instead of being taken for healthy.
- **Arming modes on every panel:** a panel whose firmware knows them shows a Mode picker (Away, Home, Night and the ones you made) and one button that arms in the chosen mode; the card says which mode the panel is armed with, and the list of recent commands names it. A panel with an older firmware keeps the two buttons it always had and says why the modes are not offered.
- **An editor for the arming modes:** an administrator opens "Edit the modes" in Alarm panels and sets, for each mode, its name, whether it behaves like away or like at home, the exit and entry delays, whether the siren sounds (a silent alarm is still recorded and told), how loudly the server tells people and the zones that differ from their kind (guard or left out, alarm at once or after the entry delay). Save is offered only for a list the server will accept; a change made by somebody else meanwhile is reloaded instead of overwritten.
- **The three modes of the start speak your language:** Away, Home and Night are shown in the language of the person until somebody renames them; a mode of your own keeps the name you gave it.
- **Help, tours and assistant:** the Help of System and of Alarm panels explain the health card and the arming modes, each menu's tour has a step for them, and the assistant answers "how is each node doing?" and "how do I arm at night with only some zones?", all in the eight languages.
- **Refusals in plain words:** a mode that no longer exists and a panel that does not know modes are told as such, in the eight languages.
- **Tests:** the health model (sizes, times, signal, memory bar, history lines, ordering), the modes model (ids, cleaning, the rules the server applies, summaries), both cards drawn in every language and the picker for a panel that knows the modes and one that does not.
- **Silence a siren without disarming:** in Alarm panels, while a panel's siren sounds, an administrator gets a "Silence siren" button that asks for the PIN of the signed-in user (the server checks it, a wrong one counts toward the same lockout as a wrong disarm PIN). The system stays armed and the alarm stays recorded; the card lists the new "siren silenced with the PIN" event, and the help and the assistant explain it in the eight languages.
- **Encryption of the link to the broker, shown:** Configuration > MQTT broker has a small card that says whether the server talks to the broker over `mqtts://` and, when it trusts only the installation's own certificate authority (`ARMOR_MQTT_CA_FILE`), shows that authority's name, SHA-256 fingerprint and end date to compare with `armor_mqtt_tls.sh status`. The default (plain MQTT) is shown calmly, not as a problem, and no path or certificate text ever reaches the screen. In the eight languages, with tests.
- **The protocol of the person reaches the server:** when a proxy in front of Studio (Caddy, a router) already ended the HTTPS, nginx passes on what it announced instead of saying "http" for every request, so the server knows whether the sign-in came over HTTPS (secure cookie, remote policy); reached directly, it is the scheme of that connection. The test of the template reads the map.
- **A camera ticket cannot lead elsewhere:** the path the server gives to watch a camera is accepted only under the cameras route, without ".." (also written %2e%2e), a second slash that would name another host, a backslash or a broken escape; anything else is refused as an invalid answer. Tests with the cases.
- **A file too large for the server is told as such:** importing an installation file larger than the server accepts (9 MB) shows a sentence of its own in the eight languages and not "it could not be done"; the refusals of the other screens use the same helper, which asks for the text of a "too large" answer only where the screen has it.
- **One way to turn a refusal into words:** the seven screens that each had their own copy of the lookup (installation, notifications, security, outside access, users, devices, automations) share one function, tested with the codes the server gives, an unknown one and a failure of the network.
- **Comments that say why, not what went wrong before:** the explanations in the code of the console that told the story of an old fault now say only the reason for the way it is done.
- **"Remote connection" in the top bar:** when the server counts the session as coming from outside the house, a small badge says so, and its hint explains that critical actions may ask for the password again and which second-factor policy applies (off, asked from outside, always). Nothing is shown from inside the house. In the eight languages, with tests.
- **A linter for the source:** `npm run lint` runs ESLint with the rules of hooks as errors and the unused variables and dependency lists of effects as warnings; the first pass fixed a hook called inside a callback (a camera discovery button), statements used as expressions in the grid of the 2D plan and a few leftovers.
- **Life counters of a battery module:** each module card in Batteries has a collapsible list of the counters its console prints (bat OV times, COC times, data items ...) with the protection ones first and flagged when above zero, a note that their meaning is not official, and the new alarm for a protection counter that went up in the eight languages.
- **Newer batteries in the list:** the Pylontech UP2500 (24 V), the corrected UP5000, the UF5000 and the Fidus FB-L-5.12-EU can be declared, and the alarm for a battery over the voltage its own protection acts at is worded in the eight languages.



## [0.8.0.3] - Guides control by control, a tidier Security menu, the way in from outside explained, and a voice that stops on time

- **Step-by-step tours that go control by control:** each menu's tour has now four to fourteen steps instead of three generic ones, and every step lights up one part of the page (the arming button, the tiles, the toolbox, the filters, the node cards, each tab of Configuration...) and says what each control does, what to expect and the usual mistakes. The welcome, security and administration tours gained steps for the mute button, the assistant, the recordings, users, security, notifications, node firmware and installation, and the card is a little wider so a long step reads comfortably. Written in the eight languages; the parts of the page are marked in the views, and a test checks that every menu has its detailed steps and that everything a step lights up exists.
- **Menu introductions use the whole width:** the description under the title of Cameras, Radar, Inverters, Batteries, Electrical, Automations, Network, System, Services, the designers and the tabs of Configuration is no longer held in a narrow column (the compact layout kept it at 60 %, the electrical designer at 70 characters and the solar menus at 44 rem). It takes all the room beside the logo and the buttons and wraps by itself with the language, the text size and the window, with no fixed height and line heights in rem; in the solar menus it sits on a row of its own under the totals. A test reads the style sheets and checks that no introduction has a restrictive width.
- **The Help explains the field nodes in depth:** the advanced levels of Radar, Alarm panels, Inverters, Electrical and Configuration now cover set-up and the set-up Wi-Fi, preparing many nodes from one image, Wi-Fi as an access point and as a station, the Bluetooth pairing PIN, the two firmware slots with rollback, signed updates and reaching the panel from outside, in the eight languages. The assistant answers three new questions (firmware slots and rollback, one Wi-Fi from many nodes, many nodes from one image), found by their keywords in every language.
- **Reaching the house from outside, step by step:** a guide at the top of Configuration > Security > Reaching the house from outside shows six steps (the machine can do it, the VPN exists, the house has a name, the port on the router, the phone is added, try it from outside) and whether each one is done, in the eight languages.
- **Configuration > Security is tidy:** three titled sections (your account, how the server sees you, reaching the house from outside); the cards of a section sit side by side and aligned at the top, the forms are laid out in a grid with their labels above the fields, and the guide's steps are cards of their own instead of a long list.
- **The assistant's voice stops when it should:** the mouth no longer goes on moving after the voice has finished, and pressing "tell me more" (or changing menu) several times no longer makes the voice read the previous text before the new one. Each reading has its own number, so what a cut-off reading reports late cannot end the new one; a browser that never says it has finished is noticed within half a second; long texts are read sentence by sentence (a browser stops a long one halfway); and the voice waits a moment before starting, so only the last text is read. Tests with a speech engine that reproduces the late events.
- **The step-by-step tours have their own mascot and voice:** each step card shows a small guide that moves its mouth while the step is read aloud; the voice and the guide are switched on or off with two buttons in the card itself (and in Preferences > Help), the voice stops when the step changes or the tour is closed, and it uses the voice chosen in Alarm sounds. The guide is on and the voice off by default.
- **An inverter whose warnings cannot be asked says so:** a REVO inverter has no warning query, so Solar shows its warnings as "unknown" (with an explanation on hover) and not as "none".
- **Estimated power is marked:** a channel whose power is an estimate (a current input with a nominal voltage) and the grid figure that includes one show "≈" and explain on hover that it is an estimate and can be higher than the real consumption.
- **A zone the alarm node cannot read is shown:** the zone state "cannot be read" appears in the alarm panels in its own colour, and the warning that the server raises for it has its text in the eight languages.
- **Wall panels are listed as such:** the services list shows the HMI screens as "Wall panel" and no longer as a radar node.

## [0.8.0.2] - The way in from outside the house, set up with choices: the VPN, the name that follows the house and the panels of the nodes

- **VPN in Configuration > Security:** for an administrator, a form with the name or address the phone will use, the port, the network of the house and, if wanted, routing to the nodes; Studio asks the machine to set up WireGuard and says what is missing (the tool, the helper) in plain words, and tells you which UDP port to forward on the router.
- **Add a phone or a laptop to the VPN:** type a name, press Create and the configuration appears with a QR code to scan with the WireGuard app (or the text, to copy); it holds a private key, so it is shown with a warning and closed afterwards. Show it again later, or remove the device to cut its access.
- **A name that follows your house:** DuckDNS, Cloudflare or any address to call, with the token kept on the machine and never shown again; the card says what is being kept up to date and the last address told, and updates it now or stops it with a button.
- **Node panels through the server:** register a node by its id and its address in the house, and Open panel shows its own web panel from outside the house without publishing the node.
- **Certificates of the nodes you can check:** for a node with HTTPS, Studio shows the fingerprint it presents so that you compare it with the one in the node's own panel before you trust it, says when the certificate is not trusted yet (and does not open the panel) and when it changed.
- **The new proof of identity is asked by itself:** every change here, from outside the house, opens the dialog for the password or the code and then goes on.
- **Refusals in plain words:** a helper that is not installed, an address that is not of the house, a node that does not answer, a wrong password; each in the eight languages.
- **Help:** the Configuration page of the Help explains the VPN, the name and the node panels step by step in the eight languages, and the assistant answers how to add a phone to the VPN, keep a dynamic DNS name or open a node panel (and, from the previous version, the second factor and outside access).
- **63 new phrases in the eight languages**, all checked by the coverage test, with the cards drawn only for administrators.
- **Tests:** the screen draws the new cards for an administrator and not for anybody else, every phrase exists in the eight languages, and the assistant finds each new topic by its keywords.

## [0.8.0.1] - Security: second factor, open sessions and the settings for using the server from outside the house

- **A Security tab in Configuration** for everybody who signs in, with the account's second factor, the open sessions, a check of how the server sees you and, for an administrator, the settings of outside access.
- **Second factor (authenticator app):** set it up with your password, add the key to the app (a link opens it on the phone), confirm it with the first code and keep the ten recovery codes, shown only once; turn it off with the password.
- **Two-step sign-in:** when the account has the second factor on, the sign-in asks for the six-digit code (or a recovery code) as a second step, in the language of the browser, and says why when the server asks for it from outside the house and it has not been set up.
- **Open sessions:** every browser or phone that is signed in, with where it came from (the house or outside), its address and when it was last used; end one, or all the others.
- **How the server sees you:** one button shows the address the server sees, whether it counts as the house or outside, the Secure cookie, the trusted proxy and the policy of the second factor, and warns when a phone on mobile data is taken for the house.
- **Settings of outside access in a form, not a file:** trusted proxy, networks that count as the house, VPN networks, whether the second factor is required from outside, what a session from outside may do (everything, operate the alarm only, only look), how long it lasts and how long it may sit unused; saved in the server's settings file with a restart.
- **A new proof for critical actions from outside:** when the server asks for it (managing users, starting a firmware update) a dialog asks for the password or a code of the app and the action that was refused is tried again by itself.
- **The server's refusals are explained:** a firmware release without a valid signature, a policy that only allows something from the house or the VPN, a wrong or locked code, an expired sign-in; each in the eight languages.
- **Help and hints:** the Configuration page of the Help describes the Security tab and the access from outside, and pointing at the tab says what it is, in the eight languages.
- **Tests:** the edit of the settings file in place, the dialog and the cards of the tab, and that every phrase of the new screens exists in the eight languages.

## [0.8.0.0] - A speaking assistant, the overview redesigned and drawings kept per server

- **Connection announcements:** the alarm voice now says aloud when a node, a device or a camera connects, as it already did when one was lost.
- A node that comes back is no longer called silent right after it reconnects: the server counts its silence from its return (server fix, shipped with this version).
- **Mute button:** one button beside Help silences the alarm sounds and the voice, and shows which state it is in.
- **Menus keep their state:** a form half filled, a tab or a firmware update in progress is still there when the person comes back, also when an alarm takes them to another menu.
- **Overview redesign:** tiles for alarm panels, energy and network, and a layout that fits from 1093 px up to full HD without a vertical scrollbar.
- **Release notes in Updates:** the changes of a program's new version are shown before installing it.
- **Configuration in groups:** the tabs are ordered from the person's own settings to the system's, with a separator between groups.
- **One General tab:** the server's address and ports now sit in General, with the address this browser uses and the interface settings, each card saying where it applies (only this browser, the server for every device, or how Studio looks for you).
- **Voice styles:** the alarm voice can speak in original personalities (action hero, dark lord, theatrical), in the eight languages; none imitates a real person.
- **A mascot that speaks:** the assistant reads its answers aloud, with a mouth that moves, a switch in Preferences and an icon in its bubble.
- Pin, return to its place and voice are small icon buttons in a corner of the bubble.
- The bubble opens on the side that has room and the mascot is easier to drag.
- **Hints everywhere:** pointing at any control says what it is and what it does, in the eight languages; controls with no hint of their own get one from their kind and name (designer tools, tabs, filters, fields and tiles).
- A check of every menu in the eight languages looks for texts that are really a missing key or a word glued from several; the hints of card-like controls (a radar, a power switch) now name them by their first words.
- **Help pictures:** every main menu has a picture with example data in the Help, in the eight languages.
- The assistant knows about signed firmware, network Zigbee and the voice styles, and answers questions about them.
- The README is rewritten in the eight languages with screenshots taken at 1920x1080.
- **Drawings kept per server:** the site, electrical, network and alarm drawings are saved in the browser for each server, with the revision they were made from; an edit made while the connection was down is sent when it returns, and one server's plan is never offered to another. A short break in the session check no longer reads the server's copy over what was being edited, and a save that comes due during a read waits for it instead of being lost. One shared code now keeps the three drawings in step.
- **One server at a time:** the address in Configuration is applied when it is finished, signing out closes the session on the server that opened it, and the server Studio talks to is always the one the person signed in to.
- **Nothing left behind after signing out:** the output of the console and the firmware job are forgotten, and no camera password is kept in the page; the user name of a camera is no longer stored in the browser either.
- **Hidden menus stop asking:** a menu that stays open but hidden, and a tab in the background, no longer poll the server (the alarms keep arriving); this ends the 429 refusals a viewer got after visiting several menus.
- **Keys of the three designers** only act in the designer that is on screen: a hidden one moved, deleted and undid things nobody saw.
- **The sign-in screen speaks the language of the browser** (or the last one used), says what the session is, and works with the browser's storage blocked.
- **Container image:** every location of the nginx sends the security headers, the pictures of the Help are included, the server's address is the one the page was opened with, and the real client address reaches the server.
- A viewer sees the alarms and the arm button disabled instead of a refusal; an account of a wall panel is told it cannot use Studio.
- An intruder seen by a radar opens the camera that sees that radar; an alarm from a panel opens the panels.
- The notification of a critical alarm names it in words, "last run" of an automation shows minutes or hours, "default" in the risk of a device and the photo / video labels are translated, and the missing Japanese and Chinese texts of the site designer are in place. Tests now fail on a phrase left in English or on a key that does not exist.
- The risk of a device can go back to its default, the history no longer jumps back to its first page, a firmware job that the server forgot ends instead of spinning, stopping or restarting the broker asks first, and a failed PTZ command is no longer an unhandled error.
- A snapshot address that carries a login is refused and never stored; a colour such as `toString` in an imported drawing is no longer accepted.
- The static host knows the picture, sound and font types and lets a Studio served without a configured server reach an https server.
- **Updates:** the release notes of a new version are shown whole (up to 300 lines), and the General tab gives the server's card two columns so its sentences take two lines instead of five.
- **Documentation:** the security model is rewritten, and the README (in the eight languages) now describes the session, the weather exception, the environment variables and the container.

## [0.7.9] - Zones of the picture to ignore

- **Zones to ignore:** the settings of the Cameras menu show, under the settings of a saved camera, its live picture with the zones that the observation service ignores drawn over it.
- Dragging on the picture draws a new zone (a rectangle, in whichever direction you drag), and a click or a thin sliver is not a zone.
- Each zone is listed with its place and size in per cent and can be removed on its own, or all of them at once, before saving.
- At most sixteen zones per camera, and the server's answer to a wrong zone is told instead of being lost.
- Everybody who may look sees the zones; only an administrator draws, removes and saves them.
- What is ignored is only the movement detection: the live video, the photos and the recordings stay whole, as the text says.
- A tree that waves, a road or a screen no longer raise alarms once its part of the picture is a zone.
- **Help, tours and assistant:** the cameras section explains the zones in every language, and the assistant answers "a tree keeps setting off the alarm, how do I ignore that part of the picture" in each of them.
- All the new texts exist in the eight languages.
- Tests check how a zone is drawn from two corners (any direction, kept inside the picture, nothing for a click) and that every question of the dictionary still finds its task.

## [0.7.8] - Automatic capture, a movable assistant and the public connection in Network

- **Automatic capture:** a new tab in Configuration sets what the server takes by itself when a camera sees something while the perimeter is armed.
- It can take photos (one or up to sixty, from one to three hundred seconds apart) and record a video of three to three hundred seconds; each part can be switched off on its own.
- A cooldown of five seconds to an hour leaves a camera alone after a capture, so that somebody walking in front of it does not fill the disk.
- The latest automatic captures are listed next to the settings; everybody who may look sees the values and only an administrator changes them.
- **A movable assistant:** drag the mascot anywhere in the window, or move it with the arrow keys, and its bubble opens to the side that has room.
- **Pin it:** "Pin here" in its bubble, or the same in Preferences, leaves it where it is and it no longer follows the menus; "Back to its place" puts it back.
- Preferences also choose its size (small, normal or large) and whether its bubble opens by itself in every menu.
- **The public connection in Network:** a card right under the internet state shows your public IP (with a button to copy it), the provider and its network number (ASN), the place with its flag and the country in your language, the time there, IPv4 or IPv6, the reverse name and since when the address has not changed.
- **Help, tours and assistant:** the new tab, the movable assistant and the public connection are explained in every language, and the assistant answers questions about them ("how do I make the cameras take a photo and a video", "how do I move the assistant", "what is my public IP").
- All the new texts exist in the eight languages, and tests check the new preferences, the public address facts and that every question of the dictionary still finds its task.

## [0.7.7] - Alarms on the live map and Zigbee sensors for the zones of the alarm panels

- **Ask the assistant in words:** the mascot has a text box; write what you want to do ("how do I arm the alarm", "a node does not answer") and it answers with the steps.
- Each answer comes with buttons: take me to the right menu, show it step by step (the menu's tour starts by itself) or open the Help.
- A dictionary of thirty tasks in the eight languages (arming and disarming, alarms, cameras, recordings, devices, automations, users, notifications, updates, nodes, Bluetooth PIN, Zigbee zones, solar, electricity, network, drawings, language, lost password and more); a question in one language is answered in the language of the interface.
- When no task fits, it searches the Help text of every menu in your language and answers with the best paragraph, and when it finds nothing it says so and suggests questions instead of guessing.
- It ignores accents, capitals and punctuation, understands other forms of a word (arm, armo, armar) and works with Japanese and Chinese, which have no spaces between words.
- Suggested questions change each time, and the chips ask them with one click.
- It works in the browser with no server, no model and no outside service: nothing you type leaves your screen.
- Tests check that every task has its keywords, sample question and answer in the eight languages, that each sample question finds its task, and that questions phrased in other words still do.
- **Alarms on the map:** an alarm nobody has acknowledged pulses on the live site map where its camera, its device or its radar is drawn, so you see where it is without opening the list.
- The marker is red for a critical alarm, orange for a high one and yellow for a warning, and it disappears when the alarm is acknowledged or cleared.
- An alarm whose source is not drawn (a network, a solar or an alarm-panel alarm, a device that was never placed) stays in the list only, instead of being drawn in a wrong place.
- **Zigbee sensors for the zones:** Alarm panels has a new card where an administrator ties each Zigbee sensor of the device registry to a zone of a panel.
- With those links the server tells the panel how each zone is while it holds the Zigbee radio, so arming a panel really guards its Zigbee doors, windows and motion sensors.
- The card offers the sensors, the panels and the zones of the chosen panel in lists, refuses a zone chosen twice and shows what it could not save.
- Anybody who may look sees the links read-only; only an administrator edits them, and at most 64 links are kept.
- **Help, tours and assistant:** the overview and the alarm panels sections explain the alarms on the map and the Zigbee links in every language, and the menu tours and the assistant say it too because they read the same text.
- All the new texts exist in the eight languages, with a test that no phrase of the card is missing in any of them.
- The card follows the narrow layout: on a phone its three lists stack in one column.

## [0.7.6] - A check before arming, a viewer role, ntfy, proof of custody, daily energy and a Help that knows all of it

- **Before arming:** the arm button asks the server first and lists what would leave the perimeter blind or noisy - a radar node that does not answer, a silent panel, an open zone, a camera that is down, an open door or window, alarms nobody has seen - and offers "Arm anyway" when something blocks.
- **Check without arming:** a tick button in the top bar shows the same check on demand.
- **Viewer role:** Configuration > Users can create viewers, each role has a line saying what it may do, a viewer cannot arm (the button is off), and only the tabs that do not change the installation are offered.
- **ntfy:** the Notifications tab lists the ntfy push channel, tests it and explains how to set it up and how an unacknowledged critical alarm is told again as unattended.
- **Proof of custody:** the Record library downloads a file signed by the server with the digest of an evidence file and every audit line about it.
- **Energy per day:** the Electrical menu shows the last week of each channel's energy, with the day a meter wrapped or restarted marked.
- **Acknowledge from the pop-up:** an alarm pop-up has its own Acknowledge button next to the jump to the right menu.
- **Help, tours and assistant:** the alarms, record, electrical, automations and configuration sections explain the new features in every language, and since the menu tours and the assistant read the Help they say the same.
- **Hover hints:** the check button, the proof button and the threshold value explain themselves.
- The Help no longer says there are five extra tours or that the connection state is at the foot of the menu.
- All the new texts exist in Portuguese as well as the other seven languages.

## [0.7.5] - Alarm sounds, voice and pop-ups, a Help book with four levels, a tour for every menu and an assistant

- **Alarm sounds:** Configuration > Preferences chooses a sound for each severity and, if wanted, another for each kind of source, with a play button on every row; eight sounds are made by Studio itself.
- **Your own sounds:** audio files (up to 1.5 MB) can be uploaded from the browser, kept in the browser's own storage, played, assigned to a severity or a source and removed.
- **Spoken alarms:** the browser's voice can say the severity, the kind of alarm and where it comes from, with a language, a female or male voice, an age (child, adult, elderly) and a speed, and a button to test it.
- **Muting:** everything can be muted at once, and each severity and each kind of source can be muted on its own; the volume is a slider.
- **Pop-ups:** a new alarm shows an animated card in a corner that never blocks the page, closes with a click or by itself after the chosen seconds, pulses when critical and can be limited to the time the system is armed.
- **Smart jump:** an alarm can take you to where it is handled - an intruder seen by a camera opens that camera, one seen by a radar opens the camera that covers it, a panel alarm opens the panels, a solar or electrical fault its own menu - or only when a click asks for it.
- **Blinking tab:** the title of the browser tab blinks with the number of alarms that wait for a person.
- **Help book:** the Help is wider and shorter so it fits a 1080-pixel screen, has an animated picture for every menu, arrows (and the arrow keys) to turn the page, and four levels of detail - simple, medium, advanced and technical - the last one listing what each menu reads from the server.
- **Guided tours:** every menu now has its own tour, written from the Help in the seven languages, that lights up the menu and then the page while it explains what it shows and how to use it.
- **Assistant:** an animated mascot follows you from menu to menu, tells you what each one is for, offers the tour of the menu, the next thing to know or the Help, and is switched on or off in Preferences.
- The animated picture of the menu sits beside its title in the top bar.
- The connection state moved from the foot of the menu to the bottom status bar, and the menu uses the space it left.
- The Sistema menu no longer squeezes "What the nodes send" against the audit log, which showed two copy buttons stacked.
- Descriptive texts under the titles of the menus and tabs use the whole width of their card instead of wrapping in a narrow column.
- **Threshold triggers:** an automation can start when a reading of a device (temperature, humidity, battery, power, voltage) goes above or below a value you type, not only when it changes state.
- **Portuguese:** the console, its Help, its tours, its hover hints and the new sounds and assistant texts are available in Portuguese, the eighth language of the family, from the language selector.
- The demonstration site is never uploaded to the server over a real design, and the status poll skips a hidden tab and a request that is still running.

## [0.7.4] - Motorised gates, garage doors and shutters, water heaters and tanks, and a bridge to the Electrical Designer

- **Gates:** new looks for a gate - farm or field gate, sliding gate and cantilever gate - drawn in the plan (swing arc or sliding track) and in 3D, and a motorised gate shows its motor box and can be tied to a gate motor of the Devices menu.
- **Garage doors:** four new kinds besides sectional, roller and swing - up-and-over, sliding, bi-fold and side sectional - each with its own look in 3D.
- **Motors:** a garage door and a window roller shutter can have a motor (drawn in the plan and in 3D, with the roller-shutter box and its slats) and each is tied to its device.
- **Roller shutters on windows** are now drawn: the box above the window, the slats let down and the motor at the end of the axle.
- **Water:** electric water heaters, hot water tanks and solar circuit tanks in the Interior panel, with their 2D symbols, 3D bodies, icons and names in seven languages.
- **Roofs:** a solar water heater (collector and horizontal tank) that follows the slope of the roof and can be tilted.
- **Devices:** four new kinds - motorised roller shutter, gate motor, garage door motor and water heater - with open and close commands, icons, colours, 3D bodies and the Zigbee2MQTT field maps.
- **Electrical Designer:** new elements - motor, circulation pump and roof solar water heater - and a button that draws the motors and water equipment of the site as loads, once, remembering the object each came from, with tests.
- **Configuration > Updates and Console:** the window of an update keeps running and comes back with its steps and log when you go to another menu; the console keeps its commands, folder and history too.
- The list of the last operations can be emptied and scrolls inside its own box when it is long.
- Every log window has a small copy icon (the updates log, the console, the firmware log and the node messages) that flashes when it has copied.
- **Configuration > Updates > operating system:** a "Full upgrade" button (apt full-upgrade: what a plain update keeps back, a new kernel for one) and a "Repair packages" button (dpkg --configure -a and apt-get -f install); the card names the packages kept back and, in red, the ones left half-installed, so they are repaired before the machine is restarted.
- The steps of the system jobs are named in the interface language.
- **Guided tours:** a window that dims the page, lights up the part it explains with a pulsing outline, opens the menu by itself and shows a card with an animated picture, the words, the progress and the buttons; keyboard (arrows, Enter, Esc), phone layout, and six tours - welcome, security, designers, energy, house and administration - with 29 steps in the seven languages.
- **Rich hover hints:** pausing the pointer on any control (or reaching it with the keyboard) shows a card next to it with the explanation and, in the rich mode, a small animated drawing of its menu; the browser's own tip is taken off meanwhile and put back after.
- **Configuration > Preferences (new tab):** guided tours on or off, a welcome tour on the first visit, every tour to start or replay and to mark as not seen, hover hints off, text or with picture and the time they wait.
- **Preferences of the look:** animations (all, fewer, none), density (comfortable or compact), size of the text (85 to 130 %) and the menu Studio opens at (or the last one used), all applied at once and kept in this browser.
- **Preferences of the alarms:** the sound and the notification of the browser for a new critical alarm can each be switched off; every preference can be restored to its default.
- The Help has a button that starts the welcome tour, and the Help of Configuration describes the Preferences.
- The Help of the Site Designer lists the new gates, garage doors, motors and water equipment, and how they reach the Electrical Designer, in the seven languages.

## [0.7.3] - Updates from GitHub, operating system updates and a maintenance console

- **Configuration > Updates:** the programs of the machine (server, Studio, network watcher, observation service, voice gateway and helper scripts) with the version installed, the newest release on GitHub and a state for each: up to date, update available, not installed, newer than GitHub or unknown (and why).
- Each program can be updated by itself, several can be picked, or everything that has an update can be updated at once; a program can also be reinstalled, and every one can go back to its previous version.
- Every update shows what it is doing: a bar for each step (download, check the hash, install, restart, check it works), a total bar and the log line by line, while the server or Studio themselves restart in the middle of it.
- The updates are checked against the hash the release publishes, keep a copy of what they replace and put it back by themselves if the program does not work afterwards; Studio asks before it starts and offers to reload itself when it was updated.
- **The operating system:** its version, kernel and time on, the packages that can be upgraded (with the version each goes to), a button to look for updates, another to update the system with the progress apt reports, a note when a reboot is needed and a button to reboot the machine.
- The last operations are kept and listed with their result, so after a failure it is clear what ran and what happened.
- **Configuration > Console:** commands as root on the machine for the day nothing else works, one at a time, with a time limit of 30 seconds to an hour, the folder remembered from one command to the next, the output printed as it comes and a button to stop a running command.
- The console is shut twice: the maintenance helper keeps it off unless it was turned on on purpose, and Studio asks the administrator for the password again before the first command and after ten minutes without use; five wrong passwords close the door for five minutes.
- The console has the history of commands (arrow keys), quick buttons for the usual tasks (state of the services, the server's log, disk, memory, network addresses, restart the server) and says so clearly when it is off or the helper is not installed.
- Every command typed in the console, who typed it and how it ended are written in the audit trail.
- The side menu is 50 points wider and shows every name whole (it had been cut short); on a short screen its list scrolls by itself while the brand and the connection state stay in view.
- The installation file now carries the alarm design as one of its parts, with its name in the seven languages, and the list of parts to import shows it.
- All the new texts are in the seven languages, with tests that no sentence is left bare.

## [0.7.2] - Alarm designer, a menu in groups and a complete help

- **Alarm Designer:** a new menu in Design, like the electrical and network designers, for the house's alarm: panels, expanders, communicator, door and window contacts, motion, dual-technology, outdoor beam, glass-break, vibration, smoke, heat, carbon monoxide, gas and flood detectors, panic buttons, tamper switches, sirens, strobes, relay outputs, keypads, card readers, key fobs, touch panels, power supplies and batteries, joined by wired loops, radio links, the siren output, the data bus and the supply.
- The Alarm panels menu and the designer are one: a drawn panel is tied to a real panel and a drawn sensor to one of its zones, the element shows live what the panel reports, "draw what the panels have" fills the drawing from the panels (each sensor guessed from the name of its zone), and each menu opens the other.
- Checks of the drawing: sensors nobody listens to, more loops than zones in use, a panel with no siren, keypad or backup battery, wireless sensors without a battery, smoke and flood sensors that would be silent while disarmed, and what the panels have that the drawing does not.
- The side menu is reorganised in groups - Monitor, Security, Energy, House and network, Design, Administration - which can be folded (Studio remembers which); a collapsed menu and small screens always reach every screen.
- The Help is complete again: a section for the Alarm Designer and new texts for the first steps, alarms, alarm panels, recordings, services, configuration and tips, in the seven languages, in the order of the menu.
- Every question that used the browser's own confirm() (deleting a camera, a user, a device, an automation, a recording, a sensor, forgetting a node, clearing a design, switching a circuit) is now asked in the page, so a browser that blocks dialogs can no longer leave a button doing nothing.
- A new critical alarm is heard (three beeps) and shown as a browser notification when the browser allows it; the alarms already there when the console opens are not announced again.
- Evidence can be protected from the automatic pruning, and released, from the media library.
- Before the first answer of the server the console shows no nodes and no alarm, instead of an invented armed house with a node in high alert.
- A slow server no longer shows the login to a valid session at start-up (the check is repeated for fifteen seconds); the "force" box of the alarm panels is cleared after arming.
- A duplicated description in the services text is removed.
- The console asks the server which cameras are recording (every 15 seconds), so after a reload it knows.
- The node firmware screen lets a node be added by its address, for the ones the network node does not see.
- **Site designer: thirteen new objects.** A mirror, an elevator, stair lights, a radiator, a washing machine, a fridge, a desk, a plant and a rug for the inside, and, for the ARMOR equipment, a video intercom (the entrance panel), the intercom monitor of a flat (the "telefonillo"), an alarm panel and an alarm keypad; each with its icon, its 2D symbol and its 3D body.
- **Site designer: block of flats.** From a rectangular building, one button fills it with floors, a corridor with the flats on both sides, the stairs and the lift, a window for every flat, the street door with its video intercom, a monitor in every flat, the alarm panel and keypad in the hall, stair lights and mailboxes; doing it again replaces what it made, and the buildings can now be used as "block of flats".
- **Objects tied to other menus:** a video intercom to a camera of the Cameras menu, its monitor to the intercom it answers, an alarm panel or keypad to a real panel of the Alarm panels menu, and a stair light or a lamp to a device of the Devices menu; the object says what the thing it is tied to reports now and a button opens that menu. The tie is kept in the design.
- The side menu is a little wider, a name stays on one line (the whole name is in the tooltip) and, on a short screen, the list scrolls on its own while the brand and the connection state stay in view.

## [0.7.0] - Texts of the new service descriptions

- The descriptions of the services of the server in the five languages cover the new ones.

## [0.6.9] - Automations from any alarm source, and the PIN to disarm

- The trigger "when an alarm..." offers every origin the server knows (radar node, camera, device, solar equipment, electrical node, the network and an alarm panel), so "when the central sounds, switch on the lights" can be made. The alarm type of the events is the closed list of the contract.
- **Disarming asks for the PIN** (the system, and an alarm panel from its card) in a dialog of the page, with the refusals told in the seven languages (wrong PIN, locked, none set). **Configuration > Users** sets, changes and removes the PIN and the duress PIN: yours after confirming your password, anybody's for an administrator; the list says who has one. The alarm of a disarm under duress and the origin "alarm panels" have their words.
- The firmware screen updates alarm panels too, adopting a node gives it the account of its kind, and the broker accounts can be of an alarm panel.

## [0.6.8] - The installation as one file, what an inverter says about itself and merging buildings

- **The installation as one file:** *Configuration > Installation* downloads the whole installation (never a password, token or key) and imports a file, with the parts to import ticked and a report of what was applied, what was left alone and what did not check out (and which cameras need their user name and password typed in), in the seven languages; the users' page offers the new `panel` role for a wall panel's own account.
- **What an inverter says about itself** in the Inverters menu: a card with its serial number and firmware, the energy its panels have made in all and its ratings and settings (rated output, the battery's voltages and currents, the type of battery, the priority of the output source and of the charger, the input range), in the seven languages; nothing when the unit said none of it.
- **The version of each service in the Services menu:** every card carries a box under its state with the version of the program (or the firmware of a radar), taken by the server (`version` in `/api/v1/system/services`); a service whose version cannot be told shows no box. Studio publishes its own as `version.json` next to its pages for the server to read, and a test checks the box in the seven languages.
- **Site designer: move a wall.** A building's wall, or the terrain's, can be pushed in or out: each side of the selected shape has a handle in the plan, and the inspector has *Move a wall* with a step and push-out and pull-in buttons per side. The walls beside it slide along their own lines, so a rectangle stays a rectangle with its right angles and the opposite wall does not move; a slanted neighbour just pivots. Doors, windows and lamps stay where they were in the world, and a move that would cross the outline, collapse the wall or turn the shape inside out is refused.
- **Site designer: pull one side of an object.** A pool, terrace, shed or any other rectangular object that is selected has a handle in the middle of each side: dragging it moves that side and leaves the opposite one where it is (the width or the depth changes and the centre follows), in the object's own axes when it is turned, and never past the opposite side.
- **Site designer: merge buildings.** Two buildings whose walls lie along each other (drawn on the same line or side by side) can be merged from the inspector: the second one's wall is brought onto the first one's line, the shared wall is built once (by the taller building; the other leaves a gap there) and a door, window or opening cut into it - whichever building it belongs to, at its real height - works from both faces, with its frame and sill on both sides. *Separate* undoes it, and a deleted or duplicated building leaves no trace of the link. A building drawn later no longer covers the doors of an earlier one in the plan.
- **Site designer: the floor of a small building** is seen in the colour and pattern that was chosen: a chosen finish now glows a little with its own pattern, because inside a small building the walls shade the whole floor and the tone looked like dark mud.
- **Alarm panels menu** (ARMOR-NODE-ALARM nodes): one card per node with its phase and mode (guarding, leaving, entry delay, alarm), its zones (kind, closed or open or tamper, left out) and its last events; a sounding alarm and a zone in tamper reach the Alarms menu with their own sentences in seven languages. An administrator can arm (away or at home, optionally leaving out the open zones) and disarm from the card, only when the server (`ARMOR_ALARM_COMMANDS=1`), the node and the broker all allow it; a disarm asks first because it carries no PIN, and the answer of the node is shown. The node finder knows the kind `alarm`.
- **A relay of an A.R.M.O.R. node is a device you can add.** *Devices* has a new connection, **A.R.M.O.R. node**: the name is `<node>/<relay>` (for example `electrical-1/lights`) and the device listens on `armor/device/<node>/<relay>/state` and is switched through `.../set` with ON, OFF or TOGGLE, with the server's own rules (a risk that asks first, only an administrator for the critical ones). The help says what the node (*Inputs and outputs: the broker moves the relays*) and the broker (`mqtt_identity.sh electrical-relays <node> on`) must allow; in the seven languages.

## [0.6.7] - The site designer with floors, interior objects and motorised cameras; services control; energy per day, alarm levels and what the nodes send; electrical devices; one look for the whole console

- **Services menu:** an administrator sees, on the card of each program of the machine (the server, Studio, the MQTT broker, the network node, the observation and voice services), the buttons that make sense in its state: *Start*, *Stop*, *Restart*, *Pause* and *Resume*. The buttons are pictures, each in the colour of what it does (a power symbol in green to start, a red square to stop, a circular arrow in the theme's accent to restart, amber bars to pause, a green triangle to resume), with its name on hover and for screen readers. Stop, restart and pause ask for confirmation, and say so when the console itself is the one affected. A paused program is frozen where it is (it keeps its memory and answers nothing) and shows as *Paused*; the server and Studio cannot be paused, because a paused console could not be used to resume itself. The buttons need the administration agent of the machine, and the menu says when it does not answer. Field nodes are only shown.
- **A node that is silent no longer shows its last reading** (Radar > Active radar nodes, the overview and the alarm counter): its light is grey, its tracks and level read "—" instead of the last ones (a node switched off could show "3 tracks" with an orange light, another a green one), and a node that went silent while at a high level no longer counts as a high alert.
- **Each menu finds only its own kind of node** (Radar, Inverters, Batteries, Electrical): the search for nodes in the network leaves out every node the system already knows, of any kind and by id or address; tells the kind from the panel's title, then from the node's own answer (the firmware now says `kind`), then from its name ("nodo-radar-1" is a radar node); and does not offer a switched-off device whose kind it cannot tell. 306 tests.
- **"Search now" and the buttons of the node search** (every menu that has it) no longer look like grey default buttons: "Search now" is a solid button in the theme's colours with a radar picture that turns while it searches; "Open panel" has an arrow-out picture, "Adopt" and "Use" a plus and a check, all in the same style as the buttons of the Services menu.
- **One look for the whole console.** A new stylesheet (`ui-system.css`) says once what the game-menu look is, in the colours of the theme, so that menus stop looking patched together: every group of switches (view tabs, camera layouts, filters, floors, inspector tabs, configuration tabs) is the same segmented strip with a glowing active one; buttons have three kinds with one height and one type (default, solid accent for the main action, red for the dangerous one); text boxes and areas have the dark panel, the accent line and the glow of the dropdown lists (the white search box of the Alarms menu is gone); the labels of a form are plain small text in every form (some drew them as pills); empty states share one dashed frame with a white title; scroll bars, check boxes and sliders take the accent; and the small grey texts are never under 11.5 px. The old 9-16 px mix of button type and five different corner radii are now one.
- **Dropdown lists** (the many selects of every menu) look like the "Clear history" menu: a dark panel with a thin line in the theme's colour, a chevron that turns when open, and an open list drawn the same way (Chrome and Edge 135 or later; older browsers get the chevron and the colours).
- **Buttons nobody had styled** (the grey "Refresh", "Versions"...) take the theme's look, with the lowest priority so the menus that style their own buttons keep them.
- **Themes:** the frame no longer paints a dark rectangle over the background of the lighter themes, the menu buttons of the sidebar are not boxes, the active one reads white, and tiles and chips that some menus painted dark follow the theme's panel (the "Professional" theme is readable again).
- **Studio on a small screen (a 1366x768 laptop, or a bigger one at 125 % or 150 % scaling):** the layout that fits the screen and scrolls only inside its panels - the one of the 1080p screens - now applies from 900 px wide and 480 px high, where it used to need 1100x800; below that the History and other menus were squeezed into a thin bar or drawn with the large headings of a phone. A little tighter still under 1050 px wide. One build serves both: the 1080p look is unchanged and the compact one is chosen by the size of the window. The optional browser tests check that every menu fits 1366x768 and 1093x614 with no sideways scroll.
- **Site designer - cameras:** a camera is *fixed* or *motorised* (it turns). A motorised one has the total angle it turns sideways (90 to 360 degrees, 360 by default), the total it tilts up and down (30 to 180), and the angle of its lens at any moment; its coverage is drawn as the whole sweep (a full circle at 360) with the bright wedge of what the lens sees at the heading you set, in the 2D plan, the 3D view and the radar map. Both kinds also say where they are mounted (wall, ceiling, pole, ground) and how far their night vision reaches. A fixed camera still covers up to 180 degrees of lens.
- **Cameras of the site designer: lens and zoom.** Each camera now says whether its lens is fixed, varifocal (angle set by hand) or motorised (optical zoom), the optical zoom factor (1x to 60x) and the digital zoom (1x to 32x). The angle entered is the widest view; with a zoom lens the selected camera also draws a dashed narrower, longer wedge for the fully zoomed-in view. Digital zoom is recorded but changes nothing in the drawing, as it adds no detail. Saved and shared with the other apps like the rest of the camera data, in the 7 languages.
- **Site designer - the other objects:** a building says what it is used for (house, garage, workshop, shed, barn, office) and what its walls are made of; a door, a window or a garage door has its style (single, double, sliding, folding; fixed, casement, sliding, tilt-and-turn; sectional, roller, swing), whether it opens outwards and on which side it hinges, whether it has a security shutter and whether an alarm contact is fitted; a solar panel has its power and how many there are (the array adds them up); a wall lamp has its type (bulb, floodlight, spotlight, lantern), its power and whether movement switches it on; a lamp post has its power and movement sensor; a gate can be motorised. All of it is kept in the design (and on the server) in the seven languages. 312 tests.
- **Site designer: the inside of a building, in its own floating panel.** A new panel ("Interior", movable like the others and remembered) holds what is drawn inside a house: **walls** (solid, with a door, a double door, a window, a large window or an opening, with the door swing drawn on the plan), **fireplaces** (against a wall, in a corner or free-standing in the middle of the room), **stairs**, **kitchens** (straight, L-shaped or with an island), **bathroom fittings** (bath, shower, toilet, basin), **bed** (single or double), **wardrobe**, **sofa** (straight or corner), **armchair**, **dining table** with its chairs and **television** (on the wall or on a piece of furniture). Every piece works in the 2D plan and in the 3D view, can be moved, turned, resized, coloured and given a height above the ground (to put it on an upper floor), is saved with the design and has its tooltips in the 7 languages. A piece placed inside a building stands on its ground floor.
- **Floors, by level and by room (site designer).** The building's panel has a "Floor finish" list with one line per level (ground floor, floor 2...): plain concrete, parquet, laminate, ceramic tile, marble, natural stone, terrazzo, vinyl, carpet or micro-cement, each in its usual colour or one of your own. Rooms with a floor of their own are drawn with the new "Floor of a room" tool of the Interior panel (a rectangle you move, turn, resize, name and give a finish), on the level chosen in the floor bar. In the 3D view the finishes are painted at the real size of the planks, tiles and slabs; in the plan they are patterns. Objects of the inside are put on the level chosen in the floor bar, are dimmed in the plan when another level is chosen and are hidden in the 3D view above the level shown. Saved with the design (7 languages).
- **Changing the floor of a level shows that level.** Choosing a finish or a colour for a level of a building puts the floor bar on that level, so the change is seen at once: with the roof off and all the levels shown, you look at the top floor, which covers the ones below.
- **A roof button in the floor bar** of the site designer (the bar with All, G, 1...), in the 2D plan and in the 3D view: it takes the roofs off to see the floors from above and puts them back, lit while they are off.
- **Position in X and Y for every object of the site designer.** A building now has X and Y (its centre; moving them moves the whole building and what stands on its roof) next to its ground elevation; a camera and a radar have X and Y in metres (they were only placed by dragging) next to their mounting height. The other objects already had X, Y and elevation, and the doors, windows and wall lamps are placed along their wall with their own height.
- **A camera's design properties no longer go back to what they were.** Reading the camera list from the server again (at start and every minute) kept only the facing, tilt, height, field of view and range of each camera, so its type (motorised, 270 degrees of pan...), mounting, lens, zoom and night reach were lost a moment after being set. All of them are kept now. The side panel of the site designer is also wider (it grows with the screen) and its fields can no longer run past its right edge.
- **Earlier versions of a design can be deleted** (Versions window of the site, electrical and network designers): each version has a Delete button (it asks to be pressed twice) and, when there are several, "Delete all versions" empties the list, so old copies nobody needs do not pile up. The current design is never touched. Needs ARMOR-SERVER with the new delete routes.
- **Energy: charts that reach back a month, energy per day, and the electrical history.** The history charts of the inverters and batteries now offer 7 and 30 days next to 1, 6 and 24 hours (the server keeps five-minute averages for a month and remembers them across restarts), with date marks on the axis. The inverter and battery menus show the **energy of each day** as bars (what the panels made and the load used; what the battery took and gave). The Electrical menu now has, on each node, **the history of every channel** (power, voltage and current). Needs ARMOR-SERVER with the history and energy routes.
- **The battery menu shows what a battery management system adds** (its own power reading, the cells being balanced, a protection active and the MOSFET status codes) and the inverter menu shows the DC bus voltage, when the node sends them.
- **The levels of the energy alarms can be changed** (a card at the end of the Inverters and Batteries menus): the charge that is low and the one that is enough again, the spread of the cells, too hot and too cold to charge for a battery, how worn it is and how hot an inverter's heat sink may get. Five new alarms (unbalanced cells, battery too hot, charging while too cold, worn battery, hot inverter), in the seven languages. Needs ARMOR-SERVER with the alarm levels.
- **System menu: "What the nodes send".** For every topic the server received from the nodes: messages taken, refused, the fields of a newer firmware it ignores, and the last refusal with the start of what was sent, to see at once why a node does not show up in its menu.
- **The Electrical menu shows the devices of the house**: Zigbee (and other) plugs, breakers, lights and meters with their power, voltage, current and energy, whether they are on, and buttons to switch them, next to the channels of the nodes' meters. New kinds of device *Smart breaker* and *Energy meter* (Zigbee2MQTT preset included: state, power, voltage, current and energy). Each switchable device has a **risk** (a click, a circuit of the board that asks first, or a critical circuit that asks first and only an administrator may switch), asked on screen and enforced by the server. Needs ARMOR-SERVER with the electrical devices.
- **The Electrical menu has an animated logo again**, like the other menus: a bolt that glows inside a ring, with the current running along the wires on its sides (it stops when the system asks for reduced motion). It was a fixed glyph.
- **The Network, Radar and Cameras menus open their designer**, with the same card as the Electrical menu (what the menu shows, what the designer is for, and a button): *Open the Network Designer* in the Network menu and *Open the Site Designer* in the Radar and Cameras menus, in the seven languages.

## [0.6.6] - A wider Help window, and Studio in a real browser

- **The Help window is twice as wide** (980 px instead of 480 px, or the width of the screen if that is smaller). Its width had never applied: the generic dialog rule (480 px) was loaded after it and won, so the Help window was as narrow as the About window; the rule now names both classes.
- **Browser tests, optional** (`e2e/`, Playwright): a script that opens Studio in the Edge that Windows already has, checks the login screen and, given an administrator's name and password, opens every menu of the sidebar and fails on any script error. It is run by hand against a running Studio and is not part of the CI; see `e2e/README.md`.

## [0.6.5] - The alarm of a camera that saw movement

- The new alarm `camera_motion` (from the observation service) has its phrase in the seven languages.

## [0.6.4] - Configuration > Notifications

- A new tab, in the seven languages: which places the alarms are sent to (the signed webhook, MQTT, Telegram, Home Assistant) are set up, the language of the sentences, a **test** button for each and for all of them that says what each answered, and the steps to create the Telegram bot and the Home Assistant webhook with the keys of `armor.env` to fill in.

## [0.6.3] - Node firmware: a progress bar and what is happening at every step, in two balanced columns

- **Progress:** a bar for the whole job and one for every node, which move while the image is sent and while the node restarts, and under each node a sentence that says what is happening at that moment (*Sending the firmware to the node: 512 of 1024 KB (50%)*, *Waiting for it to answer again with version 0.5.4... 7 s*, ...), in the seven languages. Before the nodes, the screen says whether it is downloading the release from GitHub or getting your file ready.
- **What will happen:** the five steps of an update are explained next to the start button.
- **Layout:** the screen had its sections thrown into the two columns of the camera forms and came out lopsided. Now the nodes are on the left; the firmware, the access and the start are on the right; and the progress goes under both (one column on a narrow window).

## [0.6.2] - Node firmware, from Studio

- **Configuration > Node firmware (administrators):** choose a type of node (radar, solar, electrical, touch panel), tick the nodes found on the network (a button ticks all of that type, and another asks each for its version), type the login of the nodes' own panel (used for the update only, never kept), choose the source - the newest release on GitHub (checked against the hash it publishes) or a `.bin` file of this computer - and update them one after another. Each node shows where it is (signing in, sending the image, restarting, updated) and its version before and after, or why it failed. It confirms first, in the seven languages, with hover hints and a paragraph in the help.

## [0.6.1] - Help, hints on everything, administration and live video that reconnects

- **Alarms:** what somebody has acknowledged leaves the list and stays in the Record below, whether its cause has ended or not (the whole story stays in History); if it is deleted while the cause goes on, it does not come back until the cause happens again.
- **Hints on everything:** pausing the pointer over a button, field or menu entry shows a short explanation, in the language of the interface; a new screen needs only a row in the catalogue.
- **Help:** a new button next to *About* opens a window that explains every menu in detail (a list of sections and the chosen one), in all seven languages, and opens on the section of the screen you are in.
- **Configuration > Services, MQTT broker and Settings files (administrators):** see the A.R.M.O.R. services and start, stop or restart them; give each node, device or consumer its own broker account (any number, any kind; the password is shown once) and edit the broker's settings and permissions; read and change every settings file of the system, with secrets hidden and a copy of the old file kept. They need the admin agent (`install_cm5.sh --with-admin`); without it they say so.
- **Adopt a node:** in the list of nodes found on the network, *Add to the system* makes the node's broker account and writes it into the node with the login of its own panel (used once, never kept), so it starts reporting by itself; if the panel cannot be written to, the account is shown to type in by hand.
- **Camera video:** the full-screen picture now asks for its address the same way the tiles do (it did not, and could fail where the tiles worked); a picture whose stream stops asks for a new address by itself, 1.5 s later, then 3, 6, up to 15 s; the camera form has a field for the lighter stream used for the live picture.

## [0.6.0] - Language and the weather place now follow the account, not the browser

- **Language, theme and the saved weather place were only in this browser's own storage:** signing in from a different address (another network, a new fixed IP after moving the server) looked like every one of them had been reset, because a browser keeps that storage separate for every address it visits. They are now also kept server-side (`GET`/`PUT /api/v1/preferences`, ARMOR-SERVER 0.4.1), tied to the account; the browser's own copy stays as the first paint and the offline fallback, but the server's value wins once it answers.
- **The sidebar's bottom was invisible below 1080 px of screen height:** `.studio-shell` fixes its height to the window and hides overflow, and the sidebar had no scroll of its own - on a shorter screen (a 768p laptop), whatever did not fit above the fold was simply unreachable. It now scrolls on its own under 1080 px.

## [0.5.9] - Dead Portuguese removed, a plainer "offline"

- **"Offline demonstration" was never seen by anyone who reads Portuguese:** `src/i18n.ts` built a complete `pt` catalogue (every phrase, kept current through every feature added since) but never listed Portuguese as a selectable language and never merged the other screens' text into it - it could not be picked, and once picked by code it would have been missing most of the interface anyway. Removed rather than finished, to stop it quietly growing with every new feature for no reader.
- **"Offline demonstration" simplified to "Offline"** (and its translations) across all eight languages: the longer phrasing read oddly once the demo mode became an ordinary disconnected state rather than a guided tour.

## [0.5.8] - The node finder only shows the kind you are looking for

- **Find nodes on the network:** it read a candidate's own panel title ("A.R.M.O.R. radar", "...solar", "...electrical") and now uses it - the Radar menu no longer lists a solar or electrical node found on the network, and the same the other way round. A node whose panel has not answered yet is still shown (it might be the kind you want), only a node that clearly says a different kind is left out.
- Needs the node's own firmware to say its kind in its panel's title (ARMOR-NODE-RADAR 0.3.6, ARMOR-NODE-SOLAR 0.1.4, ARMOR-NODE-ELECTRICAL 0.1.0 or later); against an older node, nothing changes.
- 1 new test.

## [0.5.7] - The Electrical menu, a menu for each branch of the plan, and gutters

- **Electrical** (Energy group, beside Inverters and Batteries): what the ARMOR-NODE-ELECTRICAL nodes measure, live - the grid's power and energy, the nodes reporting, the alarms, and one card per node with its channels (voltage, current, power, energy, frequency, power factor, line closed or open) and its transfer switches as their contacts show them. Each node says whether the Electrical Designer already draws it, with a button to open the designer. Read only. The node finder of the other menus is here too.
- **Site Designer:** the things of ARMOR (camera, radar sensor, device) have their own floating menu, in the 2D plan and in the 3D view, and the first menu keeps the construction, the vegetation and the like. More branches can have their own menu in the same way.
- **Roof gutters and downpipes:** two new objects for roofs. A gutter lies along the nearest eave and a downpipe runs down the wall from it to the ground; length, colour and turn are in the properties. Keys `-` and `=`.
- Texts in the seven languages; 6 new tests.

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

- **A new menu, Electrical Designer** (under Design), with the idea of the Site Designer for the house's electrical network: a diagram editor with **36 kinds of element** in eight coloured groups (grid supply, PV array, generator; battery bank; hybrid inverter, MPPT controller, charger, DC-DC converter; circuit breaker, DC breaker, residual-current device, DC fuse, surge protector, isolator; contactor, relay module, electronic breaker with remote control, solar surplus diverter, source transfer switch; AC and DC busbars and junctions; energy meters and the ARMOR-NODE-ELECTRICAL node and the automation controller (PLC); loads: lighting, smart socket, electric water heater, EV charger, air conditioning, DC load), ports of three kinds (AC amber, DC rose, signal cyan), right-angle wires with their section and length, panel frames, undo and redo, zoom and pan, drag from the palette, and export and import as JSON and SVG.
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

- In the Radar menu, *Radar nodes*, each node that has said where its web panel is shows a **Panel** link (the node's address, opened in a new tab) and the firmware it runs. The link is a private address: it opens from a computer on the node's network. The node's panel is described in ARMOR-NODE-RADAR.
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
