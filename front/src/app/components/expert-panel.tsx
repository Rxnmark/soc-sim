import { useEffect, useState, useMemo } from "react";
import { Terminal, Clock, ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useTranslation } from "../../context/LanguageContext";
import { getCardClass, getCriticalityRank, isResolvedThreat, isMinorEventType, formatDate, translateLogEventType, getEventDescription, getLogStyle } from "./expert-utils";
import { motion, AnimatePresence } from "framer-motion";
import { ExpertPanelDetail } from "./expert-panel-detail";

interface Props {
  filterIp: string | null;
}

interface SecurityLog {
  _id: string;
  event_type: string;
  description: string;
  source_ip: string;
  target_ip?: string;
  timestamp: string;
}

export function ExpertPanel({ filterIp }: Props) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [archivedThreats, setArchivedThreats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const fetchLogs = () => {
    fetch("http://127.0.0.1:8000/api/v1/logs")
      .then((res) => res.json())
      .then((data) => { setLogs(data); setLoading(false); })
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
    fetchLogs(); fetchArchived();
    const interval = setInterval(() => { fetchLogs(); fetchArchived(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setFixMessage(null); }, [selectedLog?._id]);

  const displayedLogs = useMemo(() => {
    let filtered = filterIp ? logs.filter(log => log.source_ip === filterIp) : logs;
    filtered = filtered.filter(log => !isResolvedThreat(log.event_type) && !isMinorEventType(log.event_type) && !archivedThreats.has(log.source_ip));
    return filtered.sort((a, b) => getCriticalityRank(a.event_type) - getCriticalityRank(b.event_type));
  }, [logs, filterIp, archivedThreats]);

  const handleArchiveThreat = async (log: SecurityLog) => {
    setArchivingId(log._id);
    try {
      await fetch("http://127.0.0.1:8000/api/v1/threats/archive-and-reboot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source_ip: log.source_ip }) });
      setLogs(prev => prev.filter(l => l._id !== log._id));
      setArchivedThreats(prev => new Set(prev).add(log.source_ip));
    } catch (error) { console.error("Error archiving threat:", error); }
    finally { setArchivingId(null); }
  };

  const handleApplyFix = async (log: SecurityLog) => {
    setIsFixing(true); setFixMessage(null);
    try {
      await handleArchiveThreat(log);
      setTimeout(() => {
        setIsFixing(false);
        setSelectedLog(null);
      }, 1000);
    } catch (error) {
      console.error("Error applying fix:", error);
      setFixMessage("Error applying fix");
      setTimeout(() => setFixMessage(null), 3000);
      setIsFixing(false);
    }
  };

  // DETAIL VIEW
  if (selectedLog) {
    return (
      <ExpertPanelDetail
        log={selectedLog}
        isFixing={isFixing}
        fixMessage={fixMessage}
        onBack={() => setSelectedLog(null)}
        onApplyFix={handleApplyFix}
      />
    );
  }

  // MAIN VIEW - LOGS LIST WITH ARCHIVE
  return (
    <div className="flex flex-col h-full w-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border bg-muted/50 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">{t('logs.live_security_logs', 'Live Security Logs')}</h2>
            <span className="text-[10px] text-muted-foreground">({displayedLogs.length})</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-emerald-500 font-medium uppercase">{t('logs.connected', 'Connected')}</span>
          </div>
        </div>
        {filterIp && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-md">
            <span className="text-xs font-medium text-primary flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> {t('logs.filtering_by_ip_prefix', 'Filtering by IP:')} {filterIp}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <p className="text-sm text-center text-muted-foreground mt-10">{t('logs.loading_logs', 'Loading logs...')}</p>
        ) : displayedLogs.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground mt-10">{t('logs.no_logs', 'No active threats. Systems secure.')}</p>
        ) : (
          <AnimatePresence mode="popLayout">
            {displayedLogs.map((log) => {
              const style = getLogStyle(log.event_type);
              const criticalityRank = getCriticalityRank(log.event_type);
              return (
                <motion.div key={log._id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }} whileHover={{ scale: 1.01 }} className="group">
                  <div className={getCardClass(log.event_type, criticalityRank)} onClick={() => setSelectedLog(log)}>
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        {style.icon}
                        <span className={`text-sm font-semibold ${style.color}`}>{translateLogEventType(t, log.event_type)}</span>
                        <Badge variant="outline" className={`text-[9px] px-1 h-4 ${criticalityRank === 0 ? 'bg-red-500/20 text-red-500 border-red-500/30' : criticalityRank === 1 ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'}`}>{criticalityRank === 0 ? 'CRIT' : criticalityRank === 1 ? 'HIGH' : 'MED'}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono"><Clock className="w-3 h-3" />{formatDate(log.timestamp)}</div>
                    </div>
                    <p className="text-sm text-card-foreground mb-3 leading-relaxed">{getEventDescription(t, log.event_type)}</p>
                    <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
                      <span className="text-xs font-mono text-muted-foreground">{t('logs.src_ip', 'SRC IP')}: <span className="text-foreground group-hover:text-primary transition-colors">{log.source_ip}</span></span>
                      <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">{t('logs.view_details', 'View Details')} →</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}