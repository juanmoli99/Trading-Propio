param(
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

if ($RetentionDays -lt 1) {
    throw "RetentionDays must be greater than zero"
}

$backendRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$backupDirectory = Join-Path $backendRoot "backups"

if (-not (Test-Path $backupDirectory)) {
    Write-Output "Backup directory does not exist. Nothing to clean."
    exit 0
}

$cutoff = (Get-Date).ToUniversalTime().AddDays(-$RetentionDays)

$expiredBackups = Get-ChildItem $backupDirectory -File -Filter "*.dump" |
    Where-Object {
        $_.LastWriteTimeUtc -lt $cutoff
    }

foreach ($backup in $expiredBackups) {
    Remove-Item $backup.FullName -Force
}

Write-Output "Retention completed"
Write-Output "RetentionDays: $RetentionDays"
Write-Output "Deleted: $($expiredBackups.Count)"
