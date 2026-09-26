# Studio security model

The browser client must never contain credentials, broker passwords or camera
tokens. A future server API supplies short-lived authenticated sessions over TLS.
The initial canvas is deliberately offline-only.
