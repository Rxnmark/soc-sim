import { useEffect, useState } from "react";
import { Card } from "./ui/card";

// ДОДАЄМО ПАРАМЕТР SEARCH QUERY
export function RiskMatrix({ searchQuery = "" }: { searchQuery?: string }) {
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/business-risks")
      .then((res) => res.json())
      .then((data) => {
        setRisks(data);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  const probabilities = [5, 4, 3, 2, 1];
  const impacts = [1, 2, 3, 4, 5];

  const getCellColor = (prob: number, imp: number) => {
    const score = prob * imp;
    if (score >= 15) return "bg-red-500/10 border-red-500/20 hover:bg-red-500/20";
    if (score >= 8) return "bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20";
    return "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20";
  };

  const getDotColor = (category: string, status: string) => {
    if (status === "Mitigated") return "bg-muted-foreground opacity-50"; 
    if (category === "Cyber") return "bg-purple-500";
    if (category === "Operational") return "bg-blue-500";
    if (category === "Financial") return "bg-emerald-500";
    return "bg-primary";
  };

  // ЛОГІКА ПІДСВІЧУВАННЯ
  const getDotOpacity = (risk: any) => {
    if (!searchQuery) return ""; // Якщо пошук порожній, все звичайно
    const match = risk.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  risk.category.toLowerCase().includes(searchQuery.toLowerCase());
    // Якщо збігається — робимо крапку більшою і додаємо біле кільце. Якщо ні — робимо напівпрозорою.
    return match ? "ring-2 ring-foreground scale-125 z-10 shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "opacity-15 grayscale";
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-xl font-bold text-card-foreground">Risk Assessment Matrix</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Impact vs. Probability Analysis - <span className="font-semibold text-foreground">{risks.length}</span> identified risks
          </p>
        </div>
        
        <div className="flex gap-4 text-xs font-medium text-muted-foreground bg-muted/30 px-4 py-2 rounded-lg border border-border">
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div> Cyber</div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Operational</div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Financial</div>
          <div className="flex items-center gap-2 ml-2 pl-4 border-l border-border"><div className="w-2.5 h-2.5 rounded-full bg-muted-foreground opacity-50"></div> Mitigated</div>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">Завантаження матриці...</div>
      ) : (
        <div className="relative pl-14 pb-8 mt-4">
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-muted-foreground tracking-[0.2em]">
            PROBABILITY
          </div>

          <div className="grid grid-cols-5 gap-1.5 h-[400px]">
            {probabilities.map((prob) =>
              impacts.map((imp) => {
                const cellRisks = risks.filter((r) => r.probability === prob && r.impact === imp);
                return (
                  <div key={`${prob}-${imp}`} className={`relative rounded-md border p-2.5 transition-colors flex flex-wrap gap-1.5 content-start ${getCellColor(prob, imp)}`}>
                    {cellRisks.map((risk) => (
                      <div 
                        key={risk.id}
                        className={`w-3.5 h-3.5 rounded-full cursor-help transition-all duration-300 ${getDotColor(risk.category, risk.status)} ${getDotOpacity(risk)}`}
                        title={`${risk.title}\nCategory: ${risk.category}\nStatus: ${risk.status}`}
                      />
                    ))}
                    <span className="absolute bottom-1 right-1.5 text-[10px] font-mono opacity-40 text-muted-foreground font-bold">{prob},{imp}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="absolute bottom-0 left-8 right-0 text-center text-xs font-bold text-muted-foreground tracking-[0.2em] pt-2">
            IMPACT
          </div>
        </div>
      )}
    </Card>
  );
}