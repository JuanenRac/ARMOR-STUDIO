# Studio security model

Studio is a browser console for ARMOR-SERVER. This is what it holds, what it sends and what it trusts.

## Sign-in and session

* A person signs in with a user name and a password. The server answers with an **HttpOnly, SameSite=Strict** cookie; the page cannot read it and no token is ever put in a URL or in storage. The password is sent once and is not kept.
* The session lasts 7 days by default (`ARMOR_STUDIO_SESSION_TTL_MS` on the server). Studio asks the server every minute whether it is still open, and signing out closes it on the server that opened it.
* Roles: **admin**, **operator**, **viewer** (looks, cannot act) and **panel** (the account of a wall panel; it cannot use Studio and is told so). The server decides every action; Studio only hides or disables what the role cannot do.
* Camera video and recordings are shown through addresses the server issues to a signed-in operator, and renewed when they lapse.

## What the browser keeps

* Per server: a copy of the site, electrical, network and alarm drawings (so they are there when the server is not, and an edit made while the connection was down is sent when it returns), the names and addresses of the cameras, and the preferences. Nothing from one server is offered to another.
* Never: a password, a token, a session, a camera or RTSP credential. A snapshot address that carries a login (`user:password@` or `?pwd=`) is refused.
* Signing out empties what the menus hold in memory: the output of the console, the state of a firmware job.
* Everything read back from storage is parsed value by value; an invalid shape is dropped.

## What the page may load

* The static host and the container's nginx send the same headers on every file: `Content-Security-Policy` (own origin, the configured server, and the weather services), `frame-ancestors 'none'`, `nosniff`, `no-referrer`, `Cross-Origin-Opener-Policy: same-origin` and a restrictive `Permissions-Policy`.
* The only third parties are the services of the Weather menu (Open-Meteo, RainViewer, EUMETSAT, ArcGIS); they are asked only when the account has a place saved.

## In the container

The browser talks only to Studio's own origin; nginx proxies `/api/` to the server and passes the real address of the client (`X-Forwarded-For`), the protocol the person used (`X-Forwarded-Proto`: the one a proxy in front already announced, else the scheme of the connection) and the host with its port, so the server's sign-in limits and audit trail see the person and not the proxy. The server must trust that proxy (`ARMOR_TRUST_PROXY`).

## Orders to the nodes

The health card can restart, pause, put in standby, identify, read and put in maintenance one node or all of them. It is shown to administrators only, and the server checks the role again. Restart, pause and standby need the name of the node (or a word for all of them) typed, and every order needs a recent proof of identity: when the server asks for one, Studio asks you to sign in again before repeating the order. Nothing in the console erases a node, resets it to factory settings or powers it off, and the server and the CM5 cannot be reached this way.

## What the person may do, and the security options of the server

The session answer carries `capabilities`: what the person may do (arm, disarm, acknowledge, operate, camera control, administer, users, security options) and the parts the server offers. Studio shows, hides and disables from that one answer (`src/capabilities.ts`); the server checks the role again on every route, so hiding is a convenience and never the protection. A server that sends no `capabilities` is an older one: the role decides as it always did, and anything that needs a route only the new server has is not offered.

An administrator of a server that offers them sees, in Configuration > Security, seventeen options (four more on a server that has the arming modes, see below), among them the PIN to disarm or silence a siren, what the voice assistant asks before silencing the alarm, whether an alarm panel ties its saved armed state to its zones and PIN, whether the server tells the panels their Zigbee zones and signs those messages, and whether FFmpeg reads the cameras through a local tunnel, and also the logins of the local network, the alert of a sign-in from a new country, whether an electrical channel whose meter stopped answering is set aside, the live events of the wall panel, the lock of a device, the encryption of the storage of the nodes and the limits of the voice audio. Each one starts the way the server always behaved; an option the server's environment fixes is shown and cannot be changed here; choosing a lower one shows a warning and asks first, and the server writes the change in its audit trail.

The button of every node in the lists (radar, inverters, batteries, electrical and wall screens) opens a dialog for the sign-in limit of that node (`system.login_limit_per_minute`, wrong passwords per minute, 0 to 120). It is for administrators; the dialog asks for the login of the node's own panel, sends it once to the server (`POST /api/v1/admin/nodes/settings`) and never keeps it in the browser or in the audit trail. A channel of an electrical node whose meter stopped answering is greyed out and marked `no data` unless the option above is turned off.

## The arming modes of the server

A server that has them offers four more options in Configuration > Security, all off or in their careful state by default: `alarm.arming_modes` (the modes Home and Night besides Away; off, Studio arms and disarms exactly as it always did), `alarm.mode_downgrade_pin` (`required`: going to a mode that defends less than the one in force asks for the PIN of the person, with its lockout and its duress PIN, like a disarm), `alarm.mode_schedule` (the server changes the mode by itself at the times of the timetable; it never disarms and never arms a mode with nothing assigned) and `alarm.mode_schedule_lowers` (off: the timetable skips a change that defends less). Changing `alarm.mode_downgrade_pin` to `not_required` or `alarm.mode_schedule_lowers` to on lowers the security, so Studio shows the warning and asks first, like the other options that lower it.

Studio never decides what a mode defends: the dialog that arms asks the server, which answers `no_zones_assigned` for a mode that defends nothing (Studio asks the person to confirm and sends `confirm_unassigned`) and a PIN error when the change defends less (Studio then asks for the PIN). Home and Night start with nothing assigned. The assignment is made in the Modes tab of the Alarm Designer by an administrator: whole zones (the places of the devices), single sensors, radar nodes and cameras; saving replaces the whole document with the revision that was read, and editing arms nothing. The preflight check before arming is shown when arming from disarmed, as for a plain arm. A wall panel or a node display still shows only armed or disarmed.

