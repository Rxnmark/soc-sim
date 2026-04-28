import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const categoryColors: Record<string, string> = {
  "DDoS": "#ef4444",
  "Ransomware": "#f97316",
  "Stealth": "#a855f7",
};

const getCategoryColor = (name: string) => {
  for (const [key, color] of Object.entries(categoryColors)) {
    if (name.includes(key)) return color;
  }
  return "#6b7280";
};

function DonutTooltipContent({ active, payload, total }: { active?: boolean; payload?: Array<{ value: number; name: string }>; total: number }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-muted-foreground text-[10px] mb-1">{item.name}</div>
      <div className="text-card-foreground font-medium">{pct}%</div>
    </div>
  );
}

export function RiskCategoryDonut({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={65}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={getCategoryColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltipContent total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground shrink-0 flex-wrap">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCategoryColor(entry.name) }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinancialTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-card-foreground font-medium">${payload[0].value.toLocaleString()}</div>
    </div>
  );
}

export function RiskFinancialBar({ data }: { data: { name: string; impact: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 9 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
            tickFormatter={(v: number) => `$${(v / 1000000).toFixed(0)}M`}
          />
          <Tooltip content={<FinancialTooltip />} />
          <Bar dataKey="impact" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getCategoryColor(entry.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}