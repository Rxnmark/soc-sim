import React from "react";
import { ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

export type LogStyle = {
  icon: React.ReactNode;
  color: string;
  badge: string;
};

export function getLogStyle(eventType: string): LogStyle {
  const type = eventType.toLowerCase();
  if (type.includes("unauthorized") || type.includes("attack")) {
    return { icon: <ShieldAlert className="w-4 h-4 text-red-500" />, color: "text-red-500", badge: "bg-red-500/10 text-red-500 border-red-500/20" };
  }
  if (type.includes("auto-fix") || type.includes("applied") || type.includes("success")) {
    return { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, color: "text-emerald-500", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
  }
  return { icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />, color: "text-yellow-500", badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };
}

export function formatDate(dateString: string): string {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function mapEventTypeToKey(eventType: string): string {
  const lower = eventType.toLowerCase();
  if (lower.includes("unauthorized access")) return "logEventTypes.unauthorized_access_attempt";
  if (lower.includes("sql injection") || lower.includes("injection")) return "logEventTypes.sql_injection_attempt";
  if (lower.includes("ddos") || lower.includes("ddos attack")) return "logEventTypes.ddos_attack";
  if (lower.includes("security warning")) return "logEventTypes.security_warning";
  if (lower.includes("antivirus signature")) return "logEventTypes.outdated_antivirus_signature";
  if (lower.includes("configuration drift")) return "logEventTypes.configuration_drift_detected";
  if (lower.includes("port scan") || lower.includes("scan activity")) return "logEventTypes.port_scan_activity";
  if (lower.includes("auto-fix") || lower.includes("applied")) return "logEventTypes.auto_fix_applied";
  return eventType;
}

export function translateLogEventType(t: (key: string, fallback?: string) => string | React.ReactNode, eventType: string): string {
  const key = mapEventTypeToKey(eventType);
  return t(key, eventType) as string;
}

export function getEventDescription(t: (key: string, fallback?: string) => string | React.ReactNode, eventType: string): string {
  const lower = eventType.toLowerCase();
  if (lower.includes("unauthorized access")) return t("logEventTypes.unauthorized_access_desc", "") as string;
  if (lower.includes("sql injection")) return t("logEventTypes.sql_injection_desc", "") as string;
  if (lower.includes("ddos") || lower.includes("ddos attack")) return t("logEventTypes.ddos_attack_desc", "") as string;
  if (lower.includes("security warning")) return t("logEventTypes.security_warning_desc", "") as string;
  if (lower.includes("antivirus signature")) return t("logEventTypes.outdated_antivirus_desc", "") as string;
  if (lower.includes("configuration drift")) return t("logEventTypes.configuration_drift_desc", "") as string;
  if (lower.includes("port scan") || lower.includes("scan activity")) return t("logEventTypes.port_scan_desc", "") as string;
  if (lower.includes("auto-fix") || lower.includes("applied")) return t("logEventTypes.auto_fix_desc", "") as string;
  return eventType;
}