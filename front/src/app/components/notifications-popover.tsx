import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Bell, CheckCheck, AlertTriangle, Shield, ServerOff, Flame } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";

function replaceCount(str: string, count: number): string {
  return str.replace("{count}", String(count));
}

export function NotificationsPopover({ apiData, displayedLogsCount }: { apiData: any; displayedLogsCount?: number }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Form the list of active notifications based on real data
  const activeAlerts: Array<{
    id: string;
    count: number;
    title: string;
    desc: string;
    icon: React.ReactNode;
    bg: string;
    textTitle: string;
  }> = [];

  if (apiData?.critical_threats > 0 && !dismissed.includes("critical")) {
    activeAlerts.push({
      id: "critical",
      count: apiData.critical_threats,
      title: t('notifications.critical_threats'),
      desc: replaceCount(t('notifications.critical_threats_desc'), apiData.critical_threats),
      icon: <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />,
      bg: "bg-red-500/10 border-red-500/20",
      textTitle: "text-red-500",
    });
  }

  if (apiData?.high_risks > 0 && !dismissed.includes("high")) {
    activeAlerts.push({
      id: "high",
      count: apiData.high_risks,
      title: t('notifications.high_risks'),
      desc: replaceCount(t('notifications.high_risks_desc'), apiData.high_risks),
      icon: <Flame className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />,
      bg: "bg-orange-500/10 border-orange-500/20",
      textTitle: "text-orange-500",
    });
  }

  if (apiData?.sensors_offline > 0 && !dismissed.includes("offline")) {
    activeAlerts.push({
      id: "offline",
      count: apiData.sensors_offline,
      title: t('notifications.sensors_offline'),
      desc: replaceCount(t('notifications.sensors_offline_desc'), apiData.sensors_offline),
      icon: <ServerOff className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />,
      bg: "bg-gray-500/10 border-gray-500/20",
      textTitle: "text-gray-400",
    });
  }

  // Total count for badge
  const totalAlerts = displayedLogsCount !== undefined ? displayedLogsCount : activeAlerts.reduce((sum, alert) => sum + alert.count, 0);

  const markAllAsRead = () => {
    setDismissed(["critical", "high", "offline"]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative hover:bg-muted/50 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {totalAlerts > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-card animate-in zoom-in">
              {totalAlerts}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80 p-0 border-border bg-card shadow-xl rounded-lg overflow-hidden">
        <div className="p-3 border-b border-border bg-muted/30 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-card-foreground">{t('notifications.system_alerts', 'System Alerts')}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {totalAlerts} {t('notifications.actionable', 'Actionable')}
            </span>
            {totalAlerts > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors ml-1"
                title={t('notifications.mark_all_read', 'Mark all as read')}
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
          {activeAlerts.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Shield className="w-8 h-8 text-emerald-500/50" />
              <p>{t('notifications.no_active_alerts', 'No active alerts right now.')}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-md border flex items-start gap-3 ${alert.bg}`}>
                  {alert.icon}
                  <div>
                    <p className={`text-sm font-semibold ${alert.textTitle}`}>{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {alert.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}