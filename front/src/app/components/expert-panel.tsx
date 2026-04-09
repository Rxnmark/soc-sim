import { useEffect, useState } from "react";
import { ShieldAlert, Terminal, Clock, AlertTriangle, Network, CheckCircle2, XCircle, TrendingUp, ArrowLeft, FilterX } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

// ДОДАЛИ ПРОПС filterIp
interface Props {
  filterIp: string | null;
}

export function ExpertPanel({ filterIp }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isFixing, setIsFixing] = useState(false);

  const fetchLogs = () => {
    fetch("http://127.0.0.1:8000/api/v1/logs")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => console.error("Помилка завантаження логів:", err));
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  // ФІЛЬТРАЦІЯ ЛОГІВ
  const displayedLogs = filterIp ? logs.filter(log => log.source_ip === filterIp) : logs;

  const handleApplyFix = async () => {
    if (!selectedLog) return;
    setIsFixing(true);

    try {
      await fetch("http://127.0.0.1:8000/api/v1/actions/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_ip: selectedLog.source_ip })
      });
      
      setSelectedLog(null);
      fetchLogs();
    } catch (error) {
      console.error("Помилка застосування фіксу:", error);
    } finally {
      setIsFixing(false);
    }
  };

  // ОНОВЛЕНА логіка стилів (додали зелений колір для успішних дій)
  const getLogStyle = (eventType: string) => {
    const type = eventType.toLowerCase();
    if (type.includes("unauthorized") || type.includes("attack")) {
      return { icon: <ShieldAlert className="w-4 h-4 text-red-500" />, color: "text-red-500", badge: "bg-red-500/10 text-red-500 border-red-500/20" };
    }
    if (type.includes("auto-fix") || type.includes("applied") || type.includes("success")) {
      return { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, color: "text-emerald-500", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    }
    return { icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />, color: "text-yellow-500", badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Щойно";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // =========================================================
  // КОМПОНЕНТ №1: ДЕТАЛІЗАЦІЯ
  // =========================================================
  if (selectedLog) {
    const style = getLogStyle(selectedLog.event_type);
    const isResolved = selectedLog.event_type.includes("Auto-Fix"); // Перевіряємо, чи це вже вирішена проблема
    
    return (
      // --- ДОДАЛИ КЛАС custom-scrollbar ТА overflow-y-auto ДЛЯ КАРТКИ ДЕТАЛЕЙ ---
      <Card className="flex flex-col h-full w-full bg-card border border-border rounded-lg shadow-sm overflow-y-auto custom-scrollbar p-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-fit mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => setSelectedLog(null)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Live Logs
        </Button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shrink-0">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-card-foreground leading-tight">
              Expert System Analysis
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              Event ID: {selectedLog._id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Badge variant="outline" className={`${style.badge} uppercase px-2.5 py-0.5 text-[11px]`}>
            {style.icon}
            <span className="ml-1.5">{isResolved ? "Resolved" : selectedLog.event_type.includes("Unauthorized") ? "Critical" : "Warning"}</span>
          </Badge>
          {!isResolved && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 uppercase px-2.5 py-0.5 text-[11px]">
              <CheckCircle2 className="w-3 h-3 mr-1.5 text-blue-500" />
              Auto-Fix Available
            </Badge>
          )}
        </div>

        <div className="space-y-5 mb-8 flex-1">
          <div>
            <h3 className="text-sm font-semibold text-card-foreground mb-2.5">Event Details</h3>
            <div className={`p-4 rounded-lg border ${isResolved ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <p className={`text-sm font-semibold mb-1.5 ${style.color}`}>
                {selectedLog.event_type}
              </p>
              <p className="text-sm text-card-foreground leading-relaxed">
                {selectedLog.description}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-card-foreground mb-2.5">System Context</h3>
            <div className="space-y-2.5 rounded-lg border border-border p-3.5 bg-muted/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Source IP</span>
                <code className="text-foreground bg-muted/60 px-2 py-0.5 rounded font-mono text-xs">
                  {selectedLog.source_ip}
                </code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Timestamp</span>
                <span className="text-foreground font-medium">
                  {formatDate(selectedLog.timestamp)} ({new Date(selectedLog.timestamp).toLocaleDateString()})
                </span>
              </div>
            </div>
          </div>

          {/* ДИНАМІЧНИЙ БЛОК: Рекомендація або Звіт про успіх */}
          {isResolved ? (
            <div>
              <h3 className="text-sm font-semibold text-card-foreground mb-2.5">Action Taken</h3>
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-start gap-3.5 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-500">
                      Threat Successfully Neutralized
                    </p>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      The expert system has already applied the necessary security protocols and blocked the IP address {selectedLog.source_ip}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-card-foreground mb-2.5">Recommended Action</h3>
              <div className="p-4 rounded-lg bg-muted/40 border border-border">
                <div className="flex items-start gap-3.5 mb-2">
                  <ShieldAlert className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Block Source IP via Firewall
                    </p>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      Immediately block {selectedLog.source_ip} at all network entry points to prevent further unauthorized access.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ДИНАМІЧНІ КНОПКИ */}
        <div className="space-y-3 pt-5 border-t border-border mt-auto shrink-0">
          {isResolved ? (
            <Button disabled className="w-full bg-muted/50 text-muted-foreground font-semibold cursor-not-allowed border border-border">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Fix Already Applied
            </Button>
          ) : (
            <Button 
              onClick={handleApplyFix}
              disabled={isFixing}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold transition-all"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isFixing ? "Applying Fix..." : "Apply Fix Automatically"}
            </Button>
          )}
          
          <Button variant="outline" className="w-full" onClick={() => setSelectedLog(null)}>
            Close Details
          </Button>
        </div>
      </Card>
    );
  }

  // =========================================================
  // КОМПОНЕНТ №2: СПИСОК 
  // =========================================================
  return (
    <div className="flex flex-col h-full w-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Індикатор підключення до бази */}
      <div className="p-4 border-b border-border bg-muted/50 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Live Security Logs</h2>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">Connected</span>
          </div>
        </div>
        
        {/* ПЛАШКА АКТИВНОГО ФІЛЬТРА */}
        {filterIp && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-md">
             <span className="text-xs font-medium text-primary flex items-center gap-1.5">
               <FilterX className="w-3.5 h-3.5" /> Filtering by IP: {filterIp}
             </span>
          </div>
        )}
      </div>

      {/* --- ТУТ ТАКОЖ ПОВИНЕН БУТИ КЛАС custom-scrollbar ТА overflow-y-auto --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <p className="text-sm text-center text-muted-foreground mt-10">Завантаження логів...</p>
        ) : displayedLogs.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground mt-10">Логів поки немає.</p>
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
                      {log.event_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Clock className="w-3 h-3" />
                    {formatDate(log.timestamp)}
                  </div>
                </div>
                
                <p className="text-sm text-card-foreground mb-3 leading-relaxed">
                  {log.description}
                </p>
                
                <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
                  <span className="text-xs font-mono text-muted-foreground">
                    SRC IP: <span className="text-foreground group-hover:text-primary transition-colors">{log.source_ip}</span>
                  </span>
                  <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    View Details →
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