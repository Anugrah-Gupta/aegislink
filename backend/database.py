"""
AegisLink Database & Persistence Layer (SQLite + Real-time In-Memory Sync)
"""
import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "aegislink.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Incidents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        urgency TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        location_name TEXT,
        people INTEGER DEFAULT 1,
        status TEXT DEFAULT 'Queued',
        details TEXT,
        responder TEXT DEFAULT 'Pending Assignment',
        responder_status TEXT DEFAULT 'Unassigned',
        created_at TEXT
    )
    """)
    
    # 2. Shelters Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shelters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        capacity INTEGER NOT NULL,
        occupancy INTEGER NOT NULL,
        water_level TEXT DEFAULT 'GOOD',
        food_level TEXT DEFAULT 'GOOD',
        medical_available INTEGER DEFAULT 1,
        power_available INTEGER DEFAULT 1,
        pet_friendly INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Open'
    )
    """)
    
    # 3. IoT Sensors Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        status TEXT NOT NULL,
        trend TEXT NOT NULL
    )
    """)
    
    # 4. Official Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        tier TEXT NOT NULL,
        message TEXT NOT NULL,
        sector TEXT NOT NULL,
        source TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    """)
    
    # 5. Family Safety Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS family_members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        relation TEXT NOT NULL,
        status TEXT DEFAULT 'SAFE',
        last_seen TEXT,
        location TEXT
    )
    """)

    # Seed Initial Data if empty
    cursor.execute("SELECT COUNT(*) FROM shelters")
    if cursor.fetchone()[0] == 0:
        seed_data(cursor)
        
    conn.commit()
    conn.close()

def seed_data(cursor):
    # Seed Shelters
    shelters = [
        ("SHEL-01", "West High School Arena", "Sector 4", 37.7790, -122.4210, 500, 427, "LOW", "MED", 1, 1, 1, "Approaching Capacity"),
        ("SHEL-02", "Civic Community Center", "Sector 2", 37.7650, -122.4080, 750, 310, "GOOD", "GOOD", 1, 1, 0, "Open (Ample Space)"),
        ("SHEL-03", "North Pavilion Sports Hall", "Sector 1", 37.7880, -122.4150, 400, 180, "GOOD", "GOOD", 0, 1, 1, "Open"),
        ("SHEL-04", "St. Jude Church Fellowship", "Sector 5", 37.7580, -122.4290, 250, 245, "GOOD", "LOW", 1, 0, 0, "Full (Redirecting)")
    ]
    cursor.executemany("INSERT INTO shelters VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", shelters)
    
    # Seed Incidents
    incidents = [
        ("SOS-182", "Medical + Water Trap", "CRITICAL (P1)", 37.7749, -122.4194, "Sector 4 (River Rd)", 3, "In Progress", "Elderly female with compound fracture, 2 trapped on 2nd floor, water rising at +18cm/h.", "Boat Rescue Unit 1", "En Route (ETA: 3 min)", datetime.now().isoformat()),
        ("SOS-183", "Structural Collapse", "CRITICAL (P1)", 37.7680, -122.4050, "Sector 2 (Warehouse B)", 5, "Dispatched", "Roof partially caved in. Acoustic sensors detect tapping on pipes.", "USAR Heavy Squad 4", "En Route", datetime.now().isoformat()),
        ("SOS-184", "Fire & Smoke Hazard", "HIGH (P2)", 37.7850, -122.4300, "Sector 6 (Industrial Ave)", 0, "On Scene", "Substation transformer explosion with spreading chemical smoke.", "Hazmat Engine 12", "Suppressing", datetime.now().isoformat()),
        ("SOS-185", "Relief Supplies Deficit", "MEDIUM (P3)", 37.7710, -122.4110, "Sector 3 (Elderly Home)", 38, "Queued", "Need 200L clean drinking water and baby formula. Power restored via solar.", "Red Cross Van 02", "Staged", datetime.now().isoformat())
    ]
    cursor.executemany("INSERT INTO incidents VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", incidents)

    # Seed IoT Sensors
    sensors = [
        ("SENS-01", "River Basin Ultrasonic Water Gauge", "Water Level", 37.7760, -122.4170, 4.82, "meters", "CRITICAL (+18cm/h)", "Rising"),
        ("SENS-02", "Sector 2 Seismic IMU Triaxial", "Seismic", 37.7690, -122.4070, 0.14, "g-force", "NORMAL", "Stable"),
        ("SENS-03", "Coastal Station Wind & Rain Gauge", "Weather", 37.7900, -122.4000, 68.0, "km/h · 42mm", "WARNING (Gale)", "Dropping Barometer")
    ]
    cursor.executemany("INSERT INTO sensors VALUES (?,?,?,?,?,?,?,?,?)", sensors)

    # Seed Alerts
    alerts = [
        ("ALT-01", "Evacuation Order for Sector 4 Low-Lying Basin", "OFFICIAL ALERT", "River levels have exceeded 4.5m threshold. All residents in Sector 4 lowlands must move to West High School or North Pavilion immediately.", "Sector 4", "Civil Defense Command", "10:42 AM"),
        ("ALT-02", "Sector 4 Bridge Impassable", "VERIFIED INCIDENT", "Structural support compromised by swift river debris; powerlines sparking across north lane. Barricaded both ways.", "Sector 4", "Highway Patrol", "11:15 AM"),
        ("ALT-03", "River Level Sensor Surge Alert", "SENSOR TELEMETRY", "Ultrasonic telemetry reading: 4.82m (Rising +18 cm/hr). Flood wave crest estimated at 13:30.", "Sector 4", "Aegis Node #014", "12:05 PM"),
        ("ALT-04", "Fallen Oak Tree Blocking Pine Street", "COMMUNITY REPORT", "Multiple citizens report utility pole downed near Pine & 3rd. Responder unit dispatched to verify.", "Sector 3", "Citizen Reports (6)", "12:18 PM")
    ]
    cursor.executemany("INSERT INTO alerts VALUES (?,?,?,?,?,?,?)", alerts)

    # Seed Family
    family = [
        ("FAM-01", "Sarah (Mother)", "Mother", "SAFE", "4 mins ago", "West High School Shelter"),
        ("FAM-02", "David (Father)", "Father", "UNKNOWN", "32 mins ago", "Sector 2 (Near Civic Center)"),
        ("FAM-03", "Maya (Sister)", "Sister", "SAFE", "18 mins ago", "Home (2nd Floor Balcony)")
    ]
    cursor.executemany("INSERT INTO family_members VALUES (?,?,?,?,?,?)", family)
