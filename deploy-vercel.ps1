# Deploy Fines System Reborn to Vercel
# Prerequisites: vercel login, Turso database (see DEPLOY_VERCEL.md)

param(
    [switch]$Prod,
    [switch]$SetupDb
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Use-SystemNode {
    $systemNodeDir = 'C:\Program Files\nodejs'
    if (-not (Test-Path (Join-Path $systemNodeDir 'node.exe'))) { return }
    $cleanPath = @(
        $systemNodeDir
        ($env:Path -split ';' | Where-Object {
            $_ -and $_ -ne $systemNodeDir -and $_ -notmatch 'Cursor\\resources\\app\\resources\\helpers'
        })
    )
    $env:Path = ($cleanPath -join ';')
}

Use-SystemNode

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Install Vercel CLI: npm i -g vercel" -ForegroundColor Yellow
    exit 1
}

try {
    vercel whoami 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'not logged in' }
} catch {
    Write-Host "Run first: vercel login" -ForegroundColor Yellow
    vercel login
}

if ($SetupDb) {
    if (-not $env:DATABASE_URL -or $env:DATABASE_URL -like 'file:*') {
        Write-Host "Set Turso env vars first:" -ForegroundColor Yellow
        Write-Host '  $env:DATABASE_URL = "libsql://YOUR-DB.turso.io"' -ForegroundColor DarkGray
        Write-Host '  $env:TURSO_AUTH_TOKEN = "YOUR-TOKEN"' -ForegroundColor DarkGray
        Write-Host "Create DB at https://turso.tech (see DEPLOY_VERCEL.md)" -ForegroundColor DarkGray
        exit 1
    }
    Write-Host ">> Migrating and seeding Turso database..." -ForegroundColor Cyan
    npm run db:migrate
    npm run db:seed
}

Write-Host ">> Deploying to Vercel..." -ForegroundColor Cyan
if ($Prod) {
    vercel deploy --prod
} else {
    vercel deploy
}

Write-Host ""
Write-Host "After deploy, set APP_URL in Vercel to your production URL, then redeploy." -ForegroundColor Green
Write-Host "See DEPLOY_VERCEL.md for Turso + env var checklist." -ForegroundColor DarkGray
