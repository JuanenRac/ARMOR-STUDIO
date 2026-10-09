# Studio in a real browser (optional)

Browser tests for ARMOR-STUDIO with Playwright. They are not part of the CI: they need a running Studio and server, and a browser download.

```powershell
cd e2e
npm install
# the tests use the Edge of Windows: no browser download is needed
$env:ARMOR_STUDIO_URL = "http://192.168.0.180:18081"
$env:ARMOR_STUDIO_USER = "admin"
$env:ARMOR_STUDIO_PASSWORD = "<the password>"   # typed in the console, never saved in a file
npm test
```

Without the user and password only the login screen is tested. With them, every menu of the sidebar is opened and the page must report no script error.
