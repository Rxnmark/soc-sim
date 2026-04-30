#!/usr/bin/env bash
# =============================================================================
# SOC Simulator — Database Backup Script (Linux/Bash)
# =============================================================================
# Dumps PostgreSQL and MongoDB databases from Docker containers.
#
# Usage:
#   chmod +x back/backup.sh
#   ./back/backup.sh
#
# ── Cron Job Setup (Linux server) ──────────────────────────────────────
# To run this script automatically every day at 02:00 AM:
#
#   1. Open the crontab editor:
#      crontab -e
#
#   2. Add the following line (adjust the path to your project root):
#      0 2 * * * /absolute/path/to/project/back/backup.sh >> /absolute/path/to/project/back/backups/cron.log 2>&1
#
#   3. Verify the cron job is registered:
#      crontab -l
#
# ── Optional: Retention Policy ─────────────────────────────────────────
# To keep only the last 30 days of backups, add this cron entry:
#   0 3 * * * find /absolute/path/to/project/back/backups -type f -mtime +30 -delete
#
# ── Windows Users ──────────────────────────────────────────────────────
# On Windows, use Git Bash, WSL, or run back/backup.ps1 instead.
# =============================================================================

set -euo pipefail

# Load credentials from .env file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "ERROR: .env file not found at ${ENV_FILE}"
    echo "Please create back/.env with database credentials."
    exit 1
fi
set -a
source "${ENV_FILE}"
set +a

# ── Configuration (from .env) ──────────────────────────────────────────
BACKUP_DIR="${SCRIPT_DIR}/backups"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"

# Docker container names (from docker-compose.yml)
PG_CONTAINER="${PG_CONTAINER:-expert_postgres}"
MONGO_CONTAINER="${MONGO_CONTAINER:-expert_mongodb}"

# PostgreSQL credentials
PG_USER="${PG_USER:-admin}"
PG_PASSWORD="${PG_PASSWORD:-170273}"
PG_DB="${PG_DB:-expert_system}"

# MongoDB credentials
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASSWORD="${MONGO_PASSWORD:-170273}"
MONGO_DB="${MONGO_DB:-expert_telemetry}"
MONGO_AUTH_DB="${MONGO_AUTH_DB:-admin}"

# ── Prepare backup directory ──────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

echo "========================================"
echo " SOC Simulator Database Backup"
echo " Timestamp: ${TIMESTAMP}"
echo "========================================"

# ── PostgreSQL Backup ─────────────────────────────────────────────────
PG_BACKUP_FILE="${BACKUP_DIR}/pg_backup_${TIMESTAMP}.sql"

echo ""
echo "[1/2] Backing up PostgreSQL (${PG_DB})..."

if docker exec "${PG_CONTAINER}" env PGPASSWORD="${PG_PASSWORD}" pg_dump -U "${PG_USER}" -d "${PG_DB}" > "${PG_BACKUP_FILE}" 2>/dev/null; then
    PG_SIZE=$(du -h "${PG_BACKUP_FILE}" | cut -f1)
    echo "  ✓ PostgreSQL backup saved: ${PG_BACKUP_FILE} (${PG_SIZE})"
else
    echo "  ✗ PostgreSQL backup FAILED. Is container '${PG_CONTAINER}' running?"
    rm -f "${PG_BACKUP_FILE}"
fi

# ── MongoDB Backup ────────────────────────────────────────────────────
MONGO_BACKUP_FILE="${BACKUP_DIR}/mongo_backup_${TIMESTAMP}.archive"

echo ""
echo "[2/2] Backing up MongoDB (${MONGO_DB})..."

if docker exec "${MONGO_CONTAINER}" mongodump \
    --username="${MONGO_USER}" \
    --password="${MONGO_PASSWORD}" \
    --authenticationDatabase="${MONGO_AUTH_DB}" \
    --db="${MONGO_DB}" \
    --archive 2>/dev/null > "${MONGO_BACKUP_FILE}"; then
    MONGO_SIZE=$(du -h "${MONGO_BACKUP_FILE}" | cut -f1)
    echo "  ✓ MongoDB backup saved: ${MONGO_BACKUP_FILE} (${MONGO_SIZE})"
else
    echo "  ✗ MongoDB backup FAILED. Is container '${MONGO_CONTAINER}' running?"
    rm -f "${MONGO_BACKUP_FILE}"
fi

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Backup complete."
echo " Directory: ${BACKUP_DIR}"
echo "========================================"