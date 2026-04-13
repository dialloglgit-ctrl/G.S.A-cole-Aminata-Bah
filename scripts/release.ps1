$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$date = Get-Date -Format "yyyyMMdd_HHmm"
$releaseDir = Join-Path $projectRoot "release"
if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

$zipPath = Join-Path $releaseDir ("linsan_source_{0}.zip" -f $date)
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$items = @("index.html", "app.js", "README.md", "DEPLOIEMENT.md", "netlify.toml")
Compress-Archive -Path $items -DestinationPath $zipPath -Force
Write-Output ("Release created: {0}" -f $zipPath)
