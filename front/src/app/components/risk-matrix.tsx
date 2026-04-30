import { useEffect, useState, useMemo } from "react";
import authenticatedFetch from "../utils/api-fetch";
import { Card } from "./ui/card";
import { useTranslation } from "../../context/LanguageContext";

function classifyAttack(eventType: string): "ddos" | "ransomware" | "stealth" | "warning" | "resolved" {
  const lower = eventType.toLowerCase();
  if (["auto-fix", "applied", "success", "neutralized"].some((k) => lower.includes(k))) return "resolved";
  if (["ddos", "slowloris", "udp flood", "dns amplification", "traffic flood", "syn flood", "http flood", "ntp amplification", "offline"].some((k) => lower.includes(k))) return "ddos";
  if (["ransomware", "cryptolocker", "encryption attack"].some((k) => lower.includes(k))) return "ransomware";
  if (["exfiltration", "spyware", "data leak", "covert channel", "apt", "lateral movement", "zero-day"].some((k) => lower.includes(k))) return "stealth";
  return "warning";
}

const IMPACT_MAP: Record<string, number> = {
  ddos: 5,
  ransomware: 3,
  stealth: 2,
};

const COLOR_MAP: Record<string, string> = {
  ddos: "bg-red-500",
  ransomware: "bg-orange-500",
  stealth: "bg-purple-500",
};

export function RiskMatrix() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = () => {
      authenticatedFetch("/api/v1/logs")
        .then((res) => res.json())
        .then((data) => {
          setLogs(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((err) => console.error(err));
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const probabilities = [5, 4, 3, 2, 1];
  const impacts = [1, 2, 3, 4, 5];

  const attackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (Array.isArray(logs)) {
      logs.forEach((log) => {
        if (!log || !log.event_type) return;
        const cat = classifyAttack(log.event_type);
        if (cat !== "warning" && cat !== "resolved") {
          counts[cat] = (counts[cat] || 0) + 1;
        }
      });
    }
    return counts;
  }, [logs]);

  const maxCount = Math.max(...Object.values(attackCounts), 1);
  const normalizeProb = (count: number): number => {
    const raw = (count / maxCount) * 5;
    return Math.max(1, Math.round(raw));
  };

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


  return (
    <Card className="p-6 bg-card border-border flex-1 min-h-0 flex flex-col">
      <div className="flex justify-between items-end mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-card-foreground">{t('riskManagement.matrix_title', 'Cyber Threat Matrix')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('riskManagement.matrix_subtitle', 'Frequency vs. Impact Analysis')} — <span className="font-semibold text-foreground">{risks.length}</span> {t('riskManagement.active_threat_types', 'active threat types')}
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
        <div className="flex-1 flex items-center justify-center text-muted-foreground">{t('riskManagement.loading', 'Loading threat matrix...')}</div>
      ) : (
        <div className="relative pl-14 flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-muted-foreground tracking-[0.2em]">
              {t('riskManagement.axis_frequency', 'FREQUENCY')}
            </div>

            <div className="grid grid-cols-5 gap-1.5 h-full">
            {probabilities.map((prob) =>
              impacts.map((imp) => {
                const cellRisks = risks.filter((r) => r.probability === prob && r.impact === imp);
                return (
                  <div
                    key={`${prob}-${imp}`}
                    className={`relative rounded-md border p-1.5 transition-colors flex flex-wrap gap-1 content-start ${getCellColor(prob, imp)}`}
                  >
                    {cellRisks.map((risk) => (
                      <div
                        key={risk.id}
                        className={`w-2.5 h-2.5 rounded-full cursor-help transition-all duration-300 ${getDotColor(risk.category)}`}
                        title={`${risk.title}\nType: ${risk.category}\nAttacks: ${risk.count}`}
                      />
                    ))}
                    <span className="absolute bottom-0.5 right-1 text-[10px] font-mono opacity-40 text-muted-foreground font-bold">{prob},{imp}</span>
                  </div>
                );
              })
            )}
            </div>
          </div>

          <div className="text-center text-xs font-bold text-muted-foreground tracking-[0.2em] pt-3 shrink-0">
            {t('riskManagement.axis_impact', 'IMPACT')}
          </div>
        </div>
      )}
    </Card>
  );
}