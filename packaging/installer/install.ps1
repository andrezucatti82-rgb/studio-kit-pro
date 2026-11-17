# Local installer; never changes execution policy, accounts or shell profiles.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host 'Studio Kit Pro — projeto, dependências e skills locais. Precisa de internet.'
try {
  $NodeOK = $false
  if (Get-Command node -ErrorAction SilentlyContinue) { & node -e 'process.exit(Number(process.versions.node.split(".")[0])>=22?0:1)'; $NodeOK = ($LASTEXITCODE -eq 0) }
  if (-not $NodeOK) {
    $Arch = if ($env:PROCESSOR_ARCHITECTURE -match 'ARM64') { 'arm64' } else { 'x64' }
    $Tools = Join-Path $PSScriptRoot '.studio-tools'
    New-Item -ItemType Directory -Force $Tools | Out-Null
    $Sums = (Invoke-WebRequest 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt' -UseBasicParsing).Content
    $Line = ($Sums -split "`n" | Where-Object { $_ -match " node-v24\.[0-9.]+-win-$Arch\.zip`$" } | Select-Object -First 1)
    if (-not $Line) { throw 'Distribuição Node.js não localizada.' }
    $Line = $Line.Trim()
    $Parts = $Line -split '\s+'
    $Archive = Join-Path $Tools $Parts[1]
    Invoke-WebRequest "https://nodejs.org/dist/latest-v24.x/$($Parts[1])" -OutFile $Archive -UseBasicParsing
    if ((Get-FileHash $Archive -Algorithm SHA256).Hash.ToLower() -ne $Parts[0]) { throw 'Falha de integridade do Node.js.' }
    Expand-Archive -Path $Archive -DestinationPath $Tools -Force
    $env:PATH = (Join-Path $Tools $Parts[1].Replace('.zip','')) + ';' + $env:PATH
  }
  & node (Join-Path $PSScriptRoot 'setup-studio.mjs') --system-deps --open-tutorial @args
  if ($LASTEXITCODE -ne 0) { throw "Instalação interrompida (código $LASTEXITCODE)." }
} catch { Write-Error $_; exit 1 }
