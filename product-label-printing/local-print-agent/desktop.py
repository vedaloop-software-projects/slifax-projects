"""Standalone Windows setup UI and hidden agent entrypoint."""
import argparse
import ctypes
import hashlib
import json
import logging
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import sys
import threading
import time
import tkinter as tk
from tkinter import ttk
from urllib.request import Request, urlopen
import winreg
from agent import PORT, WindowsSpooler, configure, serve

DATA_DIR = Path(os.getenv('LOCALAPPDATA', '.')) / 'ProductLabelPrintAgent'
RUN_KEY = r'Software\Microsoft\Windows\CurrentVersion\Run'
RUN_NAME = 'ProductLabelPrintAgent'


def install(website):
    if not getattr(sys, 'frozen', False):
        raise RuntimeError('Build the EXE first. Developer source cannot be installed as a standalone app.')
    source = Path(sys.executable).resolve()
    digest = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
    # Versioned files avoid overwriting an executable already running in Windows.
    destination = DATA_DIR / ('agent-' + digest + '.exe')
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    config, origin = configure(DATA_DIR, website)
    if source != destination and not destination.exists():
        shutil.copy2(source, destination)
    command = subprocess.list2cmdline([str(destination), '--serve'])
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, RUN_KEY) as key:
        winreg.SetValueEx(key, RUN_NAME, 0, winreg.REG_SZ, command)
    # Retire only the exact shortcut created by the previous Python-based setup.
    legacy = Path(os.environ['APPDATA']) / 'Microsoft/Windows/Start Menu/Programs/Startup/Product Label Print Agent.lnk'
    if legacy.is_file():
        legacy.unlink()
    shortcut = DATA_DIR / 'ProductLabelPrintAgent.exe'
    # A stable launcher for settings. It is not the background process executable.
    if source != shortcut.resolve():
        try:
            shutil.copy2(source, shortcut)
        except PermissionError:
            pass  # Existing settings window is open; the installed agent is current.
    with socket.socket() as probe:
        already_running = probe.connect_ex(('127.0.0.1', PORT)) == 0
    if already_running:
        return config['token'], 'Installed. Sign out of Windows and sign back in to load the updated agent, then connect on the website.'
    subprocess.Popen([str(destination), '--serve'], env={**os.environ, 'PYINSTALLER_RESET_ENVIRONMENT': '1'}, creationflags=subprocess.CREATE_NO_WINDOW, close_fds=True)
    for _ in range(30):
        try:
            req = Request(f'http://127.0.0.1:{PORT}/health', headers={'Origin': origin, 'Authorization': 'Bearer ' + config['token']})
            with urlopen(req, timeout=1) as response:
                if json.load(response).get('status') == 'ready':
                    return config['token'], 'Installed and running. Copy the key below into the website and click Connect / refresh.'
        except (OSError, ValueError):
            time.sleep(0.3)
    return config['token'], 'Installed, but the agent has not responded yet. Sign out and back in, then click Connect / refresh on the website.'


def setup_window():
    root = tk.Tk()
    root.title('Product Label Print Agent')
    root.geometry('620x390')
    root.resizable(False, False)
    frame = ttk.Frame(root, padding=24)
    frame.pack(fill='both', expand=True)
    ttk.Label(frame, text='Set up label printing', font=('Segoe UI', 18, 'bold')).pack(anchor='w')
    ttk.Label(frame, text='Install once on this printer PC. Starts automatically at Windows sign-in.\nNo Python installation or administrator account needed.', wraplength=560).pack(anchor='w', pady=(8, 16))
    ttk.Label(frame, text='Your label website address').pack(anchor='w')
    website = tk.StringVar()
    entry = ttk.Entry(frame, textvariable=website, width=75)
    entry.pack(fill='x', pady=(4, 12))
    try:
        config = json.loads((DATA_DIR / 'config.json').read_text(encoding='utf-8'))
        website.set(config['origins'][0])
    except (OSError, ValueError, KeyError, IndexError):
        pass
    status = tk.StringVar(value='Paste the website address shown on the Printers page.')
    token = tk.StringVar()
    def complete(result=None, error=None):
        button.configure(state='normal')
        if error:
            status.set('Setup could not finish. ' + error)
        else:
            token.set(result[0])
            status.set(result[1])
            copy_button.configure(state='normal')
    def work(address):
        try:
            result = install(address)
            root.after(0, lambda: complete(result=result))
        except Exception as exc:
            text = str(exc)
            root.after(0, lambda: complete(error=text))
    def start():
        button.configure(state='disabled')
        status.set('Installing...')
        threading.Thread(target=work, args=(website.get(),), daemon=True).start()
    button = ttk.Button(frame, text='Install and connect', command=start)
    button.pack(anchor='w')
    ttk.Label(frame, textvariable=status, wraplength=565).pack(anchor='w', pady=12)
    ttk.Entry(frame, textvariable=token, state='readonly', width=75).pack(fill='x')
    def copy():
        root.clipboard_clear()
        root.clipboard_append(token.get())
        status.set('Key copied. Paste it on the website Printers page and click Connect / refresh.')
    copy_button = ttk.Button(frame, text='Copy connection key', command=copy, state='disabled')
    copy_button.pack(anchor='w', pady=8)
    entry.focus_set()
    root.mainloop()


def self_test(path):
    # No setup, autostart changes, service, GUI window, or print jobs.
    tcl = tk.Tcl()
    with sqlite3.connect(':memory:') as db:
        db.execute('SELECT 1').fetchone()
    report = {'frozen': bool(getattr(sys, 'frozen', False)), 'tcl': tcl.eval('info patchlevel'), 'printers': WindowsSpooler().printers(), 'runtime': sys.version.split()[0]}
    path.write_text(json.dumps(report), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--serve', action='store_true')
    parser.add_argument('--self-test', type=Path)
    args = parser.parse_args()
    if args.self_test:
        self_test(args.self_test)
    elif args.serve:
        # Only one background instance per signed-in Windows session.
        kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        kernel.CreateMutexW.argtypes = [ctypes.c_void_p, ctypes.c_bool, ctypes.c_wchar_p]
        kernel.CreateMutexW.restype = ctypes.c_void_p
        mutex = kernel.CreateMutexW(None, False, 'Local\\ProductLabelPrintAgent')
        if not mutex or ctypes.get_last_error() == 183:
            return
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        logging.basicConfig(filename=DATA_DIR / 'agent.log', level=logging.ERROR)
        try:
            serve(DATA_DIR)
        except Exception:
            logging.exception('Print agent could not start')
    else:
        setup_window()


if __name__ == '__main__':
    main()
