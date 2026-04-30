import { useEffect, useState, useMemo } from "react";
import authenticatedFetch from "../utils/api-fetch";
import { Sidebar } from "../components/sidebar-nav";
import { Badge } from "../components/ui/badge";
import { NotificationsPopover } from "../components/notifications-popover";
import { useTranslation } from "../../context/LanguageContext";
import { classifyThreat } from "../components/expert-utils";
import { AlertTriangle, Activity, ShieldAlert } from "lucide-react";
import { ColumnLogs } from "./cyber-threats-components";

// Types
interface SecurityLog {
  _id: string;
  event_type: string;
  title: string;
  description: string;
  source_ip: string;
  target_ip?: string;
  timestamp: string;
}

interface ThreatStatistics {
  warning_count: number;
  active_count: number;
  critical_count: number;
  hourly: {
    warning: number[];
    active: number[];
    critical: number[];
  };
  recent_logs: SecurityLog[];
}

// Check if log is resolved
function isResolvedLog(eventType: string): boolean {
  return "auto-fix applied success neutralized".split(" ").some(k => eventType.toLowerCase().includes(k));
}

export default function CyberThreatsPage() {
  const { t } = useTranslation();
  const [statistics, setStatistics] = useState<ThreatStatistics | null>(null);
  const [riskSummary, setRiskSummary] = useState<any>(null);
  const [allLogs, setAllLogs] = useState<SecurityLog[]>([]);
  const [archivedThreats, setArchivedThreats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchStatistics = () => {
    authenticatedFetch("/api/v1/threats/statistics")
      .then((res) => res.json())
      .then((data) => {
        setStatistics(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error fetching statistics:", err));
  };

  const fetchLogs = () => {
    authenticatedFetch("/api/v1/logs")
      .then((res) => res.json())
      .then((data) => setAllLogs(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error loading logs:", err));
  };

  const fetchRiskSummary = () => {
    authenticatedFetch("/api/v1/risks/summary")
      .then((res) => res.json())
      .then((data) => setRiskSummary(data))
      .catch((err) => console.error("Error fetching risk summary:", err));
  };

  const fetchArchived = async () => {
    try {
      const res = await authenticatedFetch("/api/v1/threats/archived");
      const data = await res.json();
      const archivedArray = Array.isArray(data) ? data : [];
      setArchivedThreats(new Set<string>(archivedArray.map((a: any) => String(a.source_ip))));
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
    const logInterval = setInterval(fetchLogs, 5000);
    const riskInterval = setInterval(fetchRiskSummary, 5000);
    const archivedInterval = setInterval(fetchArchived, 5000);
    return () => {
      clearInterval(statsInterval);
      clearInterval(logInterval);
      clearInterval(riskInterval);
      clearInterval(archivedInterval);
    };
  }, []);

  // Separate logs by category using unified classifyThreat function
  const warningLogs = useMemo(() => {
    if (!Array.isArray(allLogs)) return [];
    return allLogs.filter(log => log && classifyThreat(log.event_type) === "warning" && !isResolvedLog(log.event_type));
  }, [allLogs]);

  const activeLogs = useMemo(() => {
    if (!Array.isArray(allLogs)) return [];
    return allLogs.filter(log => log && classifyThreat(log.event_type) === "active" && !isResolvedLog(log.event_type));
  }, [allLogs]);

  const criticalLogs = useMemo(() => {
    if (!Array.isArray(allLogs)) return [];
    return allLogs.filter(log => log && classifyThreat(log.event_type) === "critical" && !isResolvedLog(log.event_type));
  }, [allLogs]);

  const displayedLogsCount = useMemo(() => {
    if (!Array.isArray(allLogs)) return 0;
    return allLogs.filter(log => log && !isResolvedLog(log.event_type) && !archivedThreats.has(log.source_ip) && classifyThreat(log.event_type) !== "warning").length;
  }, [allLogs, archivedThreats]);

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-[280px] shrink-0 text-center">
              <h1 className="text-card-foreground font-semibold">{t('threatStats.title', 'Threat Statistics')}</h1>
              <p className="text-xs text-muted-foreground">{t('threatStats.subtitle', 'Daily attack history & analysis')}</p>
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
          <div className="flex items-center">
            <NotificationsPopover apiData={riskSummary} displayedLogsCount={displayedLogsCount} />
          </div>
        </header>

        <main className="flex-1 p-6 overflow-hidden">
          <div className="max-w-[1800px] mx-auto h-full">
            {loading ? (
              <div className="text-center text-muted-foreground py-20">
                {t('threatStats.loading', 'Loading statistics...')}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 h-full">
                {/* Warning Column */}
                <ColumnLogs
                  title={t('threatCategories.warning', 'Warning')}
                  logs={warningLogs}
                  archived={[]}
                  color="text-yellow-500"
                  icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
                  borderColor="border-yellow-500/20"
                  bgColor="bg-yellow-500/5"
                  countLabel={t('threatStats.warning_count', 'Warning')}
                  riskLabel={t('threatCategories.warning_tag', 'Minor')}
                  t={t}
                />

                {/* Active Column */}
                <ColumnLogs
                  title={t('threatCategories.active', 'Active')}
                  logs={activeLogs}
                  archived={[]}
                  color="text-orange-500"
                  icon={<Activity className="w-4 h-4 text-orange-500" />}
                  borderColor="border-orange-500/20"
                  bgColor="bg-orange-500/5"
                  countLabel={t('threatStats.active_count', 'Active')}
                  riskLabel={t('threatCategories.active_tag', 'Requires Attention')}
                  t={t}
                />

                {/* Critical Column */}
                <ColumnLogs
                  title={t('threatCategories.critical', 'Critical')}
                  logs={criticalLogs}
                  archived={[]}
                  color="text-red-500"
                  icon={<ShieldAlert className="w-4 h-4 text-red-500" />}
                  borderColor="border-red-500/20"
                  bgColor="bg-red-500/5"
                  countLabel={t('threatStats.critical_count', 'Critical')}
                  riskLabel={t('threatCategories.critical_risk', 'Critical')}
                  t={t}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}