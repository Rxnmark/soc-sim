# CLINE_DEPLOYMENT_PLAN.md — SOC Simulator Containerized Deployment

## 🎯 Objective

Containerize the entire SOC Simulator stack (React frontend + FastAPI backend + databases + monitoring) into a unified `docker-compose.yml` at the project root. The frontend Nginx container acts as the single entry point on port **80**, reverse-proxying `/api/` requests to the backend.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Host Machine                       │
│                                                       │
│   Port 80 ─► ┌──────────────────┐                    │
│              │   frontend       │                    │
│              │   (nginx:alpine) │                    │
│              │                  │                    │
│              │  /api/*  ──────────► ┌──────────┐     │
│              │                  │   │ backend  │     │
│              │  /*  → index.html│   │ (uvicorn)│     │
│              └──────────────────┘   │ :8000    │     │
│                                     └────┬─────┘     │
│                              ┌───────────┼────────┐  │
│                              │           │        │  │
│                         ┌────▼───┐  ┌────▼────┐   │  │
│                         │postgres│  │ mongodb │   │  │
│                         │ :5432  │  │ :27017  │   │  │
│                         └────────┘  └─────────┘   │  │
│                                                    │  │
│   Port 9090 ─► prometheus    Port 3000 ─► grafana │  │
└──────────────────────────────────────────────────────┘
```

> **IMPORTANT:** The backend is NOT yet containerized. This plan adds **both** a backend Dockerfile and a frontend Dockerfile, then unifies everything into a root-level `docker-compose.yml`.

---

## Pre-Flight Check (Read-Only)

Before making any changes, Cline should verify:

1. `front/src/package.json` — contains `"build": "vite build"` script ✅
2. `front/src/vite.config.js` — has dev proxy for `/api/v1` ✅ (only used in dev, not production)
3. All frontend API calls use **relative paths** (`/api/v1/...`) via `authenticatedFetch` ✅ — **no changes needed**
4. `back/database.py` — uses hardcoded `localhost` for DB connections ❌ — **needs env var migration**

---

## Step 1 — Create `back/Dockerfile`

> The backend has no Dockerfile yet. We create a simple Python image that installs deps and runs uvicorn.

### File: `back/Dockerfile` [NEW]

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system deps for psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Step 2 — Update `back/database.py` for Environment Variables

> **IMPORTANT:** Currently `database.py` uses hardcoded `localhost` URLs. Inside Docker, services communicate via container names (`postgres`, `mongodb`). We switch to environment variables with sensible defaults so it still works locally.

### File: `back/database.py` [MODIFY]

Replace the two hardcoded connection strings with:

```diff
+import os
 from sqlalchemy import create_engine
 from sqlalchemy.orm import sessionmaker, declarative_base
 import motor.motor_asyncio

 # --- PostgreSQL Configuration ---
-POSTGRES_URL = "postgresql://admin:170273@localhost:5432/expert_system"
+POSTGRES_URL = os.getenv(
+    "POSTGRES_URL",
+    "postgresql://admin:170273@localhost:5432/expert_system"
+)

 engine = create_engine(POSTGRES_URL)
 SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
 Base = declarative_base()

 # ... (get_db unchanged)

 # --- MongoDB Configuration ---
-MONGO_URL = "mongodb://admin:170273@localhost:27017"
+MONGO_URL = os.getenv(
+    "MONGO_URL",
+    "mongodb://admin:170273@localhost:27017"
+)

 mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
```

**What this does:** In Docker, the compose file sets `POSTGRES_URL` and `MONGO_URL` env vars pointing to container names. When running locally without env vars, the old `localhost` defaults still work.

---

## Step 3 — Create `front/Dockerfile`

Multi-stage build: Node to build, Nginx to serve.

### File: `front/Dockerfile` [NEW]

```dockerfile
# ── Stage 1: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from front/src/ (the actual npm root)
COPY src/package.json src/package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Build context is front/, source code is in front/src/
COPY src/ ./

# Build the production bundle
RUN npm run build

# ── Stage 2: Serve ──
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
# Vite outputs to ./dist by default
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

> **NOTE:** The `package.json` and all source code live inside `front/src/`. The Docker build context is `front/`, so we reference `src/` paths. Vite's default output dir is `dist` (relative to the project root where `vite.config.js` lives), so the built files land at `/app/dist` inside the builder stage.

---

## Step 4 — Create `front/nginx.conf`

This config does two things:
1. Serves static React files and falls back to `index.html` for client-side routing
2. Reverse-proxies `/api/` to the backend container, eliminating CORS issues

### File: `front/nginx.conf` [NEW]

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # ── API Reverse Proxy ──
    # All /api/ requests are forwarded to the FastAPI backend container.
    # This eliminates CORS entirely — browser sees same origin.
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed later)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # ── Prometheus metrics proxy (optional, for /metrics endpoint) ──
    location /metrics {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
    }

    # ── React Router fallback ──
    # For any route that doesn't match a static file, serve index.html.
    # React Router handles the routing client-side.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── Static asset caching ──
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
}
```

---

## Step 5 — Create Unified `docker-compose.yml` at Project Root

> **WARNING:** The old `back/docker-compose.yml` remains untouched — it is used for local development (databases only). The new root-level `docker-compose.yml` is the **production deployment** file that runs everything.

### File: `docker-compose.yml` (project root) [NEW]

```yaml
version: '3.8'

services:
  # ── Databases ──
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
    networks:
      - soc-network

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
    networks:
      - soc-network

  # ── Backend (FastAPI) ──
  backend:
    build:
      context: ./back
      dockerfile: Dockerfile
    container_name: expert_backend
    environment:
      POSTGRES_URL: "postgresql://admin:170273@postgres:5432/expert_system"
      MONGO_URL: "mongodb://admin:170273@mongodb:27017"
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - mongodb
    restart: unless-stopped
    networks:
      - soc-network

  # ── Frontend (Nginx + React) ──
  frontend:
    build:
      context: ./front
      dockerfile: Dockerfile
    container_name: expert_frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - soc-network

  # ── Monitoring ──
  prometheus:
    image: prom/prometheus:v2.53.0
    container_name: expert_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./back/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - soc-network

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
      - ./back/monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on:
      - prometheus
    restart: unless-stopped
    networks:
      - soc-network

volumes:
  pgdata:
  mongodata:
  prometheus_data:
  grafana_data:

networks:
  soc-network:
    driver: bridge
```

---

## Step 6 — Update Prometheus Config

Since the backend is now containerized on the same Docker network, Prometheus should scrape it by container name, not `host.docker.internal`.

### File: `back/monitoring/prometheus.yml` [MODIFY]

```diff
 scrape_configs:
   - job_name: "fastapi"
     metrics_path: "/metrics"
     static_configs:
-      - targets: ["host.docker.internal:8000"]
+      - targets: ["backend:8000"]
         labels:
           application: "soc-simulator"
```

---

## Step 7 — Frontend Code Changes

### API Calls — NO CHANGES NEEDED ✅

All frontend code already uses relative paths:
- `authenticatedFetch("/api/v1/logs")`
- `authenticatedFetch("/api/v1/risks/summary")`
- `` authenticatedFetch(`${API}/simulation/status`) `` where `API = "/api/v1"`

The Vite dev proxy (`vite.config.js`) handles this during development, and the Nginx reverse proxy handles it in production. **No code changes required.**

### One Legacy Hardcoded URL — `risk-matrix.tsx` [VERIFY]

A hardcoded `fetch("http://127.0.0.1:8000/api/v1/business-risks")` call was found in the compiled `dist/` bundle. Run this to check the source:

```bash
grep -rn "http://127.0.0.1" front/src/app/
```

If found, replace with:

```diff
-fetch("http://127.0.0.1:8000/api/v1/business-risks")
+authenticatedFetch("/api/v1/business-risks")
```

And add the import if missing:
```typescript
import authenticatedFetch from "../utils/api-fetch";
```

> **NOTE:** The source grep did not find this in `.ts/.tsx` files, suggesting the `dist/` folder is stale. If the source is clean, skip this step.

---

## Execution Checklist

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | Create backend Dockerfile | `back/Dockerfile` | ⬜ |
| 2 | Update `database.py` with env vars | `back/database.py` | ⬜ |
| 3 | Create frontend Dockerfile | `front/Dockerfile` | ⬜ |
| 4 | Create Nginx config | `front/nginx.conf` | ⬜ |
| 5 | Create root `docker-compose.yml` | `docker-compose.yml` | ⬜ |
| 6 | Update Prometheus target | `back/monitoring/prometheus.yml` | ⬜ |
| 7 | Verify no hardcoded URLs in frontend source | `front/src/app/` | ⬜ |
| 8 | Build and test | CLI | ⬜ |

---

## Verification Plan

### Build & Smoke Test

```bash
# From project root on the VPS:
docker compose build
docker compose up -d

# Check all containers are running:
docker compose ps

# Expected: 6 containers (postgres, mongodb, backend, frontend, prometheus, grafana)
```

### Functional Verification

```bash
# Frontend serves on port 80:
curl -s http://localhost/ | head -5
# Expected: HTML with <div id="root">

# API proxy works through Nginx:
curl -s http://localhost/api/v1/equipment | head -c 200
# Expected: JSON array or valid API response

# Backend direct access still works:
curl -s http://localhost:8000/api/v1/equipment | head -c 200

# Prometheus scrapes backend:
curl -s http://localhost:9090/api/v1/targets | grep backend
# Expected: backend:8000 target in "up" state

# Grafana accessible:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200 or 302
```

### Troubleshooting

```bash
# View logs for a specific service:
docker compose logs frontend
docker compose logs backend

# Rebuild a single service after changes:
docker compose build frontend
docker compose up -d frontend

# Full teardown and rebuild:
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `back/Dockerfile` | **CREATE** | Python 3.11-slim, pip install, uvicorn |
| `back/database.py` | **MODIFY** | Add `os.getenv()` for DB URLs |
| `back/monitoring/prometheus.yml` | **MODIFY** | Target → `backend:8000` |
| `front/Dockerfile` | **CREATE** | Multi-stage: node build → nginx serve |
| `front/nginx.conf` | **CREATE** | Reverse proxy + SPA fallback |
| `docker-compose.yml` (root) | **CREATE** | Unified 6-service orchestration |
| `back/docker-compose.yml` | **KEEP** | Unchanged — local dev only |
