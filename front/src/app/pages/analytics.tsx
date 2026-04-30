import { useEffect, useState, useMemo } from "react";
import authenticatedFetch from "../utils/api-fetch";
import { Sidebar } from "../components/sidebar-nav";
import { Card } from "../components/ui/card";
import { useTranslation } from "../../context/LanguageContext";
import { TrendingUp, ShieldAlert, LineChartIcon, Lock } from "lucide-react";
import { NotificationsPopover } from "../components/notifications-popover";
import { AnalyticsChart } from "./analytics-chart";

interface FinancialSummary {
  ddos_financial: number;
  ransomware_financial: number;
  stealth_financial: number;
  cumulative_financial_by_type: Record<string, number>;
  server_hour: number;
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [riskSummary, setRiskSummary] = useState<FinancialSummary | null>(null);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [chartHistory, setChartHistory] = useState<{ name: string; ddos: number; ransomware: number; stealth: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const fetchRiskSummary = () => {
    authenticatedFetch("/api/v1/risks/summary")
      .then((res) => res.json())
      .then((data) => {
        setRiskSummary(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error fetching risk summary:", err));
  };

  const fetchLogs = () => {
    authenticatedFetch("/api/v1/logs")
      .then((res) => res.json())
      .then((data) => setAllLogs(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error loading logs:", err));
  };

  useEffect(() => {
    fetchRiskSummary();
    fetchLogs();
    const riskInterval = setInterval(fetchRiskSummary, 10000);
    const logInterval = setInterval(fetchLogs, 60000);
    return () => {
      clearInterval(riskInterval);
      clearInterval(logInterval);
    };
  }, []);

  // Extract financial values from cumulative_financial_by_type
  const ddosValue = useMemo(() => {
    return Number(riskSummary?.cumulative_financial_by_type?.DDoS) || 0;
  }, [riskSummary]);

  const ransomwareValue = useMemo(() => {
    return Number(riskSummary?.cumulative_financial_by_type?.Ransomware) || 0;
  }, [riskSummary]);

  const stealthValue = useMemo(() => {
    return Number(riskSummary?.cumulative_financial_by_type?.Stealth) || 0;
  }, [riskSummary]);

  // Build base chart data from allLogs using financial impact distribution
  // Backend stores timestamps in UTC — convert to local Europe/Kiev (UTC+3) for display
  useEffect(() => {
    if (!riskSummary || !Array.isArray(allLogs) || allLogs.length === 0) return;

    const localHourNow = (new Date().getUTCHours() + 3) % 24;
    const hourlyDdos = new Array(24).fill(0);
    const hourlyRansomware = new Array(24).fill(0);
    const hourlyStealth = new Array(24).fill(0);

    let totalDdosEvents = 0;
    let totalRansomwareEvents = 0;
    let totalStealthEvents = 0;

    for (const log of allLogs) {
      const ts = new Date(log.timestamp);
      if (isNaN(ts.getTime())) continue;
      const localHour = (ts.getHours() + 3) % 24;
      const lower = log.event_type.toLowerCase();
      
      if (["auto-fix", "applied", "success", "neutralized"].some((k) => lower.includes(k))) continue;
      
      if (["ddos", "slowloris", "udp flood", "dns amplification", "traffic flood", "syn flood", "http flood", "ntp amplification", "offline"].some((k) => lower.includes(k))) {
        hourlyDdos[localHour] += 1;
        totalDdosEvents += 1;
      } else if (["ransomware", "cryptolocker", "encryption attack"].some((k) => lower.includes(k))) {
        hourlyRansomware[localHour] += 1;
        totalRansomwareEvents += 1;
      } else if (["exfiltration", "spyware", "data leak", "covert channel", "apt", "lateral movement", "zero-day"].some((k) => lower.includes(k))) {
        hourlyStealth[localHour] += 1;
        totalStealthEvents += 1;
      }
    }

    const ddosPerEvent = totalDdosEvents > 0 ? ddosValue / totalDdosEvents : 0;
    const ransomwarePerEvent = totalRansomwareEvents > 0 ? ransomwareValue / totalRansomwareEvents : 0;
    const stealthPerEvent = totalStealthEvents > 0 ? stealthValue / totalStealthEvents : 0;

    const points: { name: string; ddos: number; ransomware: number; stealth: number }[] = [];
    let cumDdos = 0;
    let cumRansomware = 0;
    let cumStealth = 0;

    for (let h = 0; h <= localHourNow; h++) {
      cumDdos += (hourlyDdos[h] || 0) * ddosPerEvent;
      cumRansomware += (hourlyRansomware[h] || 0) * ransomwarePerEvent;
      cumStealth += (hourlyStealth[h] || 0) * stealthPerEvent;
      const hh = String(h).padStart(2, '0');
      points.push({ name: `${hh}:00`, ddos: Math.round(cumDdos), ransomware: Math.round(cumRansomware), stealth: Math.round(cumStealth) });
    }
    
    // Ensure the current hour reflects the exact current totals
    if (points.length > 0) {
      points[points.length - 1].ddos = ddosValue;
      points[points.length - 1].ransomware = ransomwareValue;
      points[points.length - 1].stealth = stealthValue;
    }
    
    setChartHistory(points);
  }, [allLogs, riskSummary, ddosValue, ransomwareValue, stealthValue]);

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
          <div className="flex items-center gap-4">
            <div className="w-[280px] shrink-0 text-center">
              <h1 className="text-card-foreground font-semibold">{t('businessAnalytics.title', 'Business Analytics')}</h1>
              <p className="text-xs text-muted-foreground">{t('businessAnalytics.subtitle', 'Financial impact and risk analytics')}</p>
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">{t('businessAnalytics.live', 'LIVE')}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('businessAnalytics.last_updated', 'Last updated')}: <span className="font-mono">{new Date().toLocaleTimeString()}</span>
              </p>
            </div>
          </div>
          <NotificationsPopover apiData={riskSummary} />
        </header>

        <main className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 shrink-0">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('financialStats.ddos', 'DDoS')}</p>
                  <p className="text-3xl text-red-500 font-semibold">
                    {formatCurrency(ddosValue)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('financialStats.ransomware', 'Ransomware')}</p>
                  <p className="text-3xl text-orange-500 font-semibold">
                    {formatCurrency(ransomwareValue)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('financialStats.stealth', 'Stealth / APT')}</p>
                  <p className="text-3xl text-purple-500 font-semibold">
                    {formatCurrency(stealthValue)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
              </div>
            </Card>
          </div>

          {/* Financial Impact Chart */}
          <Card className="p-6 border-border flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <LineChartIcon className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-card-foreground">
                {t('financialStats.hourly_chart', 'Financial Impact Over Time')}
              </h3>
            </div>
            <AnalyticsChart
              ddosValue={ddosValue}
              ransomwareValue={ransomwareValue}
              stealthValue={stealthValue}
              chartHistory={chartHistory}
              setChartHistory={setChartHistory}
            />
          </Card>
        </main>
      </div>
    </div>
  );
}