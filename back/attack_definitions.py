"""
Attack definitions and constants for the simulation engine.
This module contains all attack type configurations, log events,
and critical infrastructure definitions.
"""

# Attack definitions for the simulation engine
SIMULATION_ATTACKS = {
    "DDoS": {
        "types": ["DDoS Attack", "Traffic Flood", "SYN Flood", "NTP Amplification", "DNS Amplification", "Slowloris", "HTTP Flood", "UDP Flood"],
        "log_events": [
            "Massive incoming traffic flood detected targeting {target_name}.",
            "DDoS attack detected: {attack_type} from multiple sources.",
            "Service degradation due to traffic overload on {target_name}.",
            "Failed DDoS attempt blocked by firewall - {attack_type} detected and mitigated.",
            "Port scan detected from external source - reconnaissance activity on {target_name}.",
            "Unauthorized access attempt blocked - brute-force login detected on {target_name}.",
            "SQL injection attempt blocked by WAF on {target_name}.",
            "Security warning - suspicious network activity detected on {target_name}.",
        ],
        "effect": "offline",
    },
    "Stealth": {
        "types": ["Data Leak", "Spyware", "Covert Channel", "Data Exfiltration"],
        "log_events": [
            "Suspicious data transfer detected from {target_name}.",
            "Covert data exfiltration attempt identified on {target_name}.",
            "Hidden malware communication channel detected on {target_name}.",
        ],
        "effect": "stealth",
        "financial_impact_per_tick": 50000,
    },
    "Ransomware": {
        "types": ["Ransomware", "CryptoLocker", "RansomWare-X", "Encryption Attack"],
        "log_events": [
            "Ransomware encryption activity detected on {target_name}.",
            "Unauthorized file encryption attempt on {target_name}.",
            "Ransomware payload execution detected on {target_name}.",
        ],
        "effect": "ransomware",
        "ransomware_timeout_seconds": 15,
        "encrypted_recovery_seconds": 30,
    },
}

# Equipment that counts as "critical infrastructure" - if all go offline, everything becomes unreachable
CRITICAL_GATEWAY_IDS = {1}

# Default attack weights for probability selection
DEFAULT_ATTACK_WEIGHTS = {"DDoS": 3, "Stealth": 4, "Ransomware": 2}

# Phase escalation threshold (seconds)
ESCALATION_PHASE_SECONDS = 180  # 3 minutes

# Stealth financial exposure interval (seconds)
STEALTH_FINANCIAL_INTERVAL = 5

# Normal attack delay range (seconds)
NORMAL_ATTACK_DELAY_MIN = 20
NORMAL_ATTACK_DELAY_MAX = 40

# Escalated attack delay range (seconds)
ESCALATED_ATTACK_DELAY_MIN = 10
ESCALATED_ATTACK_DELAY_MAX = 20

# Reboot duration (seconds)
STANDARD_REBOOT_SECONDS = 5

# Game-over check interval (seconds)
GAME_OVER_CHECK_INTERVAL = 2