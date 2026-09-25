import base64
import concurrent.futures
import http.client
import json
from pathlib import Path
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from agent import Bridge, handler_for, PORT

CONFIG = {'token': 'test-only-key', 'origins': ['https://labels.example']}

class FakeSpooler:
    def __init__(self):
        self.calls = []
        self.fail = False
    def printers(self):
        return ['TVS test queue']
    def send(self, printer, data, title):
        self.calls.append((printer, data, title))
        if self.fail:
            raise OSError('Driver failed after write')
        return 42

class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'jobs.db'
        self.spooler = FakeSpooler()
        self.bridge = Bridge(CONFIG, self.spooler, self.path)
        self.payload = {'id': 'test-job-123', 'printer': 'TVS test queue', 'data': base64.b64encode(b'\x00\xffPRN\r\n').decode()}
    def tearDown(self):
        self.bridge.db.close()
        self.temp.cleanup()
    def test_exact_bytes_and_durable_deduplication(self):
        self.assertEqual(self.bridge.submit(self.payload)['spoolJobId'], 42)
        self.assertEqual(self.spooler.calls[0][1], b'\x00\xffPRN\r\n')
        self.bridge.db.close()
        self.bridge = Bridge(CONFIG, self.spooler, self.path)
        self.assertEqual(self.bridge.submit(self.payload)['state'], 'spooled')
        self.assertEqual(len(self.spooler.calls), 1)
    def test_same_id_cannot_change_payload(self):
        self.bridge.submit(self.payload)
        with self.assertRaises(ValueError):
            self.bridge.submit({**self.payload, 'data': base64.b64encode(b'new').decode()})
    def test_unknown_submission_never_replays(self):
        self.spooler.fail = True
        self.assertEqual(self.bridge.submit(self.payload)['state'], 'unknown')
        self.spooler.fail = False
        self.assertEqual(self.bridge.submit(self.payload)['state'], 'unknown')
        self.assertEqual(len(self.spooler.calls), 1)
    def test_interrupted_job_never_replays(self):
        self.bridge.submit(self.payload)
        self.bridge.db.execute('UPDATE jobs SET result=?', (json.dumps({'state': 'unknown'}),))
        self.bridge.db.commit()
        self.assertEqual(self.bridge.submit(self.payload)['state'], 'unknown')
        self.assertEqual(len(self.spooler.calls), 1)
    def test_simultaneous_requests_submit_once(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: self.bridge.submit(self.payload), range(4)))
        self.assertTrue(all(r['state'] == 'spooled' for r in results))
        self.assertEqual(len(self.spooler.calls), 1)
    def test_invalid_requests_do_not_print(self):
        for patch in [{'printer': 'missing'}, {'id': '../bad'}, {'data': 'not base64'}, {'data': ''}, {'data': base64.b64encode(b'x' * (4 * 1024 * 1024 + 1)).decode()}]:
            with self.assertRaises(ValueError):
                self.bridge.submit({**self.payload, **patch})
        self.assertEqual(self.spooler.calls, [])
    def test_http_auth_cors_host_and_submission(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler_for(self.bridge))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        def call(method, path, body=None, **overrides):
            headers = {'Host': f'127.0.0.1:{PORT}', 'Origin': CONFIG['origins'][0], 'Authorization': 'Bearer test-only-key', 'Content-Type': 'application/json', **overrides}
            client = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=3)
            client.request(method, path, json.dumps(body) if body is not None else None, headers)
            response = client.getresponse()
            result = response.status, dict(response.getheaders()), json.loads(response.read())
            client.close()
            return result
        try:
            status, headers, _ = call('OPTIONS', '/jobs', Authorization='')
            self.assertEqual(status, 200)
            self.assertEqual(headers['Access-Control-Allow-Origin'], CONFIG['origins'][0])
            self.assertEqual(call('GET', '/printers')[2]['printers'], ['TVS test queue'])
            self.assertEqual(call('POST', '/jobs', self.payload, Origin='https://evil.example')[0], 403)
            self.assertEqual(call('POST', '/jobs', self.payload, Authorization='Bearer wrong')[0], 401)
            self.assertEqual(call('POST', '/jobs', self.payload, Host='evil.example')[0], 403)
            self.assertEqual(call('POST', '/jobs', [], **{'Content-Type': 'text/plain'})[0], 415)
            self.assertEqual(self.spooler.calls, [])
            self.assertEqual(call('POST', '/jobs', self.payload)[2]['spoolJobId'], 42)
            self.assertEqual(call('POST', '/jobs', self.payload)[2]['spoolJobId'], 42)
            self.assertEqual(len(self.spooler.calls), 1)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

if __name__ == '__main__':
    unittest.main()
