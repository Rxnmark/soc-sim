import { useTranslation } from "../../context/LanguageContext";

// Criticality ranking for sorting (0 = most critical, 3 = least)
export function getCriticalityRank(eventType: string): number {
  const type = eventType.toLowerCase();
  // Critical (red) - DDoS attacks causing system disruptions, equipment going offline
  // Check DDoS subtypes first: slowloris, udp flood, dns amplification, ntp amplification
  if ("slowloris udp flood dns amplification ntp amplification ddos".split(" ").some(k => type.includes(k))) return 0;
  // Critical (red) - any attack that causes equipment to go offline/encrypted
  if ("offline encrypted".split(" ").some(k => type.includes(k))) return 0;
  // Significant (orange) - ransomware, data leaks, spyware, encryption attacks (ENCRYPTED status without equipment disruption)
  if ("ransomware exfiltration spyware data leak covert channel cryptolocker encryption".split(" ").some(k => type.includes(k))) return 1;
  // Minor (yellow) - scanning, injection attempts, brute-force, warnings, unauthorized access, blocked
  // Note: "attack" is excluded to avoid matching DDoS-related events
  if ("scan injection unauthorized access security warning drift antivirus port bruteforce blocked".split(" ").some(k => type.includes(k))) return 2;
  return 3; // least critical (auto-fix, resolved, neutralized)
}

// Get card styling based on criticality
export function getCardClass(eventType: string, criticalityRank: number): string {
  if (eventType.includes('Auto-Fix')) return 'p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-muted/40 transition-all cursor-pointer hover:border-primary/50 shadow-sm hover:shadow';
  const borderColor = criticalityRank === 0 ? 'border-red-500/40' : criticalityRank === 1 ? 'border-orange-500/40' : criticalityRank === 2 ? 'border-yellow-500/40' : 'border-border';
  const bgColor = criticalityRank === 0 ? 'bg-red-500/5' : criticalityRank === 1 ? 'bg-orange-500/5' : criticalityRank === 2 ? 'bg-yellow-500/5' : 'bg-background';
  return `p-3.5 rounded-lg border ${borderColor} ${bgColor} hover:bg-muted/40 transition-all cursor-pointer hover:border-primary/50 shadow-sm hover:shadow`;
}

export function isResolvedThreat(eventType: string): boolean {
  return "auto-fix applied success neutralized".split(" ").some(k => eventType.toLowerCase().includes(k));
}

// Log event type translation
export function translateLogEventType(t: (key: string, fallback: string) => string, eventType: string): string {
  const type = eventType.toLowerCase();
  // Check DDoS subtypes first
  if (type.includes("slowloris")) return t("threats.slowloris", "Slowloris DDoS");
  if (type.includes("udp flood")) return t("threats.udp_flood", "UDP Flood");
  if (type.includes("dns amplification")) return t("threats.dns_amplification", "DNS Amplification");
  if (type.includes("ntp amplification")) return t("threats.ntp_amplification", "NTP Amplification");
  if (type.includes("ddos")) return t("threats.ddos", "DDoS Attack");
  if (type.includes("ransomware")) return t("threats.ransomware", "Ransomware");
  if (type.includes("exfiltration")) return t("threats.exfiltration", "Data Exfiltration");
  if (type.includes("spyware")) return t("threats.spyware", "Spyware");
  if (type.includes("data leak")) return t("threats.data_leak", "Data Leak");
  if (type.includes("covert channel")) return t("threats.covert_channel", "Covert Channel");
  if (type.includes("cryptolocker")) return t("threats.cryptolocker", "CryptoLocker");
  if (type.includes("encryption attack")) return t("threats.encryption_attack", "Encryption Attack");
  if (type.includes("scan")) return t("threats.scan", "Port Scan");
  if (type.includes("injection")) return t("threats.injection", "SQL Injection");
  if (type.includes("unauthorized")) return t("threats.unauthorized", "Unauthorized Access");
  if (type.includes("security warning")) return t("threats.security_warning", "Security Warning");
  if (type.includes("drift")) return t("threats.drift", "DNS Drift");
  if (type.includes("antivirus")) return t("threats.antivirus", "Antivirus Alert");
  if (type.includes("port")) return t("threats.port_scan", "Port Scan");
  if (type.includes("bruteforce")) return t("threats.bruteforce", "Brute-force");
  if (type.includes("blocked")) return t("threats.blocked", "Blocked");
  if (type.includes("auto-fix") || type.includes("applied")) return t("threats.auto_fix", "Auto-Fix Applied");
  if (type.includes("neutralized")) return t("threats.neutralized", "Neutralized");
  if (type.includes("success")) return t("threats.success", "Success");
  return eventType;
}

// Get event description
export function getEventDescription(t: (key: string, fallback: string) => string, eventType: string): string {
  const type = eventType.toLowerCase();
  if (type.includes("slowloris")) return t("logs.slowloris_desc", "Slowloris DDoS attack detected - connection exhaustion");
  if (type.includes("udp flood")) return t("logs.udp_flood_desc", "UDP Flood attack - bandwidth saturation");
  if (type.includes("dns amplification")) return t("logs.dns_amp_desc", "DNS Amplification attack detected");
  if (type.includes("ntp amplification")) return t("logs.ntp_amp_desc", "NTP Amplification attack detected");
  if (type.includes("ddos")) return t("logs.ddos_desc", "DDoS attack detected - service disruption");
  if (type.includes("ransomware")) return t("logs.ransomware_desc", "Ransomware detected - files encrypted");
  if (type.includes("exfiltration")) return t("logs.exfiltration_desc", "Data exfiltration attempt detected");
  if (type.includes("spyware")) return t("logs.spyware_desc", "Spyware detected on system");
  if (type.includes("data leak")) return t("logs.data_leak_desc", "Data leak detected");
  if (type.includes("covert channel")) return t("logs.covert_channel_desc", "Covert channel communication detected");
  if (type.includes("cryptolocker")) return t("logs.cryptolocker_desc", "CryptoLocker ransomware detected");
  if (type.includes("encryption attack")) return t("logs.encryption_attack_desc", "Encryption attack detected");
  if (type.includes("scan")) return t("logs.scan_desc", "Port scanning activity detected");
  if (type.includes("injection")) return t("logs.injection_desc", "SQL Injection attempt detected");
  if (type.includes("unauthorized")) return t("logs.unauthorized_desc", "Unauthorized access attempt detected");
  if (type.includes("security warning")) return t("logs.security_warning_desc", "Security warning triggered");
  if (type.includes("drift")) return t("logs.drift_desc", "DNS drift detected");
  if (type.includes("antivirus")) return t("logs.antivirus_desc", "Antivirus alert triggered");
  if (type.includes("port")) return t("logs.port_scan_desc", "Port scan detected");
  if (type.includes("bruteforce")) return t("logs.bruteforce_desc", "Brute-force attack detected");
  if (type.includes("blocked")) return t("logs.blocked_desc", "Blocked connection attempt");
  if (type.includes("auto-fix") || type.includes("applied")) return t("logs.auto_fix_desc", "System auto-fixed the issue");
  if (type.includes("neutralized")) return t("logs.neutralized_desc", "Threat neutralized");
  if (type.includes("success")) return t("logs.success_desc", "Success");
  return eventType;
}

// Format date
export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Get log style
export function getLogStyle(eventType: string): { badge: string; color: string; icon: React.ReactNode } {
  const type = eventType.toLowerCase();
  if (type.includes("auto-fix") || type.includes("applied") || type.includes("success") || type.includes("neutralized")) {
    return { badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", color: "text-emerald-500", icon: null };
  }
  if ("ddos slowloris udp flood dns amplification ntp amplification offline encrypted".split(" ").some(k => type.includes(k))) {
    return { badge: "bg-red-500/10 text-red-500 border-red-500/20", color: "text-red-500", icon: null };
  }
  if ("ransomware exfiltration spyware data leak covert channel cryptolocker encryption".split(" ").some(k => type.includes(k))) {
    return { badge: "bg-orange-500/10 text-orange-500 border-orange-500/20", color: "text-orange-500", icon: null };
  }
  return { badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", color: "text-yellow-500", icon: null };
}