import { useEffect, useState, useMemo } from "react";
import { Card } from "./ui/card";

// Classify attack type from event_type string
function classifyAttack(eventType: string): "ddos" | "ransomware" | "stealth" | "warning" | "resolved" {
  const lower = eventType.toLowerCase();
  // Resolved / auto-fix
  if (["auto-fix", "applied", "success", "neutralized"].some((k) => lower.includes(k))) return "resolved";
  // Critical (red) - DDoS
  if (["ddos", "slowloris", "udp flood", "dns amplification", "traffic flood", "syn flood", "http flood", "ntp amplification", "offline"].some((k) => lower.includes(k))) return "ddos";
  // Active (orange) - Ransomware
  if (["ransomware", "cryptolocker", "encryption attack"].some((k) => lower.includes(k))) return "ransomware";
  // Stealth (purple) - Exfiltration, Spyware, Data Leak, Covert Channel
  if (["exfiltration", "spyware", "data leak", "covert channel", "apt", "lateral movement", "zero-day"].some((k) => lower.includes(k))) return "stealth";
  // Warning (yellow) - everything else
  return "warning";
}

// Impact levels: DDoS = 5 (takes offline), Ransomware = 3 (encrypts data), Stealth = 2 (covert)
const IMPACT_MAP: Record<string, number> = {
  ddos: 5,
  ransomware: 3,
  stealth: 2,
};

// Color map
const COLOR_MAP: Record<string, string> = {
  ddos: "bg-red-500",
  ransomware: "bg-orange-500",
  stealth: "bg-purple-500",
};

export function RiskMatrix({ searchQuery = "" }: { searchQuery?: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/logs")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  const probabilities = [5, 4, 3, 2, 1];
  const impacts = [1, 2, 3, 4, 5];

  // Group logs by attack type and count
  const attackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      const cat = classifyAttack(log.event_type);
      if (cat !== "warning" && cat !== "resolved") {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [logs]);

  // Normalize counts to probability scale 1-5
  const maxCount = Math.max(...Object.values(attackCounts), 1);
  const normalizeProb = (count: number): number => {
    const raw = (count / maxCount) * 5;
    return Math.max(1, Math.round(raw));
  };

  // Build risk points from attack data
  const risks = useMemo(() => {
    const result: Array<{
      id: string;
      title: string;
      category: string;
      probability: number;
      impact: number;
      status: string;
      count: number;
    }> = [];

    const attackNames: Record<string, string> = {
      ddos: "DDoS Attacks",
      ransomware: "Ransomware",
      stealth: "Stealth / APT",
    };

    for (const [type, count] of Object.entries(attackCounts)) {
      const impact = IMPACT_MAP[type] || 1;
      const probability = normalizeProb(count);
      result.push({
        id: type,
        title: attackNames[type] || type,
        category: type.charAt(0).toUpperCase() + type.slice(1),
        probability,
        impact,
        status: "Active",
        count,
      });
    }

    return result;
  }, [attackCounts, maxCount]);

  const getCellColor = (prob: number, imp: number) => {
    const score = prob * imp;
    if (score >= 15) return "bg-red-500/10 border-red-500/20 hover:bg-red-500/20";
    if (score >= 8) return "bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20";
    return "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20";
  };

  const getDotColor = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes("ddos")) return "bg-red-500";
    if (lower.includes("ransomware")) return "bg-orange-500";
    if (lower.includes("stealth")) return "bg-purple-500";
    return "bg-primary";
  };

  // Highlight on search match
  const getDotOpacity = (risk: any) => {
    if (!searchQuery) return "";
    const match =
      risk.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.category.toLowerCase().includes(searchQuery.toLowerCase());
    return match ? "ring-2 ring-foreground scale-125 z-10 shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "opacity-15 grayscale";
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-xl font-bold text-card-foreground">Cyber Threat Matrix</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Frequency vs. Impact Analysis — <span className="font-semibold text-foreground">{risks.length}</span> active threat types
          </p>
        </div>

        <div className="flex gap-4 text-xs font-medium text-muted-foreground bg-muted/30 px-4 py-2 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> DDoS
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> Ransomware
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div> Stealth
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">Loading threat matrix...</div>
      ) : (
        <div className="relative pl-14 pb-8 mt-4">
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-muted-foreground tracking-[0.2em]">
            FREQUENCY
          </div>

          <div className="grid grid-cols-5 gap-1.5 h-[400px]">
            {probabilities.map((prob) =>
              impacts.map((imp) => {
                const cellRisks = risks.filter((r) => r.probability === prob && r.impact === imp);
                return (
                  <div
                    key={`${prob}-${imp}`}
                    className={`relative rounded-md border p-2.5 transition-colors flex flex-wrap gap-1.5 content-start ${getCellColor(prob, imp)}`}
                  >
                    {cellRisks.map((risk) => (
                      <div
                        key={risk.id}
                        className={`w-3.5 h-3.5 rounded-full cursor-help transition-all duration-300 ${getDotColor(risk.category)} ${getDotOpacity(risk)}`}
                        title={`${risk.title}\nType: ${risk.category}\nAttacks: ${risk.count}`}
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