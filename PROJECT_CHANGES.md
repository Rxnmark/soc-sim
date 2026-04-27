# Project Changes Log

## 🔧 Recent Changes

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

## 🐛 Known Issues & Fixes

### 2026-04-26: ImportError 'simulation_manager' after file split
Після розділення `main.py`, `main_reset.py` намагався імпорт `simulation_manager` з `simulation.py`, але він знаходиться в `simulation_endpoints.py`.
**Виправлення:** Змінено `from simulation import simulation_manager` на `from simulation_endpoints import simulation_manager` в `back/main_reset.py`.

### 2026-04-23: Auto-fix не скидав active_attacks
При натисканні "Усунути загрозу" (експерт-панель) викликався `/api/v1/actions/block`, який встановлював статус обладнання в "Rebooting" і запускав background task `reboot_equipment`. Після 5 секунд статус змінювався на "Online", але `simulation_manager.active_attacks` все ще містив запис для цього пристрою. Це призводило до того, що `will_be_attacked = can_attack and not in_active_attacks` завжди повертало `false`, і пристрій більше не міг бути атакованим.

**Виправлення:** Додано видалення з `active_attacks` в `reboot_equipment()` та `_apply_auto_fix()` у `back/simulation_endpoints.py`. Також виправлено виклик `_update_topology_dependencies(db)` (замість `self.`).

### 2026-04-25: Equipment не відновлюється після паузи симуляції
Після зупинки симуляції через відсутність доступного обладнання (`No available equipment`), при продовженні симуляції пристрої, атаковані DDoS/Minor атаками, не відновлювалися після ручного усунення загроз. Причиною був race condition: `_recovery_equipment()` перевіряв `equipment_id not in self.active_attacks`, але DDoS-атаки видалялися з `active_attacks` одразу після застосування ефекту. Також пристрої в "Rebooting" могли потрапити на нові атаки через `_get_available_equipment()`.

**Виправлення:**
1. `back/simulation.py`: Прибрана перевірка `equipment_id not in self.active_attacks` в `_recovery_equipment()` — тепер обладнання відновлюється незалежно від наявності в `active_attacks`.
2. `back/simulation_topology.py`: Додано "Rebooting" у список статусів, які виключаються з доступних для атаки в `_get_available_equipment()`.
3. `back/simulation_topology.py`: Повернуто стандартну поведінку `propagate_offline` (без "Rebooting") — пристрої в "Rebooting" більше не блокують каскадне відновлення дітей.