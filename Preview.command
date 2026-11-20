#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
node src/build.mjs || exit 1

python3 - <<'PY'
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Timer
import webbrowser

handler = partial(SimpleHTTPRequestHandler, directory="dist")
with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
    url = f"http://127.0.0.1:{server.server_port}/"
    print(f"Portfolio preview running at {url}", flush=True)
    print("Press Control-C or close this window to stop the preview.", flush=True)
    Timer(0.3, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
PY
