import { useEffect, useState, useMemo, useRef } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { Card } from "../components/ui/card";
import { useTranslation } from "../../context/LanguageContext";
import { AlertTriangle, Activity, ShieldAlert, LineChartIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { classifyThreat, isResolvedThreat } from "../components/expert-utils";

interface ThreatStatistics {
  warning_count: number;
  active_count: number;
  critical_count: number;
  hourly: {
    warning: number[];
    active: number[];
    critical: number[];
  };
  recent_logs: any[];
  server_hour: number;
}

export default function CyberAnalyticsPage() {
  const { t } = useTranslation();
  const [statistics, setStatistics] = useState<ThreatStatistics | null>(null);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [chartHistory, setChartHistory] = useState<{ name: string; warning: number; active: number; critical: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const chartHistoryRef = useRef(chartHistory);
  chartHistoryRef.current = chartHistory;

  const fetchStatistics = () => {
    fetch("http://127.0.0.1:8000/api/v1/threats/statistics")
      .then((res) => res.json())
      .then((data) => {
        setStatistics(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error fetching statistics:", err));
  };

  const fetchLogs = () => {
    fetch("http://127.0.0.1:8000/api/v1/logs")
      .then((res) => res.json())
      .then((data) => setAllLogs(data))
      .catch((err) => console.error("Error loading logs:", err));
  };

  useEffect(() => {
    fetchStatistics();
    fetchLogs();
    const statsInterval = setInterval(fetchStatistics, 10000);
    const logInterval = setInterval(fetchLogs, 60000);
    return () => {
      clearInterval(statsInterval);
      clearInterval(logInterval);
    };
  }, []);

  // Separate logs by category using unified classifyThreat function
  const warningLogs = useMemo(() =>
    allLogs.filter(log => classifyThreat(log.event_type) === "warning" && !isResolvedThreat(log.event_type)), [allLogs]
  );
  const activeLogs = useMemo(() =>
    allLogs.filter(log => classifyThreat(log.event_type) === "active" && !isResolvedThreat(log.event_type)), [allLogs]
  );
  const criticalLogs = useMemo(() =>
    allLogs.filter(log => classifyThreat(log.event_type) === "critical" && !isResolvedThreat(log.event_type)), [allLogs]
  );

  // Build base chart data from backend hourly buckets (00:00 to current hour)
  useEffect(() => {
    if (!statistics) return;
    const { hourly } = statistics;
    const currentHour = new Date().getHours();
    const points: { name: string; warning: number; active: number; critical: number }[] = [];
    let cumWarning = 0;
    let cumActive = 0;
    let cumCritical = 0;
    for (let h = 0; h <= currentHour; h++) {
      cumWarning += hourly.warning[h] || 0;
      cumActive += hourly.active[h] || 0;
      cumCritical += hourly.critical[h] || 0;
      const hh = String(h).padStart(2, '0');
      points.push({ name: `${hh}:00`, warning: cumWarning, active: cumActive, critical: cumCritical });
    }
    setChartHistory(points);
  }, [statistics]);

  // Add a live point every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const newPoint = {
        name: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        warning: warningLogs.length,
        active: activeLogs.length,
        critical: criticalLogs.length,
      };
      setChartHistory(prev => [...prev.slice(-60), newPoint]);
    }, 60000);
    return () => clearInterval(interval);
  }, [warningLogs.length, activeLogs.length, criticalLogs.length]);

  // Ensure the last point always reflects current time so X-axis ends at now
  const chartData = useMemo(() => {
    const now = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (chartHistoryRef.current.length === 0) return chartHistoryRef.current;
    const last = chartHistoryRef.current[chartHistoryRef.current.length - 1];
    if (last.name !== now) {
      return [...chartHistoryRef.current.slice(0, -1), { ...last, name: now }];
    }
    return chartHistoryRef.current;
  }, [chartHistory]);

  // Calculate dynamic Y-axis max from chart history
  const yMax = useMemo(() => {
    if (chartData.length === 0) return 10;
    const maxVal = Math.max(
      ...chartData.flatMap(d => [d.warning, d.active, d.critical]),
    );
    return Math.max(10, Math.ceil(maxVal * 1.2));
  }, [chartData]);

  // Build X-axis tick labels: 00:00, every full hour, and the last point's time
  const xTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const tickSet = new Set<string>();
    const lastPoint = chartData[chartData.length - 1];

    // Always show 00:00
    tickSet.add("00:00");

    // Show every full hour
    for (let h = 0; h <= 23; h++) {
      tickSet.add(`${String(h).padStart(2, '0')}:00`);
    }

    // Always show the last point's time
    tickSet.add(lastPoint.name);

    return Array.from(tickSet);
  }, [chartData]);

  if (loading) {
    return (
      <div className="h-screen w-full flex bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-card-foreground font-semibold">{t('analytics.title', 'Security Analytics')}</h1>
            <p className="text-xs text-muted-foreground">{t('analytics.subtitle', 'Security metrics and threat analytics')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] text-emerald-500 font-medium">LIVE</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-6 bg-card border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('threatStats.warning_count', 'Warning')}</p>
                    <p className="text-3xl text-yellow-500 font-semibold">
                      {warningLogs.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('threatStats.active_count', 'Active Attacks')}</p>
                    <p className="text-3xl text-orange-500 font-semibold">
                      {activeLogs.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('threatStats.critical_count', 'Critical Attacks')}</p>
                    <p className="text-3xl text-red-500 font-semibold">
                      {criticalLogs.length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Hourly Chart */}
            <Card className="p-6 border-border">
              <div className="flex items-center gap-2 mb-4">
                <LineChartIcon className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-card-foreground">
                  {t('threatStats.hourly_chart', 'Hourly Attack Distribution')}
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888" 
                    fontSize={12}
                    ticks={xTicks}
                  />
                  <YAxis 
                    stroke="#888" 
                    fontSize={12} 
                    domain={[0, yMax]}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1a1a2e', 
                      border: '1px solid #333', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="warning" 
                    name={t('threatCategories.warning', 'Warning')} 
                    stroke="#eab308" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="active" 
                    name={t('threatCategories.active', 'Active')} 
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="critical" 
                    name={t('threatCategories.critical', 'Critical')} 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}