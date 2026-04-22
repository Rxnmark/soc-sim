import { useEffect, useState, useMemo } from "react";
import { Terminal, Clock, Network, CheckCircle2, XCircle, ArrowLeft, FilterX, ShieldAlert, Sword, ShieldOff, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { useTranslation } from "../../context/LanguageContext";
import { getLogStyle, formatDate, translateLogEventType, getEventDescription } from "./expert-utils";
import { motion, AnimatePresence } from "framer-motion";

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

interface ArchivedThreat {
  _id: string;
  event_type: string;
  description: string;
  source_ip: string;
  target_ip?: string;
  timestamp: string;
  archivedAt: string;
}

// Criticality ranking for sorting (0 = most critical, 3 = least)
function getCriticalityRank(eventType: string): number {
  const type = eventType.toLowerCase();
  // Critical (red) - DDoS attacks causing system disruptions, equipment going offline
  if ("ddos".split(" ").some(k => type.includes(k))) return 0;
  // Critical (red) - any attack that causes equipment to go offline/encrypted
  if ("offline encrypted".split(" ").some(k => type.includes(k))) return 0;
  // Significant (orange) - ransomware, data leaks, spyware, encryption attacks (ENCRYPTED status without equipment disruption)
  if ("ransomware exfiltration spyware data leak covert channel cryptolocker encryption".split(" ").some(k => type.includes(k))) return 1;
  // Minor (yellow) - scanning, injection attempts, brute-force, warnings, unauthorized access, blocked
  // Note: "attack" is excluded to avoid matching DDoS-related events
  if ("scan injection unauthorized access security warning drift antivirus port bruteforce blocked".split(" ").some(k => type.includes(k))) return 2;
  return 3; // least critical (auto-fix, resolved, neutralized)
}

// Get card styling based on criticality
function getCardClass(eventType: string, criticalityRank: number): string {
  if (eventType.includes('Auto-Fix')) return 'p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-muted/40 transition-all cursor-pointer hover:border-primary/50 shadow-sm hover:shadow';
  const borderColor = criticalityRank === 0 ? 'border-red-500/40' : criticalityRank === 1 ? 'border-orange-500/40' : criticalityRank === 2 ? 'border-yellow-500/40' : 'border-border';
  const bgColor = criticalityRank === 0 ? 'bg-red-500/5' : criticalityRank === 1 ? 'bg-orange-500/5' : criticalityRank === 2 ? 'bg-yellow-500/5' : 'bg-background';
  return `p-3.5 rounded-lg border ${borderColor} ${bgColor} hover:bg-muted/40 transition-all cursor-pointer hover:border-primary/50 shadow-sm hover:shadow`;
}

function isResolvedThreat(eventType: string): boolean {
  return "auto-fix applied success neutralized".split(" ").some(k => eventType.toLowerCase().includes(k));
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
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error loading logs:", err));
  };

  const fetchArchived = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/threats/archived");
      const data = await res.json();
      // Store archived source IPs as a Set for quick lookup
      const archivedIps = new Set<string>(data.map((a: any) => String(a.source_ip)));
      setArchivedThreats(archivedIps);
    } catch (err) {
      console.error("Error loading archived:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchArchived();
    const interval = setInterval(() => {
      fetchLogs();
      fetchArchived();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const displayedLogs = useMemo(() => {
    let filtered = filterIp ? logs.filter(log => log.source_ip === filterIp) : logs;
    // Filter out already resolved threats from active view
    filtered = filtered.filter(log => !isResolvedThreat(log.event_type));
    // Filter out already archived threats (by source IP)
    filtered = filtered.filter(log => !archivedThreats.has(log.source_ip));
    // Sort by criticality (most critical first)
    return filtered.sort((a, b) => getCriticalityRank(a.event_type) - getCriticalityRank(b.event_type));
  }, [logs, filterIp, archivedThreats]);

  const handleArchiveThreat = async (log: SecurityLog) => {
    setArchivingId(log._id);
    try {
      // First, archive the threat
      await fetch("http://127.0.0.1:8000/api/v1/threats/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_ip: log.source_ip })
      });
      // Then, apply the fix (triggers equipment reboot via backend)
      await fetch("http://127.0.0.1:8000/api/v1/actions/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_ip: log.source_ip })
      });
      // Remove from displayed immediately
      setLogs(prev => prev.filter(l => l._id !== log._id));
      // Add source IP to archived set so it won't reappear on next poll
      setArchivedThreats(prev => new Set(prev).add(log.source_ip));
      setSelectedLog(null);
    } catch (error) {
      console.error("Error archiving threat:", error);
    } finally {
      setArchivingId(null);
    }
  };

  const handleApplyFix = async (log: SecurityLog) => {
    setIsFixing(true);
    setFixMessage(null);

    try {
      // First archive the threat
      await handleArchiveThreat(log);
      setFixMessage("Threat neutralized and archived");
      setTimeout(() => setFixMessage(null), 3000);
    } catch (error) {
      console.error("Error applying fix:", error);
      setFixMessage("Error applying fix");
      setTimeout(() => setFixMessage(null), 3000);
    } finally {
      setIsFixing(false);
    }
  };

  // DETAIL VIEW
  if (selectedLog) {
    const style = getLogStyle(selectedLog.event_type);
    const isResolved = isResolvedThreat(selectedLog.event_type);
    
    return (
      <Card className="flex flex-col h-full w-full bg-card border border-border rounded-lg shadow-sm overflow-y-auto custom-scrollbar p-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-fit mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => setSelectedLog(null)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('logs.back_to_logs', 'Back to Live Logs')}
        </Button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shrink-0">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-card-foreground leading-tight">
              {t('logs.expert_analysis', 'Expert System Analysis')}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              Event ID: {selectedLog._id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Badge variant="outline" className={`${style.badge} uppercase px-2.5 py-0.5 text-[11px]`}>
            {style.icon}
            <span className="ml-1.5">{isResolved ? t('logs.resolved', 'Resolved') : selectedLog.event_type.includes("Unauthorized") ? t('logs.critical', 'Critical') : t('logs.warning', 'Warning')}</span>
          </Badge>
          {!isResolved && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 uppercase px-2.5 py-0.5 text-[11px]">
              <CheckCircle2 className="w-3 h-3 mr-1.5 text-blue-500" />
              {t('logs.auto_fix_available', 'Auto-Fix Available')}
            </Badge>
          )}
        </div>

        <div className="space-y-5 mb-8 flex-1">
          <div>
            <h3 className="text-sm font-semibold text-card-foreground mb-2.5">{t('logs.event_details', 'Event Details')}</h3>
            <div className={`p-4 rounded-lg border ${isResolved ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <p className={`text-sm font-semibold mb-1.5 ${style.color}`}>
                {getEventDescription(t, selectedLog.event_type)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-card-foreground mb-2.5">{t('logs.system_context', 'System Context')}</h3>
            <div className="space-y-2.5 rounded-lg border border-border p-3.5 bg-muted/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('logs.source_ip', 'Source IP')}</span>
                <code className="text-foreground bg-muted/60 px-2 py-0.5 rounded font-mono text-xs">
                  {selectedLog.source_ip}
                </code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('logs.timestamp', 'Timestamp')}</span>
                <span className="text-foreground font-medium">
                  {formatDate(selectedLog.timestamp)} ({new Date(selectedLog.timestamp).toLocaleDateString()})
                </span>
              </div>
            </div>
          </div>

          {isResolved ? (
            <div>
              <h3 className="text-sm font-semibold text-card-foreground mb-2.5">{t('logs.action_taken', 'Action Taken')}</h3>
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-start gap-3.5 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-500">
                      {t('logs.threat_neutralized', 'Threat Successfully Neutralized')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {t('logs.neutralized_desc', '')} {selectedLog.source_ip}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-card-foreground mb-2.5">{t('logs.recommended_action', 'Recommended Action')}</h3>
              <div className="p-4 rounded-lg bg-muted/40 border border-border">
                <div className="flex items-start gap-3.5 mb-2">
                  <ShieldAlert className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t('logs.block_ip_recommendation', 'Block Source IP via Firewall')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {t('logs.block_desc', '')} {selectedLog.source_ip}{t('logs.block_desc_end', '')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-5 border-t border-border mt-auto shrink-0">
          {fixMessage && (
            <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-xs text-emerald-500 font-medium">{fixMessage}</p>
            </div>
          )}

          {isResolved ? (
            <Button disabled className="w-full bg-muted/50 text-muted-foreground cursor-not-allowed border border-border">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t('logs.fix_applied', 'Fix Already Applied')}
            </Button>
          ) : (
            <Button 
              onClick={() => handleApplyFix(selectedLog)}
              disabled={isFixing}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold transition-all"
            >
              {isFixing ? (
                <>
                  <span className="animate-spin mr-2"><ShieldCheck className="w-4 h-4" /></span>
                  {t('logs.applying_fix', 'Applying Fix...')}
                </>
              ) : (
                <>
                  <Sword className="w-4 h-4 mr-2" />
                  {t('logs.fix_simulation_attack', 'Neutralize & Archive')}
                </>
              )}
            </Button>
          )}
          
          <Button variant="outline" className="w-full" onClick={() => setSelectedLog(null)}>
            {t('logs.close_details', 'Close Details')}
          </Button>
        </div>
      </Card>
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
          <div className="flex items-center gap-2">
            {/* Archived Threats Container Indicator */}
            {archivedThreats.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="relative flex items-center gap-1.5 px-2.5 py-1.5 border-amber-500/30 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">{t('logs.archived_threats', 'Archived')}</span>
                <Badge className="bg-amber-500 text-white border-none text-[10px] px-1.5 h-4">
                  {archivedThreats.size}
                </Badge>
              </Button>
            )}
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] text-emerald-500 font-medium uppercase">{t('logs.connected', 'Connected')}</span>
            </div>
          </div>
        </div>
        
        {filterIp && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-md">
             <span className="text-xs font-medium text-primary flex items-center gap-1.5">
               <FilterX className="w-3.5 h-3.5" /> {t('logs.filtering_by_ip_prefix', 'Filtering by IP:')} {filterIp}
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
                <motion.div
                  key={log._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                  whileHover={{ scale: 1.01 }}
                  className="group"
                >
                  <div 
                    className={getCardClass(log.event_type, criticalityRank)}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        {style.icon}
                        <span className={`text-sm font-semibold ${style.color}`}>
                          {translateLogEventType(t, log.event_type)}
                        </span>
                        {/* Criticality indicator */}
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] px-1 h-4 ${
                            criticalityRank === 0 ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                            criticalityRank === 1 ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' :
                            'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                          }`}
                        >
                          {criticalityRank === 0 ? 'CRIT' : criticalityRank === 1 ? 'HIGH' : 'MED'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.timestamp)}
                      </div>
                    </div>
                    
                    <p className="text-sm text-card-foreground mb-3 leading-relaxed">
                      {getEventDescription(t, log.event_type)}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
                      <span className="text-xs font-mono text-muted-foreground">
                        {t('logs.src_ip', 'SRC IP')}: <span className="text-foreground group-hover:text-primary transition-colors">{log.source_ip}</span>
                      </span>
                      <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                        {t('logs.view_details', 'View Details')} →
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Archived Threats Count Badge in Header is sufficient */}
    </div>
  );
}