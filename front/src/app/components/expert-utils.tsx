import { useTranslation } from "../../context/LanguageContext";

// Criticality ranking for sorting (0 = most critical, 3 = least)
export function getCriticalityRank(eventType: string): number {
  const type = eventType.toLowerCase();
  // Critical (red) - DDoS attacks causing system disruptions, equipment going offline
  // Check DDoS subtypes first: syn flood, traffic flood, slowloris, udp flood, dns amplification, ntp amplification
  if ("syn flood traffic flood slowloris udp flood dns amplification ntp amplification ddos".split(" ").some(k => type.includes(k))) return 0;
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
  if (type.includes("syn flood")) return t("logEventTypes.syn_flood_detected", "SYN Flood Attack");
  if (type.includes("traffic flood")) return t("logEventTypes.traffic_flood_detected", "Traffic Flood Attack");
  if (type.includes("slowloris")) return t("logEventTypes.slowloris_detected", "Slowloris Attack");
  if (type.includes("udp flood")) return t("logEventTypes.udp_flood_detected", "UDP Flood Attack");
  if (type.includes("dns amplification")) return t("logEventTypes.dns_amplification_detected", "DNS Amplification Attack");
  if (type.includes("ntp amplification")) return t("logEventTypes.ntp_amplification_detected", "NTP Amplification Attack");
  if (type.includes("http flood")) return t("logEventTypes.http_flood_detected", "HTTP Flood Attack");
  if (type.includes("ddos")) return t("logEventTypes.ddos_attack", "DDoS Attack");
  if (type.includes("ransomware")) return t("logEventTypes.ransomware_detected", "Ransomware Detected");
  if (type.includes("exfiltration")) return t("logEventTypes.data_exfiltration_detected", "Data Exfiltration");
  if (type.includes("spyware")) return t("logEventTypes.spyware_detected", "Spyware Detected");
  if (type.includes("data leak")) return t("logEventTypes.data_leak_detected", "Data Leak Detected");
  if (type.includes("covert channel")) return t("logEventTypes.covert_channel_detected", "Covert Channel Detected");
  if (type.includes("cryptolocker")) return t("logEventTypes.cryptolocker_detected", "CryptoLocker");
  if (type.includes("encryption attack")) return t("logEventTypes.encryption_attack_detected", "Encryption Attack");
  if (type.includes("port scan")) return t("logEventTypes.port_scan_activity", "Port Scan Activity");
  if (type.includes("scan")) return t("logEventTypes.port_scan_activity", "Port Scan Activity");
  if (type.includes("injection")) return t("logEventTypes.sql_injection_attempt", "SQL Injection Attempt");
  if (type.includes("unauthorized")) return t("logEventTypes.unauthorized_access_attempt", "Unauthorized Access Attempt");
  if (type.includes("security warning")) return t("logEventTypes.security_warning", "Security Warning");
  if (type.includes("drift")) return t("logEventTypes.configuration_drift_detected", "Configuration Drift Detected");
  if (type.includes("antivirus")) return t("logEventTypes.outdated_antivirus_signature", "Outdated Antivirus Signature");
  if (type.includes("bruteforce")) return t("logEventTypes.brute_force_detected", "Brute-force Attack");
  if (type.includes("blocked")) return t("logEventTypes.blocked_connection", "Blocked Connection");
  if (type.includes("auto-fix") || type.includes("applied")) return t("logEventTypes.auto_fix_applied", "Auto-Fix Applied");
  if (type.includes("neutralized")) return t("logEventTypes.threat_neutralized", "Threat Neutralized");
  if (type.includes("success")) return t("logEventTypes.success", "Success");
  return eventType;
}

// Get event description
export function getEventDescription(t: (key: string, fallback: string) => string, eventType: string): string {
  const type = eventType.toLowerCase();
  if (type.includes("syn flood")) return t("logEventTypes.syn_flood_desc", "SYN flood attack — exhausting server connection table with half-open connections");
  if (type.includes("traffic flood")) return t("logEventTypes.traffic_flood_desc", "Massive traffic flood overwhelming the target network");
  if (type.includes("slowloris")) return t("logEventTypes.slowloris_desc", "Web server attack using delayed requests to exhaust resources");
  if (type.includes("udp flood")) return t("logEventTypes.udp_flood_desc", "Massive UDP packet flooding to overwhelm network equipment");
  if (type.includes("dns amplification")) return t("logEventTypes.dns_amplification_desc", "Exploiting DNS servers to amplify attack traffic");
  if (type.includes("ntp amplification")) return t("logEventTypes.ntp_amplification_desc", "Exploiting NTP servers to amplify attack traffic");
  if (type.includes("http flood")) return t("logEventTypes.http_flood_desc", "Massive legitimate HTTP requests flooding to exhaust web server resources");
  if (type.includes("ddos")) return t("logEventTypes.ddos_attack_desc", "Massive DDoS traffic detected targeting server overload");
  if (type.includes("ransomware")) return t("logEventTypes.ransomware_desc", "Ransomware encryption activity detected - critical files may be at risk");
  if (type.includes("exfiltration")) return t("logEventTypes.data_exfiltration_desc", "Unauthorized transmission of confidential data detected outside the network");
  if (type.includes("spyware")) return t("logEventTypes.spyware_desc", "Hidden malicious process detected collecting sensitive information");
  if (type.includes("data leak")) return t("logEventTypes.data_leak_desc", "Unauthorized transmission of confidential data detected outside the network");
  if (type.includes("covert channel")) return t("logEventTypes.covert_channel_desc", "Covert channel communication detected");
  if (type.includes("cryptolocker")) return t("logEventTypes.cryptolocker_desc", "Ransomware encryption activity detected - critical files may be at risk");
  if (type.includes("encryption attack")) return t("logEventTypes.encryption_attack_desc", "Ransomware encryption activity detected - critical files may be at risk");
  if (type.includes("port scan")) return t("logEventTypes.port_scan_desc", "Reconnaissance port scanning activity detected from external source");
  if (type.includes("scan")) return t("logEventTypes.port_scan_desc", "Reconnaissance port scanning activity detected from external source");
  if (type.includes("injection")) return t("logEventTypes.sql_injection_desc", "Malicious SQL injection payload detected in form input fields");
  if (type.includes("unauthorized")) return t("logEventTypes.unauthorized_access_desc", "Unauthorized login attempt detected from external IP address");
  if (type.includes("security warning")) return t("logEventTypes.security_warning_desc", "Suspicious activity detected requiring investigation");
  if (type.includes("drift")) return t("logEventTypes.configuration_drift_desc", "Security configuration has drifted from baseline policy");
  if (type.includes("antivirus")) return t("logEventTypes.outdated_antivirus_desc", "Antivirus signature database is outdated and needs immediate update");
  if (type.includes("bruteforce")) return t("logEventTypes.brute_force_desc", "Multiple failed authentication attempts from unauthorized source");
  if (type.includes("blocked")) return t("logEventTypes.blocked_connection_desc", "Unauthorized access attempt blocked by firewall");
  if (type.includes("auto-fix") || type.includes("applied")) return t("logEventTypes.auto_fix_desc", "Automated security remediation successfully applied");
  if (type.includes("neutralized")) return t("logEventTypes.threat_neutralized_desc", "Threat successfully neutralized");
  if (type.includes("success")) return t("logEventTypes.success", "Success");
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
  if ("syn flood traffic flood ddos slowloris udp flood dns amplification ntp amplification offline encrypted".split(" ").some(k => type.includes(k))) {
    return { badge: "bg-red-500/10 text-red-500 border-red-500/20", color: "text-red-500", icon: null };
  }
  if ("ransomware exfiltration spyware data leak covert channel cryptolocker encryption".split(" ").some(k => type.includes(k))) {
    return { badge: "bg-orange-500/10 text-orange-500 border-orange-500/20", color: "text-orange-500", icon: null };
  }
  return { badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", color: "text-yellow-500", icon: null };
}