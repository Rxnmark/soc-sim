import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { EquipmentTable } from "../components/equipment-table";
import { ExpertPanel } from "../components/expert-panel";
import { Card } from "../components/ui/card";
import { AlertTriangle, Shield, ServerOff } from "lucide-react";
import { NotificationsPopover } from "../components/notifications-popover";
import { useTranslation } from "../../context/LanguageContext";
import { isResolvedThreat } from "../components/expert-utils";

export default function CybersecurityDashboard() {
  const { t } = useTranslation();
  const [apiData, setApiData] = useState<any>(null);
  const [filterIp, setFilterIp] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [archivedThreats, setArchivedThreats] = useState<Set<string>>(new Set());

  const fetchSummary = () => {
    fetch("http://127.0.0.1:8000/api/v1/risks/summary")
      .then((res) => res.json())
      .then((data) => setApiData(data))
      .catch((err) => console.error("Error fetching data:", err));
  };

  const fetchLogs = () => {
    fetch("http://127.0.0.1:8000/api/v1/logs")
      .then((res) => res.json())
      .then((data) => setLogs(data))
      .catch((err) => console.error("Error loading logs:", err));
  };

  const fetchArchived = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/threats/archived");
      const data = await res.json();
      setArchivedThreats(new Set<string>(data.map((a: any) => String(a.source_ip))));
    } catch (err) {
      console.error("Error loading archived:", err);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else if (savedTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (!isDark) document.documentElement.classList.remove("dark");
      else document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
    
    fetchSummary();
    fetchLogs();
    fetchArchived();
    const dataInterval = setInterval(fetchSummary, 5000);
    const logInterval = setInterval(fetchLogs, 5000);
    const archivedInterval = setInterval(fetchArchived, 5000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(logInterval);
      clearInterval(archivedInterval);
    };
  }, []);

  const displayedLogsCount = useMemo(() => {
    return logs.filter(log => !isResolvedThreat(log.event_type) && !archivedThreats.has(log.source_ip)).length;
  }, [logs, archivedThreats]);

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-card-foreground font-semibold">{t('dashboard.title', 'Cybersecurity Dashboard')}</h1>
            <p className="text-xs text-muted-foreground">{t('dashboard.subtitle', 'Real-time threat monitoring')}</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationsPopover apiData={apiData} displayedLogsCount={displayedLogsCount} />

            {apiData?.critical_threats > 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                <Shield className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-sm text-red-500 font-medium">{t('dashboard.active_threats', 'Active Threats')}</span>
              </div>
            ) : apiData?.sensors_offline > 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-500 font-medium">{t('dashboard.maintenance', 'Maintenance / Reboot')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-500 font-medium">{t('dashboard.systems_secure', 'Systems Secure')}</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 flex flex-col overflow-hidden">
          <div className="max-w-[1800px] w-full mx-auto flex-1 flex gap-6 min-h-0">
            <div className="flex-1 flex flex-col space-y-6 min-h-0">
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <Card className="p-6 bg-card border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('dashboard.critical_vulnerabilities', 'Critical Vulnerabilities')}</p>
                      <p className="text-3xl text-red-500 font-semibold">
                        {apiData ? apiData.critical_threats : "..."}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-500">{t('dashboard.requires_attention', 'Requires attention')}</span>
                  </div>
                </Card>

                <Card className="p-6 bg-card border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('dashboard.medium_risks', 'Medium Risks')}</p>
                      <p className="text-3xl text-yellow-500 font-semibold">
                        {apiData ? apiData.medium_risks : "..."}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-yellow-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t('dashboard.scheduled_patching', 'Scheduled for patching')}</span>
                  </div>
                </Card>

                <Card className="p-6 bg-card border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('dashboard.sensors_offline', 'Sensors Offline / Rebooting')}</p>
                      <p className="text-3xl text-gray-500 font-semibold">
                        {apiData ? apiData.sensors_offline : "..."}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                      <ServerOff className="w-5 h-5 text-gray-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t('dashboard.maintenance_mode', 'Maintenance mode')}</span>
                  </div>
                </Card>
              </div>

              <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
                <EquipmentTable filterIp={filterIp} setFilterIp={setFilterIp} />
              </div>
            </div>

            <div className="w-[420px] shrink-0 h-full flex flex-col">
              <ExpertPanel filterIp={filterIp} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}