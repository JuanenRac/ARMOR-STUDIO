# Studio in a real browser

Browser tests for ARMOR-STUDIO with Playwright, in two ways.

## In the CI (its own workflow, `.github/workflows/e2e.yml`)

`ci_stack.py` starts everything the tests need on one machine and tears it down afterwards:

* ARMOR-SERVER, from the sibling checkout, with a throw-away data folder and an administrator made for the run;
* the nginx of the container image, rendered from `nginx/default.conf.template` and `nginx/security_headers.conf` (only the address it listens on, the folder of the page and the path of
  the headers file change; the script stops if the template no longer has those lines), in front of the server;
* Playwright with Chromium, running `tests/*.e2e.ts`: the headers of the page, of `/assets/` and of the fallback to the page, `/healthz`, `/armor-config.json`, the proxy to the server
  (the address and the protocol the server is told), the login, the live channel of the status, the saving of the design of the site and the walk through every menu.

```sh
npm ci && npm run build                    # Studio, in the folder above
(cd ../ARMOR-SERVER && npm ci && npm run build)
(cd e2e && npm ci && npx playwright install chromium)
python e2e/ci_stack.py                     # needs nginx; NGINX_BIN and NGINX_MIME_TYPES say where it is when it is not on the PATH
python e2e/ci_stack.py -- --grep proxy     # what follows -- goes to `playwright test`
```

To turn it off without touching the code, set the repository variable `ARMOR_STUDIO_E2E` to `off`, or disable the workflow in the Actions tab.

## By hand, against a Studio that is already running

```powershell
cd e2e
npm install
# the tests use the Edge of Windows: no browser download is needed
$env:ARMOR_STUDIO_URL = "http://192.168.0.180:18081"
$env:ARMOR_STUDIO_USER = "admin"
$env:ARMOR_STUDIO_PASSWORD = "<the password>"   # typed in the console, never saved in a file
npm test
```

Without the user and password only the login screen is tested. With them, every menu of the sidebar is opened and the page must report no script error. The tests of the proxy run only
when `ARMOR_E2E_NGINX=1` (the CI sets it); `ARMOR_E2E_CHANNEL` chooses the browser (`msedge` by default, `chromium` for the one `npm run install-browser` downloads).
