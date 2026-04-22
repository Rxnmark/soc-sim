import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useTranslation } from "../../context/LanguageContext";
import { getLogStyle, formatDate, translateLogEventType, getEventDescription } from "../components/expert-utils";
import { AlertTriangle, Shield, Activity, ShieldAlert, CheckCircle2, Clock, Database, Box } from "lucide-react";

// Types
interface SecurityLog {
  _id: string;
  event_type: string;
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

// Category classification for logs (matches expert-panel.tsx)
function getLogCategory(eventType: string): "warning" | "active" | "critical" {
  const type = eventType.toLowerCase();
  if ("auto-fix applied success neutralized".includes(type)) return "warning";
  // Critical (red) - DDoS attacks causing system disruptions, equipment going offline
  if ("ddos".includes(type)) return "critical";
  // Critical (red) - any attack that causes equipment to go offline/encrypted
  if ("offline".includes(type) || "encrypted".includes(type)) return "critical";
  // Significant (orange) - ransomware, data leaks, spyware, encryption attacks (ENCRYPTED status without equipment disruption)
  if ("ransomware exfiltration spyware data leak covert channel cryptolocker encryption".split(" ").some(k => type.includes(k))) return "active";
  // Minor (yellow) - scanning, injection attempts, brute-force, warnings, unauthorized access, blocked
  // Note: "attack" is excluded to avoid matching DDoS-related events
  if ("scan injection unauthorized access security warning drift antivirus port bruteforce blocked".split(" ").some(k => type.includes(k))) return "warning";
  return "warning";
}

// Check if log is resolved
function isResolvedLog(eventType: string): boolean {
  return "auto-fix applied success neutralized".split(" ").some(k => eventType.toLowerCase().includes(k));
}

// Counter Card Component
function CounterCard({
  title,
  count,
  color,
  icon,
  bgColor,
  iconColor,
}: {
  title: string;
  count: number;
  color: string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
}) {
  return (
    <Card className={`p-5 border border-border hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{title}</p>
          <p className={`text-3xl font-semibold ${color}`}>{count}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// Log Card Component for 3-column layout
function LogCard({ log, onClick }: { log: SecurityLog; onClick: () => void }) {
  const style = getLogStyle(log.event_type);
  return (
    <div
      className="p-3 rounded-lg border border-border bg-background hover:bg-muted/40 transition-all cursor-pointer hover:border-primary/50 group shadow-sm"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {style.icon}
          <span className={`text-xs font-semibold ${style.color}`}>
            {translateLogEventType(useTranslation().t, log.event_type)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatDate(log.timestamp)}
        </div>
      </div>
      <p className="text-xs text-card-foreground mb-2 line-clamp-2">
        {getEventDescription(useTranslation().t, log.event_type)}
      </p>
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <span className="text-[10px] font-mono text-muted-foreground">
          SRC: <span className="text-foreground">{log.source_ip}</span>
        </span>
      </div>
    </div>
  );
}

// Archived Log Component (simplified)
function ArchivedLog({ log }: { log: SecurityLog }) {
  const style = getLogStyle(log.event_type);
  return (
    <div className="p-2 rounded border border-border/50 bg-muted/10 opacity-60">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-medium ${style.color}`}>
          {translateLogEventType(useTranslation().t, log.event_type)}
        </span>
        <span className="text-[9px] text-muted-foreground">{formatDate(log.timestamp)}</span>
      </div>
    </div>
  );
}

export default function CyberThreatsPage() {
  const { t } = useTranslation();
  const [statistics, setStatistics] = useState<ThreatStatistics | null>(null);
  const [allLogs, setAllLogs] = useState<SecurityLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [archivedLogs, setArchivedLogs] = useState<SecurityLog[]>([]);

  const fetchStatistics = () => {
    fetch("http://127.0.0.1:8000/api/v1/threats/statistics")
      .then((res) => res.json())
      .then((data) => {
        setStatistics(data);
        setAllLogs(data.recent_logs || []);
        setLoading(false);
      })
      .catch((err) => console.error("Error fetching statistics:", err));
  };

  useEffect(() => {
    fetchStatistics();
    const interval = setInterval(fetchStatistics, 10000);
    return () => clearInterval(interval);
  }, []);

  // Split logs into today's and archived
  useEffect(() => {
    if (!allLogs.length) return;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const today = allLogs.filter(log => new Date(log.timestamp) >= startOfDay);
    const archived = allLogs.filter(log => new Date(log.timestamp) < startOfDay).slice(0, 30);
    setArchivedLogs(archived);
  }, [allLogs]);

  // Separate logs by category (filter out resolved logs)
  const warningLogs = useMemo(() => 
    allLogs.filter(log => getLogCategory(log.event_type) === "warning" && !isResolvedLog(log.event_type)),
    [allLogs]
  );
  const activeLogs = useMemo(() => 
    allLogs.filter(log => getLogCategory(log.event_type) === "active" && !isResolvedLog(log.event_type)),
    [allLogs]
  );
  const criticalLogs = useMemo(() => 
    allLogs.filter(log => getLogCategory(log.event_type) === "critical" && !isResolvedLog(log.event_type)),
    [allLogs]
  );

  // Chart data - hourly breakdown
  const chartData = useMemo(() => {
    if (!statistics) return [];
    const hours = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
    const step = 3;
    return hours.map((label, i) => ({
      name: label,
      warning: statistics.hourly.warning[i * step] || 0,
      active: statistics.hourly.active[i * step] || 0,
      critical: statistics.hourly.critical[i * step] || 0,
    }));
  }, [statistics]);

  // DETAIL VIEW
  if (selectedLog) {
    const style = getLogStyle(selectedLog.event_type);
    const isResolved = selectedLog.event_type.includes("Auto-Fix") || selectedLog.event_type.includes("applied") || selectedLog.event_type.includes("neutralized");
    
    return (
      <div className="h-screen w-full flex bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
            <div>
              <h1 className="text-card-foreground font-semibold">{t('threats.title', 'Threat Statistics')}</h1>
              <p className="text-xs text-muted-foreground">{t('threats.details', 'Attack Log Details')}</p>
            </div>
          </header>
          <main className="flex-1 p-6 flex items-center justify-center overflow-auto">
            <Card className="max-w-lg w-full p-6 bg-card border-border">
              <Button
                variant="ghost"
                size="sm"
                className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedLog(null)}
              >
                ← {t('logs.back_to_logs', 'Back to Logs')}
              </Button>

              <div className="flex items-center gap-3 mb-4">
                {style.icon}
                <h2 className="text-lg font-bold text-card-foreground">
                  {translateLogEventType(t, selectedLog.event_type)}
                </h2>
              </div>

              <Badge variant="outline" className={`${style.badge} mb-4`}>
                {style.icon}
                <span className="ml-1.5">{isResolved ? t('logs.resolved', 'Resolved') : t('logs.critical', 'Critical')}</span>
              </Badge>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">{t('logs.event_details', 'Event Details')}</p>
                  <p className="text-sm text-card-foreground">
                    {getEventDescription(t, selectedLog.event_type)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 bg-muted/20">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">{t('logs.source_ip', 'Source IP')}</p>
                    <p className="text-sm font-mono">{selectedLog.source_ip}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">{t('logs.timestamp', 'Timestamp')}</p>
                    <p className="text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={() => setSelectedLog(null)}>
                {t('logs.close_details', 'Close Details')}
              </Button>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  // MAIN VIEW
  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-card-foreground font-semibold">{t('threatStats.title', 'Threat Statistics')}</h1>
            <p className="text-xs text-muted-foreground">{t('threatStats.subtitle', 'Daily attack history & analysis')}</p>
          </div>
          <div className="flex items-center gap-2">
            {statistics && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">LIVE</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {loading ? (
              <div className="text-center text-muted-foreground py-20">
                {t('threatStats.loading', 'Loading statistics...')}
              </div>
            ) : (
              <>
                {/* THREE COLUMN LAYOUT - constrained to viewport height */}
                <div className="grid grid-cols-3 gap-4 flex-1" style={{ height: 'calc(100vh - 260px)' }}>
                  {/* Warning Column */}
                  <ColumnLogs
                    title={t('threatCategories.warning', 'Warning')}
                    logs={warningLogs}
                    archived={[]}
                    color="text-yellow-500"
                    icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    borderColor="border-yellow-500/20"
                    bgColor="bg-yellow-500/5"
                    onClick={setSelectedLog}
                    countLabel={t('threatStats.warning_count', 'Warning')}
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
                    onClick={setSelectedLog}
                    countLabel={t('threatStats.active_count', 'Active')}
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
                    onClick={setSelectedLog}
                    countLabel={t('threatStats.critical_count', 'Critical')}
                    t={t}
                  />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Reusable Column Component
function ColumnLogs({
  title,
  logs,
  archived,
  color,
  icon,
  borderColor,
  bgColor,
  onClick,
  countLabel,
  t,
}: {
  title: string;
  logs: SecurityLog[];
  archived: SecurityLog[];
  color: string;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  onClick: (log: SecurityLog) => void;
  countLabel: string;
  t: (key: string, fallback?: string) => string | React.ReactNode;
}) {
  return (
    <Card className={`flex flex-col h-full border ${borderColor} overflow-hidden`} style={{ maxHeight: '100%' }}>
      {/* Column Header */}
      <div className={`p-3 border-b border-border ${bgColor} flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className={`text-sm font-semibold ${color}`}>{title}</h3>
        </div>
        <Badge variant="outline" className={`${color} border-${color.split('-')[1]}-500/30 text-xs`}>
          {logs.length}
        </Badge>
      </div>

      {/* Today's Logs */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">No {title.toLowerCase()} logs</p>
        ) : (
          logs.map((log) => (
            <LogCard key={log._id} log={log} onClick={() => onClick(log)} />
          ))
        )}
      </div>

      {/* Archived Section */}
      {archived.length > 0 && (
        <div className="border-t border-border p-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Database className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              {t('threatStats.archived', 'Archived')} ({archived.length})
            </span>
          </div>
          <div className="space-y-1 max-h-[150px] overflow-y-auto">
            {archived.map((log) => (
              <ArchivedLog key={log._id} log={log} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}