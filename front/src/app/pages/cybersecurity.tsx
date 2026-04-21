import { useEffect, useState } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { EquipmentTable } from "../components/equipment-table";
import { ExpertPanel } from "../components/expert-panel";
import { Card } from "../components/ui/card";
import { AlertTriangle, Shield, ServerOff, DollarSign, Zap } from "lucide-react";
import { NotificationsPopover } from "../components/notifications-popover";
import { useTranslation } from "../../context/LanguageContext";

export default function CybersecurityDashboard() {
  const { t } = useTranslation();
  const [apiData, setApiData] = useState<any>(null);
  const [simStatus, setSimStatus] = useState<any>(null);
  const [filterIp, setFilterIp] = useState<string | null>(null);

  const fetchSummary = () => {
    fetch("http://127.0.0.1:8000/api/v1/risks/summary")
      .then((res) => res.json())
      .then((data) => setApiData(data))
      .catch((err) => console.error("Error fetching data:", err));
  };

  const fetchSimStatus = () => {
    fetch("http://127.0.0.1:8000/api/v1/simulation/status")
      .then((res) => res.json())
      .then((data) => setSimStatus(data))
      .catch((err) => console.error("Error fetching sim status:", err));
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
    fetchSimStatus();
    const dataInterval = setInterval(fetchSummary, 5000);
    const simInterval = setInterval(fetchSimStatus, 5000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(simInterval);
    };
  }, []);

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
            <NotificationsPopover apiData={apiData} />

            {/* Simulation Status Indicator */}
            {simStatus?.is_running && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                simStatus.phase === "escalated" 
                  ? "bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]" 
                  : "bg-amber-500/10 border-amber-500/20"
              }`}>
                <Zap className={`w-4 h-4 ${simStatus.phase === "escalated" ? "text-red-500 animate-pulse" : "text-amber-500"}`} />
                <div className="flex flex-col items-start">
                  <span className={`text-xs font-medium ${simStatus.phase === "escalated" ? "text-red-500" : "text-amber-500"}`}>
                    {simStatus.phase === "escalated" ? t('dashboard.simulation_escalated', 'Escalation') : t('dashboard.simulation_normal', 'Normal')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {simStatus.active_attacks_count > 0 ? `${simStatus.active_attacks_count} active` : 'No attacks'}
                  </span>
                </div>
              </div>
            )}

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

                <Card className="p-6 bg-card border-border border-lime-500/30">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('dashboard.financial_exposure_card', 'Financial Exposure')}</p>
                      <p className="text-2xl text-lime-500 font-semibold">
                        {apiData ? apiData.financial_exposure : "$0"}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-lime-500/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-lime-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {simStatus?.is_running ? (
                        <span className="flex items-center gap-1">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-lime-500"></span>
                          </span>
                          Live
                        </span>
                      ) : "Simulation inactive"}
                    </span>
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