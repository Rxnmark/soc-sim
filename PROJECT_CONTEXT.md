# Expert Information System - Project Context

## Overview
This is a cybersecurity risk management expert system with dual dashboards (Cybersecurity Dashboard and Risk Management Dashboard). Built with FastAPI backend and React/Vite frontend.

## Backend Structure (`/back`)
**Technology Stack**: FastAPI, SQLAlchemy (PostgreSQL), Motor (MongoDB), Uvicorn

### Key Files:
1. **`main.py`** - Main FastAPI application
   - Risk summary endpoint (`/api/v1/risks/summary`)
   - Business risks endpoint (`/api/v1/business-risks`)
   - Equipment monitoring endpoint (`/api/v1/equipment`)
   - Security logging system (`/api/v1/logs`)
   - Auto-fix/remediation system (`/api/v1/actions/block`)
   - Database reset endpoint (`/api/v1/reset`)

2. **`models.py`** - SQLAlchemy ORM models
   - `Equipment`: Network/server/endpoint devices with IP, type, status
   - `RiskAssessment`: Security risks linked to equipment (risk_level, description, is_resolved)
   - `BusinessRisk`: Business-level risks for risk matrix (title, category, probability, impact, status)

3. **`database.py`** - Database configuration
   - PostgreSQL connection: `postgresql://admin:170273@localhost:5432/expert_system`
   - MongoDB connection: `mongodb://admin:170273@localhost:27017/expert_telemetry`
   - Collections: `security_logs` for security events

### Key Features:
- **Expert System**: Automatically creates RiskAssessments from security logs
- **Auto-fix**: Blocks IPs and reboots equipment when threats detected
- **Real-time Updates**: Equipment status polling every 5 seconds
- **Sample Data Generation**: Reset endpoint creates 20 equipment items, initial risks, and logs

## Frontend Structure (`/front`)
**Technology Stack**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, lucide-icons

### Key Components:
1. **`App.tsx`** - Main app component with react-router
2. **`routes.tsx`** - Application routing (not shown in structure but referenced)
3. **Risk Management Components**:
   - `RiskMatrix` - Interactive probability/impact matrix with search highlighting
   - `CriticalThreats` - Top threats ranked by probability*impact with financial exposure
   - `ExportModal` - Report generation (CSV/Excel/txt formats)
4. **Monitoring Components**:
   - `EquipmentTable` - Real-time equipment monitoring with search/filter by IP/name
   - Status indicators (Online/Rebooting/Offline) with visual cues
   - Risk level coloring (Critical/Medium/Safe)
5. **UI Components**: Built with shadcn/ui (Card, Button, Badge, ToggleGroup, etc.)

### Key Features:
- **Search Functionality**: Implemented in EquipmentTable, RiskMatrix, CriticalThreats
- **Real-time Updates**: Equipment data refreshed every 5 seconds via useEffect + setInterval
- **Visual Indicators**: Color-coded risk levels, status badges, animated pulses for active threats
- **Data Export**: CSV/Excel report generation with financial impact calculations
- **Responsive Design**: Tailwind CSS for mobile-friendly layouts

## Data Flow
1. **Backend** generates sample data via `/api/v1/reset` (20 equipment, 3 initial risks, 5 business risks, 3 security logs)
2. **Frontend** polls `/api/v1/equipment` every 5 seconds for real-time monitoring
3. **Expert System** in backend:
   - Processes security logs via `/api/v1/logs`
   - Creates RiskAssessments for suspicious activities (unauthorized access, attacks, scans)
   - Applies auto-fixes via `/api/v1/actions/block` (blocks IP, marks risks resolved, reboots equipment)
4. **Dashboards** consume:
   - `/api/v1/risks/summary` for statistics widgets
   - `/api/v1/business-risks` for risk matrix and critical threats
   - `/api/v1/equipment` for equipment table

## Security Features
- **CORS**: Allow all origins (development setup)
- **Input Validation**: Pydantic models for API requests
- **Automatic Threat Detection**: Log analysis creates risks and triggers remediation
- **Audit Trail**: Security logs stored in MongoDB with timestamps

## Sample Data Characteristics
- **Equipment**: 20 items across Network, Server, Database, ICS, Sensor, IoT, Endpoint types
- **IP Ranges**: Internal (192.168.x.x, 10.0.x.x, 172.16.x.x) simulating enterprise network
- **Initial Risks**: DDoS attack, Unauthorized Modbus command, Outdated Antivirus
- **Business Risks**: Ransomware, Supply Chain, Compliance, DDoS, Insider Threat (varied probabilities/impacts)
- **Security Logs**: DDoS, Unauthorized Access, Security Warning events

## Development Notes
- Backend runs on `http://127.0.0.1:8000`
- Frontend proxies to backend via Vite (implicit in fetch URLs)
- Database reset required for fresh sample data
- MongoDB used for log storage due to flexible schema and scalability
- PostgreSQL for structured equipment/risk data requiring relationships

## Potential Enhancement Areas
1. Add authentication/authorization
2. Implement WebSocket connections for real-time updates instead of polling
3. Add more sophisticated risk calculation algorithms
4. Enhance export functionality with actual PDF generation
5. Add unit/integration tests
6. Implement proper error handling and loading states