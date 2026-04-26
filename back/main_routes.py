"""
Route handlers for threat statistics, archive, and database reset.
Imported by main.py to keep files under 250 lines.
"""
from datetime import datetime, timezone, timedelta

# Use Europe/Kiev timezone (UTC+3) for correct local time display
LOCAL_TZ = timezone(timedelta(hours=3))
from bson import ObjectId
from database import SessionLocal, security_logs_collection
from models import ThreatArchive, Equipment, BusinessRisk
from schemas import FixRequest


async def get_threat_statistics():
    """Get daily attack statistics by category from security logs."""
    now = datetime.now(LOCAL_TZ)
    start_of_day_local = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day_local = start_of_day_local + timedelta(days=1)

    # Convert to UTC for MongoDB comparison (MongoDB stores timestamps in UTC)
    start_of_day_utc = start_of_day_local.astimezone(timezone.utc)
    end_of_day_utc = end_of_day_local.astimezone(timezone.utc)

    # Get today's logs (filter by UTC timestamps in MongoDB)
    logs_cursor = security_logs_collection.find({
        "timestamp": {
            "$gte": start_of_day_utc,
            "$lt": end_of_day_utc
        }
    }).sort("timestamp", -1)
    today_logs = await logs_cursor.to_list(length=10000)

    # Count by category (matches frontend categorization)
    minor_count = 0
    warning_count = 0
    active_count = 0
    critical_count = 0

    for log in today_logs:
        event_type = log.get("event_type", "").lower()
        if "auto-fix" in event_type or "applied" in event_type or "success" in event_type or "neutralized" in event_type:
            warning_count += 1
        # Critical (red) - DDoS attacks that take equipment offline
        elif any(k in event_type for k in ["ddos", "slowloris", "udp flood", "dns amplification", "traffic flood", "syn flood", "http flood", "ntp amplification"]):
            critical_count += 1
        elif "offline" in event_type:
            critical_count += 1
        # Active (orange) - Ransomware (encrypts but doesn't offline) + Stealth
        elif any(k in event_type for k in ["ransomware", "exfiltration", "spyware", "data leak", "covert channel", "cryptolocker", "encryption attack"]):
            active_count += 1
        # Minor (yellow) - scanning, injection attempts, brute-force, policy violations, reconnaissance
        elif any(k in event_type for k in ["port scan", "brute-force attempt", "sql injection attempt", "policy violation", "reconnaissance"]):
            minor_count += 1
        # Minor (yellow) - other scanning, injection, unauthorized, security warnings
        elif any(k in event_type for k in ["scan", "injection", "unauthorized", "security warning", "drift", "antivirus", "port", "bruteforce", "blocked"]):
            warning_count += 1
        else:
            warning_count += 1

    # Hourly breakdown for chart - pre-grouped into 3-hour buckets
    # Frontend expects: hourly.warning[0], hourly.warning[3], hourly.warning[6]... (step=3)
    # Include ALL warning-type events in hourly.warning to match the counter
    hourly_counts = {"warning": [0]*24, "active": [0]*24, "critical": [0]*24, "minor": [0]*24}
    for log in today_logs:
        ts = log.get("timestamp")
        if ts:
            # Convert timestamp to local timezone for correct hour bucketing
            # MongoDB stores timestamps in UTC — ensure correct conversion
            if ts.tzinfo is None:
                # Naive datetime — assume UTC (MongoDB default)
                ts = ts.replace(tzinfo=timezone.utc)
            ts_local = ts.astimezone(LOCAL_TZ)
            hour = ts_local.hour
            event_type = log.get("event_type", "").lower()
            if "auto-fix" in event_type or "applied" in event_type or "success" in event_type or "neutralized" in event_type:
                hourly_counts["warning"][hour] += 1
            # Critical (red) - DDoS
            elif any(k in event_type for k in ["ddos", "slowloris", "udp flood", "dns amplification", "traffic flood", "syn flood", "http flood", "ntp amplification"]):
                hourly_counts["critical"][hour] += 1
            elif "offline" in event_type:
                hourly_counts["critical"][hour] += 1
            # Active (orange) - Ransomware + Stealth
            elif any(k in event_type for k in ["ransomware", "exfiltration", "spyware", "data leak", "covert channel", "cryptolocker", "encryption attack"]):
                hourly_counts["active"][hour] += 1
            # All other events (including minor attacks) go to warning
            else:
                hourly_counts["warning"][hour] += 1

    # Get recent logs (last 24h) for each category
    recent_logs_cursor = security_logs_collection.find().sort("timestamp", -1).limit(50)
    recent_logs_raw = await recent_logs_cursor.to_list(length=50)

    # Convert ObjectId to string for JSON serialization and add title field
    recent_logs = []
    for log in recent_logs_raw:
        log["_id"] = str(log["_id"])
        log["title"] = log.get("title", "")
        recent_logs.append(log)

    return {
        "minor_count": minor_count,
        "warning_count": warning_count,
        "active_count": active_count,
        "critical_count": critical_count,
        "hourly": hourly_counts,
        "recent_logs": recent_logs,
        "server_hour": now.hour,
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