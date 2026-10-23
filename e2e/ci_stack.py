#!/usr/bin/env python3
"""Studio as it is deployed, in a real browser: the nginx of the container image in front of a real ARMOR-SERVER, and the Playwright tests of this folder against them.

Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.

What it starts, all on 127.0.0.1 and in a folder of its own that is deleted at the end:
  * ARMOR-SERVER (`node dist/server.mjs` of the sibling checkout, built beforehand) with a throw-away data folder and an administrator made for the run;
  * nginx with the template of the image (nginx/default.conf.template) and the same security headers file. Only what a machine without a container needs is changed in the template:
    the address it listens on, the folder of the page and the path of the headers file, and this script stops if one of those lines is not where it expects it;
  * Playwright, with the tests of tests/*.e2e.ts.

    python e2e/ci_stack.py                 # needs: Studio built (npm run build), ARMOR-SERVER built, nginx, the e2e dependencies installed
    python e2e/ci_stack.py -- --grep proxy # what comes after -- goes to playwright test

Environment (all optional): NGINX_BIN, NGINX_MIME_TYPES, ARMOR_SERVER_DIR (default ../ARMOR-SERVER), ARMOR_E2E_CHANNEL (default chromium), NODE_BIN.
"""
from __future__ import annotations

import os
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

STUDIO = Path(__file__).resolve().parents[1]
SERVER = Path(os.environ.get("ARMOR_SERVER_DIR", STUDIO.parent / "ARMOR-SERVER"))
USER = "admin"


def free_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def find(name: str, *candidates: str) -> str:
    chosen = os.environ.get(name.upper() + "_BIN") or next((shutil.which(c) for c in (name, *candidates) if shutil.which(c)), None)
    if not chosen:
        raise SystemExit(f"{name} was not found: install it or set {name.upper()}_BIN")
    return chosen


def wait_for(url: str, what: str, seconds: float = 60) -> None:
    end = time.time() + seconds
    while time.time() < end:
        try:
            urllib.request.urlopen(url, timeout=3).close()
            return
        except urllib.error.HTTPError:
            return   # any answer, even a refusal, is the service being up
        except OSError:
            time.sleep(0.5)
    raise SystemExit(f"{what} did not answer at {url} within {seconds:.0f} s")


def render_template(web_port: int, upstream: str, page_root: Path, headers_file: Path) -> str:
    text = (STUDIO / "nginx" / "default.conf.template").read_text(encoding="utf-8").replace("\r\n", "\n")
    changes = [
        ("listen 80;", f"listen 127.0.0.1:{web_port};"),
        ("root /usr/share/nginx/html;", f"root {page_root.as_posix()};"),
        ("include /etc/nginx/snippets/security_headers.conf;", f"include {headers_file.as_posix()};"),
        ("${ARMOR_PUBLIC_ORIGIN}", "same-origin"),
        ("${ARMOR_SERVER_UPSTREAM}", upstream),
    ]
    for old, new in changes:
        if old not in text:
            raise SystemExit(f"the template of nginx no longer has `{old}`: this script has to follow it")
        text = text.replace(old, new)
    if "${" in text:
        raise SystemExit("the template still has a variable that was not given a value: ${" + text.split("${", 1)[1][:30])
    return text


def main(playwright_args: list[str]) -> int:

    node = find("node")
    npx = find("npx")
    nginx = find("nginx")
    dist = STUDIO / "dist"
    if not (dist / "index.html").is_file():
        raise SystemExit("Studio is not built: run `npm run build` first")
    if not (SERVER / "dist" / "server.mjs").is_file():
        raise SystemExit(f"{SERVER} is not built: run `npm ci && npm run build` there first")
    mime = os.environ.get("NGINX_MIME_TYPES") or next((str(p) for p in (Path(nginx).parent / "conf" / "mime.types", Path("/etc/nginx/mime.types")) if p.is_file()), "")
    if not mime:
        raise SystemExit("mime.types of nginx was not found: set NGINX_MIME_TYPES")

    work = Path(tempfile.mkdtemp(prefix="armor-e2e-"))
    server_port, web_port = free_port(), free_port()
    password = secrets.token_urlsafe(18)
    processes: list[subprocess.Popen] = []
    nginx_prefix = work / "nginx"
    try:
        # ---- the server
        data = work / "data"
        data.mkdir()
        server_env = {
            **os.environ,
            "ARMOR_HOST": "127.0.0.1", "ARMOR_PORT": str(server_port), "ARMOR_DATA_DIR": str(data), "ARMOR_TZ": "UTC",
            "ARMOR_INGEST_TOKEN": secrets.token_urlsafe(32), "ARMOR_CONTROL_TOKEN": secrets.token_urlsafe(32), "ARMOR_OPERATOR_TOKEN": secrets.token_urlsafe(32),
            "ARMOR_STUDIO_USERNAME": USER, "ARMOR_STUDIO_PASSWORD": password,
            "ARMOR_TRUST_PROXY": "loopback", "ARMOR_STUDIO_ORIGIN": f"http://127.0.0.1:{web_port}",
        }
        server_log = (work / "server.log").open("w")
        processes.append(subprocess.Popen([node, "dist/server.mjs"], cwd=SERVER, env=server_env, stdout=server_log, stderr=subprocess.STDOUT))
        wait_for(f"http://127.0.0.1:{server_port}/api/v1/studio/session", "ARMOR-SERVER")

        # ---- nginx, with the template of the image
        for folder in ("logs", "temp"):
            (nginx_prefix / folder).mkdir(parents=True)
        headers = nginx_prefix / "security_headers.conf"
        headers.write_text((STUDIO / "nginx" / "security_headers.conf").read_text(encoding="utf-8"), encoding="utf-8")
        (nginx_prefix / "site.conf").write_text(render_template(web_port, f"127.0.0.1:{server_port}", dist, headers), encoding="utf-8")
        (nginx_prefix / "nginx.conf").write_text(
            "worker_processes 1;\nerror_log logs/error.log warn;\npid logs/nginx.pid;\nevents { worker_connections 256; }\n"
            f"http {{\n  include {Path(mime).as_posix()};\n  default_type application/octet-stream;\n  access_log logs/access.log;\n"
            "  client_body_temp_path temp/body; proxy_temp_path temp/proxy; fastcgi_temp_path temp/fastcgi; uwsgi_temp_path temp/uwsgi; scgi_temp_path temp/scgi;\n"
            "  include site.conf;\n}\n", encoding="utf-8")
        test = subprocess.run([nginx, "-t", "-p", str(nginx_prefix), "-e", "logs/error.log", "-c", "nginx.conf"], capture_output=True, text=True)
        if test.returncode != 0:
            raise SystemExit("nginx does not accept the rendered template:\n" + test.stdout + test.stderr)
        processes.append(subprocess.Popen([nginx, "-p", str(nginx_prefix), "-e", "logs/error.log", "-c", "nginx.conf"], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT))
        wait_for(f"http://127.0.0.1:{web_port}/healthz", "nginx")

        # ---- the browser
        env = {**os.environ, "CI": os.environ.get("CI", "1"), "ARMOR_STUDIO_URL": f"http://127.0.0.1:{web_port}", "ARMOR_STUDIO_USER": USER, "ARMOR_STUDIO_PASSWORD": password,
               "ARMOR_E2E_NGINX": "1", "ARMOR_E2E_CHANNEL": os.environ.get("ARMOR_E2E_CHANNEL", "chromium")}
        result = subprocess.run([npx, "playwright", "test", *playwright_args], cwd=STUDIO / "e2e", env=env)
        if result.returncode != 0:
            print("--- server log (last lines) ---", file=sys.stderr)
            server_log.flush()
            print("\n".join((work / "server.log").read_text(errors="replace").splitlines()[-30:]), file=sys.stderr)
            error_log = nginx_prefix / "logs" / "error.log"
            if error_log.is_file():
                print("--- nginx error log (last lines) ---", file=sys.stderr)
                print("\n".join(error_log.read_text(errors="replace").splitlines()[-20:]), file=sys.stderr)
        return result.returncode
    finally:
        if (nginx_prefix / "nginx.conf").is_file():
            subprocess.run([nginx, "-s", "stop", "-p", str(nginx_prefix), "-e", "logs/error.log", "-c", "nginx.conf"], capture_output=True)
        for process in processes:
            process.terminate()
        for process in processes:
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    # `python ci_stack.py -- --grep x`: everything after -- is for playwright
    raise SystemExit(main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []))
