import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { Card } from "../components/ui/card";
import { useTranslation } from "../../context/LanguageContext";
import { AlertTriangle, Activity, ShieldAlert, LineChartIcon } from "lucide-react";
import { classifyThreat, isResolvedThreat } from "../components/expert-utils";
import { NotificationsPopover } from "../components/notifications-popover";
import { CyberAnalyticsChart } from "./cyber-analytics-chart";

interface ThreatStatistics {
  warning_count: number;
  active_count: number;
  critical_count: number;
  hourly: {
    warning: number[];
    active: number[];
    critical: number[];
  };
  recent_logs: any[];
  server_hour: number;
}

export default function CyberAnalyticsPage() {
  const { t } = useTranslation();
  const [statistics, setStatistics] = useState<ThreatStatistics | null>(null);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [chartHistory, setChartHistory] = useState<{ name: string; warning: number; active: number; critical: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskSummary, setRiskSummary] = useState<any>(null);
  const [archivedThreats, setArchivedThreats] = useState<Set<string>>(new Set());
  // Fallback: if Set is not available, use plain object

  const fetchStatistics = () => {
    fetch("http://127.0.0.1:8000/api/v1/threats/statistics")
      .then((res) => res.json())
      .then((data) => {
        setStatistics(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error fetching statistics:", err));
  };

  const fetchLogs = () => {
    fetch("http://127.0.0.1:8000/api/v1/logs")
      .then((res) => res.json())
      .then((data) => setAllLogs(data))
      .catch((err) => console.error("Error loading logs:", err));
  };

  const fetchRiskSummary = () => {
    fetch("http://127.0.0.1:8000/api/v1/risks/summary")
      .then((res) => res.json())
      .then((data) => setRiskSummary(data))
      .catch((err) => console.error("Error fetching risk summary:", err));
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
    fetchStatistics();
    fetchLogs();
    fetchRiskSummary();
    fetchArchived();
    const statsInterval = setInterval(fetchStatistics, 10000);
    const logInterval = setInterval(fetchLogs, 60000);
    const riskInterval = setInterval(fetchRiskSummary, 10000);
    const archivedInterval = setInterval(fetchArchived, 10000);
    return () => {
      clearInterval(statsInterval);
      clearInterval(logInterval);
      clearInterval(riskInterval);
      clearInterval(archivedInterval);
    };
  }, []);

  // Separate logs by category using unified classifyThreat function
  const warningLogs = useMemo(() =>
    allLogs.filter(log => classifyThreat(log.event_type) === "warning" && !isResolvedThreat(log.event_type)), [allLogs]
  );
  const activeLogs = useMemo(() =>
    allLogs.filter(log => classifyThreat(log.event_type) === "active" && !isResolvedThreat(log.event_type)), [allLogs]
  );
  const criticalLogs = useMemo(() =>
    allLogs.filter(log => classifyThreat(log.event_type) === "critical" && !isResolvedThreat(log.event_type)), [allLogs]
  );

  // Total count for bell badge - match cybersecurity.tsx logic exactly
  const displayedLogsCount = useMemo(() => {
    return allLogs.filter(log =>
      !isResolvedThreat(log.event_type) &&
      !archivedThreats.has(log.source_ip) &&
      classifyThreat(log.event_type) !== "warning"
    ).length;
  }, [allLogs, archivedThreats]);

  // Build base chart data from allLogs using unified classification (matches cards exactly)
  // Backend stores timestamps in UTC — convert to local Europe/Kiev (UTC+3) for display
  useEffect(() => {
    const localHourNow = (new Date().getUTCHours() + 3) % 24;
    const hourlyWarning = new Array(24).fill(0);
    const hourlyActive = new Array(24).fill(0);
    const hourlyCritical = new Array(24).fill(0);

    for (const log of allLogs) {
      const ts = new Date(log.timestamp);
      if (isNaN(ts.getTime())) continue;
      const localHour = (ts.getHours() + 3) % 24;
      const cat = classifyThreat(log.event_type);
      if (isResolvedThreat(log.event_type)) continue;
      if (cat === "warning") hourlyWarning[localHour] += 1;
      else if (cat === "active") hourlyActive[localHour] += 1;
      else if (cat === "critical") hourlyCritical[localHour] += 1;
    }

    const points: { name: string; warning: number; active: number; critical: number }[] = [];
    let cumWarning = 0;
    let cumActive = 0;
    let cumCritical = 0;
    for (let h = 0; h <= localHourNow; h++) {
      cumWarning += hourlyWarning[h] || 0;
      cumActive += hourlyActive[h] || 0;
      cumCritical += hourlyCritical[h] || 0;
      const hh = String(h).padStart(2, '0');
      points.push({ name: `${hh}:00`, warning: cumWarning, active: cumActive, critical: cumCritical });
    }
    setChartHistory(points);
  }, [allLogs]);

  if (loading) {
    return (
      <div className="h-screen w-full flex bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-[280px] shrink-0 text-center">
              <h1 className="text-card-foreground font-semibold">{t('analytics.title', 'Security Analytics')}</h1>
              <p className="text-xs text-muted-foreground">{t('analytics.subtitle', 'Security metrics and threat analytics')}</p>
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">LIVE</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('riskManagement.last_updated', 'Last updated')}: <span className="font-mono">{new Date().toLocaleTimeString()}</span>
              </p>
            </div>
          </div>
          <NotificationsPopover apiData={riskSummary} displayedLogsCount={displayedLogsCount} />
        </header>

        <main className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 shrink-0">
              <Card className="p-6 bg-card border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('threatStats.warning_count', 'Warning')}</p>
                    <p className="text-3xl text-yellow-500 font-semibold">
                      {warningLogs.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('threatStats.active_count', 'Active Attacks')}</p>
                    <p className="text-3xl text-orange-500 font-semibold">
                      {activeLogs.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('threatStats.critical_count', 'Critical Attacks')}</p>
                    <p className="text-3xl text-red-500 font-semibold">
                      {criticalLogs.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Hourly Chart */}
            <Card className="p-6 border-border flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <LineChartIcon className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-card-foreground">
                  {t('threatStats.hourly_chart', 'Hourly Attack Distribution')}
                </h3>
              </div>
              <CyberAnalyticsChart
                warningLogs={warningLogs}
                activeLogs={activeLogs}
                criticalLogs={criticalLogs}
                chartHistory={chartHistory}
                setChartHistory={setChartHistory}
              />
            </Card>
        </main>
      </div>
    </div>
  );
}