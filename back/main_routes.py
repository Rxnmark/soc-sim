"""
Route handlers for threat statistics, archive, and database reset.
Imported by main.py to keep files under 250 lines.
"""
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from database import SessionLocal, security_logs_collection
from models import ThreatArchive, Equipment, BusinessRisk
from schemas import FixRequest


async def get_threat_statistics():
    """Get daily attack statistics by category from security logs."""
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)

    # Get today's logs
    logs_cursor = security_logs_collection.find({
        "timestamp": {
            "$gte": start_of_day,
            "$lt": end_of_day
        }
    }).sort("timestamp", -1)
    today_logs = await logs_cursor.to_list(length=10000)

    # Count by category (matches frontend categorization)
    warning_count = 0
    active_count = 0
    critical_count = 0

    for log in today_logs:
        event_type = log.get("event_type", "").lower()
        if "auto-fix" in event_type or "applied" in event_type or "success" in event_type or "neutralized" in event_type:
            warning_count += 1
        # Critical (red) - DDoS attacks causing system disruptions, equipment going offline
        elif any(k in event_type for k in ["ddos", "slowloris", "udp flood", "dns amplification", "ntp amplification"]):
            critical_count += 1
        elif "offline" in event_type or "encrypted" in event_type:
            critical_count += 1
        # Significant (orange) - ransomware, data leaks, spyware, encryption attacks
        elif any(k in event_type for k in ["ransomware", "exfiltration", "spyware", "data leak", "covert channel", "cryptolocker", "encryption", "encryption attack"]):
            active_count += 1
        # Minor (yellow) - scanning, injection attempts, brute-force, warnings
        elif any(k in event_type for k in ["scan", "injection", "unauthorized", "security warning", "drift", "antivirus", "port", "bruteforce", "blocked"]):
            warning_count += 1
        else:
            warning_count += 1

    # Hourly breakdown for chart
    hourly_counts = {"warning": [0]*24, "active": [0]*24, "critical": [0]*24}
    for log in today_logs:
        ts = log.get("timestamp")
        if ts:
            hour = ts.hour
            event_type = log.get("event_type", "").lower()
            if "auto-fix" in event_type or "applied" in event_type or "success" in event_type or "neutralized" in event_type:
                hourly_counts["warning"][hour] += 1
            elif any(k in event_type for k in ["ddos", "slowloris", "udp flood", "dns amplification", "ntp amplification"]):
                hourly_counts["critical"][hour] += 1
            elif "offline" in event_type or "encrypted" in event_type:
                hourly_counts["critical"][hour] += 1
            elif any(k in event_type for k in ["ransomware", "exfiltration", "spyware", "data leak", "covert channel", "cryptolocker", "encryption", "encryption attack"]):
                hourly_counts["active"][hour] += 1
            elif any(k in event_type for k in ["scan", "injection", "unauthorized", "security warning", "drift", "antivirus", "port", "bruteforce", "blocked"]):
                hourly_counts["warning"][hour] += 1
            else:
                hourly_counts["warning"][hour] += 1

    # Get recent logs (last 24h) for each category
    recent_logs_cursor = security_logs_collection.find().sort("timestamp", -1).limit(50)
    recent_logs_raw = await recent_logs_cursor.to_list(length=50)

    # Convert ObjectId to string for JSON serialization
    recent_logs = []
    for log in recent_logs_raw:
        log["_id"] = str(log["_id"])
        recent_logs.append(log)

    return {
        "warning_count": warning_count,
        "active_count": active_count,
        "critical_count": critical_count,
        "hourly": hourly_counts,
        "recent_logs": recent_logs
    }


async def archive_threat(request: FixRequest, db):
    """Archive a resolved threat to the threat archive table."""
    equipment = db.query(Equipment).filter(Equipment.ip_address == request.source_ip).first()

    if not equipment:
        archive = ThreatArchive(
            threat_type="Neutralized",
            description=f"Threat neutralized from IP {request.source_ip}",
            source_ip=request.source_ip,
            equipment_name=None,
            severity="Medium",
            category="Active"
        )
        db.add(archive)
        db.commit()
        return {"status": "archived"}

    archive = ThreatArchive(
        threat_type="Neutralized",
        description=f"Threat neutralized on {equipment.name}",
        source_ip=request.source_ip,
        equipment_name=equipment.name,
        severity="Medium",
        category="Active"
    )
    db.add(archive)
    db.commit()
    return {"status": "archived"}


def get_archived_threats(limit: int = 100, db=None):
    """Get archived threats."""
    archives = db.query(ThreatArchive).order_by(ThreatArchive.archived_at.desc()).limit(limit).all()
    return [{"id": a.id, "threat_type": a.threat_type, "description": a.description,
             "source_ip": a.source_ip, "equipment_name": a.equipment_name,
             "severity": a.severity, "category": a.category,
             "archived_at": a.archived_at.isoformat()} for a in archives]