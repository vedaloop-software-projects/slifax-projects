import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, MagicMock
from agent import configure
import desktop

class DesktopTests(unittest.TestCase):
    def test_pairing_preserves_key_and_adds_only_valid_origins(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            first, origin = configure(folder, 'https://labels.example/printers')
            self.assertEqual(origin, 'https://labels.example')
            second, _ = configure(folder, 'http://localhost:5173')
            self.assertEqual(first['token'], second['token'])
            self.assertEqual(set(second['origins']), {'https://labels.example', 'http://localhost:5173'})
            for value in ['http://example.com', 'https://user:pass@example.com', 'file:///tmp/x', 'not a website']:
                with self.assertRaises(ValueError):
                    configure(folder, value)
            self.assertEqual(json.loads((folder / 'config.json').read_text()), second)

    def test_install_copies_binary_and_registers_hidden_autostart_without_python(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            source = folder / 'download.exe'
            source.write_bytes(b'test executable fixture')
            data = folder / 'installation'
            probe = MagicMock()
            probe.__enter__.return_value.connect_ex.return_value = 0
            with patch.object(desktop.sys, 'frozen', True, create=True), patch.object(desktop.sys, 'executable', str(source)), patch.object(desktop, 'DATA_DIR', data), patch.dict(desktop.os.environ, {'APPDATA': str(folder / 'roaming')}), patch.object(desktop.winreg, 'CreateKey'), patch.object(desktop.winreg, 'SetValueEx') as reg, patch.object(desktop.socket, 'socket', return_value=probe), patch.object(desktop.subprocess, 'Popen') as popen:
                key, status = desktop.install('https://labels.example')
                self.assertTrue(key)
                self.assertIn('Sign out', status)
                command = reg.call_args.args[-1]
                self.assertIn('--serve', command)
                self.assertIn('.exe', command)
                self.assertNotIn('python', command.lower())
                self.assertEqual(len(list(data.glob('agent-*.exe'))), 1)
                self.assertTrue((data / 'ProductLabelPrintAgent.exe').is_file())
                popen.assert_not_called()

    def test_developer_source_cannot_install_python_dependency_by_accident(self):
        with patch.object(desktop.sys, 'frozen', False, create=True):
            with self.assertRaisesRegex(RuntimeError, 'Build the EXE'):
                desktop.install('https://labels.example')

if __name__ == '__main__':
    unittest.main()
