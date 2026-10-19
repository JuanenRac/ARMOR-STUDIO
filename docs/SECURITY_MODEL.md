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
