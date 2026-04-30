# CLINE DevOps Implementation Plan — CI/CD & Database Backups

## 🎯 Goal

Implement two DevOps infrastructure components for the SOC Simulator:
1. **CI/CD Pipeline** — GitHub Actions workflow that runs `pytest` on every push/PR to `main`.
2. **Database Backup Script** — Bash script that dumps PostgreSQL and MongoDB data from Docker containers.

---

## Reference: Docker Container Credentials

Extracted from `back/docker-compose.yml`:

| Service    | Container Name      | User    | Password | Database / Auth DB     |
|------------|---------------------|---------|----------|------------------------|
| PostgreSQL | `expert_postgres`   | `admin` | `170273` | `expert_system`        |
| MongoDB    | `expert_mongodb`    | `admin` | `170273` | `admin` (auth source)  |

MongoDB database used by the app: `expert_telemetry`, collection: `security_logs`.

---

## Part 1: CI/CD Pipeline (GitHub Actions)

### Step 1.1 — Create workflow directory and file

**File:** `.github/workflows/ci.yml` (relative to project root)

> **IMPORTANT:** The test suite uses **SQLite in-memory** and **AsyncMock for MongoDB** (see `back/tests/conftest.py`). No external PostgreSQL or MongoDB services are needed in CI.

### Step 1.2 — Exact file content

Create `.github/workflows/ci.yml` with the following content:

```yaml
name: SOC Simulator CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Cache pip dependencies
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ hashFiles('back/requirements.txt') }}
          restore-keys: |
            ${{ runner.os }}-pip-

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r back/requirements.txt

      - name: Run tests
        working-directory: back
        run: pytest -v --tb=short
```

### Step 1.3 — Execution instructions

```
# From project root (PowerShell):
New-Item -ItemType Directory -Path ".github\workflows" -Force
# Then create the file .github\workflows\ci.yml with the content above.
```

---

## Part 2: Database Backup Script

### Step 2.1 — Create the backup script

**File:** `back/backup.sh`

### Step 2.2 — Exact file content

Create `back/backup.sh` with the following content:

```bash
#!/usr/bin/env bash
# =============================================================================
# SOC Simulator — Database Backup Script
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
# =============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"

# Docker container names (from docker-compose.yml)
PG_CONTAINER="expert_postgres"
MONGO_CONTAINER="expert_mongodb"

# PostgreSQL credentials
PG_USER="admin"
PG_DB="expert_system"

# MongoDB credentials
MONGO_USER="admin"
MONGO_PASSWORD="170273"
MONGO_DB="expert_telemetry"
MONGO_AUTH_DB="admin"

# ── Prepare backup directory ─────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

echo "========================================"
echo " SOC Simulator Database Backup"
echo " Timestamp: ${TIMESTAMP}"
echo "========================================"

# ── PostgreSQL Backup ────────────────────────────────────────────────────
PG_BACKUP_FILE="${BACKUP_DIR}/pg_backup_${TIMESTAMP}.sql"

echo ""
echo "[1/2] Backing up PostgreSQL (${PG_DB})..."

if docker exec "${PG_CONTAINER}" pg_dump -U "${PG_USER}" -d "${PG_DB}" > "${PG_BACKUP_FILE}" 2>/dev/null; then
    PG_SIZE=$(du -h "${PG_BACKUP_FILE}" | cut -f1)
    echo "  ✓ PostgreSQL backup saved: ${PG_BACKUP_FILE} (${PG_SIZE})"
else
    echo "  ✗ PostgreSQL backup FAILED. Is container '${PG_CONTAINER}' running?"
    rm -f "${PG_BACKUP_FILE}"
fi

# ── MongoDB Backup ───────────────────────────────────────────────────────
MONGO_BACKUP_DIR="${BACKUP_DIR}/mongo_backup_${TIMESTAMP}"

echo ""
echo "[2/2] Backing up MongoDB (${MONGO_DB})..."

if docker exec "${MONGO_CONTAINER}" mongodump \
    --username="${MONGO_USER}" \
    --password="${MONGO_PASSWORD}" \
    --authenticationDatabase="${MONGO_AUTH_DB}" \
    --db="${MONGO_DB}" \
    --archive 2>/dev/null > "${MONGO_BACKUP_DIR}.archive"; then
    MONGO_SIZE=$(du -h "${MONGO_BACKUP_DIR}.archive" | cut -f1)
    echo "  ✓ MongoDB backup saved: ${MONGO_BACKUP_DIR}.archive (${MONGO_SIZE})"
else
    echo "  ✗ MongoDB backup FAILED. Is container '${MONGO_CONTAINER}' running?"
    rm -f "${MONGO_BACKUP_DIR}.archive"
fi

# ── Summary ──────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Backup complete."
echo " Directory: ${BACKUP_DIR}"
echo "========================================"
```

### Step 2.3 — Make executable

```bash
chmod +x back/backup.sh
```

---

## Part 3: Update `.gitignore`

Add the following line to the root `.gitignore` to exclude backup dumps from version control:

```diff
 .aider*
 front/src/node_modules/
 __pycache__/
 .env
+back/backups/
```

---

## Execution Checklist for Cline

| #   | Action                                                 | Command / Tool       |
|-----|--------------------------------------------------------|----------------------|
| 1   | Create `.github/workflows/` directory                  | `mkdir -p`           |
| 2   | Create `.github/workflows/ci.yml` with content above   | `write_to_file`      |
| 3   | Create `back/backup.sh` with content above              | `write_to_file`      |
| 4   | Set executable permission on `backup.sh`                | `chmod +x`           |
| 5   | Append `back/backups/` to `.gitignore`                  | `replace_in_file`    |
| 6   | Create empty `back/backups/.gitkeep`                    | `write_to_file`      |

---

## Verification Plan

### CI/CD Verification
- The workflow uses **no external services** — tests run against SQLite in-memory + AsyncMock (see `back/tests/conftest.py`).
- To verify locally before pushing:
  ```powershell
  cd back; pytest -v --tb=short
  ```
- After push to `main`, check the **Actions** tab in the GitHub repository for green status.

### Backup Script Verification
- Ensure Docker containers are running:
  ```powershell
  cd back; docker compose up -d
  ```
- Run the backup script (requires Git Bash or WSL on Windows):
  ```bash
  cd back && bash backup.sh
  ```
- Verify output files exist in `back/backups/`:
  - `pg_backup_YYYY-MM-DD_HH-MM-SS.sql` — should contain SQL statements
  - `mongo_backup_YYYY-MM-DD_HH-MM-SS.archive` — should be a non-empty binary archive
- Verify `.gitignore` prevents `back/backups/` from being tracked:
  ```powershell
  git status
  ```
  The backups directory should NOT appear in untracked files.

---

## File Summary

| File                            | Status  | Purpose                              |
|---------------------------------|---------|--------------------------------------|
| `.github/workflows/ci.yml`     | **NEW** | GitHub Actions CI pipeline           |
| `back/backup.sh`               | **NEW** | PostgreSQL + MongoDB backup script   |
| `.gitignore`                    | MODIFY  | Exclude `back/backups/` from git     |
| `back/backups/.gitkeep`        | **NEW** | Preserve empty backups directory     |
