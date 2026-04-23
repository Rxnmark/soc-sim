import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Bell, CheckCheck, AlertTriangle, Shield, ServerOff } from "lucide-react";

export function NotificationsPopover({ apiData, displayedLogsCount }: { apiData: any; displayedLogsCount?: number }) {
  // Зберігаємо типи загроз, які користувач "прочитав" (приховав)
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Якщо apiData оновлюється і з'являються НОВІ загрози, ми можемо скидати dismissed,
  // але для демо-режиму просто дозволяємо їх приховати.
  
  // Формуємо масив активних сповіщень на основі реальних даних
  const activeAlerts = [];

  if (apiData?.critical_threats > 0 && !dismissed.includes("critical")) {
    activeAlerts.push({
      id: "critical",
      count: apiData.critical_threats,
      title: "Critical Threats",
      desc: `${apiData.critical_threats} device(s) require immediate AI analysis.`,
      icon: <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />,
      bg: "bg-red-500/10 border-red-500/20",
      textTitle: "text-red-500",
    });
  }

  if (apiData?.medium_risks > 0 && !dismissed.includes("medium")) {
    activeAlerts.push({
      id: "medium",
      count: apiData.medium_risks,
      title: "Medium Risks",
      desc: `${apiData.medium_risks} vulnerability(ies) scheduled for patching.`,
      icon: <Shield className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />,
      bg: "bg-yellow-500/10 border-yellow-500/20",
      textTitle: "text-yellow-500",
    });
  }

  if (apiData?.sensors_offline > 0 && !dismissed.includes("offline")) {
    activeAlerts.push({
      id: "offline",
      count: apiData.sensors_offline,
      title: "Sensors Offline",
      desc: `${apiData.sensors_offline} system(s) currently unreachable or rebooting.`,
      icon: <ServerOff className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />,
      bg: "bg-gray-500/10 border-gray-500/20",
      textTitle: "text-gray-400",
    });
  }

  // Загальна кількість подій для бейджика
  const totalAlerts = displayedLogsCount !== undefined ? displayedLogsCount : activeAlerts.reduce((sum, alert) => sum + alert.count, 0);

  const markAllAsRead = () => {
    setDismissed(["critical", "medium", "offline"]);
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
          <h3 className="text-sm font-semibold text-card-foreground">System Alerts</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {totalAlerts} Actionable
            </span>
            {totalAlerts > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors ml-1"
                title="Mark all as read"
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
              <p>No active alerts right now.</p>
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