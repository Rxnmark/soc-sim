# CLINE_MONITORING_PLAN.md — Prometheus + Grafana Integration Blueprint

> **IMPORTANT:** This document is an **execution-ready blueprint** for a Junior Developer (Cline).
> Follow each step sequentially. Do NOT skip steps or improvise.

---

## 0. Architecture Overview

```
┌──────────────────┐        scrape :8000/metrics        ┌──────────────┐
│  FastAPI Backend  │◄──────────────────────────────────│  Prometheus   │
│  (host machine)   │         every 5s                  │  :9090        │
│  uvicorn :8000    │                                   └──────┬───────┘
└──────────────────┘                                           │
                                                               │ datasource
                                                        ┌──────▼───────┐
                                                        │   Grafana     │
                                                        │   :3000       │
                                                        └──────────────┘
```

**Key point:** FastAPI runs on the **host machine** (not in Docker). Prometheus and Grafana run in Docker alongside PostgreSQL and MongoDB. Prometheus scrapes the host's `localhost:8000/metrics` via `host.docker.internal`.

---

## 1. Prerequisites — `back/requirements.txt`

**Action:** Append this line at the end of `back/requirements.txt` (before the trailing blank line):

```
prometheus-fastapi-instrumentator==7.0.2
```

Then install it:

```powershell
cd back
pip install prometheus-fastapi-instrumentator==7.0.2
```

> **NOTE:** `prometheus_client==0.21.1` is already present in `requirements.txt` (transitive dependency). The instrumentator depends on it, so no conflict.

---

## 2. FastAPI Setup — `back/main.py`

**Action:** Modify `back/main.py` to instrument the app with Prometheus metrics.

### Current file (24 lines):

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from simulation_endpoints import register_simulation_routes
from debug_simulation import router as debug_router
from main_api import register_all_routes

# Create database tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routes
register_all_routes(app)
```

### Target file (changes marked with `+`):

```diff
 from fastapi import FastAPI
 from fastapi.middleware.cors import CORSMiddleware
 from database import engine, Base
 import models
 from simulation_endpoints import register_simulation_routes
 from debug_simulation import router as debug_router
 from main_api import register_all_routes
+from prometheus_fastapi_instrumentator import Instrumentator
 
 # Create database tables if they don't exist
 Base.metadata.create_all(bind=engine)
 
 app = FastAPI()
 
 
 app.add_middleware(
     CORSMiddleware,
     allow_origins=["*"],
     allow_credentials=True,
     allow_methods=["*"],
     allow_headers=["*"],
 )
 
 # Register all API routes
 register_all_routes(app)
+
+# Prometheus metrics — exposes GET /metrics
+Instrumentator().instrument(app).expose(app)
```

**What this does:**
- Imports the instrumentator.
- `instrument(app)` — hooks into FastAPI middleware to collect request duration, count, and size metrics automatically.
- `expose(app)` — registers a `GET /metrics` endpoint that Prometheus will scrape.

**After this change, `back/main.py` should be exactly 28 lines.**

---

## 3. Configuration Files — Create Directory Structure

**Action:** Create the following directory tree inside `back/`:

```
back/
└── monitoring/
    ├── prometheus.yml
    └── grafana/
        └── provisioning/
            └── datasources/
                └── datasource.yml
```

### 3.1 Prometheus Config — `back/monitoring/prometheus.yml`

**Create file** `back/monitoring/prometheus.yml` with this exact content:

```yaml
global:
  scrape_interval: 5s
  evaluation_interval: 5s

scrape_configs:
  - job_name: "fastapi"
    metrics_path: "/metrics"
    static_configs:
      - targets: ["host.docker.internal:8000"]
        labels:
          application: "soc-simulator"
```

> **NOTE:** `host.docker.internal` resolves to the host machine's IP from inside Docker containers (Docker Desktop on Windows/macOS). This allows Prometheus (running in Docker) to reach the FastAPI server (running on the host via `uvicorn`).

### 3.2 Grafana Datasource Provisioning — `back/monitoring/grafana/provisioning/datasources/datasource.yml`

**Create file** `back/monitoring/grafana/provisioning/datasources/datasource.yml` with this exact content:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

> **NOTE:** `http://prometheus:9090` uses Docker's internal DNS. The service name `prometheus` in `docker-compose.yml` resolves to the Prometheus container's IP.

---

## 4. Docker Compose — `back/docker-compose.yml`

**Action:** Replace the entire `back/docker-compose.yml` with the content below. The existing `postgres` and `mongodb` services are unchanged; `prometheus` and `grafana` are appended.

### Target file (full content):

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: expert_postgres
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: 170273
      POSTGRES_DB: expert_system
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  mongodb:
    image: mongo:6.0
    container_name: expert_mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: 170273
    ports:
      - "27017:27017"
    volumes:
      - mongodata:/data/db
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:v2.53.0
    container_name: expert_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:11.1.0
    container_name: expert_grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  pgdata:
  mongodata:
  prometheus_data:
  grafana_data:
```

### What was added:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `prometheus` | `prom/prometheus:v2.53.0` | `9090` | Scrapes `/metrics` from FastAPI every 5s |
| `grafana` | `grafana/grafana:11.1.0` | `3000` | Visualization dashboards, auto-provisioned Prometheus datasource |

**Key details:**
- `extra_hosts: ["host.docker.internal:host-gateway"]` ensures `host.docker.internal` resolves correctly on Linux Docker hosts (already works on Windows/macOS Docker Desktop).
- Prometheus config is bind-mounted as read-only (`:ro`).
- Grafana provisioning directory is bind-mounted so the datasource is auto-configured on first boot.
- Named volumes `prometheus_data` and `grafana_data` persist data across container restarts.

---

## 5. Execution & Verification Instructions

### Step 5.1 — Install the Python package

```powershell
cd c:\Users\stokm\Documents\Study\Проектування_інф_систем\back
pip install prometheus-fastapi-instrumentator==7.0.2
```

### Step 5.2 — Restart the FastAPI server

Kill the existing `uvicorn` process and restart:

```powershell
cd c:\Users\stokm\Documents\Study\Проектування_інф_систем\back
uvicorn main:app --reload
```

### Step 5.3 — Verify `/metrics` endpoint

Open in browser or curl:

```
http://localhost:8000/metrics
```

**Expected:** A plain-text page with Prometheus-format metrics like:

```
# HELP http_requests_total Total number of requests by method, status and handler.
# TYPE http_requests_total counter
http_requests_total{handler="/api/v1/risks/summary",method="GET",status="2xx"} 5.0
...
# HELP http_request_duration_seconds Duration of HTTP requests in seconds.
# TYPE http_request_duration_seconds histogram
...
```

### Step 5.4 — Start Prometheus & Grafana

```powershell
cd c:\Users\stokm\Documents\Study\Проектування_інф_систем\back
docker-compose up -d prometheus grafana
```

> **TIP:** If PostgreSQL and MongoDB are already running, you can start only the new services with `docker-compose up -d prometheus grafana` — it won't restart existing containers.

### Step 5.5 — Verify Prometheus

Open: **http://localhost:9090**

1. Go to **Status → Targets**.
2. You should see a target `fastapi` with endpoint `host.docker.internal:8000` in state **UP**.
3. Try querying: `http_requests_total` in the Expression field.

### Step 5.6 — Verify Grafana

Open: **http://localhost:3000**

1. Login with `admin` / `admin` (skip password change prompt).
2. Go to **Connections → Data sources**.
3. You should see **Prometheus** already listed (auto-provisioned).
4. Click it → **Test** → should show **"Data source is working"**.

### Step 5.7 — (Optional) Create a basic dashboard

In Grafana:
1. Go to **Dashboards → New → New Dashboard → Add visualization**.
2. Select **Prometheus** as the data source.
3. Use query: `rate(http_request_duration_seconds_sum[1m]) / rate(http_request_duration_seconds_count[1m])` for average latency.
4. Use query: `rate(http_requests_total[1m])` for request rate.

---

## 6. Files Changed Summary

| Action | File | Description |
|--------|------|-------------|
| **MODIFY** | `back/requirements.txt` | Add `prometheus-fastapi-instrumentator==7.0.2` |
| **MODIFY** | `back/main.py` | Add import + 2 lines to instrument and expose metrics |
| **NEW** | `back/monitoring/prometheus.yml` | Prometheus scrape config targeting `host.docker.internal:8000` |
| **NEW** | `back/monitoring/grafana/provisioning/datasources/datasource.yml` | Auto-provision Prometheus as Grafana's default datasource |
| **MODIFY** | `back/docker-compose.yml` | Add `prometheus` and `grafana` services + their volumes |

---

## 7. Troubleshooting

| Problem | Solution |
|---------|----------|
| Prometheus target shows **DOWN** | Ensure FastAPI is running on the host (`uvicorn main:app --reload`). Check that `host.docker.internal` resolves — run `docker exec expert_prometheus ping host.docker.internal`. |
| Port 3000 already in use | Change Grafana's port mapping in `docker-compose.yml`: `"3001:3000"`, then access via `http://localhost:3001`. |
| Port 9090 already in use | Change Prometheus port mapping: `"9091:9090"`, and update Grafana's datasource URL to `http://prometheus:9090` (internal port stays the same). |
| Grafana shows "No data" | Wait 10-15 seconds for Prometheus to collect initial scrape data. Make a few API requests to generate traffic. |
| `ModuleNotFoundError: prometheus_fastapi_instrumentator` | Ensure `pip install` ran in the correct virtual environment where uvicorn runs. |
