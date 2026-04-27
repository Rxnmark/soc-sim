import { useMemo, useRef, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTranslation } from "../../context/LanguageContext";

interface ChartPoint {
  name: string;
  warning: number;
  active: number;
  critical: number;
}

interface Props {
  warningLogs: any[];
  activeLogs: any[];
  criticalLogs: any[];
  chartHistory: ChartPoint[];
  setChartHistory: (fn: (prev: ChartPoint[]) => ChartPoint[]) => void;
}

export function CyberAnalyticsChart({ warningLogs, activeLogs, criticalLogs, chartHistory, setChartHistory }: Props) {
  const { t } = useTranslation();
  const chartHistoryRef = useRef(chartHistory);
  chartHistoryRef.current = chartHistory;

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

  return (
    <ResponsiveContainer width="100%" height="100%">
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
  );
}