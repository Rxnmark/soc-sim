import { Terminal, Clock, Network, CheckCircle2, ArrowLeft, ShieldAlert, Sword, ShieldCheck, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { useTranslation } from "../../context/LanguageContext";
import { getCardClass, getCriticalityRank, isResolvedThreat, isMinorEventType, formatDate, translateLogEventType, getEventDescription, getLogStyle } from "./expert-utils";
import { motion, AnimatePresence } from "framer-motion";

interface SecurityLog {
  _id: string;
  event_type: string;
  description: string;
  source_ip: string;
  target_ip?: string;
  timestamp: string;
}

interface Props {
  log: SecurityLog;
  isFixing: boolean;
  fixMessage: string | null;
  onBack: () => void;
  onApplyFix: (log: SecurityLog) => void;
}

export function ExpertPanelDetail({ log, isFixing, fixMessage, onBack, onApplyFix }: Props) {
  const { t } = useTranslation();
  const style = getLogStyle(log.event_type);
  const isResolved = isResolvedThreat(log.event_type);

  return (
    <Card className="flex flex-col h-full w-full bg-card border border-border rounded-lg shadow-sm overflow-y-auto custom-scrollbar p-3 gap-2" style={{ gap: '2px' }}>
      <Button variant="ghost" size="sm" className="w-fit mb-1 -ml-2 text-muted-foreground hover:text-foreground" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('logs.back_to_logs', 'Back to Live Logs')}
      </Button>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shrink-0"><Network className="w-5 h-5 text-white" /></div>
        <div>
          <h2 className="text-xl font-bold text-card-foreground leading-tight">{t('logs.expert_analysis', 'Expert System Analysis')}</h2>
          <p className="text-xs text-muted-foreground font-mono">Event ID: {log._id}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className={`${style.badge} uppercase px-2.5 py-0.5 text-[11px]`}>
          {style.icon}
          <span className="ml-1.5">{isResolved ? t('logs.resolved', 'Resolved') : log.event_type.includes("Unauthorized") ? t('logs.critical', 'Critical') : t('logs.warning', 'Warning')}</span>
        </Badge>
        {!isResolved && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 uppercase px-2.5 py-0.5 text-[11px]">
            <CheckCircle2 className="w-3 h-3 mr-1.5 text-blue-500" />
            {t('logs.auto_fix_available', 'Auto-Fix Available')}
          </Badge>
        )}
      </div>

      <div className="space-y-2 mb-4 flex-1">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground mb-2.5">{t('logs.event_details', 'Event Details')}</h3>
          <div className={`p-4 rounded-lg border ${isResolved ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <p className={`text-sm font-semibold mb-1.5 ${style.color}`}>{getEventDescription(t, log.event_type)}</p>
          </div>
        </div>
        <div><h3 className="text-sm font-semibold text-card-foreground mb-2.5">{t('logs.system_context', 'System Context')}</h3>
          <div className="space-y-2.5 rounded-lg border border-border p-3.5 bg-muted/20">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('logs.source_ip', 'Source IP')}</span><code className="text-foreground bg-muted/60 px-2 py-0.5 rounded font-mono text-xs">{log.source_ip}</code></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('logs.timestamp', 'Timestamp')}</span><span className="text-foreground font-medium">{formatDate(log.timestamp)}</span></div>
          </div>
        </div>
        {isResolved ? (
          <div><h3 className="text-sm font-semibold text-card-foreground mb-2.5">{t('logs.action_taken', 'Action Taken')}</h3>
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-start gap-3.5 mb-2"><CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                <div><p className="text-sm font-semibold text-emerald-500">{t('logs.threat_neutralized', 'Threat Successfully Neutralized')}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t('logs.neutralized_desc', '')} {log.source_ip}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div><h3 className="text-sm font-semibold text-card-foreground mb-2.5">{t('logs.recommended_action', 'Recommended Action')}</h3>
            <div className="p-4 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-start gap-3.5 mb-2"><ShieldAlert className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                <div><p className="text-sm font-semibold text-foreground">{t('logs.block_ip_recommendation', 'Block Source IP via Firewall')}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t('logs.block_desc', '')} {log.source_ip}{t('logs.block_desc_end', '')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-border mt-auto shrink-0">
        {fixMessage && <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-center"><p className="text-xs text-emerald-500 font-medium">{fixMessage}</p></div>}
        {isResolved ? (
          <Button disabled className="w-full bg-muted/50 text-muted-foreground cursor-not-allowed border border-border"><CheckCircle2 className="w-4 h-4 mr-2" />{t('logs.fix_applied', 'Fix Already Applied')}</Button>
        ) : (
          <Button onClick={() => onApplyFix(log)} disabled={isFixing} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold transition-all">
            {isFixing ? <><span className="animate-spin mr-2"><ShieldCheck className="w-4 h-4" /></span>{t('logs.applying_fix', 'Applying Fix...')}</> : <><Sword className="w-4 h-4 mr-2" />{t('logs.fix_simulation_attack', 'Neutralize & Archive')}</>}
          </Button>
        )}
        <Button variant="outline" className="w-full" onClick={onBack}>{t('logs.close_details', 'Close Details')}</Button>
      </div>
    </Card>
  );
}