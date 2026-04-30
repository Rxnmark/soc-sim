# Project Changes Log

## 🔧 Recent Changes

### 2026-04-29: CI/CD Pipeline та Database Backup Scripts
- **`.github/workflows/ci.yml`** — **НОВИЙ** GitHub Actions workflow: Python 3.11, кешування pip, запуск `pytest -v --tb=short` з `working-directory: back`. Працює на push/PR до `main`. Тести використовують SQLite in-memory + AsyncMock (без зовнішніх сервісів).
- **`back/backup.sh`** — **НОВИЙ** Bash скрипт для бекапу PostgreSQL та MongoDB з Docker контейнерів. Читає credentials з `.env`, використовує `PGPASSWORD` для PostgreSQL, підтримує cron job setup.
- **`back/backup.ps1`** — **НОВИЙ** PowerShell скрипт (Windows еквівалент `backup.sh`). Перевіряє доступність контейнерів Docker перед бекапом, використовує `PGPASSWORD` для PostgreSQL.
- **`back/.env`** — **НОВИЙ** credentials file: PostgreSQL (admin/170273 → expert_system), MongoDB (admin/170273 → expert_telemetry).
- **`.gitignore`** — оновлено: додано `back/.env` та `back/backups/` для виключення з версійного контролю.
- **`back/backups/.gitkeep`** — **НОВИЙ** для збереження директорії бекапів у git.
- Виправлено `backup.ps1` та `backup.sh` — `pg_dump` тепер використовує `env PGPASSWORD=$PGPassword` (раніше пароль не передавався, бекап не працював).
- Додано перевірку контейнерів Docker у `backup.ps1` — вихід з помилкою, якщо контейнери не запущені.
- Верифікація: pytest пройшов (19 passed, 1.05s).

### 2026-04-29: Впровадження JWT + 2FA Автентифікації та RBAC
- **front/src/vite.config.js** — додано конфігурацію проксі (`/api/v1` -> `http://localhost:8000`). Це виправило помилку "Network error" при логіні, оскільки раніше фронтенд намагався робити запити на порт Vite (5173).
- **back/main.py** — додано `Base.metadata.create_all(bind=engine)` для автоматичного створення таблиць (зокрема нової таблиці `users`) при запуску. Видалено дублювання реєстрації маршрутів.
- **back/auth_utils.py** — змінено алгоритм хешування з `bcrypt` на `argon2`. Це вирішило критичну помилку `ValueError: password cannot be longer than 72 bytes`, яка виникала в бібліотеці `passlib` при ініціалізації bcrypt на Windows/Python 3.11.
- **back/main_api.py** — впроваджено Role-Based Access Control (RBAC). Всі маршрути тепер захищені через `Depends(require_role(...))`:
    - **CEO**: Повний доступ до всього.
    - **CISO**: Тільки Cyber Defense (обладнання, загрози, симуляція).
    - **PM**: Тільки Risk Management (звіти, бізнес-ризики).
- **front/src/app/pages/...** — оновлено `risk-management-hooks.ts`, `cybersecurity.tsx`, `equipment-table.tsx` та `expert-panel.tsx`: тепер вони використовують `authenticatedFetch` (додає Bearer токен) та відносні шляхи замість абсолютних `http://127.0.0.1:8000`.
- **Database Seeding** — успішно виконано початковий посів користувачів: `ceo`, `ciso`, `pm` (пароль: `password123`).


### 2026-04-29: Виправлення синхронізації UI з бекендом (Швидкість, NotificationsPopover, Auto-Neutralize)
- **schemas.py** — додано поля `speed_multiplier` (float) та `is_paused` (bool) у схему `SimulationStatus`. Це виправило баг, коли зміна швидкості на UI не відображалася як оновлена з бекенду (завжди показувало 1x), бо FastAPI обрізав ці поля при відповіді.
- **sim-control-panel.tsx** — виправлено баг `Auto-Neutralize`, який зациклювався на старих загрозах і не міг очистити нові. Тепер скрипт спочатку завантажує список архівованих загроз (`/api/v1/threats/archived`) і фільтрує лог, ігноруючи вже оброблені загрози та ті, чиє обладнання вже має статус Safe.
- **expert-panel.tsx** — панель тепер кожні 5 сек завантажує стан обладнання (`/api/v1/equipment`). Якщо загроза націлена на обладнання, яке вже має статуси "Online/Rebooting" та "Safe", картка автоматично приховується. Це запобігає зависанню карток, коли загроза була усунена іншим шляхом (наприклад, через авто-відновлення чи Ghost Sweeper).
- **notifications-popover.tsx** — дзвіночок сповіщень більше не спирається на локальний підрахунок логів (який відставав від бази), а використовує прямі дані `apiData` (critical_threats, high_risks, sensors_offline), завжди показуючи абсолютно точну кількість актуальних проблем.

### 2026-04-29: Виправлення зависання при скиданні БД та багу самоочищення
- **back/simulation_endpoints.py** — видалено `await security_logs_collection.delete_many({})` з `clear_ghosts`. Ghost Sweeper більше не видаляє історію логів з MongoDB, усуваючи ефект "самочинного скидання" бази даних при досягненні безпечного стану.
- **back/main_reset.py** — змінено логіку `/api/v1/reset`. Замість `drop_all` (який викликав deadlock через ексклюзивне блокування таблиць, коли фонові задачі автореагування тримали активні транзакції) тепер використовується безпечне очищення рядків через `db.query(...).delete()`. Додано `simulation_manager.stop()` перед очищенням бази для запобігання новим фоновим запитам.


### 2026-04-29: Business Analytics Dashboard — Financial Impact Metrics
- **analytics.tsx** — повне перепрофілювання placeholder-сторінки: Business Analytics Dashboard з фінансовими метриками для 3 категорій ризиків (DDoS, Ransomware, Stealth). Картки з фінансовим впливом у USD (формат `Intl.NumberFormat`), графік за часовими інтервалами (auto-refresh 5 сек), підтягування даних з `/api/v1/risks/summary` (polling 10 сек).
- **analytics-chart.tsx** — новий компонент Recharts LineChart для візуалізації фінансового впливу. Три лінії: DDoS (червона #ef4444), Ransomware (помаранчева #f97316), Stealth (фіолетова #a855f7). Live-точки кожні 5 сек.
- **en-extended.ts** — додано `businessAnalytics` (title, subtitle, live, last_updated) та `financialStats` (ddos, ransomware, stealth, hourly_chart, currency) ключі.
- **uk-extended.ts** — українські переклади для `businessAnalytics` та `financialStats`.
- **PROJECT_MAP.md** — оновлено з новими файлами та описами.

### 2026-04-28: Оновлення Export Report на Risk Management + Sim Control Panel
- **export-modal.tsx** — повне перепирання: доданено `reportData` проп (apiData, unprocessedCount, mitigationRate, categoryChartData, financialImpactData, lastUpdated), `useTranslation()` для всього тексту, `RadioGroup` замість ToggleGroup для вибору JSON/CSV, `handleExport` з генерацією Blob/ObjectURL для завантаження, `isExporting` стан з спинером. Видалено DatePicker (експорт поточних даних).
- **risk-management.tsx** — ExportModal тепер отримує `reportData` з реальними даними.
- **en-extended.ts** / **uk-extended.ts** — `exportModal` з ключами: title, description, format, cancel, download, success, report_summary, matrix_data, threats_analysis, financial_impact.
- **en-core.ts** / **uk-core.ts** — `dashboard.export_reports` переклад.
- **sim-control-panel.tsx** — нова панель керування симуляцією (Popover): статус, telemetry (Backend Speed, Auto-Fix Speed, Active Attacks), Play/Pause/Resume/Stop, швидкість (1x/2x/4x/10x), New Threat / DB Reset, Auto-Neutralize AI з Ghost Sweeper failsafe.
- **PROJECT_MAP.md** — оновлено з новою структурою та описами.
- **PROJECT_CHANGES.md** — оновлено.

### 2026-04-27: Фікс `POST /api/v1/threats/archive-and-reboot` (ітерація 2) + фільтр Minor/Warning у `GET /api/v1/threats`
- **Проблема #1:** `_block_equipment()` шукала обладнання за `request.source_ip`, але `source_ip` — це IP атакуючого, а не IP цілі. Через це обладнання не знаходилося.
- **Проблема #2 (ітерація 1):** Перевірка `has_attacks` використовувала MongoDB logs, які ніколи не очищуються → `has_attacks` завжди `True` → перезавантаження не спрацьовувало.
- **Проблема #2 (ітерація 2):** Перезавантаження спрацьовувало при кожному виклику (не тільки для останньої загрози). Причиною було те, що симуляція створює нові атаки асинхронно, тому перевірка за MongoDB не працювала.
- **Проблема #3:** `GET /api/v1/threats` повертав Minor/Warning загрози, які мають бути приховані.
- **Виправлення #1:** `_block_equipment()` тепер шукає обладнання по останньому неопрацьованому `risk_assessment` (`equipment_id`), а не за `source_ip`.
- **Виправлення #2:** Перевірка `remaining_attacks` використовує `risk_assessments.is_resolved` (окрім Warning). Перезавантаження спрацьовує тільки коли `remaining_attacks == 0`.
- **Виправлення #3:** `GET /api/v1/threats` фільтрує за `category.notin_(["Minor", "Warning"])`.

### 2026-04-27: Розділення risk-management.tsx на 3 модулі (<200 рядків)
- `front/src/app/pages/risk-management.tsx` → `risk-management.tsx` + `risk-management-hooks.ts` + `risk-management-charts.tsx` (layout + hooks + чарти)
- Всі файли < 130 рядків.

### 2026-04-26: Розділення великих файлів (<200 рядків)
- `back/main.py` → `main.py` + `main_api.py` + `main_reset.py` (реєстрація маршрутів, reset логіка, основний файл)
- `back/simulation_core.py` → `simulation_core.py` + `simulation_helpers.py` (ядро гри + допоміжні функції)
- `front/src/app/components/expert-panel.tsx` → `expert-panel.tsx` + `expert-panel-detail.tsx` (панель + детальна картка)
- `front/src/app/components/network-topology-map.tsx` → `network-topology-map.tsx` + `network-topology-map-layout.tsx` (топологія + лейаут)
- `front/src/app/pages/cyber-analytics.tsx` → `cyber-analytics.tsx` + `cyber-analytics-chart.tsx` (сторінка + графік)
- `front/src/translations/uk.ts` → `uk.ts` + `uk-core.ts` + `uk-threats.ts` + `uk-extended.ts` (re-export структура)
- `front/src/translations/en.ts` → `en.ts` + `en-core.ts` + `en-threats.ts` + `en-extended.ts` (re-export структура)

### 2026-04-26: Cyber Analytics — графік атак у реальному часі + виправлення часового поясу
- Створено `cyber-analytics.tsx` — сторінка з графіком атак (Recharts LineChart). Три лінії: Warning, Active, Critical.
- Базові точки генеруються з `statistics.hourly` (00:00 до поточної години). Live-точки додаються кожні 60 сек.
- X-вісь: 00:00, погодинні мітки, остання точка. Без точок (`dot={false}`).
- Виправлено часовий пояс у `back/main_routes.py`: MongoDB зберігає UTC, тому фільтр `start_of_day`/`end_of_day` тепер конвертує локальний час в UTC перед порівнянням.
- Виправлено hourly bucketing: naive timestamp з MongoDB тепер припускається як UTC (`ts.replace(tzinfo=timezone.utc)`) → `ts.astimezone(LOCAL_TZ)`.

### 2026-04-25: Cyber Assets — NotificationsPopover, переклад, повноекранна мапа
- Додано NotificationsPopover на cyber-assets.tsx (дзвіночок у правий верхній кут хедера).
- Прибрано картки-лічильники (Total assets, Healthy, Critical threats, Systems offline) — мапа розтягнута на всю сторінку.
- Додано переклад `notifications.*` у uk.ts та en.ts (system_alerts, actionable, no_active_alerts, critical_threats, high_risks, sensors_offline, mark_all_read).
- Оновлено notifications-popover.tsx — замінив хардкод на t() з useTranslation, додав replaceCount() для `{count}`.
- cyber-assets.tsx підтягує `/api/v1/equipment`, `/api/v1/logs`, `/api/v1/risks/summary`, `/api/v1/threats/archived`.
- displayedLogsCount фільтрує: `!isResolvedLog && !archivedThreats && classifyThreat !== "warning"`.
- Додано `classifyThreat()` в expert-utils.tsx для категоризації загроз (warning/active/critical).

### 2026-04-23: Зміна лічильників на сторінці Cybersecurity Dashboard
- Замінено "active" на "unsafe" в підписі Escalation (cybersecurity.tsx, equipment-table.tsx) — відображає кількість обладнання, яке не має статусу "Безпечно" (не "Online").
- Escalation перенесено з cybersecurity.tsx в equipment-table.tsx (відображається справа від заголовка "Моніторинг обладнання").
- Замінено лічильник на іконці дзвоника (NotificationsPopover) з суми карток (11+9+14=34 actionable) на кількість неопрацьованих логів з expert-panel (displayedLogsCount).
- CybersecurityDashboard тепер підтягує логи з `/api/v1/logs` та архівовані загрози з `/api/v1/threats/archived`.
- displayedLogsCount у NotificationsPopover фільтрує: `!isResolvedThreat(log.event_type) && !archivedThreats.has(log.source_ip)`.
- NotificationsPopover приймає опційний проп `displayedLogsCount` — якщо не передано, використовує стару логіку (сума карток).
- Escalation видалено з UI (користувач вирішив, що він зайвий).

### 2026-04-29: Реалізація сторінки "Звіти" (Reports Dashboard)
- **reports-db.ts** — новий файл: IndexedDB wrapper для збереження `FileSystemDirectoryHandle` (без зовнішніх залежностей). Функції: `saveDirectoryHandle`, `getDirectoryHandle`, `deleteDirectoryHandle`.
- **reports.tsx** — повне перероблення: замінено Drag & Drop на `window.showDirectoryPicker()` (вибір каталогу), IndexedDB-персистентність (при поверненні на сторінку автоматичне відновлення доступу до каталогу), side-by-side лейаут (50/50: календар + панель), кнопки "Select Folder" і "Refresh Data". Кнопка Select Folder використовує variant="default" (always primary color).
- **reports-panel.tsx** — видалено `Sheet` обгортку, замінено на звичайний `div` контейнер. Додано `RiskMatrix` (з `../components/risk-matrix`). Адаптивний лейаут: `h-full flex flex-col`, графіки з `flex-1 min-h-0`. Кольори синхронізовані: DDoS=#ef4444, Ransomware=#f97316, Stealth=#a855f7. Сітка 2x2 для графіків. Усі тексти перекладені через `useTranslation()`.
- **reports-calendar.tsx** — додано `isLoading` проп. Skeleton-завантаження (35 пульсуючих div) при `isLoading`. Motion-анімація: каскадна поява днів з `delay: index * 0.02`. Locale залежить від мови (uk/en через `date-fns/locale`).
- **uk-core.ts** / **en-core.ts** — додано ключі `reports.select_folder`, `reports.refresh_data`, `reports.loading`, `reports.report_for_date`.

## 🐛 Known Issues & Fixes

### 2026-04-26: ImportError 'simulation_manager' after file split
Після розділення `main.py`, `main_reset.py` намагався імпорт `simulation_manager` з `simulation.py`, але він знаходиться в `simulation_endpoints.py`.
**Виправлення:** Змінено `from simulation import simulation_manager` на `from simulation_endpoints import simulation_manager` в `back/main_reset.py`.

### 2026-04-23: Auto-fix не скидав active_attacks
При натисканні "Усунути загрозу" (експерт-панель) викликався `/api/v1/actions/block`, який встановлював статус обладнання в "Rebooting" і запускав background task `reboot_equipment`. Після 5 секунд статус змінювався на "Online", але `simulation_manager.active_attacks` все ще містив запис для цього пристрою. Це призводило до того, що `will_be_attacked = can_attack and not in_active_attacks` завжди повертало `false`, і пристрій більше не міг бути атакованим.

**Виправлення:** Додано видалення з `active_attacks` в `reboot_equipment()` та `_apply_auto_fix()` у `back/simulation_endpoints.py`. Також виправлено виклик `_update_topology_dependencies(db)` (замість `self.`).

### 2026-04-28: Оновлення UI risk-management та cyber-assets сторінок
- **risk-management.tsx**:
  - Видалено refresh button (кнопка `<RefreshCw>`)
  - LIVE + Last updated тепер у одному рядку, title відцентрований
  - subtitle змінено на "Оцінка фінансового впливу ризиків"
  - Переклад `riskManagement.last_updated` додано в uk-core.ts
- **cyber-assets.tsx**:
  - Видалено refresh button з хедера
  - LIVE + Last updated у одному рядку, title відцентрований
  - Додано `assets.subtitle` переклад: "Мережеві пристрої та інфраструктура" (uk) / "Network devices and infrastructure" (en)
  - Додано `assets.title` переклад: "Реєстр захисту активів" (uk) / "Asset Protection Registry" (en)
  - Додано `last_updated` переклад: "Останнє оновлення" (uk) / "Last updated:" (en)
- **risk-matrix.tsx**:
  - Виправлено структуру сітки: тепер сітка займає `flex-1`, IMPACT label розташований окремо під сіткою (`shrink-0`), щоб не накладався на сітку
- **simulation_topology.py**:
  - Збільшено фінансовий вплив ransomware: `FINANCIAL_PER_TICK["Ransomware"]` з 10000 до 80000 (на тик)
  - Це робить колонку ransomware на чарті "Фінансовий вплив за типами" приблизно 1/3 від DDoS

### 2026-04-28: Виправлення перезавантаження обладнання + видалення логу "Equipment Rebooted"
- **Проблема:** `_block_equipment()` шукав обладнання за "найновішому unresolved ризику", а не за конкретний пристрій з картки загрози. При кількох активних загрозах перезавантажувався неправильний пристрій.
- **Виправлення #1:** Додано `target_equipment_id: target.id` у MongoDB логи при створенні загроз (`simulation_core.py`).
- **Виправлення #2:** `_block_equipment()` тепер використовує 3-рівневе знаходження: (1) `target_equipment_id` з запиту, (2) найновіший unresolved ризик, (3) пошук по `source_ip`.
- **Виправлення #3:** `_block_equipment` зроблено асинхронним, виправлено виклики у `_apply_auto_fix` та `_archive_and_reboot`.
- **Виправлення #4:** `FixRequest` schema отримала нове поле `target_equipment_id: int | None = None`.
- **Виправлення #5:** Frontend (`expert-panel.tsx`) тепер передає `target_equipment_id` з логу при виклику `archive-and-reboot`.
- **Виправлення #6:** Видалено лог "Equipment Rebooted" з `reboot_equipment()` — він більше не з'являтиметься в expert-panel.

### 2026-04-25: Equipment не відновлюється після паузи симуляції
Після зупинки симуляції через відсутність доступного обладнання (`No available equipment`), при продовженні симуляції пристрої, атаковані DDoS/Minor атаками, не відновлювалися після ручного усунення загроз. Причиною був race condition: `_recovery_equipment()` перевіряв `equipment_id not in self.active_attacks`, але DDoS-атаки видалялися з `active_attacks` одразу після застосування ефекту. Також пристрої в "Rebooting" могли потрапити на нові атаки через `_get_available_equipment()`.

**Виправлення:**
1. `back/simulation.py`: Прибрана перевірка `equipment_id not in self.active_attacks` в `_recovery_equipment()` — тепер обладнання відновлюється незалежно від наявності в `active_attacks`.
2. `back/simulation_topology.py`: Додано "Rebooting" у список статусів, які виключаються з доступних для атаки в `_get_available_equipment()`.
3. `back/simulation_topology.py`: Повернуто стандартну поведінку `propagate_offline` (без "Rebooting") — пристрої в "Rebooting" більше не блокують каскадне відновлення дітей.