param()

$ErrorActionPreference = "Stop"

$backendRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$backupDirectory = Join-Path $backendRoot "backups"
$remote = "trading-backups:Trading-Propio/backups"

if (-not (Test-Path $backupDirectory)) {
    throw "Local backup directory does not exist"
}

$latestBackup = Get-ChildItem $backupDirectory -File -Filter "*.dump" |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1

if (-not $latestBackup) {
    throw "No local database backup was found"
}

& rclone copyto `
    $latestBackup.FullName `
    "$remote/$($latestBackup.Name)" `
    --checksum `
    --retries 3 `
    --low-level-retries 10

if ($LASTEXITCODE -ne 0) {
    throw "External backup upload failed with exit code $LASTEXITCODE"
}

Write-Output "External backup uploaded successfully"
Write-Output "File: $($latestBackup.Name)"
