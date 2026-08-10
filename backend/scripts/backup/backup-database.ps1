param()

$ErrorActionPreference = "Stop"

$backendRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $backendRoot ".env"
$backupDirectory = Join-Path $backendRoot "backups"

if (-not (Test-Path $envFile)) {
    throw "Missing backend .env file"
}

$directUrlLine = Get-Content $envFile |
    Where-Object { $_ -match '^DIRECT_URL=' } |
    Select-Object -First 1

if (-not $directUrlLine) {
    throw "DIRECT_URL is missing from .env"
}

$directUrl = $directUrlLine.Substring("DIRECT_URL=".Length).Trim()

if ([string]::IsNullOrWhiteSpace($directUrl)) {
    throw "DIRECT_URL is empty"
}

New-Item -ItemType Directory -Force $backupDirectory | Out-Null

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$backupPath = Join-Path $backupDirectory "trading-propio-$timestamp.dump"

& pg_dump `
    --format=custom `
    --no-owner `
    --no-privileges `
    --file="$backupPath" `
    "$directUrl"

if ($LASTEXITCODE -ne 0) {
    Remove-Item $backupPath -ErrorAction SilentlyContinue
    throw "pg_dump failed with exit code $LASTEXITCODE"
}

$file = Get-Item $backupPath

if ($file.Length -le 0) {
    Remove-Item $backupPath -ErrorAction SilentlyContinue
    throw "Backup file is empty"
}

Write-Output "Backup created successfully"
Write-Output "File: $($file.Name)"
Write-Output "SizeBytes: $($file.Length)"
