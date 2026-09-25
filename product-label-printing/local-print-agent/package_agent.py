from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
source = Path(__file__).resolve().parent
public = source.parent / 'product-label-printing-frontend/public/downloads'
exe = public / 'ProductLabelPrintAgent.exe'
if not exe.exists():
    raise SystemExit('Build the standalone Windows app with build_windows.py first.')
with ZipFile(public / 'local-print-agent.zip', 'w', ZIP_DEFLATED) as archive:
    archive.write(exe, 'ProductLabelPrintAgent.exe')
    archive.write(source / 'README.md', 'README.md')
print(public / 'local-print-agent.zip')
