import { useEffect, useState } from "react";
import { Terminal, Clock, Network, CheckCircle2, XCircle, ArrowLeft, FilterX, ShieldAlert, Sword } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { useTranslation } from "../../context/LanguageContext";
import { getLogStyle, formatDate, translateLogEventType, getEventDescription } from "./expert-utils";

interface Props {
  filterIp: string | null;
}

export function ExpertPanel({ filterIp }: Props) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);

  const fetchLogs = () => {
    fetch("http://127.0.0.1:8000/api/v1/logs")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error loading logs:", err));
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const displayedLogs = filterIp ? logs.filter(log => log.source_ip === filterIp) : logs;

  const handleApplyFix = async () => {
    if (!selectedLog) return;
    setIsFixing(true);
    setFixMessage(null);

    try {
      // Try simulation fix first (by equipment ID from IP)
      const eqResponse = await fetch("http://127.0.0.1:8000/api/v1/equipment");
      const equipment = await eqResponse.json();
      
      // Use target_ip if available (simulation attacks), otherwise use source_ip
      const targetIp = selectedLog.target_ip || selectedLog.source_ip;
      const targetEq = equipment.find((e: any) => e.ip_address === targetIp);

      if (targetEq) {
        // Try simulation fix (non-blocking - returns immediately)
        try {
          const simFixResponse = await fetch(`http://127.0.0.1:8000/api/v1/simulation/fix?equipment_id=${targetEq.id}`, {
            method: "POST",
          });
          const result = await simFixResponse.json();
          if (simFixResponse.ok && result.status === "success") {
            setFixMessage(`Fix initiated: ${result.attack_type || 'Attack neutralized'}. Equipment recovering...`);
            setSelectedLog(null);
            fetchLogs();
            return;
          }
        } catch (simError) {
          // Simulation fix failed, fall back to legacy fix
          console.log("Simulation fix failed, using legacy fix");
        }
      }

      // Legacy fix
      await fetch("http://127.0.0.1:8000/api/v1/actions/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_ip: selectedLog.source_ip })
      });
      
      setFixMessage("Legacy fix applied");
      setSelectedLog(null);
      fetchLogs();
    } catch (error) {
      console.error("Error applying fix:", error);
      setFixMessage("Error applying fix");
    } finally {
      setTimeout(() => setFixMessage(null), 5000);
      setIsFixing(false);
    }
  };

  // DETAIL VIEW COMPONENT
  if (selectedLog) {
    const style = getLogStyle(selectedLog.event_type);
    const isResolved = selectedLog.event_type.includes("Auto-Fix");
    
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
                {selectedLog.event_type.includes("Auto-Fix") ? t('logs.action_taken', 'Action Taken') : getEventDescription(t, selectedLog.event_type)}
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
          {/* Fix status message */}
          {fixMessage && (
            <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-xs text-emerald-500 font-medium">{fixMessage}</p>
            </div>
          )}

          {isResolved ? (
            <Button disabled className="w-full bg-muted/50 text-muted-foreground font-semibold cursor-not-allowed border border-border">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t('logs.fix_applied', 'Fix Already Applied')}
            </Button>
          ) : (
            <Button 
              onClick={handleApplyFix}
              disabled={isFixing}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold transition-all"
            >
              {isFixing ? (
                <>
                  <span className="animate-spin mr-2"><CheckCircle2 className="w-4 h-4" /></span>
                  {t('logs.applying_fix', 'Applying Fix...')}
                </>
              ) : (
                <>
                  <Sword className="w-4 h-4 mr-2" />
                  {t('logs.fix_simulation_attack', 'Neutralize Threat')}
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

  // LOGS LIST VIEW COMPONENT
  return (
    <div className="flex flex-col h-full w-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border bg-muted/50 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">{t('logs.live_security_logs', 'Live Security Logs')}</h2>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">{t('logs.connected', 'Connected')}</span>
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
          <p className="text-sm text-center text-muted-foreground mt-10">{t('logs.no_logs', 'No logs available yet.')}</p>
        ) : (
          displayedLogs.map((log) => {
            const style = getLogStyle(log.event_type);
            return (
              <div 
                key={log._id} 
                className={`p-3.5 rounded-lg border ${log.event_type.includes('Auto-Fix') ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-background'} hover:bg-muted/40 transition-all cursor-pointer hover:border-primary/50 group shadow-sm hover:shadow`}
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    {style.icon}
                    <span className={`text-sm font-semibold ${style.color}`}>
                      {translateLogEventType(t, log.event_type)}
                    </span>
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
            );
          })
        )}
      </div>
    </div>
  );
}