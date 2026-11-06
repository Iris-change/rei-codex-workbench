param([switch]$DesktopBoot,[ValidateRange(1024,65535)][int]$Port=43147,[switch]$NoBrowser,[string]$DataDirectory)
$ErrorActionPreference = 'Stop'
$env:REI_PORT=[string]$Port
if (-not $DataDirectory) { $DataDirectory=Join-Path $PSScriptRoot 'data' }
$env:REI_DATA_DIR=[System.IO.Path]::GetFullPath($DataDirectory)
$projectRoot = $PSScriptRoot
$identityBytes=[System.Text.Encoding]::UTF8.GetBytes($projectRoot.ToLowerInvariant()+'|'+$env:REI_DATA_DIR.ToLowerInvariant())
$identityHash=[System.Security.Cryptography.SHA256]::Create()
try { $expectedInstance=([BitConverter]::ToString($identityHash.ComputeHash($identityBytes))).Replace('-','').ToLowerInvariant().Substring(0,16) } finally { $identityHash.Dispose() }
$url = 'http://127.0.0.1:'+$Port
$running = $false
try {
    $health = Invoke-RestMethod -Uri "$url/health" -TimeoutSec 2
    if ($health.app -ne 'EVA-UNIT00' -or $health.instance -ne $expectedInstance) { throw "Port $Port is occupied by another program or workbench directory. Select another port." }
    $running = $true
} catch {
    if ($_.Exception.Message -like '*occupied*') { throw }
}
if (-not $running) {
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    & $nodePath -e "try{require(require.resolve('node-pty',{paths:[process.argv[1]]}));require.resolve('@xterm/xterm',{paths:[process.argv[1]]});require.resolve('@xterm/addon-fit',{paths:[process.argv[1]]})}catch{process.exit(1)}" $projectRoot
    if($LASTEXITCODE -ne 0){throw 'Missing terminal dependencies. Open a terminal in workbench and run: npm ci'}
    if (-not $env:REI_CODEX) { $env:REI_CODEX = (Get-Command codex -ErrorAction Stop).Source }
    $logDir = $env:REI_DATA_DIR
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    Start-Process -FilePath $nodePath -ArgumentList ('"' + (Join-Path $projectRoot 'server.cjs') + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'server.log') -RedirectStandardError (Join-Path $logDir 'server-error.log')
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 300
        try { $health = Invoke-RestMethod -Uri "$url/health" -TimeoutSec 1; if ($health.app -eq 'EVA-UNIT00' -and $health.instance -eq $expectedInstance) { $running = $true; break } } catch {}
    }
    if (-not $running) { throw 'Workbench could not start. See workbench/data/server-error.log.' }
}
if($NoBrowser){Write-Output "Workbench ready at $url";return}
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (Test-Path -LiteralPath $edgePath) {
    $profilePath = Join-Path $env:REI_DATA_DIR 'unit00-browser'
    if ($DesktopBoot) {
        $launchUrl = $url + '/?boot=interactive&launch=' + [Guid]::NewGuid().ToString('N')
        Start-Process -FilePath $edgePath -ArgumentList ('--app=' + $launchUrl),('--user-data-dir="' + $profilePath + '"'),'--autoplay-policy=no-user-gesture-required','--no-first-run','--no-default-browser-check','--window-size=1500,950'
        return
    }
    # This is the visible, interactive workbench window requested by the user.
    $launchUrl = $url + '/?launch=' + [Guid]::NewGuid().ToString('N')
    Start-Process -FilePath $edgePath -ArgumentList ('--app=' + $launchUrl),('--user-data-dir="' + $profilePath + '"'),'--no-first-run','--no-default-browser-check','--window-size=1500,950'
} else {
    throw 'Microsoft Edge is required for the isolated UNIT-00 browser profile. Install Edge, then run this launcher again.'
}
