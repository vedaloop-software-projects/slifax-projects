@echo off
if exist "%~dp0ProductLabelPrintAgent.exe" (
  start "" "%~dp0ProductLabelPrintAgent.exe"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Setup.ps1"
)
