# =============================================================================
# SOC Simulator - Database Backup Script (Windows PowerShell)
# =============================================================================
# Dumps PostgreSQL and MongoDB databases from Docker containers.
#
# Usage:
#   pwsh -ExecutionPolicy Bypass -File back/backup.ps1
#
# ── Cron Job Setup (Windows Task Scheduler) ──────────────────────────
# To run this script automatically every day at 02:00 AM:
#
#   1. Open Task Scheduler (taskschd.msc)
#   2. Create a new task:
#      - Action: Start a program
#      - Program: powershell.exe
#      - Arguments: -ExecutionPolicy Bypass -File "C:\path\to\project\back\backup.ps1"
#      - Trigger: Daily at 02:00 AM
#
# ── Retention Policy ─────────────────────────────────────────────────
# To keep only the last 30 days of backups, run this in Task Scheduler:
#   powershell.exe -ExecutionPolicy Bypass -Command "Get-ChildItem 'C:\path\to\project\back\backups' -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Recurse -Force"
#
# ── Linux/Mac Users ──────────────────────────────────────────────────
# On Linux/Mac, use back/backup.sh instead (requires Git Bash or WSL).
# =============================================================================

$ErrorActionPreference = "Stop"

# Load credentials from .env file
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $ScriptDir ".env"

if (-not (Test-Path $EnvFile)) {
    Write-Error ".env file not found at $EnvFile"
    Write-Host "Please create back/.env with database credentials."
    exit 1
}

# Parse .env file (simple key=value parser)
$envVars = @{}
Get-Content $EnvFile | Where-Object { $_ -match '^\s*([A-Z_]+)=(.*)\s*$' } | ForEach-Object {
    $envVars[$matches[1]] = $matches[2]
}

# Export parsed variables
foreach ($key in $envVars.Keys) {
    [System.Environment]::SetEnvironmentVariable($key, $envVars[$key], "User")
}

# ── Configuration (from .env) ────────────────────────────────────────
$BackupDir = Join-Path $ScriptDir "backups"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# Docker container names (from docker-compose.yml)
$PGContainer = if ($envVars.ContainsKey("PG_CONTAINER")) { $envVars["PG_CONTAINER"] } else { "expert_postgres" }
$MONGOContainer = if ($envVars.ContainsKey("MONGO_CONTAINER")) { $envVars["MONGO_CONTAINER"] } else { "expert_mongodb" }

# PostgreSQL credentials
$PGUser = if ($envVars.ContainsKey("PG_USER")) { $envVars["PG_USER"] } else { "admin" }
$PGPassword = if ($envVars.ContainsKey("PG_PASSWORD")) { $envVars["PG_PASSWORD"] } else { "170273" }
$PGDB = if ($envVars.ContainsKey("PG_DB")) { $envVars["PG_DB"] } else { "expert_system" }

# MongoDB credentials
$MONGOUser = if ($envVars.ContainsKey("MONGO_USER")) { $envVars["MONGO_USER"] } else { "admin" }
$MONGOPassword = if ($envVars.ContainsKey("MONGO_PASSWORD")) { $envVars["MONGO_PASSWORD"] } else { "170273" }
$MONGODB = if ($envVars.ContainsKey("MONGO_DB")) { $envVars["MONGO_DB"] } else { "expert_telemetry" }
$MONGOAuthDB = if ($envVars.ContainsKey("MONGO_AUTH_DB")) { $envVars["MONGO_AUTH_DB"] } else { "admin" }

# ── Check Docker containers are running ──────────────────────────────
$runningContainers = docker ps --format "{{.Names}}" 2>$null

$pgRunning = $runningContainers -contains $PGContainer
$mongoRunning = $runningContainers -contains $MONGOContainer

if (-not $pgRunning) {
    Write-Host ""
    Write-Host "  [FAIL] PostgreSQL container '$PGContainer' is NOT running."
    Write-Host "  Start it with: docker compose -f back/docker-compose.yml up -d"
    Write-Host ""
    Write-Host "========================================"
    Write-Host " Backup ABORTED (missing containers)."
    Write-Host "========================================"
    exit 1
}

if (-not $mongoRunning) {
    Write-Host ""
    Write-Host "  [FAIL] MongoDB container '$MONGOContainer' is NOT running."
    Write-Host "  Start it with: docker compose -f back/docker-compose.yml up -d"
    Write-Host ""
    Write-Host "========================================"
    Write-Host " Backup ABORTED (missing containers)."
    Write-Host "========================================"
    exit 1
}

# ── Prepare backup directory ────────────────────────────────────────
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host "========================================"
Write-Host " SOC Simulator Database Backup"
Write-Host " Timestamp: $Timestamp"
Write-Host "========================================"

# ── PostgreSQL Backup ───────────────────────────────────────────────
$PGBackupFile = Join-Path $BackupDir "pg_backup_$Timestamp.sql"

Write-Host ""
Write-Host "[1/2] Backing up PostgreSQL ($PGDB)..."

$pgDumpSuccess = $true
try {
    # postgres:15-alpine uses 'trust' auth for local connections inside the container
    & docker exec $PGContainer pg_dump -U $PGUser -d $PGDB 2>$null | Set-Content -Path $PGBackupFile -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
}
catch {
    Write-Host "  [FAIL] PostgreSQL backup FAILED: $_"
    $pgDumpSuccess = $false
    if (Test-Path $PGBackupFile) { Remove-Item $PGBackupFile -Force }
}

if ($pgDumpSuccess) {
    $pgSize = (Get-Item $PGBackupFile).Length
    if ($pgSize -gt 1MB) { $pgSizeStr = "{0:N1} MB" -f ($pgSize / 1MB) }
    elseif ($pgSize -gt 1KB) { $pgSizeStr = "{0:N1} KB" -f ($pgSize / 1KB) }
    else { $pgSizeStr = "$pgSize B" }
    Write-Host "  [OK] PostgreSQL backup saved: $PGBackupFile ($pgSizeStr)"
}

# ── MongoDB Backup ──────────────────────────────────────────────────
$MONGOBackupFile = Join-Path $BackupDir "mongo_backup_$Timestamp.archive"

Write-Host ""
Write-Host "[2/2] Backing up MongoDB ($MONGODB)..."

$mongoDumpSuccess = $true
try {
    # Use cmd /c for binary archive output - PowerShell pipelines corrupt binary data
    $cmdLine = "docker exec $MONGOContainer mongodump --username=$MONGOUser --password=$MONGOPassword --authenticationDatabase=$MONGOAuthDB --db=$MONGODB --archive" + ' 2>nul > "' + $MONGOBackupFile + '"'
    & cmd /c $cmdLine
    if ($LASTEXITCODE -ne 0) { throw "mongodump failed with exit code $LASTEXITCODE" }
}
catch {
    Write-Host "  [FAIL] MongoDB backup FAILED: $_"
    $mongoDumpSuccess = $false
    if (Test-Path $MONGOBackupFile) { Remove-Item $MONGOBackupFile -Force }
}

if ($mongoDumpSuccess) {
    $mongoSize = (Get-Item $MONGOBackupFile).Length
    if ($mongoSize -gt 1MB) { $mongoSizeStr = "{0:N1} MB" -f ($mongoSize / 1MB) }
    elseif ($mongoSize -gt 1KB) { $mongoSizeStr = "{0:N1} KB" -f ($mongoSize / 1KB) }
    else { $mongoSizeStr = "$mongoSize B" }
    Write-Host "  [OK] MongoDB backup saved: $MONGOBackupFile ($mongoSizeStr)"
}

# ── Summary ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================"
Write-Host " Backup complete."
Write-Host " Directory: $BackupDir"
Write-Host "========================================"