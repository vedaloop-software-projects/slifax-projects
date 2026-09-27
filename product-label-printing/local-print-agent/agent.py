"""Loopback-only Windows RAW spooler bridge. Python 3.10+, no pip packages."""
import argparse
import base64
import ctypes as C
from ctypes import wintypes as W
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import threading
from urllib.parse import urlsplit

PORT = 17846
MAX_BODY = 6 * 1024 * 1024


class WindowsSpooler:
    def __init__(self):
        self.dll = C.WinDLL('winspool.drv', use_last_error=True)
        signatures = {
            'OpenPrinterW': ([W.LPWSTR, C.POINTER(W.HANDLE), C.c_void_p], W.BOOL),
            'ClosePrinter': ([W.HANDLE], W.BOOL),
            'StartDocPrinterW': ([W.HANDLE, W.DWORD, C.c_void_p], W.DWORD),
            'StartPagePrinter': ([W.HANDLE], W.BOOL),
            'WritePrinter': ([W.HANDLE, C.c_void_p, W.DWORD, C.POINTER(W.DWORD)], W.BOOL),
            'EndPagePrinter': ([W.HANDLE], W.BOOL),
            'EndDocPrinter': ([W.HANDLE], W.BOOL),
            'AbortPrinter': ([W.HANDLE], W.BOOL),
            'EnumPrintersW': ([W.DWORD, W.LPWSTR, W.DWORD, C.c_void_p, W.DWORD,
                               C.POINTER(W.DWORD), C.POINTER(W.DWORD)], W.BOOL),
        }
        for name, (args, result) in signatures.items():
            fn = getattr(self.dll, name)
            fn.argtypes, fn.restype = args, result

    @staticmethod
    def check(result):
        if not result:
            raise C.WinError(C.get_last_error())
        return result

    def printers(self):
        class Info(C.Structure):
            _fields_ = [('name', W.LPWSTR), ('server', W.LPWSTR), ('attributes', W.DWORD)]
        needed, count = W.DWORD(), W.DWORD()
        self.dll.EnumPrintersW(6, None, 4, None, 0, C.byref(needed), C.byref(count))
        if not needed.value:
            if C.get_last_error() not in (0, 122):
                raise C.WinError(C.get_last_error())
            return []
        buf = C.create_string_buffer(needed.value)
        self.check(self.dll.EnumPrintersW(6, None, 4, buf, len(buf), C.byref(needed), C.byref(count)))
        rows = C.cast(buf, C.POINTER(Info))
        return [rows[i].name for i in range(count.value)]

    def send(self, printer, data, title):
        class Doc(C.Structure):
            _fields_ = [('name', W.LPWSTR), ('output', W.LPWSTR), ('datatype', W.LPWSTR)]
        handle = W.HANDLE()
        self.check(self.dll.OpenPrinterW(printer, C.byref(handle), None))
        started = False
        try:
            doc = Doc(title, None, 'RAW')
            job_id = self.check(self.dll.StartDocPrinterW(handle, 1, C.byref(doc)))
            started = True
            self.check(self.dll.StartPagePrinter(handle))
            buf = C.create_string_buffer(data)
            offset = 0
            while offset < len(data):
                written = W.DWORD()
                self.check(self.dll.WritePrinter(handle, C.byref(buf, offset), len(data) - offset, C.byref(written)))
                if written.value == 0:
                    raise OSError('Windows accepted zero bytes')
                offset += written.value
            self.check(self.dll.EndPagePrinter(handle))
            self.check(self.dll.EndDocPrinter(handle))
            started = False
            return job_id
        finally:
            if started:
                self.dll.AbortPrinter(handle)
            self.dll.ClosePrinter(handle)


class Bridge:
    def __init__(self, config, spooler, database, config_path=None):
        self._config, self.spooler = config, spooler
        self.config_path, self._config_mtime = config_path, None
        if config_path:
            self._config_mtime = config_path.stat().st_mtime_ns
        self.lock = threading.Lock()
        self.db = sqlite3.connect(database, check_same_thread=False)
        self.db.execute('CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, digest TEXT, result TEXT)')
        self.db.commit()

    @property
    def config(self):
        # Setup may pair a new website while this agent is already running;
        # pick that up without requiring a Windows sign-out.
        if self.config_path:
            try:
                mtime = self.config_path.stat().st_mtime_ns
                if mtime != self._config_mtime:
                    self._config = json.loads(self.config_path.read_text(encoding='utf-8'))
                    self._config_mtime = mtime
            except (OSError, ValueError):
                pass  # Keep the last good config if the file is mid-write or unreadable.
        return self._config

    def submit(self, body):
        request_id, printer = body.get('id'), body.get('printer')
        if not isinstance(request_id, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{8,100}', request_id):
            raise ValueError('Invalid job id')
        if not isinstance(printer, str) or not printer or len(printer) > 256:
            raise ValueError('Select a Windows printer')
        try:
            data = base64.b64decode(body.get('data', ''), validate=True)
        except (ValueError, TypeError) as exc:
            raise ValueError('Invalid PRN bytes') from exc
        if not data or len(data) > 4 * 1024 * 1024:
            raise ValueError('PRN must be between 1 byte and 4 MB')
        digest = hashlib.sha256(printer.encode() + b'\0' + data).hexdigest()
        # Persist before handing bytes to Windows. A lost response/restart must never
        # blindly replay a possibly printed job. Reusing an ID is read-only.
        with self.lock:
            row = self.db.execute('SELECT digest, result FROM jobs WHERE id=?', (request_id,)).fetchone()
            if row:
                if row[0] != digest:
                    raise ValueError('Job id already belongs to a different payload')
                return json.loads(row[1])
            if printer not in self.spooler.printers():
                raise ValueError('Printer is not installed on this Windows account. Refresh the printer list.')
            result = {'id': request_id, 'state': 'unknown', 'error': 'Submission may have started. Check the Windows queue before reprinting.'}
            self.db.execute('INSERT INTO jobs VALUES (?,?,?)', (request_id, digest, json.dumps(result)))
            self.db.commit()
            try:
                job_id = self.spooler.send(printer, data, 'Product labels ' + request_id)
                result = {'id': request_id, 'state': 'spooled', 'spoolJobId': job_id}
            except Exception as exc:
                # A driver failure may happen after some bytes were accepted.
                result['error'] = f'{exc}. Check the Windows queue before reprinting.'
            self.db.execute('UPDATE jobs SET result=? WHERE id=?', (json.dumps(result), request_id))
            self.db.commit()
            return result


def handler_for(bridge):
    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def log_message(self, *_args):
            pass  # Never log credentials or PRN contents.

        def allowed(self):
            return (self.headers.get('Host') in {f'127.0.0.1:{PORT}', f'localhost:{PORT}'}
                    and self.headers.get('Origin') in bridge.config['origins'])

        def reply(self, status, body):
            raw = json.dumps(body).encode()
            self.send_response(status)
            if self.allowed():
                self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
                self.send_header('Vary', 'Origin')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
                self.send_header('Access-Control-Allow-Private-Network', 'true')
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            try:
                self.wfile.write(raw)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def do_OPTIONS(self):
            self.reply(200 if self.allowed() else 403, {})

        def authorized(self):
            if not self.allowed():
                self.reply(403, {'error': 'Website is not paired with this agent'})
                return False
            auth = self.headers.get('Authorization', '')
            if not secrets.compare_digest(auth.encode(), ('Bearer ' + bridge.config['token']).encode()):
                self.reply(401, {'error': 'Pairing key is incorrect'})
                return False
            return True

        def do_GET(self):
            if not self.authorized():
                return
            try:
                if self.path == '/printers':
                    self.reply(200, {'printers': bridge.spooler.printers()})
                elif self.path == '/health':
                    self.reply(200, {'status': 'ready', 'version': 1})
                else:
                    self.reply(404, {'error': 'Not found'})
            except Exception as exc:
                self.reply(503, {'error': str(exc)})

        def do_POST(self):
            if not self.authorized():
                return
            if self.path != '/jobs':
                self.reply(404, {'error': 'Not found'})
                return
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= MAX_BODY or self.headers.get('Transfer-Encoding'):
                    self.reply(413, {'error': 'Invalid request size'})
                    return
                if self.headers.get_content_type() != 'application/json':
                    self.reply(415, {'error': 'JSON required'})
                    return
                body = json.loads(self.rfile.read(size))
                if not isinstance(body, dict):
                    raise ValueError('JSON object required')
                self.reply(200, bridge.submit(body))
            except (ValueError, TypeError) as exc:
                self.reply(400, {'error': str(exc)})
            except Exception:
                self.reply(503, {'error': 'Submission interrupted. Check Windows queue before reprinting.'})
    return Handler


def configure(data_dir, website):
    """Shared by the graphical installer and developer CLI."""
    url = urlsplit(website.strip())
    if url.username or url.password or not url.netloc or not (url.scheme == 'https' or (url.scheme == 'http' and url.hostname in ('localhost', '127.0.0.1'))):
        raise ValueError('Enter your HTTPS website address (or http://localhost for development).')
    origin = f'{url.scheme}://{url.netloc}'
    data_dir.mkdir(parents=True, exist_ok=True)
    path = data_dir / 'config.json'
    config = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'token': secrets.token_urlsafe(32), 'origins': []}
    config['origins'] = sorted(set(config['origins'] + [origin]))
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(config), encoding='utf-8')
    temporary.replace(path)
    return config, origin


def serve(data_dir):
    path = data_dir / 'config.json'
    if not path.exists():
        raise RuntimeError('Open ProductLabelPrintAgent.exe to finish setup.')
    bridge = Bridge(json.loads(path.read_text(encoding='utf-8')), WindowsSpooler(), data_dir / 'jobs.sqlite3', path)
    server = ThreadingHTTPServer(('127.0.0.1', PORT), handler_for(bridge))
    server.daemon_threads = True
    try:
        server.serve_forever()
    finally:
        server.server_close()
        bridge.db.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--configure', metavar='WEBSITE_URL')
    parser.add_argument('--data-dir', type=Path, default=Path(os.getenv('LOCALAPPDATA', '.')) / 'ProductLabelPrintAgent')
    args = parser.parse_args()
    if args.configure:
        config, origin = configure(args.data_dir, args.configure)
        print('Website paired: ' + origin)
        print('Paste this pairing key in the website Printers page: ' + config['token'])
    else:
        serve(args.data_dir)


if __name__ == '__main__':
    main()
