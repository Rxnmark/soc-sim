# Project Knowledge Base & Architecture Map

## 🎯 Project Core
Це експертна система для моніторингу кібербезпеки та управління ризиками. Система складається з двох дашбордів:
- **Risk Management Dashboard** — управління бізнес-ризиками, матриця ризиків, відсоток мінімізації
- **Cybersecurity Dashboard** — моніторинг кіберзагроз, обладнання, логи безпеки, автоматичне реагування

Система підтримує двомовний інтерфейс (українська/англійська) та включає механізм симуляції загроз та експертну систему з автоматичним реагуванням на інциденти.

**Загальна кількість рядків коду: 13 168** (скановано через `count_lines.py`, виключено lock-файли та debug.txt)

**Top 20 файлів за кількістю рядків (без lock-файлів):**

| Файл | Рядків |
|------|--------|
| `front/src/app/components/ui/sidebar.tsx` | 726 |
| `front/src/app/components/ui/chart.tsx` | 353 |
| `front/src/app/components/sim-control-panel.tsx` | 279 |
| `front/src/app/components/ui/menubar.tsx` | 276 |
| `front/src/app/components/ui/dropdown-menu.tsx` | 257 |
| `front/src/app/components/ui/context-menu.tsx` | 252 |
| `front/src/app/components/ui/carousel.tsx` | 241 |
| `front/src/app/pages/cyber-analytics.tsx` | 240 |
| `front/src/app/pages/analytics.tsx` | 238 |
| `back/simulation_endpoints.py` | 218 |
| `front/src/app/components/expert-panel.tsx` | 202 |
| `back/simulation_core.py` | 201 |
| `front/src/app/pages/cyber-threats.tsx` | 196 |
| `back/main_api.py` | 194 |
| `back/requirements.txt` | 189 |
| `front/src/app/components/ui/select.tsx` | 189 |
| `front/src/app/components/expert-utils.tsx` | 185 |
| `front/src/app/pages/cybersecurity.tsx` | 184 |
| `front/src/styles/theme.css` | 181 |
| `front/src/app/components/risk-matrix.tsx` | 179 |
| `front/src/app/components/ui/command.tsx` | 177 |
| `front/src/app/pages/cyber-assets.tsx` | 177 |
| `front/src/app/pages/cyber-threats-components.tsx` | 174 |

## 🏗 Architecture & File Structure

### Backend (`back/`)
| File | Description |
|------|-------------|
| `back/main.py` | Основний FastAPI додаток. Імпорт `register_all_routes` з `main_api` та `setup_reset` з `main_reset`. Ініціалізація CORS, Base.metadata.create_all, запуск симуляції. |
| `back/main_routes.py` | Ендпоїнти статистики загроз: `get_threat_statistics()`, `archive_threat()`, `get_archived_threats()`. |
| `back/main_api.py` | **Реєстрація всіх API маршрутів** — `register_all_routes(app)`: імпортує та реєструє simulation routes, threat endpoints, equipment, logs, risks, expert system, analytics. |
| `back/main_reset.py` | **Reset endpoint** — `setup_reset(app)`: `POST /api/v1/reset` — скидання БД, створення 20 одиниць обладнання, 5 бізнес-ризиків, запуск симуляції. Імпорт `simulation_manager` з `simulation_endpoints`. |
| `back/simulation_endpoints.py` | **Симуляційні API-ендпоїнти**: `register_simulation_routes(app)` — реєструє `/api/v1/simulation/*` (status, fix, start, stop) та `/api/v1/actions/block` (auto-fix), а також `/api/v1/threats/archive-and-reboot`. `simulation_manager = SimulationManager()`. |
| `back/models.py` | SQLAlchemy моделі: `Equipment`, `RiskAssessment`, `BusinessRisk`, `Threat`, `User` (JWT auth: username, password_hash, role, totp_secret, is_2fa_enabled). |
| `back/schemas.py` | Pydantic схеми: `ThreatResponse`, `SecurityLog`, `FixRequest`, `SimulationStatus`, `FixResponse`, `UserLogin`, `TwoFactorSetup`, `TwoFactorVerify`, `UserInfo`. |
| `back/auth_utils.py` | **JWT + TOTP утиліти** — `hash_password()` (argon2), `verify_password()`, `create_access_token()`, `decode_access_token()`, `get_totp_uri()`, `get_current_user()` (FastAPI Depends), `require_role()` (RBAC factory). |
| `back/auth_routes.py` | **Auth API routes** — `POST /api/v1/auth/login`, `POST /api/v1/auth/setup-2fa`, `POST /api/v1/auth/verify-2fa`, `POST /api/v1/auth/verify-2fa-login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`. |
| `back/threats.py` | База загроз з трьома категоріями: `warning_threats` (Port Scan, Reconnaissance, Policy Violation тощо), `active_threats` (DDoS, Brute-force, SQL Injection, Phishing, Malware), `critical_threats` (Ransomware, Data Exfiltration, APT, Zero-day, Lateral Movement). Функція `generate_random_threat()` для створення випадкової загрози. |
| `back/attack_definitions.py` | Конфігурація атак: `SIMULATION_ATTACKS` (DDoS з підтипами: Traffic Flood, SYN Flood, NTP Amplification, DNS Amplification, Slowloris, HTTP Flood, UDP Flood; Stealth; Ransomware), `CRITICAL_GATEWAY_IDS`, константи часу. |
| `back/simulation_core.py` | **SimulationCore** — асинхронна логіка гри: `_game_loop()`, `_spawn_attack()`, `_schedule_ransomware_encryption()`, `_apply_stealth_financial_impact()`, `_update_topology_dependencies()` (каскадна ескалація offline-статусу). Імпортує `_random_delay()`, `_pick_attack_type()`, `_generate_unique_ip()`, `_all_equipment_down()` з `simulation_helpers`. |
| `back/simulation_helpers.py` | **Допоміжні функції симуляції** — `_random_delay()`, `_pick_attack_type()`, `_generate_unique_ip()`, `_all_equipment_down()`. Використовується `simulation_core.py`. |
| `back/simulation_topology.py` | **Топологія залежностей та фінансовий вплив**: `TOPOLOGY_CONNECTIONS` — explicit connections між пристроями; `FINANCIAL_PER_TICK` — фінансовий вплив на тик (Stealth: 50000, DDoS: 25000, Ransomware: 80000); `get_connected_devices()`, `get_parent()`, `get_children()`, `get_ancestors()`, `get_descendants()`, `get_subordinate_ips()`, `get_device_by_ip()`, `get_all_device_ips()`, `get_all_device_ids()`. |
| `back/simulation.py` | **SimulationManager** (наспадник SimulationCore) — управління життєвим циклом: `start()`, `stop()`, `apply_fix()` (non-blocking з `_recovery_equipment()` фоновим завданням), `get_status()`. Після відновлення обладнання викликає `_update_topology_dependencies` для перерахунку статусів дочірніх пристроїв. |
| `back/database.py` | Конфігурація підключень: PostgreSQL (SQLAlchemy) + MongoDB (Motor async). Змінні `engine`, `SessionLocal`, `security_logs_collection`. |
| `back/docker-compose.yml` | Docker-конфігурація для запуску PostgreSQL та MongoDB сервісів. |
| `back/requirements.txt` | Python-залежності: FastAPI, SQLAlchemy, Motor, Pydantic, Flask, Jupyter, **PyJWT**, **pyotp**, **passlib[bcrypt]**. |
| `back/test_db.py` | Тестовий скрипт для перевірки підключення до бази даних. |

### Frontend (`front/src/`)
| File | Description |
|------|-------------|
| `front/src/index.html` | HTML-шаблон з `<script type="module" src="/main.tsx">` для вказівки точки входу. Містить script для відновлення theme з `localStorage`. |
| `front/src/main.tsx` | Точка входу React-додатку. Рендерить `<App />` з `React.StrictMode`. |
| `front/src/app/App.tsx` | Кореневий компонент. Обгортає `LanguageProvider` та `RouterProvider`. |
| `front/src/app/routes.tsx` | React Router v7 маршрутизація: 9 маршрутів (Risk Management, Cybersecurity, Analytics, Reports, Settings). |
| `front/src/context/LanguageContext.tsx` | Context API для перемикання мов (EN/UK). Зберігає вибір у `localStorage`. Підтримує nested ключі перекладу. |
| `front/src/translations/uk.ts` | **UK переклади (re-export)** — імпортує `translations` з `./uk-core`. |
| `front/src/translations/uk-core.ts` | **UK базові переклади** — navigation, common, risk_management, cybersecurity, equipment, expert_system, export_modal, notifications, login, settings, not_found, assets, analytics, data, threats, cyber_settings, risk_nav_items, cyber_nav_items. Імпортує `threatKeys` з `./uk-threats`, `extKeys` з `./uk-extended`. |
| `front/src/translations/uk-threats.ts` | **UK загрози** — `threatKeys` (threats.common, threats.categories, threats.types, threats.ddos_subtypes, threats.auto_fix). |
| `front/src/translations/uk-extended.ts` | **UK розширені переклади** — `extKeys` (expert_panel, cyber_assets, cyber_threats, cyber_analytics, risk_matrix, critical_threats, equipment_table, login_modal, sidebar_nav, network_topology, notifications_popover, export_modal, placeholders, exportModal). |
| `front/src/translations/en.ts` | **EN переклади (re-export)** — імпортує `translations` з `./en-core`. |
| `front/src/translations/en-core.ts` | **EN базові переклади** — navigation, common, risk_management, cybersecurity, equipment, expert_system, export_modal, notifications, login, settings, not_found, assets, analytics, data, threats, cyber_settings, risk_nav_items, cyber_nav_items. Імпортує `threatKeys` з `./en-threats`, `extKeys` з `./en-extended`. |
| `front/src/translations/en-threats.ts` | **EN загрози** — `threatKeys` (threats.common, threats.categories, threats.types, threats.ddos_subtypes, threats.auto_fix). |
| `front/src/translations/en-extended.ts` | **EN розширені переклади** — `extKeys` (expert_panel, cyber_assets, cyber_threats, cyber_analytics, risk_matrix, critical_threats, equipment_table, login_modal, sidebar_nav, network_topology, notifications_popover, export_modal, placeholders, exportModal). |
| `front/src/styles/` | CSS стилі: `index.css`, `tailwind.css`, `theme.css`, `fonts.css`. |
| `front/src/vite.config.js` | Vite конфігурація з TailwindCSS та React plugins. |
| `front/src/package.json` | Залежності: MUI 7, React Router 7, Recharts, TailwindCSS 4, Vite 6, Radix UI, Motion, React DnD, Sonner, date-fns, react, react-dom. |

### Frontend Pages (`front/src/app/pages/`)
| File | Description |
|------|-------------|
| `risk-management.tsx` | **Risk Management Dashboard** — Layout: Header (Export, NotificationsPopover), KPI-картки, RiskMatrix (лівa половина), чарти (права половина), CriticalThreats. LIVE + Last updated у одному рядку. Без refresh button (auto-refresh кожні 5 сек). API: `/api/v1/risks/summary`, `/api/v1/logs`, `/api/v1/threats/archived`. |
| `risk-management-hooks.ts` | **Custom hooks** — `useRiskData()`: fetch summary/logs/archived + розрахунки. `useBusinessRisks()`: fetch logs, класифікація атак (DDoS/Ransomware/Stealth), categoryChartData + financialImpactData. |
| `risk-management-charts.tsx` | **Чарти** — `RiskCategoryDonut`: DonutChart (DDoS/Ransomware/Stealth). `RiskFinancialBar`: BarChart з фінансовим вплигом. Кольори: DDoS=червоний, Ransomware=помаранчевий, Stealth=фіолетовий. |
| `cybersecurity.tsx` | **Cybersecurity Dashboard** — головна сторінка кібербезпеки. KPI-картки (critical vulnerabilities, medium risks, sensors offline), EquipmentTable з ієрархічним обладнанням, ExpertPanel для аналізу логів. Індикатор статусу системи (Active Threats / Maintenance / Secure). |
| `analytics.tsx` | **Business Analytics Dashboard** — фінансовий дашборд ризиків (DDoS, Ransomware, Stealth). Картки з фінансовим впливом у USD, графік за часовими інтервалами (auto-refresh 5-10 сек). |
| `reports.tsx` | **Сторінка звітів** — повноцінний інтерактивний дашборд з календарною сіткою, File System Access API (вибір каталогу), IndexedDB-персистентність, side-by-side лейаут. Компоненти: ReportsCalendar (motion анімації, locale залежить від мови), ReportsPanel (RiskMatrix + Recharts, переклад через useTranslation). Типи: ReportData, CalendarDay. Утиліти: `reports-db.ts` (IndexedDB wrapper). Кнопка Select Folder використовує variant="default". Переклади: reports.title, reports.subtitle, reports.select_folder, reports.refresh_data, reports.no_data, reports.report_for_date тощо. |
| `settings.tsx` | Сторінка глобальних налаштувань. |
| `cyber-threats.tsx` | **Threat Statistics** — сторінка статистики загроз з трьома колонками (Незначні, Потребують уваги, Критичні). Використовує ColumnLogs з cyber-threats-components.tsx. NotificationsPopover з riskSummary + displayedLogsCount. API: `/api/v1/threats/statistics`, `/api/v1/logs`, `/api/v1/risks/summary`, `/api/v1/threats/archived`. |
| `cyber-threats-components.tsx` | **Компоненти для cyber-threats** — `ColumnLogs` (колонка з логами загроз), `LogCard` (картка події), `ArchivedLogCard` (архівована картка). |
| `cyber-assets.tsx` | **Cyber Assets (Реєстр захисту активів)** — інтерактивна мапа мережевого обладнання (NetworkTopologyMap). Хедер з пошуком, тумблером режиму (grid/hierarchical) та NotificationsPopover. Без refresh button (auto-refresh кожні 5 сек). API: `/api/v1/equipment`, `/api/v1/logs`, `/api/v1/risks/summary`, `/api/v1/threats/archived`. displayedLogsCount фільтрує логи: `!isResolvedLog && !archivedThreats && classifyThreat !== "warning"`. |
| `cyber-analytics.tsx` | **Cyber Analytics** — сторінка з графіком атак. Імпортує `CyberAnalyticsChart` з `./cyber-analytics-chart`. API: `/api/v1/threats/statistics`, `/api/v1/logs`. |
| `cyber-analytics-chart.tsx` | **Графік атак у реальному часі** — Recharts LineChart. Три лінії: Warning (жовта), Active (помаранчева), Critical (червона). Базові точки з `statistics.hourly` (00:00 до поточної години). Live-точки кожні 60 сек. X-вісь: 00:00, погодинні мітки. `dot={false}`. |
| `analytics-chart.tsx` | **Графік фінансового впливу** — Recharts LineChart. Три лінії: DDoS (червона #ef4444), Ransomware (помаранчева #f97316), Stealth (фіолетова #a855f7). Live-точки кожні 5 сек. Використовується на Business Analytics сторінці. |
| `not-found.tsx` | 404 сторінка. |
| `placeholder.tsx` | **Універсальний placeholder-компонент** — відображає повідомлення "Page Under Construction" з кнопкою повернення. Використовує Sidebar для навігації. |

### Frontend Components (`front/src/app/components/`)
| File | Description |
|------|-------------|
| `sidebar-nav.tsx` | **Бокова навігація** з модульною структурою (Cyber Defense / Risk & Compliance). JWT-автентифікація: декодує токен з `localStorage`, відображає профіль користувача, Logout. RBAC-фільтрація навігації (CEO/CISO/PM). Аuto-показ LoginModal якщо токен відсутній. |
| `login-modal.tsx` | **JWT Login Modal** — двохфазний логін: credentials (username/password) → 2FA (TOTP 6-digit code). API: `/api/v1/auth/login`, `/api/v1/auth/verify-2fa-login`. Callback `onLoginSuccess` зберігає токен у localStorage. |
| `protected-route.tsx` | **Route guard** — `ProtectedRoute` компонент для захисту маршрутів. Перевіряє JWT токен та роль. Якщо доступ заборонено — редірект на дефолтну сторінку. Показує LoginModal якщо не автентифіковано. |
| `sidebar-data.ts` | **Дані навігації** — визначення `CYBER_NAV_ITEMS` та `RISK_NAV_ITEMS` з translation keys (не перекладеними значеннями). `NavItem` тип з `React.ComponentType` іконками. `USERS_DATA` для демо-логін системи. |
| `expert-utils.tsx` | **Утиліти для експертної системи** — `LogStyle` тип, `getLogStyle()` для кольору подій (red/yellow/emerald), `translateLogEventType()` для перекладу типу події, `getEventDescription()` для отримання опису, `mapEventTypeToKey()` маппінг на translation key, `formatDate()` форматування часу, `classifyThreat()` категоризація загроз (warning/active/critical). Підтримує мапінг для DDoS підтипів (Slowloris, UDP Flood, DNS Amplification), ransomware, stealth загроз. |
| `expert-panel.tsx` | **Експертна панель** — live-логи безпеки з MongoDB. Імпортує `ExpertDetailCard` з `./expert-panel-detail`. Використовує `expert-utils.tsx` для перекладу. |
| `expert-panel-detail.tsx` | **Детальна картка експерта** — `ExpertDetailCard` компонент для детального перегляду подій з MongoDB. Кнопка "Apply Fix" для блокування IP через API. Картки загроз сортуються за критичністю (DDoS → Critical, ransomware → High, scan → Medium), з кольоровим фоновим кодуванням. |
| `risk-matrix.tsx` | **Матриця ризиків 5×5** (Probability × Impact). Кольорове кодування: червоний (≥15), жовтий (≥8), зелений (<8). Крапки показують ризики за категоріями (Cyber, Operational, Financial). Підсвічування результатів пошуку. |
| `critical-threats.tsx` | **Топ критичних загроз** — список активних ризиків, відсортованих за score (probability × impact). Фінансовий вплив розраховується як `impact * 750000 + 45000`. Пошук за назвою/категорією. |
| `equipment-table.tsx` | **Таблиця обладнання** — список моніторених пристроїв з фільтрацією по IP, пошуком, сортуванням за risk_level. Статуси: Online, Rebooting, Offline, Unreachable, Encrypted. Кнопка фільтрації логів по IP. Автооновлення кожні 5 сек. |
| `export-modal.tsx` | Модальне вікно експорту звітів (JSON/CSV з реальними даними, `useTranslation`, `reportData` проп). |
| `notifications-popover.tsx` | **Спливаючі нотифікації** — дзвіночок з popover для системних сповіщень. Приймає `apiData` (riskSummary з `critical_threats`, `high_risks`, `sensors_offline`) та опційний `displayedLogsCount` для бейджа. Відображає активні загрози з іконками, кольоровим кодуванням, кнопкою "Mark all as read". Функція `replaceCount()` для підстановки `{count}` у перекладах (t() не підтримує інтерполяцію). Переклад через `useTranslation`. |
| `sim-control-panel.tsx` | **Панель керування симуляцією** — фіксована кнопка зверху (Cpu + "SIM CONTROL"), Popover з: статус (Running/Paused/Stopped), telemetry (Backend Speed, Auto-Fix Speed, Active Attacks), Play/Pause/Resume/Stop, швидкість (1x/2x/4x/10x), New Threat / DB Reset, Auto-Neutralize AI (Switch + інтервал). Використовує `isResolvedThreat`/`isMinorEventType` з `expert-utils`. Ghost Sweeper для очищення stale states. |
| `network-topology-map.tsx` | **Візуалізація мережевої топології** — імпортує `NetworkTopologyMapLayout` з `./network-topology-map-layout`. Чотири сегментовані мережі: Core Backbone, Enterprise, IoT, ICS. |
| `network-topology-map-layout.tsx` | **Лейаут топології** — `NetworkTopologyMapLayout` компонент для відображення мережевої топології. Використовує explicit connections для визначення зв'язків між обладнанням. Каскадна ескалація offline-статусу: якщо батьківський пристрій offline, діти стають Unreachable. Стабільні позиції вузлів (ID-based). Горизонтальний спейс: 600px. Кольорове кодування: червоний (Critical), жовтий (Medium), сірий (Offline/Unreachable), зелений (Safe). |
| `figma/ImageWithFallback.tsx` | Компонент зображення з fallback. |

### UI Components (`front/src/app/components/ui/`)
Універсальні UI компоненти (кнопки, інпути, діалоги) на базі Radix UI та Tailwind. Не редагувати без гострої потреби.

### DevOps (root + `back/`)
| File | Description |
|------|-------------|
| `.github/workflows/ci.yml` | **CI/CD Pipeline** — GitHub Actions workflow: Python 3.11, кешування pip, запуск `pytest -v --tb=short` з `working-directory: back`. Працює на push/PR до `main`. |
| `back/backup.sh` | **Backup Script (Linux)** — Bash скрипт для бекапу PostgreSQL та MongoDB з Docker контейнерів. Читає credentials з `.env`. Підтримує cron job setup. |
| `back/backup.ps1` | **Backup Script (Windows)** — PowerShell еквівалент `backup.sh`. Перевіряє доступність контейнерів перед бекапом, використовує `PGPASSWORD` для PostgreSQL. |
| `back/.env` | **Credentials file** — PostgreSQL (admin/170273 → expert_system), MongoDB (admin/170273 → expert_telemetry). Додано до `.gitignore`. |
| `back/monitoring/prometheus.yml` | Prometheus configuration для моніторингу. |
| `back/monitoring/grafana/provisioning/datasources/datasource.yml` | Grafana datasource provisioning. |
| `back/tests/` | **Test suite** — pytest (19 testів: auth, equipment, simulation). Використовує SQLite in-memory + AsyncMock. |
| `back/pytest.ini` | pytest конфігурація (testpaths, asyncio mode). |
| `back/backups/.gitkeep` | Зберігає директорію бекапів у git. |
| `back/backups/` | Директорія з бекапами (pg_backup_*.sql, mongo_backup_*.archive). Додано до `.gitignore`. |

### Frontend Utilities (`front/src/app/utils/`)
| File | Description |
|------|-------------|
| `front/src/app/utils/api-fetch.ts` | **Fetch interceptor** — автоматично додає `Authorization: Bearer <token>` до всіх запитів. При 401 очищує токен та диспетчеризує `auth-expired` event. |
| `front/scan.py` | Python-скрипт для генерації дерева проектних файлів у `project_structure.txt`. |
| `front/project_structure.txt` | Згенерована структура проекту. |
| `package.json` | Кореневий package.json з залежністю `reactflow`. |

## ⚙️ Tech Stack & Dependencies

### Backend
- **Framework**: FastAPI 0.135.1 (Python)
- **ORM**: SQLAlchemy 2.0.48
- **Database (Relational)**: PostgreSQL (через `psycopg2-binary`)
- **Database (NoSQL)**: MongoDB (через `motor` async)
- **Validation**: Pydantic 2.12.5
- **Server**: Uvicorn 0.42.0
- **Інше**: Flask, Jupyter, pytesseract, opencv-python, telegram-bot, pygame, ultralytics

### Frontend
- **Framework**: React 18.3.1 + TypeScript
- **Build Tool**: Vite 6.4.1
- **UI Library**: Material-UI (MUI) 7.3.5
- **Styling**: TailwindCSS 4.1.12
- **Routing**: React Router 7.13.0
- **Charts**: Recharts 2.15.2
- **Animations**: Motion 12.23.2
- **Components**: Radix UI (універсальні компоненти)
- **Drag & Drop**: React DnD 16.0.1
- **Notifications**: Sonner 2.0.3
- **Utilities**: date-fns, clsx, tailwind-merge, lucide-react

### Root
- **ReactFlow** 11.11.4 — візуалізація графів/діаграм

## 🛑 Project-Specific Rules

1. **Backend API** використовує версіонування `/api/v1/`
2. **Дві бази даних**: PostgreSQL для структурних даних (обладнання, ризики, загрози, користувачі), MongoDB для логів безпеки
3. **JWT Authentication**: Всі захищені API-запити вимагають `Authorization: Bearer <JWT>`. Токен зберігається у `localStorage`. Секрет: `SOC_SIMULATOR_SECRET_K3Y` (змінити в продакшені). Термін дії: 8 годин.
4. **RBAC**: Ролі `CEO`, `CISO`, `PM`. Використовувати `require_role(["CEO", "CISO"])` як FastAPI Depends для захисту ендпоїнтів.
5. **2FA (TOTP)**: Використовує `pyotp`. Секрет зберігається у `User.totp_secret`. 2FA вмикається через `/setup-2fa` → `/verify-2fa`.
6. **Default users**: При DB Reset створюються `ceo`, `ciso`, `pm` з паролем `password123` (хешується через argon2).
7. **Frontend Auth Flow**: `sidebar-nav.tsx` на монтуванні перевіряє JWT → якщо відсутній або прострочений → показує `LoginModal`. Після успішного логіну токен зберігається у localStorage.
8. **Fetch Interceptor**: `api-fetch.ts` автоматично додає Bearer-токен до всіх запитів. При 401 — очищує токен та диспетчеризує `auth-expired` event.
9. **ProtectedRoute**: Обгортайте захищені сторінки `<ProtectedRoute allowedRoles={["CEO", "CISO"]}>`.
10. **Експертна система** автоматично аналізує логи та створює `RiskAssessment` при виявленні підозрілих подій (`unauthorized`, `attack`, `scan`)
11. **Симуляція загроз**: POST `/api/v1/threats/simulate` генерує випадкову загрозу; GET `/api/v1/threats` автоматично створює загрозу якщо база порожня
12. **Reset endpoint** (`POST /api/v1/reset`) повністю скидає БД та генерує 20 одиниць обладнання + стартові дані + seed users
13. **Мови**: переклади зберігаються у `translations/uk.ts` та `translations/en.ts` (re-export з `-core`, `-threats`, `-extended` файлів), доступ через `useTranslation()` hook
14. **CORS**: відкритий для всіх джерел (`allow_origins=["*"]`)
15. **Обладнання має ієрархію** через `parent_id` (self-referencing foreign key)
16. **Симуляція атак**: POST `/api/v1/simulation/start` запускає `SimulationManager` з асинхронним game loop. Три типи атак (DDoS, Stealth, Ransomware) з різною логікою впливу. `apply_fix()` для ручного вирішення інцидентів. Архітектура розділена на 5 файлів: `attack_definitions.py` (константи), `simulation_core.py` (ядро гри), `simulation_helpers.py` (допоміжні функції), `simulation.py` (менеджер), `simulation_endpoints.py` (API-ендпоїнти).
17. **UI-компоненти** (`front/src/app/components/ui/`) не редагуються — це бібліотечні компоненти на базі Radix UI
18. **Максимальна довжина файлу**: 200 рядків (без ui/ компонентів). Якщо файл перевищує — розділити на частини з імпортами.
