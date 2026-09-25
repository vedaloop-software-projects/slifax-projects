"""Run on Windows in the developer build environment."""
from pathlib import Path
import subprocess
import sys
import os
import tkinter
source = Path(__file__).resolve().parent
public = source.parent / 'product-label-printing-frontend/public/downloads'
public.mkdir(parents=True, exist_ok=True)
tkinter.Tcl().eval('info patchlevel')  # Fail early rather than distribute a broken GUI.
os.environ['PYINSTALLER_CONFIG_DIR'] = str(source / 'build/cache')
subprocess.run([sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean', '--onefile', '--windowed', '--noupx',
    '--name', 'ProductLabelPrintAgent', '--distpath', str(public), '--workpath', str(source / 'build'),
    '--specpath', str(source / 'build'), str(source / 'desktop.py')], check=True, cwd=source)
print(public / 'ProductLabelPrintAgent.exe')
