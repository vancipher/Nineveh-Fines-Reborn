# Deploy to Vercel with env vars from .env
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

function Use-SystemNode {
    $d = 'C:\Program Files\nodejs'
    if (Test-Path "$d\node.exe") {
        $env:Path = "$d;" + (($env:Path -split ';' | Where-Object { $_ -and $_ -ne $d -and $_ -notmatch 'Cursor\\resources\\app\\resources\\helpers' }) -join ';')
    }
}
Use-SystemNode

if (-not (Test-Path '.env')) { Write-Host '.env not found' -ForegroundColor Red; exit 1 }

function Get-EnvValue([string]$Key) {
    foreach ($line in Get-Content '.env') {
        if ($line -match "^\s*$Key=(.*)$") {
            $v = $Matches[1].Trim()
            if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
            return $v
        }
    }
    return $null
}

Write-Host ">> Checking Vercel login..." -ForegroundColor Cyan
vercel whoami 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Open the URL below in your browser and approve login:" -ForegroundColor Yellow
    vercel login
}

Write-Host ">> Linking project (if needed)..." -ForegroundColor Cyan
if (-not (Test-Path '.vercel')) {
    vercel link --yes 2>$null
    if ($LASTEXITCODE -ne 0) { vercel link }
}

$keys = @(
    'AUTH_SECRET', 'DATABASE_URL', 'TURSO_AUTH_TOKEN',
    'ADMIN_EMAIL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD',
    'GROQ_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    'DEFAULT_VOICE_LANGUAGE'
)

Write-Host ">> Setting Vercel env vars (production)..." -ForegroundColor Cyan
foreach ($key in $keys) {
    $val = Get-EnvValue $key
    if (-not $val) { continue }
    Write-Host "  $key"
    $val | vercel env rm $key production -y 2>$null | Out-Null
    $val | vercel env add $key production 2>$null | Out-Null
}

Write-Host ">> Deploying to production..." -ForegroundColor Cyan
vercel deploy --prod --yes
if ($LASTEXITCODE -ne 0) { exit 1 }

$prodUrl = (vercel inspect --prod 2>$null | Select-String 'https://' | Select-Object -First 1)
if (-not $prodUrl) {
    $prodUrl = (vercel ls 2>$null | Select-String 'https://.*vercel\.app' | Select-Object -First 1)
}

Write-Host ""
Write-Host "Deploy done. Set APP_URL after you know your URL:" -ForegroundColor Green
Write-Host "  vercel env add APP_URL production" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Login: QaisHassan + password from .env" -ForegroundColor Green
