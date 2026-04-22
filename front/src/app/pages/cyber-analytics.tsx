import { useEffect, useState, useMemo } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { Card } from "../components/ui/card";
import { useTranslation } from "../../context/LanguageContext";
import { AlertTriangle, Activity, ShieldAlert, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
}

export default function CyberAnalyticsPage() {
  const { t } = useTranslation();
  const [statistics, setStatistics] = useState<ThreatStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatistics = () => {
    fetch("http://127.0.0.1:8000/api/v1/threats/statistics")
      .then((res) => res.json())
      .then((data) => {
        setStatistics(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error fetching statistics:", err));
  };

  useEffect(() => {
    fetchStatistics();
    const interval = setInterval(fetchStatistics, 10000);
    return () => clearInterval(interval);
  }, []);

  // Chart data - hourly breakdown with 3-hour ranges
  const chartData = useMemo(() => {
    if (!statistics) return [];
    const hours = ["00:00-03:00", "03:00-06:00", "06:00-09:00", "09:00-12:00", 
                   "12:00-15:00", "15:00-18:00", "18:00-21:00", "21:00-00:00"];
    const step = 3;
    return hours.map((label, i) => ({
      name: label,
      warning: statistics.hourly.warning[i * step] || 0,
      active: statistics.hourly.active[i * step] || 0,
      critical: statistics.hourly.critical[i * step] || 0,
    }));
  }, [statistics]);

  // Calculate dynamic Y-axis max
  const yMax = useMemo(() => {
    if (!statistics) return 10;
    const allValues = [
      ...statistics.hourly.warning,
      ...statistics.hourly.active,
      ...statistics.hourly.critical,
    ];
    const maxVal = Math.max(...allValues);
    // Minimum base of 10, but cap at max value
    return Math.max(10, maxVal);
  }, [statistics]);

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
                      {statistics?.warning_count || 0}
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
                      {statistics?.active_count || 0}
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
                      {statistics?.critical_count || 0}
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
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-card-foreground">
                  {t('threatStats.hourly_chart', 'Hourly Attack Distribution')}
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888" 
                    fontSize={12}
                    tickFormatter={(value) => value.split('-')[0]}
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
                  <Bar 
                    dataKey="warning" 
                    name={t('threatCategories.warning', 'Warning')} 
                    fill="#eab308" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="active" 
                    name={t('threatCategories.active', 'Active')} 
                    fill="#f97316" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="critical" 
                    name={t('threatCategories.critical', 'Critical')} 
                    fill="#ef4444" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}