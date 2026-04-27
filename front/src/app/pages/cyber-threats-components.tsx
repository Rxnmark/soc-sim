import { AlertTriangle, ShieldAlert, Activity, CheckCircle2, Clock, Database } from "lucide-react";

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
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { getLogStyle, formatDate, translateLogEventType, getEventDescription } from "../components/expert-utils";
import { useTranslation } from "../../context/LanguageContext";

// Counter Card Component
export function CounterCard({
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
export function LogCard({ log, riskLabel }: { log: SecurityLog; riskLabel?: string }) {
  const style = getLogStyle(log.event_type);
  const { t } = useTranslation();
  return (
    <div
      className="p-3 rounded-lg border border-border bg-background hover:bg-muted/40 transition-all hover:border-primary/50 group shadow-sm"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {style.icon}
          <span className={`text-xs font-semibold ${style.color}`}>
            {translateLogEventType(t, log.event_type)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatDate(log.timestamp)}
        </div>
      </div>
      <p className="text-xs text-card-foreground mb-2 line-clamp-2 font-medium">
        {log.title}
      </p>
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
        {getEventDescription(t, log.event_type)}
      </p>
      {riskLabel && (
        <div className="mb-2">
          <Badge variant="outline" className={`${style.badge} text-[9px]`}>
            {riskLabel}
          </Badge>
        </div>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <span className="text-[10px] font-mono text-muted-foreground">
          SRC: <span className="text-foreground">{log.source_ip}</span>
        </span>
      </div>
    </div>
  );
}

// Archived Log Component (simplified)
export function ArchivedLog({ log }: { log: SecurityLog }) {
  const { t } = useTranslation();
  const style = getLogStyle(log.event_type);
  return (
    <div className="p-2 rounded border border-border/50 bg-muted/10 opacity-60">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-medium ${style.color}`}>
          {translateLogEventType(t, log.event_type)}
        </span>
        <span className="text-[9px] text-muted-foreground">{formatDate(log.timestamp)}</span>
      </div>
    </div>
  );
}

// Reusable Column Component
export function ColumnLogs({
  title,
  logs,
  archived,
  color,
  icon,
  borderColor,
  bgColor,
  countLabel,
  riskLabel,
  t,
}: {
  title: string;
  logs: SecurityLog[];
  archived: SecurityLog[];
  color: string;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  countLabel: string;
  riskLabel?: string;
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
            <LogCard key={log._id} log={log} riskLabel={riskLabel} />
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