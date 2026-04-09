import { useEffect, useState } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { EquipmentTable } from "../components/equipment-table";
import { ExpertPanel } from "../components/expert-panel";
import { Card } from "../components/ui/card";
import { AlertTriangle, Shield, ServerOff } from "lucide-react";
import { NotificationsPopover } from "../components/notifications-popover";

export default function CybersecurityDashboard() {
  const [apiData, setApiData] = useState<any>(null);
  const [filterIp, setFilterIp] = useState<string | null>(null);

  const fetchSummary = () => {
    fetch("http://127.0.0.1:8000/api/v1/risks/summary")
      .then((res) => res.json())
      .then((data) => setApiData(data))
      .catch((err) => console.error("Помилка завантаження даних:", err));
  };

  useEffect(() => {
    // Завантажуємо тему з налаштувань
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else if (savedTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (!isDark) document.documentElement.classList.remove("dark");
      else document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.add("dark"); // За замовчуванням
    }
    
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    // Головний контейнер на весь екран без прокрутки
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-10 shrink-0">
          <div>
            <h1 className="text-card-foreground font-semibold">Cybersecurity Dashboard</h1>
            <p className="text-xs text-muted-foreground">Real-time threat monitoring</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <NotificationsPopover apiData={apiData} />

            {/* ДИНАМІЧНИЙ СТАТУС */}
            {apiData?.critical_threats > 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                <Shield className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-sm text-red-500 font-medium">Active Threats</span>
              </div>
            ) : apiData?.sensors_offline > 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-500 font-medium">Maintenance / Reboot</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-500 font-medium">Systems Secure</span>
              </div>
            )}
          </div>
        </header>

        {/* Обмежуємо main по висоті, щоб скрол був лише у таблиці та логах */}
        <main className="flex-1 p-6 flex flex-col overflow-hidden">
          <div className="max-w-[1800px] w-full mx-auto flex-1 flex gap-6 min-h-0">
            
            {/* Ліва колонка (Картки + Таблиця) */}
            <div className="flex-1 flex flex-col space-y-6 min-h-0">
              
              {/* SUMMARY METRICS */}
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <Card className="p-6 bg-card border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Critical Vulnerabilities</p>
                      <p className="text-3xl text-red-500 font-semibold">
                        {apiData ? apiData.critical_threats : "..."}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-500">↑ Requires attention</span>
                  </div>
                </Card>

                <Card className="p-6 bg-card border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Medium Risks</p>
                      <p className="text-3xl text-yellow-500 font-semibold">
                        {apiData ? apiData.medium_risks : "..."}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-yellow-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Scheduled for patching</span>
                  </div>
                </Card>

                <Card className="p-6 bg-card border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Sensors Offline / Rebooting</p>
                      <p className="text-3xl text-gray-500 font-semibold">
                        {apiData ? apiData.sensors_offline : "..."}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                      <ServerOff className="w-5 h-5 text-gray-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Maintenance mode</span>
                  </div>
                </Card>
              </div>

              {/* Equipment Table (займає весь залишок висоти зліва) */}
              <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
                <EquipmentTable filterIp={filterIp} setFilterIp={setFilterIp} />
              </div>
            </div>

            {/* Right Column - Expert Panel (займає всю доступну висоту) */}
            <div className="w-[420px] shrink-0 h-full flex flex-col">
              <ExpertPanel filterIp={filterIp} />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}