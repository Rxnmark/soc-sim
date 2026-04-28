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

// Classify backend attack type names (DDoS, Ransomware, Stealth) into frontend categories
function classifyAttackType(attackType: string): "ddos" | "ransomware" | "stealth" {
  const lower = attackType.toLowerCase();
  if (lower.includes("ddos")) return "ddos";
  if (lower.includes("ransomware")) return "ransomware";
  if (lower.includes("stealth")) return "stealth";
  return "ddos"; // fallback
}

// Map backend attack types to display names
const FINANCIAL_DISPLAY_NAMES: Record<string, string> = {
  DDoS: "DDoS",
  Ransomware: "Ransomware",
  Stealth: "Stealth / APT",
};

export function useBusinessRisks() {
  const [apiSummary, setApiSummary] = useState<any>(null);

  const fetchSummary = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/risks/summary");
      const data = await res.json();
      setApiSummary(data);
    } catch (error) {
      console.error("Error fetching summary for charts:", error);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000);
    return () => clearInterval(interval);
  }, []);

  // Financial exposure by attack type — cumulative (historical, doesn't reset on fix)
  const byType = apiSummary?.cumulative_financial_by_type ?? {};

  const financialImpactData = useMemo(() => {
    return Object.entries(byType)
      .map(([type, impact]) => ({
        name: FINANCIAL_DISPLAY_NAMES[type] || type,
        impact: Number(impact) || 0,
      }))
      .sort((a, b) => b.impact - a.impact);
  }, [byType]);

  // Attack counts by type for Donut chart — from attack_history (total spawned, not just active)
  const attackTypeCounts = apiSummary?.attack_type_counts ?? {};

  const attackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(attackTypeCounts).forEach(([type, count]) => {
      const cat = classifyAttackType(type);
      counts[cat] = (counts[cat] || 0) + (Number(count) || 0);
    });
    return counts;
  }, [attackTypeCounts]);

  const categoryChartData = useMemo(() => {
    const labels: Record<string, string> = { ddos: "DDoS", ransomware: "Ransomware", stealth: "Stealth / APT" };
    return Object.entries(attackCounts).map(([name, value]) => ({
      name: labels[name] || name,
      value,
    }));
  }, [attackCounts]);

  return { risks: [], categoryChartData, financialImpactData };
}
