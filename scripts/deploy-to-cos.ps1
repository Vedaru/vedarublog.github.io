# Requires: Python + pip (for coscmd)
# Usage:
#   pwsh ./scripts/deploy-to-cos.ps1 -Bucket "vedaru-123456" -Region "ap-shanghai" -SecretId "AKIDxxxx" -SecretKey "xxxx"
# Or set env vars TENCENT_SECRET_ID/TENCENT_SECRET_KEY and pass Bucket/Region only.

param(
  [Parameter(Mandatory=$true)][string]$Bucket,
  [Parameter(Mandatory=$true)][string]$Region,
  [string]$SecretId = $env:TENCENT_SECRET_ID,
  [string]$SecretKey = $env:TENCENT_SECRET_KEY,
  [string]$ProjectRoot = (Resolve-Path "..").Path
)

# Fail fast on errors
$ErrorActionPreference = "Stop"

Write-Host "Building Astro site..." -ForegroundColor Cyan
Push-Location $ProjectRoot
try {
  $env:ASTRO_BASE = "/"
  pnpm install --frozen-lockfile
  pnpm build
} finally {
  Pop-Location
}

$dist = Join-Path $ProjectRoot "dist"
if (-not (Test-Path $dist)) { throw "dist folder not found: $dist" }

Write-Host "Installing coscmd..." -ForegroundColor Cyan
python --version | Out-Null
pip install --upgrade coscmd | Out-Null

Write-Host "Configuring coscmd..." -ForegroundColor Cyan
if (-not $SecretId -or -not $SecretKey) { throw "SecretId/SecretKey not provided or env not set." }
coscmd config -a $SecretId -s $SecretKey -b $Bucket -r $Region

Write-Host "Uploading dist/ to COS (recursive, skip unchanged)..." -ForegroundColor Cyan
coscmd upload -rs "$dist/" "/"

$websiteUrl = "http://$Bucket.cos-website.$Region.myqcloud.com"
Write-Host "Done. Website URL: $websiteUrl" -ForegroundColor Green
