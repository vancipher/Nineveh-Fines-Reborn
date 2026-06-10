# Nineveh Traffic Fines - start the app
# Usage:
#   .\launch.ps1              # HTTPS (phone mic / voice)
#   .\launch.ps1 -Http        # HTTP only (localhost)
#   .\launch.ps1 -Setup       # create DB + admin user first run

param(
    [switch]$Http,
    [switch]$Setup
)

$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -ge 7) {
    $PSNativeCommandUseErrorActionPreference = $false
}
Set-Location $PSScriptRoot

function Use-SystemNode {
    $systemNodeDir = 'C:\Program Files\nodejs'
    if (-not (Test-Path (Join-Path $systemNodeDir 'node.exe'))) { return }

    $cleanPath = @(
        $systemNodeDir
        ($env:Path -split ';' | Where-Object {
            $_ -and
            $_ -ne $systemNodeDir -and
            $_ -notmatch 'Cursor\\resources\\app\\resources\\helpers'
        })
    )
    $env:Path = ($cleanPath -join ';')
}

Use-SystemNode

function Write-Step([string]$Message) {
    Write-Host ">> $Message" -ForegroundColor Cyan
}

function Ensure-NativeModules {
    $nodeExe = (Get-Command node -ErrorAction Stop).Source
    $nodeVer = (node -v).Trim()
    $moduleVer = (node -e "process.stdout.write(process.versions.modules)" 2>$null)
    $marker = Join-Path $PSScriptRoot '.node-native-build'

    node -e "require('better-sqlite3')" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0 -and (Test-Path $marker)) {
        $saved = (Get-Content $marker -Raw).Trim()
        if ($saved -eq "$nodeVer|$moduleVer") { return }
    }

    if (Test-Path $marker) { Remove-Item $marker -Force }

    Write-Step "Rebuilding native modules for Node $nodeVer (module $moduleVer) at $nodeExe ..."
    npm rebuild better-sqlite3
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Rebuild failed. Trying npm install..." -ForegroundColor Yellow
        npm install
        npm rebuild better-sqlite3
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Rebuild failed. Delete node_modules and run: npm install" -ForegroundColor Red
            exit 1
        }
    }

    node -e "require('better-sqlite3')" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "better-sqlite3 still fails after rebuild." -ForegroundColor Red
        Write-Host "Node used: $nodeExe ($nodeVer)" -ForegroundColor Red
        Write-Host "Run from PowerShell (not Cursor terminal): npm rebuild better-sqlite3" -ForegroundColor Yellow
        exit 1
    }

    Set-Content -Path $marker -Value "$nodeVer|$moduleVer" -NoNewline
}

function Get-LanIPv4 {
    if (Get-Command Get-NetIPConfiguration -ErrorAction SilentlyContinue) {
        $configs = @(Get-NetIPConfiguration -ErrorAction SilentlyContinue |
            Where-Object {
                $_.NetAdapter -and
                $_.NetAdapter.Status -eq 'Up' -and
                $_.IPv4Address -and
                $_.NetAdapter.InterfaceDescription -notmatch 'Virtual|VMware|Hyper-V|WSL|Loopback|TAP|TUN|Bluetooth|VPN'
            })

        $wifi = @($configs | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN' })
        if ($wifi.Count -gt 0) { return $wifi[0].IPv4Address.IPAddress }

        $ethernet = @($configs | Where-Object {
            $_.InterfaceAlias -match 'Ethernet' -and $_.InterfaceAlias -notmatch 'vEthernet'
        })
        if ($ethernet.Count -gt 0) { return $ethernet[0].IPv4Address.IPAddress }

        if ($configs.Count -gt 0) { return $configs[0].IPv4Address.IPAddress }
    }

    if (-not (Get-Command Get-NetIPAddress -ErrorAction SilentlyContinue)) { return $null }

    $candidates = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notmatch '^127\.' -and
            $_.PrefixOrigin -ne 'WellKnown' -and
            $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)\d'
        } |
        Sort-Object InterfaceMetric, SkipAsSource)

    if ($candidates.Count -gt 0) { return $candidates[0].IPAddress }
    return $null
}

function Find-OpenSslPath {
    $paths = @(
        'openssl',
        "${env:ProgramFiles}\Git\usr\bin\openssl.exe",
        "${env:ProgramFiles(x86)}\Git\usr\bin\openssl.exe"
    )
    foreach ($candidate in $paths) {
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    return $null
}

function Ensure-FirewallRule([int]$Port) {
    if (-not (Get-Command New-NetFirewallRule -ErrorAction SilentlyContinue)) { return }

    $ruleName = "Fines System Reborn Dev TCP $Port"
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existing) { return }

    try {
        Write-Step "Allowing inbound TCP $Port in Windows Firewall (phone/tablet access)..."
        New-NetFirewallRule `
            -DisplayName $ruleName `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort $Port `
            -Action Allow `
            -Profile Any | Out-Null
    } catch {
        Write-Host "Could not add firewall rule automatically. Run PowerShell as Administrator once, or allow port $Port manually." -ForegroundColor Yellow
    }
}

function Ensure-DevHttpsCert([string]$LanIp) {
    $certDir = Join-Path $PSScriptRoot 'certificates'
    New-Item -ItemType Directory -Force -Path $certDir | Out-Null

    $keyPath = Join-Path $certDir 'dev-key.pem'
    $certPath = Join-Path $certDir 'dev-cert.pem'
    $stampPath = Join-Path $certDir 'dev-cert.stamp'

    if ((Test-Path $keyPath) -and (Test-Path $certPath) -and (Test-Path $stampPath)) {
        $savedIp = (Get-Content $stampPath -Raw).Trim()
        if ($savedIp -eq $LanIp) {
            return @{ Key = $keyPath; Cert = $certPath }
        }
    }

    $openssl = Find-OpenSslPath
    if (-not $openssl) {
        Write-Host "OpenSSL not found (install Git for Windows). Using default Next.js cert - phones may not connect." -ForegroundColor Yellow
        return $null
    }

    Write-Step "Creating HTTPS certificate for localhost and $LanIp ..."
    Remove-Item $keyPath, $certPath -Force -ErrorAction SilentlyContinue

    $san = "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:$LanIp"
    $prevError = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $openssl req -x509 -newkey rsa:2048 -keyout $keyPath -out $certPath -days 825 -nodes `
        -subj "/CN=localhost" -addext $san *>&1 | Out-Null
    $opensslExit = $LASTEXITCODE
    $ErrorActionPreference = $prevError

    if ($opensslExit -ne 0 -or -not (Test-Path $keyPath) -or -not (Test-Path $certPath)) {
        Write-Host "Could not create LAN HTTPS certificate. Phones may fail to connect." -ForegroundColor Yellow
        Remove-Item $keyPath, $certPath -Force -ErrorAction SilentlyContinue
        return $null
    }

    Set-Content -Path $stampPath -Value $LanIp -NoNewline
    return @{ Key = $keyPath; Cert = $certPath }
}

function Show-MobileInstructions([string]$LanIp, [int]$Port, [switch]$UseHttp) {
    Write-Host ""
    Write-Host "  PC (this machine):" -ForegroundColor White
    if ($UseHttp) {
        Write-Host "    http://localhost:$Port" -ForegroundColor Green
    } else {
        Write-Host "    https://localhost:$Port" -ForegroundColor Green
    }

    if ($LanIp) {
        Write-Host ""
        Write-Host "  iPhone / iPad (same Wi-Fi, NOT mobile data):" -ForegroundColor White
        if ($UseHttp) {
            Write-Host "    http://${LanIp}:$Port" -ForegroundColor Green
            Write-Host "    Voice/mic will NOT work over HTTP on phone - type numbers or use HTTPS mode." -ForegroundColor Yellow
        } else {
            Write-Host "    https://${LanIp}:$Port" -ForegroundColor Green
            Write-Host "    Use https (not http). On iOS: Advanced -> Continue if you see a certificate warning." -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "  Could not detect LAN IP. Run: ipconfig" -ForegroundColor Yellow
        Write-Host "  Then open https://YOUR-IP:$Port on phone (same Wi-Fi)." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "  If phone still cannot connect:" -ForegroundColor DarkGray
    Write-Host "    - Wi-Fi must be Private (not Guest/Public isolation)" -ForegroundColor DarkGray
    Write-Host "    - Turn off VPN on phone and PC" -ForegroundColor DarkGray
    Write-Host "    - Windows Settings -> Network -> Wi-Fi -> your network -> Private" -ForegroundColor DarkGray
    Write-Host ""
}

function Start-AppBrowser([string]$Url) {
    Start-Job -ScriptBlock {
        param($OpenUrl)
        Start-Sleep -Seconds 4
        $chromePaths = @(
            "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
            "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
        )
        foreach ($path in $chromePaths) {
            if (Test-Path $path) {
                Start-Process $path $OpenUrl
                return
            }
        }
        Start-Process $OpenUrl
    } -ArgumentList $Url | Out-Null
}

function Stop-ListenersOnPort([int]$Port) {
    $pids = @()

    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $pids = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique)
    }

    if ($pids.Count -eq 0) {
        $pids = @(netstat -ano | Select-String ":$Port\s" | ForEach-Object {
            if ($_.Line -match '\s(\d+)\s*$') { [int]$matches[1] }
        } | Where-Object { $_ -gt 0 } | Select-Object -Unique)
    }

    foreach ($procId in $pids) {
        if ($procId -eq $PID) { continue }
        Write-Step "Stopping process $procId on port $Port..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

$AppPort = 3000

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is not installed. Install from https://nodejs.org and try again." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm was not found. Reinstall Node.js and try again." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path '.env')) {
    if (Test-Path '.env.example') {
        Write-Step "Creating .env from .env.example - edit it if needed."
        Copy-Item '.env.example' '.env'
    } else {
        Write-Host ".env file is missing. Copy .env.example to .env and set AUTH_SECRET." -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path 'node_modules')) {
    Write-Step "Installing packages (first run only)..."
    npm install
}

Ensure-NativeModules

$dbPath = Join-Path $PSScriptRoot 'data\local.db'
if ($Setup -or -not (Test-Path $dbPath)) {
    Write-Step "Setting up database..."
    npm run db:setup
}

if (Test-Path '.next') {
    $manifest = Join-Path '.next' 'server\app-paths-manifest.json'
    if (-not (Test-Path $manifest)) {
        Write-Step "Clearing broken .next cache..."
        Remove-Item -Recurse -Force '.next'
    }
}

Write-Host ""
Write-Host "Nineveh Traffic Fines" -ForegroundColor Green
Write-Host "  Node: $((node -v).Trim())" -ForegroundColor DarkGray
Write-Host "  Login (default): QaisHassan  (or see .env ADMIN_*)" -ForegroundColor DarkGray
Write-Host ""

Write-Step "Freeing port $AppPort (and 3001 if in use)..."
Stop-ListenersOnPort $AppPort
Stop-ListenersOnPort 3001
Start-Sleep -Milliseconds 500
$env:PORT = "$AppPort"
$lanIp = Get-LanIPv4
Ensure-FirewallRule $AppPort

$appUrl = if ($Http) { "http://localhost:$AppPort" } else { "https://localhost:$AppPort" }
Start-AppBrowser $appUrl

if ($Http) {
    Write-Step "Starting on all network interfaces (HTTP) port $AppPort"
    Show-MobileInstructions -LanIp $lanIp -Port $AppPort -UseHttp
    npm run dev -- -p $AppPort
} else {
    $httpsCert = $null
    if ($lanIp) {
        $httpsCert = Ensure-DevHttpsCert $lanIp
    }

    Write-Step "Starting on all network interfaces (HTTPS) port $AppPort"
    Show-MobileInstructions -LanIp $lanIp -Port $AppPort

    if ($httpsCert) {
        npm run dev:https -- -p $AppPort `
            --experimental-https-key $httpsCert.Key `
            --experimental-https-cert $httpsCert.Cert
    } else {
        npm run dev:https -- -p $AppPort
    }
}
