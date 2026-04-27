import { useState, useEffect, useMemo } from "react";
import { isResolvedThreat, isMinorEventType } from "../components/expert-utils";

export function useRiskData() {
  const [apiData, setApiData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [archivedThreats, setArchivedThreats] = useState<Set<string>>(new Set());

  const fetchSummary = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/risks/summary");
      const data = await response.json();
      setApiData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      if (isManual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/logs");
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const fetchArchived = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/threats/archived");
      const data = await res.json();
      setArchivedThreats(new Set<string>(data.map((a: any) => String(a.source_ip))));
    } catch (error) {
      console.error("Error fetching archived:", error);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchLogs();
    fetchArchived();
    const interval = setInterval(() => {
      fetchSummary(false);
      fetchLogs();
      fetchArchived();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const unprocessedCount = useMemo(() => {
    return logs.filter(
      (log) =>
        !isResolvedThreat(log.event_type) &&
        !isMinorEventType(log.event_type) &&
        !archivedThreats.has(log.source_ip)
    ).length;
  }, [logs, archivedThreats]);

  const archivedCount = archivedThreats.size;
  const totalCount = unprocessedCount + archivedCount;
  const mitigationRate = totalCount > 0 ? Math.round((archivedCount / totalCount) * 100) : 0;

  return {
    apiData, lastUpdated, isRefreshing,
    fetchSummary, fetchLogs, fetchArchived,
    unprocessedCount, archivedCount, totalCount, mitigationRate,
  };
}

// Classify attack type from event_type string
function classifyAttack(eventType: string): "ddos" | "ransomware" | "stealth" | "warning" | "resolved" {
  const lower = eventType.toLowerCase();
  if (["auto-fix", "applied", "success", "neutralized"].some((k) => lower.includes(k))) return "resolved";
  if (["ddos", "slowloris", "udp flood", "dns amplification", "traffic flood", "syn flood", "http flood", "ntp amplification", "offline"].some((k) => lower.includes(k))) return "ddos";
  if (["ransomware", "cryptolocker", "encryption attack"].some((k) => lower.includes(k))) return "ransomware";
  if (["exfiltration", "spyware", "data leak", "covert channel", "apt", "lateral movement", "zero-day"].some((k) => lower.includes(k))) return "stealth";
  return "warning";
}

// Financial impact per attack type (estimated cost in USD)
const FINANCIAL_IMPACT_PER_ATTACK: Record<string, number> = {
  ddos: 75000,       // DDoS — equipment offline, downtime
  ransomware: 50000, // Ransomware — data encryption, recovery
  stealth: 25000,    // Stealth — data leak, investigation cost
};

export function useBusinessRisks() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/logs")
      .then((res) => res.json())
      .then((data) => setLogs(data))
      .catch((err) => console.error("Error fetching logs:", err));
  }, []);

  // Count attacks by type (exclude resolved + warnings)
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

  const categoryChartData = useMemo(() => {
    const labels: Record<string, string> = { ddos: "DDoS", ransomware: "Ransomware", stealth: "Stealth / APT" };
    return Object.entries(attackCounts).map(([name, value]) => ({
      name: labels[name] || name,
      value,
    }));
  }, [attackCounts]);

  const financialImpactData = useMemo(() => {
    return Object.entries(attackCounts)
      .map(([type, count]) => ({
        name: type === "ddos" ? "DDoS" : type === "ransomware" ? "Ransomware" : "Stealth",
        impact: count * FINANCIAL_IMPACT_PER_ATTACK[type],
      }))
      .sort((a, b) => b.impact - a.impact);
  }, [attackCounts]);

  return { risks: [], categoryChartData, financialImpactData };
}
