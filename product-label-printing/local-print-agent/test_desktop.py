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
            with patch.object(desktop.sys, 'frozen', True, create=True), patch.object(desktop.sys, 'executable', str(source)), patch.object(desktop, 'DATA_DIR', data), patch.dict(desktop.os.environ, {'APPDATA': str(folder / 'roaming')}), patch.object(desktop.winreg, 'CreateKey'), patch.object(desktop.winreg, 'SetValueEx') as reg, patch.object(desktop.socket, 'socket', return_value=probe), patch.object(desktop.subprocess, 'Popen') as popen, patch.object(desktop, '_healthy', return_value=False), patch.object(desktop.subprocess, 'run'), patch.object(desktop.time, 'sleep'):
                # Port stays busy and nothing answers: fall back to asking for a sign-out.
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

    def _install(self, folder, *, port_busy, healthy):
        source = folder / 'download.exe'
        source.write_bytes(b'new agent build')
        data = folder / 'installation'
        data.mkdir()
        (data / 'agent-0ldversion0.exe').write_bytes(b'old agent build')
        probe = MagicMock()
        probe.__enter__.return_value.connect_ex.side_effect = port_busy
        with patch.object(desktop.sys, 'frozen', True, create=True), patch.object(desktop.sys, 'executable', str(source)), patch.object(desktop, 'DATA_DIR', data), patch.dict(desktop.os.environ, {'APPDATA': str(folder / 'roaming')}), patch.object(desktop.winreg, 'CreateKey'), patch.object(desktop.winreg, 'SetValueEx'), patch.object(desktop.socket, 'socket', return_value=probe), patch.object(desktop.subprocess, 'Popen') as popen, patch.object(desktop.subprocess, 'run') as run, patch.object(desktop, '_healthy', side_effect=healthy), patch.object(desktop.time, 'sleep'):
            _, status = desktop.install('https://labels.example')
        return status, popen, run

    def test_install_replaces_an_older_running_agent_without_sign_out(self):
        with tempfile.TemporaryDirectory() as temp:
            # Old agent holds the port and does not know the website; after taskkill the port frees.
            status, popen, run = self._install(Path(temp), port_busy=[0, 1], healthy=[False, True])
            self.assertIn('Installed and running', status)
            killed = [c.args[0] for c in run.call_args_list]
            self.assertEqual(killed, [['taskkill', '/F', '/IM', 'agent-0ldversion0.exe']], 'only the older agent version is stopped')
            popen.assert_called_once()
            self.assertIn('--serve', popen.call_args.args[0])

    def test_install_leaves_a_current_agent_running(self):
        with tempfile.TemporaryDirectory() as temp:
            # A current agent already answers for the new website (it reloads its pairing).
            status, popen, run = self._install(Path(temp), port_busy=[0], healthy=[True])
            self.assertIn('Installed and running', status)
            run.assert_not_called()
            popen.assert_not_called()

    def test_developer_source_cannot_install_python_dependency_by_accident(self):
        with patch.object(desktop.sys, 'frozen', False, create=True):
            with self.assertRaisesRegex(RuntimeError, 'Build the EXE'):
                desktop.install('https://labels.example')

if __name__ == '__main__':
    unittest.main()
