Add-Type -AssemblyName System.Drawing
$assetRoot = $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $assetRoot 'prompts.json') -Raw | ConvertFrom-Json
$originals = Join-Path $assetRoot 'originals'
New-Item -ItemType Directory -Path $originals -Force | Out-Null
foreach ($asset in $manifest.assets) {
  Copy-Item -LiteralPath $asset.source -Destination (Join-Path $originals ($asset.name + '.png'))
  $width = 1080; $height = 1920
  if ($asset.name -eq 'app-icon') { $width = 512; $height = 512 }
  if ($asset.name -eq 'feature-graphic') { $width = 1024; $height = 500 }
  $sourceImage = [System.Drawing.Image]::FromFile($asset.source)
  $bitmap = New-Object System.Drawing.Bitmap($width, $height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb))
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($sourceImage, 0, 0, $width, $height)
    $bitmap.Save((Join-Path $assetRoot ($asset.name + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $graphics.Dispose(); $bitmap.Dispose(); $sourceImage.Dispose() }
  Write-Output ($asset.name + ': ' + $width + ' x ' + $height)
}
