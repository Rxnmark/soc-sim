import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { AlertTriangle, DollarSign, TrendingUp, ShieldAlert, SearchX } from "lucide-react";

// ДОДАЄМО ПАРАМЕТР SEARCH QUERY
export function CriticalThreats({ searchQuery = "" }: { searchQuery?: string }) {
  const [threats, setThreats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/business-risks")
      .then((res) => res.json())
      .then((data) => {
        const activeRisks = data.filter((r: any) => r.status !== "Mitigated");
        const sortedRisks = activeRisks.sort((a: any, b: any) => (b.probability * b.impact) - (a.probability * a.impact));
        setThreats(sortedRisks);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
  const calculateFinancialImpact = (impactScore: number) => impactScore * 750000 + 45000;
  const getProbabilityText = (prob: number) => prob >= 4 ? "High" : prob === 3 ? "Medium" : "Low";
  
  const getSeverityInfo = (prob: number, imp: number) => {
    const score = prob * imp;
    if (score >= 15) return { text: "Critical", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" };
    if (score >= 8) return { text: "High", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" };
    return { text: "Medium", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20" };
  };

  // ФІЛЬТРУЄМО РИЗИКИ НА ОСНОВІ ПОШУКУ
  const filteredThreats = threats.filter(threat => 
    threat.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    threat.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalExposure = filteredThreats.reduce((sum, threat) => sum + calculateFinancialImpact(threat.impact), 0);

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-card-foreground mb-1">Top Critical Threats</h2>
          <p className="text-sm text-muted-foreground">
            Total Financial Exposure: <span className="text-red-500 font-bold tracking-wide">{formatCurrency(totalExposure)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-sm text-red-500 font-semibold">{filteredThreats.length} Active</span>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Аналіз загроз...</div>
        ) : filteredThreats.length === 0 ? (
          // ПОВІДОМЛЕННЯ ЯКЩО ПОШУК НІЧОГО НЕ ЗНАЙШОВ
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3 bg-muted/20 rounded-lg border border-dashed border-border">
            <SearchX className="w-8 h-8 opacity-50" />
            <p>No threats matching <span className="font-semibold text-foreground">"{searchQuery}"</span></p>
            <button onClick={() => window.document.querySelector('input')?.focus()} className="text-xs text-primary hover:underline">Clear search</button>
          </div>
        ) : (
          filteredThreats.map((threat, index) => {
            const severity = getSeverityInfo(threat.probability, threat.impact);
            const financialImpact = calculateFinancialImpact(threat.impact);

            return (
              <div key={threat.id} className="p-4 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors shadow-sm group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-xs font-mono text-muted-foreground w-5">#{index + 1}</span>
                      <h3 className="text-sm font-semibold text-card-foreground truncate group-hover:text-primary transition-colors">{threat.title}</h3>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground ml-7">
                      <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted font-normal">{threat.category}</Badge>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Prob: {getProbabilityText(threat.probability)}</span>
                      <Badge variant="outline" className={`${severity.bg} ${severity.color} uppercase px-2 py-0 font-semibold text-[10px]`}>{severity.text}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right shrink-0 bg-red-500/5 px-3 py-2 rounded-md border border-red-500/10">
                    <DollarSign className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-sm text-red-500 font-bold">{formatCurrency(financialImpact)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Est. Loss</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}