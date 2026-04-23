# Project Knowledge Base & Architecture Map

Пам'ятка для AI-агента: Цей файл (PROJECT_MAP.md) містить глобальну архітектуру. Для відстеження поточних задач та кроків використовуй файл cline_tracker.md.

## 🎯 Project Core
Це експертна система для моніторингу кібербезпеки та управління ризиками. Система складається з двох дашбордів:
- **Risk Management Dashboard** — управління бізнес-ризиками, матриця ризиків, відсоток мінімізації
- **Cybersecurity Dashboard** — моніторинг кіберзагроз, обладнання, логи безпеки, автоматичне реагування

Система підтримує двомовний інтерфейс (українська/англійська) та включає механізм симуляції загроз та експертну систему з автоматичним реагуванням на інциденти.

## 🏗 Architecture & File Structure

### Backend (`back/`)
| File | Description |
|------|-------------|
| `back/main.py` | Основний FastAPI додаток. Містить API маршрути для загроз, обладнання, логів, бізнес-ризиків. Викликає `register_simulation_routes(app)` для реєстрації симуляційних ендпоїнтів. Ініціалізація БД при reset. |
| `back/main_routes.py` | Ендпоїнти статистики загроз: `get_threat_statistics()`, `archive_threat()`, `get_archived_threats()`. |
| `back/simulation_endpoints.py` | **Симуляційні API-ендпоїнти**: `register_simulation_routes(app)` — реєструє `/api/v1/simulation/*` (status, fix, start, stop) та `/api/v1/actions/block` (auto-fix). |
| `back/models.py` | SQLAlchemy моделі: `Equipment` (обладнання з ієрархією), `RiskAssessment` (оцінки ризиків), `BusinessRisk` (бізнес-ризики), `Threat` (загрози). |
| `back/schemas.py` | Pydantic схеми для валідації API відповідей: `ThreatResponse`, `SecurityLog`, `FixRequest`, `SimulationStatus`, `FixResponse`. |
| `back/threats.py` | База загроз з трьома категоріями: `warning_threats` (Port Scan, Reconnaissance, Policy Violation тощо), `active_threats` (DDoS, Brute-force, SQL Injection, Phishing, Malware), `critical_threats` (Ransomware, Data Exfiltration, APT, Zero-day, Lateral Movement). Функція `generate_random_threat()` для створення випадкової загрози. |
| `back/attack_definitions.py` | Конфігурація атак: `SIMULATION_ATTACKS` (DDoS з підтипами: Traffic Flood, SYN Flood, NTP Amplification, DNS Amplification, Slowloris, HTTP Flood, UDP Flood; Stealth; Ransomware), `CRITICAL_GATEWAY_IDS`, константи часу. |
| `back/simulation_core.py` | **SimulationCore** — асинхронна логіка гри: `_game_loop()`, `_spawn_attack()`, `_schedule_ransomware_encryption()`, `_apply_stealth_financial_impact()`, `_update_topology_dependencies()` (каскадна ескалація offline-статусу для IoT/Endpoint пристроїв), `_random_delay()`, `_pick_attack_type()`, `_generate_unique_ip()`, `_all_equipment_down()`. |
| `back/simulation.py` | **SimulationManager** (наспадник SimulationCore) — управління життєвим циклом: `start()`, `stop()`, `apply_fix()` (non-blocking з `_recovery_equipment()` фоновим завданням), `get_status()`. Після відновлення обладнання викликає `_update_topology_dependencies` для перерахунку статусів дочірніх пристроїв. |
| `back/simulation_topology.py` | **Топологія залежностей**: `TOPOLOGY_CONNECTIONS` — explicit connections між пристроями; `get_connected_devices()`, `get_parent()`, `get_children()`, `get_ancestors()`, `get_descendants()`, `get_subordinate_ips()`, `get_device_by_ip()`, `get_all_device_ips()`, `get_all_device_ids()`. |
| `back/database.py` | Конфігурація підключень: PostgreSQL (SQLAlchemy) + MongoDB (Motor async). Змінні `engine`, `SessionLocal`, `security_logs_collection`. |
| `back/docker-compose.yml` | Docker-конфігурація для запуску PostgreSQL та MongoDB сервісів. |
| `back/requirements.txt` | Python-залежності: FastAPI, SQLAlchemy, Motor, Pydantic, Flask, Jupyter та ін. |
| `back/test_db.py` | Тестовий скрипт для перевірки підключення до бази даних. |

### Frontend (`front/src/`)
| File | Description |
|------|-------------|
| `front/src/index.html` | HTML-шаблон з `<script type="module" src="/main.tsx">` для вказівки точки входу. Містить script для відновлення theme з `localStorage`. |
| `front/src/main.tsx` | Точка входу React-додатку. Рендерить `<App />` з `React.StrictMode`. |
| `front/src/app/App.tsx` | Кореневий компонент. Обгортає `LanguageProvider` та `RouterProvider`. |
| `front/src/app/routes.tsx` | React Router v7 маршрутизація: 15 маршрутів (Risk Management, Cybersecurity, Analytics, тощо). |
| `front/src/context/LanguageContext.tsx` | Context API для перемикання мов (EN/UK). Зберігає вибір у `localStorage`. Підтримує nested ключі перекладу. |
| `front/src/translations/uk.ts` | Українські переклади UI елементів, включаючи переклади для загроз (DDoS підтипи: Slowloris, UDP Flood, DNS Amplification тощо), категорій загроз (Незначні, Потребують уваги, Критичні). |
| `front/src/translations/en.ts` | Англійські переклади UI елементів, включаючи переклади для загроз (DDoS subtypes: Slowloris, UDP Flood, DNS Amplification), threat categories (Minor, Requires Attention, Critical). |
| `front/src/styles/` | CSS стилі: `index.css`, `tailwind.css`, `theme.css`, `fonts.css`. |
| `front/src/vite.config.js` | Vite конфігурація з TailwindCSS та React plugins. |
| `front/src/package.json` | Залежності: MUI 7, React Router 7, Recharts, TailwindCSS 4, Vite 6, Radix UI, Motion, React DnD, Sonner, date-fns, react, react-dom. |

### Frontend Pages (`front/src/app/pages/`)
| File | Description |
|------|-------------|
| `risk-management.tsx` | **Risk Management Dashboard** — головна сторінка управління ризиками. Відображає KPI-картки (total risks, critical threats, financial exposure, mitigation rate), RiskMatrix та CriticalThreats. Пошук по ризиках, експорт звітів, нотифікації. Автооновлення даних кожні 5 сек з `/api/v1/risks/summary`. |
| `cybersecurity.tsx` | **Cybersecurity Dashboard** — головна сторінка кібербезпеки. KPI-картки (critical vulnerabilities, medium risks, sensors offline), EquipmentTable з ієрархічним обладнанням, ExpertPanel для аналізу логів. Індикатор статусу системи (Active Threats / Maintenance / Secure). |
| `risk-analysis.tsx` | Placeholder-сторінка для майбутньої детальної аналітики ризиків. |
| `projects.tsx` | Placeholder-сторінка для управління проектами. |
| `analytics.tsx` | Placeholder-сторінка для аналітики. |
| `reports.tsx` | Placeholder-сторінка для звітів. |
| `team.tsx` | Placeholder-сторінка для управління командою. |
| `settings.tsx` | Сторінка глобальних налаштувань. |
| `cyber-threats.tsx` | **Threat Statistics** — сторінка статистики загроз з трьома колонками (Незначні, Потребують уваги, Критичні). Відображення логів атак за поточну добу, фільтрація "зелених" (усунутих) загроз, категоризація за критичністю. Кольорове кодування: червоний (DDoS), помаранчевий (ransomware, data leaks), жовтий (scan, injection), зелений (resolved). |
| `cyber-assets.tsx` | Placeholder-сторінка для управління активами. |
| `cyber-access.tsx` | Placeholder-сторінка для контролю доступу. |
| `cyber-data.tsx` | Placeholder-сторінка для управління даними. |
| `cyber-analytics.tsx` | Placeholder-сторінка для кібераналітики. |
| `cyber-settings.tsx` | Placeholder-сторінка для налаштувань кібербезпеки. |
| `not-found.tsx` | 404 сторінка. |
| `placeholder.tsx` | **Універсальний placeholder-компонент** — відображає повідомлення "Page Under Construction" з кнопкою повернення. Використовує Sidebar для навігації. |

### Frontend Components (`front/src/app/components/`)
| File | Description |
|------|-------------|
| `sidebar-nav.tsx` | **Бокова навігація** з модульною структурою (Cyber Defense / Risk & Compliance). Система ролей (CEO, CISO, PM) з демо-логіном через модальне вікно. Блокування доступу для ролей без прав. Переклади через `useTranslation`. |
| `login-modal.tsx` | **Модальне вікно вибору ролі** — `LoginModal` компонент з профілями користувачів (CEO/CISO/PM), кольоровими аватарами, перекладеними підписами. Імпортує `USERS_DATA` з `sidebar-data`. |
| `sidebar-data.ts` | **Дані навігації** — визначення `CYBER_NAV_ITEMS` та `RISK_NAV_ITEMS` з translation keys (не перекладеними значеннями). `NavItem` тип з `React.ComponentType` іконками. `USERS_DATA` для демо-логін системи. |
| `expert-utils.tsx` | **Утиліти для експертної системи** — `LogStyle` тип, `getLogStyle()` для кольору подій (red/yellow/emerald), `translateLogEventType()` для перекладу типу події, `getEventDescription()` для отримання опису, `mapEventTypeToKey()` маппінг на translation key, `formatDate()` форматування часу. Підтримує мапінг для DDoS підтипів (Slowloris, UDP Flood, DNS Amplification), ransomware, stealth загроз. |
| `risk-matrix.tsx` | **Матриця ризиків 5×5** (Probability × Impact). Кольорове кодування: червоний (≥15), жовтий (≥8), зелений (<8). Крапки показують ризики за категоріями (Cyber, Operational, Financial). Підсвічування результатів пошуку. |
| `critical-threats.tsx` | **Топ критичних загроз** — список активних ризиків, відсортованих за score (probability × impact). Фінансовий вплив розраховується як `impact * 750000 + 45000`. Пошук за назвою/категорією. |
| `equipment-table.tsx` | **Таблиця обладнання** — список моніторених пристроїв з фільтрацією по IP, пошуком, сортуванням за risk_level. Статуси: Online, Rebooting, Offline, Unreachable, Encrypted. Кнопка фільтрації логів по IP. Автооновлення кожні 5 сек. |
| `expert-panel.tsx` | **Експертна панель** — live-логи безпеки з MongoDB. Детальний перегляд подій з автоматичним визначенням типу (unauthorized, SQL injection, port scan тощо). Кнопка "Apply Fix" для блокування IP через API. Використовує `expert-utils.tsx` для перекладу. Картки загроз сортуються за критичністю (DDoS → Critical, ransomware → High, scan → Medium), з кольоровим фоновим кодуванням. |
| `export-modal.tsx` | Модальне вікно експорту звітів. |
| `notifications-popover.tsx` | Спливаючі нотифікації на основі даних з API. |
| `network-topology-map.tsx` | **Візуалізація мережевої топології** — використовує explicit connections для визначення зв'язків між обладнанням. Чотири сегментовані мережі: Core Backbone (Router → Switch), Enterprise (Core Switch → Servers/Endpoints), IoT (Guest WiFi → IoT devices), ICS (SCADA → PLC/Sensors). Каскадна ескалація offline-статусу: якщо батьківський пристрій offline, діти стають Unreachable. Стабільні позиції вузлів (ID-based). Горизонтальний спейс: 600px. Кольорове кодування: червоний (Critical), жовтий (Medium), сірий (Offline/Unreachable), зелений (Safe). |
| `figma/ImageWithFallback.tsx` | Компонент зображення з fallback. |

### UI Components (`front/src/app/components/ui/`)
Універсальні UI компоненти (кнопки, інпути, діалоги) на базі Radix UI та Tailwind. Не редагувати без гострої потреби.

### Frontend Utilities (`front/`)
| File | Description |
|------|-------------|
| `front/scan.py` | Python-скрипт для генерації дерева проектних файлів у `project_structure.txt`. |
| `front/project_structure.txt` | Згенерована структура проекту. |
| `package.json` | Кореневий package.json з залежністю `reactflow`. |

## 🐛 Known Issues & Fixes

### 2026-04-23: Auto-fix не скидав active_attacks
При натисканні "Усунути загрозу" (експерт-панель) викликався `/api/v1/actions/block`, який встановлював статус обладнання в "Rebooting" і запускав background task `reboot_equipment`. Після 5 секунд статус змінювався на "Online", але `simulation_manager.active_attacks` все ще містив запис для цього пристрою. Це призводило до того, що `will_be_attacked = can_attack and not in_active_attacks` завжди повертало `false`, і пристрій більше не міг бути атакованим.

**Виправлення:** Додано видалення з `active_attacks` в `reboot_equipment()` та `_apply_auto_fix()` у `back/simulation_endpoints.py`. Також виправлено виклик `_update_topology_dependencies(db)` (замість `self.`).

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
- **Animations**: Motion 12.23.24
- **Components**: Radix UI (універсальні компоненти)
- **Drag & Drop**: React DnD 16.0.1
- **Notifications**: Sonner 2.0.3
- **Utilities**: date-fns, clsx, tailwind-merge, lucide-react

### Root
- **ReactFlow** 11.11.4 — візуалізація графів/діаграм

## 🛑 Project-Specific Rules

1. **Backend API** використовує версіонування `/api/v1/`
2. **Дві бази даних**: PostgreSQL для структурних даних (обладнання, ризики, загрози), MongoDB для логів безпеки
3. **Експертна система** автоматично аналізує логи та створює `RiskAssessment` при виявленні підозрілих подій (`unauthorized`, `attack`, `scan`)
4. **Симуляція загроз**: POST `/api/v1/threats/simulate` генерує випадкову загрозу; GET `/api/v1/threats` автоматично створює загрозу якщо база порожня
5. **Reset endpoint** (`POST /api/v1/reset`) повністю скидає БД та генерує 20 одиниць обладнання + стартові дані
6. **Мови**: переклади зберігаються у `translations/uk.ts` та `translations/en.ts`, доступ через `useTranslation()` hook
7. **CORS**: відкритий для всіх джерел (`allow_origins=["*"]`)
8. **Обладнання має ієрархію** через `parent_id` (self-referencing foreign key)
9. **Симуляція атак**: POST `/api/v1/simulation/start` запускає `SimulationManager` з асинхронним game loop. Три типи атак (DDoS, Stealth, Ransomware) з різною логікою впливу. `apply_fix()` для ручного вирішення інцидентів. Архітектура розділена на 4 файли: `attack_definitions.py` (константи), `simulation_core.py` (ядро гри), `simulation.py` (менеджер), `simulation_endpoints.py` (API-ендпоїнти).
10. **Експертна система**: `expert-utils.tsx` містить утиліти для перекладу подій (`translateLogEventType`, `getEventDescription`), `sidebar-data.ts` визначає навігаційні items з translation keys для уникнення hook violation