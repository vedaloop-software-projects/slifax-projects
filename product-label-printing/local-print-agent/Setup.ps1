$ErrorActionPreference = 'Stop'
$installerPath = Join-Path $PSScriptRoot 'ProductLabelPrintAgent.exe'
if (-not (Test-Path -LiteralPath $installerPath)) {
    $installerPath = Join-Path $PSScriptRoot '../product-label-printing-frontend/public/downloads/ProductLabelPrintAgent.exe'
}
if (-not (Test-Path -LiteralPath $installerPath)) {
    throw 'Download ProductLabelPrintAgent.exe from the website Printers page, then double-click it.'
}
# This launcher is explicitly opened by the user for interactive setup.
Start-Process -FilePath $installerPath
