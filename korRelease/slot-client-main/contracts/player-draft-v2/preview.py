"""Read-only synthetic contract examples on loopback. No session or spin execution."""
import argparse
import hashlib
import json
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def assets(root):
    root = Path(root).resolve()
    manifest = json.loads((root / 'examples/FILES.json').read_text())
    result = {}
    for name, expected in manifest.items():
        if not re.fullmatch(r'catalog\.json|cases/[a-z0-9-]+\.json', name):
            raise ValueError('Example allowlist path rejected')
        path = root / 'examples' / name
        if path.is_symlink() or path.resolve().parent not in {root/'examples', root/'examples/cases'}:
            raise ValueError('Unsafe example path')
        raw = path.read_bytes()
        if len(raw) > 2*1024*1024 or hashlib.sha256(raw).hexdigest() != expected:
            raise ValueError('Example hash/size mismatch')
        result['/' + name] = raw
    if json.loads(result['/catalog.json'])['profile'] != 'synthetic-contract':
        raise ValueError('Synthetic examples only')
    result['/'] = b'{"profile":"synthetic-contract","readOnly":true,"catalog":"/catalog.json"}'
    return result


class Server(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 8

    def __init__(self, address, root):
        if address[0] != '127.0.0.1':
            raise ValueError('Loopback only')
        self.assets = assets(root)
        self.slots = threading.BoundedSemaphore(8)
        super().__init__(address, Handler)

    def process_request(self, request, client_address):
        if not self.slots.acquire(blocking=False):
            self.shutdown_request(request); return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self.slots.release(); raise

    def process_request_thread(self, request, client_address):
        try: super().process_request_thread(request, client_address)
        finally: self.slots.release()


class Handler(BaseHTTPRequestHandler):
    timeout = 3
    def log_message(self, *args): pass
    def do_GET(self):
        host = f'127.0.0.1:{self.server.server_port}'
        status = 200
        if len(self.headers.get_all('Host', [])) != 1 or self.headers.get('Host') != host:
            status = 403
        elif len(self.headers.get_all('Origin', [])) > 1 or self.headers.get('Origin') not in {None, 'http://'+host} or self.headers.get('Sec-Fetch-Site') == 'cross-site':
            status = 403
        elif self.path not in self.server.assets:
            status = 404
        raw = self.server.assets[self.path] if status == 200 else b'{"error":"EXAMPLE_NOT_AVAILABLE"}'
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
        self.end_headers(); self.wfile.write(raw)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', choices=['synthetic-contract'], required=True)
    parser.add_argument('--port', type=int, default=49331)
    args = parser.parse_args()
    with Server(('127.0.0.1', args.port), Path(__file__).resolve().parent) as server:
        print(json.dumps({'readOnly':True, 'url':f'http://127.0.0.1:{server.server_port}/catalog.json'}), flush=True)
        try: server.serve_forever()
        except KeyboardInterrupt: pass
