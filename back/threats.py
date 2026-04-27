import random
from datetime import datetime, timezone, timedelta

# Use Europe/Kiev timezone (UTC+3)
LOCAL_TZ = timezone(timedelta(hours=3))
import models

minor_threats = [
    {"type": "Port Scan", "severity": "Low", "category": "Minor",
     "title": "Позадовільне сканування мережі",
     "description": "Виявлено сканування портів зовнішнім джерелом, розвідка перед атакою"},
    {"type": "Brute-force Attempt", "severity": "Low", "category": "Minor",
     "title": "Невдала спроба brute-force атаки",
     "description": "Невдала спроба підбору паролів виявлена та заблокована"},
    {"type": "SQL Injection Attempt", "severity": "Low", "category": "Minor",
     "title": "Спроба SQL-ін'єкції заблокована",
     "description": "Невдала спроба SQL-ін'єкції, спрямована на бази даних через поля форм"},
    {"type": "Policy Violation", "severity": "Low", "category": "Minor",
     "title": "Порушення політики безпеки",
     "description": "Виявлено відхилення від базової політики безпеки"},
    {"type": "Reconnaissance", "severity": "Low", "category": "Minor",
     "title": "Розвідувальна активність виявлена",
     "description": "Підозріла активність збору інформації про інфраструктуру"},
    {"type": "NTP Amplification", "severity": "High", "category": "Minor",
     "title": "NTP Amplification атака виявлена",
     "description": "Виявлено NTP Amplification атаку, спрямовану на внутрішні сегменти мережі"},
]

warning_threats = [
    {"type": "Port Scan", "severity": "Low", "category": "Warning",
     "title": "Позадовільне сканування мережі",
     "description": "Виявлено сканування портів зовнішнім джерелом, розвідка перед атакою"},
    {"type": "Reconnaissance", "severity": "Low", "category": "Warning",
     "title": "Розвідувальна активність виявлена",
     "description": "Підозріла активність збору інформації про інфраструктуру"},
    {"type": "Policy Violation", "severity": "Low", "category": "Warning",
     "title": "Порушення політики безпеки",
     "description": "Виявлено відхилення від базової політики безпеки"},
    {"type": "Outdated Signature", "severity": "Low", "category": "Warning",
     "title": "Застарілі сигнатури антивіруса",
     "description": "База даних сигнатур антивіруса застаріла і потребує оновлення"},
    {"type": "Config Drift", "severity": "Low", "category": "Warning",
     "title": "Зміна конфігурації виявлена",
     "description": "Конфігурація безпеки відхилилася від базової політики"},
    {"type": "NTP Amplification", "severity": "High", "category": "Warning",
     "title": "NTP Amplification атака виявлена",
     "description": "Виявлено NTP Amplification атаку, спрямовану на внутрішні сегменти мережі"},
]

active_threats = [
    {"type": "DDoS", "severity": "High", "category": "Active",
     "title": "DDoS-атака в прогресі",
     "description": "Автоматичне виявлення трафіку DDoS-атаки, спрямованого на внутрішні сегменти"},
    {"type": "Brute-force", "severity": "High", "category": "Active",
     "title": "Brute-force атака в прогресі",
     "description": "Автоматичне виявлення активності brute-force атаки, спрямованої на внутрішні сегменти"},
    {"type": "SQL Injection", "severity": "High", "category": "Active",
     "title": "SQL-ін'єкція виявлена",
     "description": "Спроба SQL-ін'єкції, спрямована на бази даних через поля форм"},
    {"type": "Phishing", "severity": "High", "category": "Active",
     "title": "Фішингова кампанія виявлена",
     "description": "Виящено підозрілі шаблони електронних листів для викрадення облікових даних"},
    {"type": "Malware", "severity": "High", "category": "Active",
     "title": "Виявлено шкідливе ПЗ",
     "description": "Виявлено активність шкідливого ПЗ на системі"},
]

critical_threats = [
    {"type": "Ransomware", "severity": "Critical", "category": "Critical",
     "title": "Ransomware активність виявлена",
     "description": "Виявлено активність шифрування ransomware - критичні файли можуть бути під загрозою"},
    {"type": "Data Exfiltration", "severity": "Critical", "category": "Critical",
     "title": "Витоку даних виявлено",
     "description": "Несанкціонований вихід критичних даних за межі мережі виявлено"},
    {"type": "APT", "severity": "Critical", "category": "Critical",
     "title": "APT-активність виявлена",
     "description": "Підозріла повільна активність, що вказує на цільову атаку високого рівня"},
    {"type": "Zero-day", "severity": "Critical", "category": "Critical",
     "title": "Zero-day вразливість експлуатується",
     "description": "Виявлено експлуатацію невідомої вразливості в реальних умовах"},
    {"type": "Lateral Movement", "severity": "Critical", "category": "Critical",
     "title": "Бічного переміщення виявлено",
     "description": "Несанкціоноване переміщення між системами в межах мережі"},
]

def generate_random_threat(db):
    """Generates a random threat categorized as Minor, Warning, Active, or Critical."""
    category_weights = random.choices(["Minor", "Warning", "Active", "Critical"], weights=[30, 30, 30, 10])[0]
    if category_weights == "Minor":
        threat_pool = minor_threats
    elif category_weights == "Warning":
        threat_pool = warning_threats
    elif category_weights == "Active":
        threat_pool = active_threats
    else:
        threat_pool = critical_threats
    
    selected = random.choice(threat_pool)
    
    new_threat = models.Threat(
        title=selected["title"],
        description=selected["description"],
        type=selected["type"],
        severity=selected["severity"],
        category=selected["category"],
        timestamp=datetime.now(LOCAL_TZ)
    )
    db.add(new_threat)
    db.commit()
    db.refresh(new_threat)
    return new_threat