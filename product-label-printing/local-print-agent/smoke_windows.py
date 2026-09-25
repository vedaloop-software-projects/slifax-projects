"""Read-only packaged-app check; does not install or print."""
import json
import os
from pathlib import Path
import subprocess
source = Path(__file__).resolve().parent
exe = source.parent / 'product-label-printing-frontend/public/downloads/ProductLabelPrintAgent.exe'
report = source / 'build/self-test.json'
report.parent.mkdir(exist_ok=True)
env = {k: v for k, v in os.environ.items() if k.upper() not in {'PYTHONPATH', 'PYTHONHOME', 'TCL_LIBRARY', 'TK_LIBRARY'}}
env['PATH'] = str(Path(os.environ['SystemRoot']) / 'System32')
env['PYINSTALLER_RESET_ENVIRONMENT'] = '1'
subprocess.run([str(exe), '--self-test', str(report)], env=env, check=True, timeout=45, creationflags=subprocess.CREATE_NO_WINDOW)
result = json.loads(report.read_text())
assert result['frozen'] is True, result
assert result['tcl'], result
print(json.dumps(result))
