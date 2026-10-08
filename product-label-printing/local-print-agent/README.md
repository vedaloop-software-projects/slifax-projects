# Product Label Print Agent for Windows

## For shop owners

**No Python, terminal, or batch commands are required.** Use Windows 10/11 64-bit and keep the printer's working Windows driver installed.

1. An admin opens **Printers & Templates → Printers** in the website and clicks **Download Windows installer**.
2. Open **ProductLabelPrintAgent.exe**. The website address (`https://barcode.zenxpos.com`) is already filled in; click **Install and connect**.
3. Open the website's Printers page. It connects to the agent by itself (auto-connect): nobody copies or pastes a key. The first time, the browser asks to allow access to devices on the local network; choose **Allow** (asked once per browser).
4. Add your printer profile if needed and map it to its installed Windows queue, e.g. **SNBC TVSE LP46 Dlite BPLE**. Use **Font test** on the printer card once to see which printer fonts it supports.
5. Print from **Barcode Printing**. Every user who signs in on this PC is connected; regular users never install anything.

Older agents (before auto-connect) still work with the manual key: **Copy connection key** in the installer and paste it on the Printers page. Running the new installer replaces an older running agent automatically; no Windows sign-out is needed.

**Code signing (required for production):** the installer is currently unsigned. Windows 11 Smart App Control blocks unsigned programs without reputation, so on PCs where it is on, the installer will not run until it is signed (e.g. Microsoft Trusted Signing or an OV/EV certificate). Do not ask shops to turn Smart App Control off; Windows cannot turn it back on without a reinstall.

The installer includes its own runtime. It installs only for the current Windows account and starts the background agent automatically at sign-in. Normally no administrator account is needed. Close the setup window after pairing; printing continues in the background.

Setup replaces an older running agent by itself; only if Windows will not release it does setup ask you to sign out and back in once. A different website origin needs pairing again; use your stable production website address.

The app is currently an unsigned development build. Production releases should be code-signed before distribution to shops. Do not instruct customers to disable Windows security protections.

## Printing limits

RAW submission sends the original PRN bytes to Windows without browser scaling or orientation settings. It requires a printer that understands those bytes. It does not translate between TSPL, ZPL, EPL or ESC/POS. Generated ZPL/TSPL labels are supported; generated ESC/POS is not yet supported. Verified binary PRN files can be sent unchanged. Generated TSPL currently requires ASCII text.

Keep a tested profile per printer and stock. Physical dimensions, firmware language, DPI, media mode and sensor calibration still need to match. Browser/PDF page controls do not change PRN output. The existing generated PRN uses a 2 mm feed gap.

**Spooled means accepted by Windows, not confirmed printed.** Inspect the Windows queue before retrying a failed or timed-out submission. The agent journals request IDs before writing and never replays the same ID, including after restart. A new print click is a new job.

## Troubleshooting and removal

- No connection: open the installer, confirm the exact website address, and allow local-network access. Use HTTPS (or localhost during development).
- No printer: install its Windows driver for the current user, then refresh the list.
- Blank/garbled labels: confirm the same PRN works through the original working route and that the selected queue and firmware language match.
- Settings and diagnostics: `%LOCALAPPDATA%\ProductLabelPrintAgent`. Open `ProductLabelPrintAgent.exe` there to reopen setup. Background startup failures go to `agent.log`.
- To stop automatic startup, disable **ProductLabelPrintAgent** in Windows **Settings > Apps > Startup**, then sign out/in. To remove stored files afterward, delete `%LOCALAPPDATA%\ProductLabelPrintAgent`. This also removes the pairing key and duplicate-submission journal.

## Developer build

Python is required on the developer's build computer only. Build on 64-bit Windows with Python 3.10+ including Tcl/Tk:

```powershell
python -m venv .build-env
.\.build-env\Scripts\python.exe -m pip install -r requirements-build.txt
.\.build-env\Scripts\python.exe build_windows.py
python package_agent.py
```

Run these commands in `local-print-agent`. Build output is `../product-label-printing-frontend/public/downloads/ProductLabelPrintAgent.exe`; the optional ZIP also contains that EXE, not Python scripts. The frontend's installer link points directly to the EXE. Rebuild it after agent changes, code-sign it for production, and deploy the frontend assets. Vercel serves the download; the agent runs on each printer PC.

`Setup.cmd` and `Setup.ps1` are compatibility launchers for the EXE, not runtime installers. Developer CLI usage of `agent.py --configure URL` remains available.

Testing:

```powershell
python -m unittest -v test_agent.py test_desktop.py
```

The packaged EXE supports `--self-test OUTPUT_JSON` to verify its embedded runtime, Tcl and read-only Windows printer enumeration. It does not install, change startup settings, start a server, or print. Run with Python removed from the subprocess PATH to check the package. Frontend tests: Node.js 24+, `npm test`.

Security: loopback-only `127.0.0.1:17846`, paired Origin and Host checks, bearer authentication, payload size limits and installed-queue validation. No web-supplied shell commands are executed. The installer writes a current-user Run entry under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`; it does not install an elevated Windows service.

References: [Windows RAW printing](https://learn.microsoft.com/en-us/windows/win32/printdocs/sending-data-directly-to-a-printer), [standalone packaging](https://pyinstaller.org/en/stable/operating-mode.html), [Chrome local-network permissions](https://developer.chrome.com/blog/local-network-access).
