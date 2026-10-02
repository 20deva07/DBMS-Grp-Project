"""
The Grand Horizon Luxury Hotel Management System - Backend Server
PostgreSQL Database Driver configured EXACTLY for user's tables and attributes:

1. Admin_details   (admin_id, name, password, type)
2. Admin_features  (type, feature)
3. Booking         (booking_no, checkInDate, checkOutDate, guest_id, adminid)
4. Booking_room    (booking_no, room_no)
5. Guest           (guest_id, guest_name, idProof)
6. Guest_phone     (guest_id, mobile_number)
7. Service         (service_id, service_type, price)
8. Service_request (request_id, service_id, guest_id, admin_id)
9. Room            (room_number, room_type, availability)
10. Room_type      (room_type, price)
"""

import os
import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

try:
    from db_config import DB_CONFIG
except ImportError:
    from backend.db_config import DB_CONFIG

# Static directory is the parent directory
STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

app = Flask(__name__, static_folder=STATIC_DIR)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

def get_db_connection():
    """Establish connection to PostgreSQL using credentials in db_config.py"""
    try:
        conn = psycopg2.connect(
            dbname=DB_CONFIG["database"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"]
        )
        return conn, None
    except Exception as e:
        return None, str(e)

def parse_id(raw_val, default=1):
    """Safely extracts integer ID from strings like 'RES-2026-1006', 'GUEST-9', 'USR-001', or 1006."""
    if raw_val is None:
        return default
    raw_str = str(raw_val).strip()
    if "-" in raw_str:
        raw_str = raw_str.split("-")[-1]
    digits = "".join(filter(str.isdigit, raw_str))
    return int(digits) if digits else default

def auto_init_database():
    """Create missing tables without wiping live data already stored in pgAdmin.

    The schema file contains destructive DROP TABLE statements and seed inserts, so it
    must not be run every time the app starts. It is only safe for a brand-new empty
    database or a one-time bootstrap. Live application data must be left intact.
    """
    conn, err = get_db_connection()
    if err:
        print(f"[PostgreSQL Connection Note]: {err}")
        print("-> To connect, please update your database name and password in backend/db_config.py")
        return False

    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public';
        """)
        existing_tables = {row[0] for row in cur.fetchall()}
        required_tables = {
            'Admin_details', 'Admin_features', 'Room_type', 'Room', 'Guest',
            'Guest_phone', 'Booking', 'Booking_room', 'Service', 'Service_request'
        }

        if required_tables.issubset(existing_tables):
            cur.close()
            conn.close()
            print("[Database Synced]: All 10 tables already exist; live data preserved.")
            return True

        schema_path = os.path.join(STATIC_DIR, "database", "postgres_schema.sql")
        if os.path.exists(schema_path):
            with open(schema_path, "r", encoding="utf-8") as f:
                sql_content = f.read()

            # Only allow the schema file to initialize missing tables. Do not run the
            # destructive DROP TABLE / seed-reset section on an already live database.
            filtered_sql = "\n".join(
                line for line in sql_content.splitlines()
                if "DROP TABLE" not in line.upper()
            )
            filtered_sql = "\n".join(
                line for line in filtered_sql.splitlines()
                if "SELECT setval" not in line.upper()
            )

            cur.execute(filtered_sql)
            conn.commit()
            print("[Database Initialized]: Missing tables created without deleting live records.")

        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"[Schema Init Note]: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False

# =====================================================================
# API Endpoints mapped directly to user's 10 tables
# =====================================================================

@app.route("/api/status", methods=["GET"])
def check_status():
    """Health check: tests connection to user's pgAdmin database and lists tables"""
    conn, err = get_db_connection()
    if err:
        return jsonify({
            "connected": False,
            "error": err,
            "hint": "Check database name & password in backend/db_config.py."
        }), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        """)
        tables = [row["table_name"] for row in cur.fetchall()]
        cur.close()
        conn.close()

        return jsonify({
            "connected": True,
            "database": DB_CONFIG["database"],
            "host": DB_CONFIG["host"],
            "port": DB_CONFIG["port"],
            "tables_found": tables,
            "message": "Connected directly to pgAdmin database!"
        })
    except Exception as e:
        return jsonify({"connected": False, "error": str(e)}), 500

# --- 1. ADMIN AUTHENTICATION (Table: Admin_details & Admin_features) ---

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    """
    Table: Admin_details (admin_id, name, password, type)
    Table: Admin_features (type, feature)
    """
    data = request.json or {}
    admin_id = data.get("adminId", "").strip()
    admin_name = data.get("adminName", "").strip()
    password = data.get("password", "")

    if not admin_id or not admin_name or not password:
        return jsonify({"error": "Admin ID, Name, and Password are all required."}), 400

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Query Admin_details with case-insensitivity on ID and name
        cur.execute("""
            SELECT admin_id, name, password, type
            FROM "Admin_details"
            WHERE UPPER(admin_id) = %s AND LOWER(name) = %s;
        """, (admin_id.upper(), admin_name.lower()))
        admin_row = cur.fetchone()

        if not admin_row or admin_row["password"] != password:
            cur.close()
            conn.close()
            return jsonify({"error": "Invalid Admin ID, Name, or Password."}), 401

        # Query features for this admin's type from Admin_features
        cur.execute("""
            SELECT feature 
            FROM "Admin_features" 
            WHERE LOWER(type) = %s;
        """, (admin_row["type"].lower(),))
        features = [f["feature"] for f in cur.fetchall()]

        cur.close()
        conn.close()

        role = admin_row["type"].lower()
        return jsonify({
            "success": True,
            "staff": {
                "admin_id": admin_row["admin_id"],
                "staffId": admin_row["admin_id"],
                "name": admin_row["name"],
                "fullName": admin_row["name"],
                "type": role,
                "role": role,
                "features": features
            }
        })

    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/staff", methods=["GET"])
def get_staff_directory():
    """Table: Admin_details (admin_id, name, type)"""
    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT admin_id, name, type
            FROM "Admin_details"
            ORDER BY admin_id;
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        staff_list = []
        for r in rows:
            staff_list.append({
                "admin_id": r["admin_id"],
                "staffId": r["admin_id"],
                "name": r["name"],
                "fullName": r["name"],
                "type": r["type"],
                "role": r["type"].lower(),
                "department": "Management" if r["type"].lower() == "manager" else "Front Desk"
            })

        return jsonify({"staff": staff_list})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/staff", methods=["POST"])
def add_new_staff():
    """
    Manager capability: Add other Manager or Receptionist
    Table: Admin_details (admin_id, name, password, type)
    """
    data = request.json or {}
    admin_id = data.get("staffId") or data.get("admin_id")
    name = data.get("fullName") or data.get("name")
    password = data.get("password")
    admin_type = (data.get("role") or data.get("type", "receptionist")).lower()

    if not admin_id or not name or not password:
        return jsonify({"error": "Admin ID, Name, and Password are required."}), 400

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO "Admin_details" (admin_id, name, password, type)
            VALUES (%s, %s, %s, %s)
            RETURNING admin_id, name, type;
        """, (admin_id.upper(), name.strip(), password, admin_type))
        new_row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "staff": {
                "admin_id": new_row["admin_id"],
                "staffId": new_row["admin_id"],
                "name": new_row["name"],
                "fullName": new_row["name"],
                "type": new_row["type"],
                "role": new_row["type"].lower()
            }
        }), 201

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

# --- 2. GUEST REGISTRATION & AUTH (Tables: Guest, Guest_phone) ---

@app.route("/api/auth/register", methods=["POST"])
def register_guest():
    """
    Table: Guest (guest_id, guest_name, idProof)
    Table: Guest_phone (guest_id, mobile_number)
    """
    data = request.json or {}
    name = (data.get("guest_name") or data.get("fullName") or data.get("name") or "").strip()
    id_proof = (data.get("idProof") or data.get("id_proof") or "").strip()
    mobile = (data.get("phone") or data.get("mobile_number") or data.get("mobile") or "").strip()

    if not name or not id_proof:
        return jsonify({"error": "Guest name and ID proof are required."}), 400

    if not mobile:
        mobile = "+1 (555) 000-0000"

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            INSERT INTO "Guest" (guest_name, idProof)
            VALUES (%s, %s)
            RETURNING guest_id, guest_name, idProof;
        """, (name, id_proof))
        guest = cur.fetchone()
        g_id = guest["guest_id"]

        if mobile:
            cur.execute("""
                INSERT INTO "Guest_phone" (guest_id, mobile_number)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING;
            """, (g_id, mobile))

        conn.commit()
        cur.close()
        conn.close()

        guest_id_proof = guest.get("idProof") or guest.get("idproof") or id_proof

        return jsonify({
            "success": True,
            "user": {
                "id": f"GUEST-{g_id}",
                "userId": g_id,
                "guest_id": g_id,
                "fullName": guest["guest_name"],
                "guest_name": guest["guest_name"],
                "idProof": guest_id_proof,
                "phone": mobile,
                "email": data.get("email", f"guest{g_id}@hotel.com"),
                "role": "guest"
            }
        }), 201

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/api/auth/login", methods=["POST"])
def login_guest():
    """Guest lookup from Guest & Guest_phone using the real project_jqlp schema."""
    data = request.json or {}
    guest_name = (data.get("guest_name") or data.get("fullName") or data.get("name") or data.get("guestName") or "").strip()
    id_proof = (data.get("idProof") or data.get("id_proof") or "").strip()
    phone = (data.get("phone") or data.get("mobile_number") or "").strip()
    guest_id = data.get("guest_id") or data.get("userId")

    if not guest_name and not id_proof and not phone and guest_id is None:
        return jsonify({"error": "Guest name and ID proof are required for sign in."}), 400

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        if guest_id is not None:
            cur.execute("""
                SELECT g.guest_id, g.guest_name, g.idProof, gp.mobile_number
                FROM "Guest" g
                LEFT JOIN "Guest_phone" gp ON g.guest_id = gp.guest_id
                WHERE g.guest_id = %s
                ORDER BY g.guest_id ASC
                LIMIT 1;
            """, (int(guest_id),))
        elif guest_name and id_proof:
            cur.execute("""
                SELECT g.guest_id, g.guest_name, g.idProof, gp.mobile_number
                FROM "Guest" g
                LEFT JOIN "Guest_phone" gp ON g.guest_id = gp.guest_id
                WHERE LOWER(TRIM(g.guest_name)) = LOWER(TRIM(%s))
                  AND LOWER(TRIM(g.idProof)) = LOWER(TRIM(%s))
                ORDER BY g.guest_id ASC
                LIMIT 1;
            """, (guest_name, id_proof))
        elif phone:
            cur.execute("""
                SELECT g.guest_id, g.guest_name, g.idProof, gp.mobile_number
                FROM "Guest" g
                LEFT JOIN "Guest_phone" gp ON g.guest_id = gp.guest_id
                WHERE LOWER(TRIM(gp.mobile_number)) = LOWER(TRIM(%s))
                ORDER BY g.guest_id ASC
                LIMIT 1;
            """, (phone,))
        else:
            cur.execute("""
                SELECT g.guest_id, g.guest_name, g.idProof, gp.mobile_number
                FROM "Guest" g
                LEFT JOIN "Guest_phone" gp ON g.guest_id = gp.guest_id
                WHERE LOWER(TRIM(g.guest_name)) = LOWER(TRIM(%s))
                ORDER BY g.guest_id ASC
                LIMIT 1;
            """, (guest_name,))

        guest = cur.fetchone()
        cur.close()
        conn.close()

        if not guest:
            return jsonify({"error": "Invalid guest name or ID proof."}), 401

        return jsonify({
            "success": True,
            "user": {
                "id": f"GUEST-{guest['guest_id']}",
                "userId": guest["guest_id"],
                "guest_id": guest["guest_id"],
                "fullName": guest["guest_name"],
                "guest_name": guest["guest_name"],
                "idProof": guest.get("idProof") or guest.get("idproof"),
                "phone": guest["mobile_number"],
                "email": f"guest{guest['guest_id']}@hotel.com",
                "role": "guest"
            }
        })

    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/api/rooms", methods=["GET"])
def get_rooms():
    """
    Table: Room (room_number, room_type, availability)
    Table: Room_type (room_type, price)
    """
    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT 
                rt.room_type, 
                rt.price,
                COUNT(r.room_number) as total_rooms,
                COUNT(CASE WHEN r.availability = 'available' THEN 1 END) as available_rooms,
                COALESCE(array_agg(r.room_number) FILTER (WHERE r.availability = 'available'), '{}') as available_numbers
            FROM "Room_type" rt
            LEFT JOIN "Room" r ON rt.room_type = r.room_type
            GROUP BY rt.room_type, rt.price
            ORDER BY rt.price ASC;
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Visual enhancement mappings for the 3 canonical suites
        meta_map = {
            "Standard Skyline Suite": {
                "id": "executive-skyline-suite",
                "name": "Standard Skyline Suite",
                "room_type": "Standard Skyline Suite",
                "type": "standard",
                "typeName": "Standard Suite",
                "pricePerNight": 2000.0,
                "rating": 4.92,
                "reviews": 215,
                "popular": False,
                "capacity": 1,
                "bedType": "1 King Bed",
                "roomSize": "580 sq.ft (54 m²)",
                "image": "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=80",
                "gallery": [
                    "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=900&q=80"
                ],
                "description": "Tailored for the modern luxury traveler, this suite boasts separate living and sleeping quarters, executive ergonomic workspace, marble wet bar, and high-altitude skyline panoramas.",
                "amenities": [
                    "Panoramic Skyline View",
                    "Executive Lounge Access",
                    "Private Workstation",
                    "Complimentary Mini-Bar",
                    "Deep Soaking Jacuzzi",
                    "Smart Home Automation",
                    "Soundproofed Glass"
                ]
            },
            "Deluxe Ocean King Suite": {
                "id": "deluxe-ocean-king",
                "name": "Deluxe Ocean King Suite",
                "room_type": "Deluxe Ocean King Suite",
                "type": "deluxe",
                "typeName": "Deluxe Suite",
                "pricePerNight": 3500.0,
                "rating": 4.90,
                "reviews": 320,
                "popular": True,
                "capacity": 2,
                "bedType": "2 California King Beds",
                "roomSize": "750 sq.ft (70 m²)",
                "image": "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
                "gallery": [
                    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=80"
                ],
                "description": "Perched gracefully above the coastline, this sanctuary features floor-to-ceiling glass doors opening onto a private furnished sun deck. Handcrafted oak furnishings and Italian marble rain-shower.",
                "amenities": [
                    "Ocean View Balcony",
                    "High-Speed Wi-Fi 6",
                    "55-inch 4K OLED TV",
                    "Nespresso Bar",
                    "Rainfall Shower & Soaking Tub",
                    "Free Gourmet Breakfast",
                    "24/7 Room Service"
                ]
            },
            "Zen Garden Wellness Suite": {
                "id": "garden-wellness-deluxe",
                "name": "Zen Garden Wellness Suite",
                "room_type": "Zen Garden Wellness Suite",
                "type": "suite",
                "typeName": "Wellness Suite",
                "pricePerNight": 6000.0,
                "rating": 4.88,
                "reviews": 142,
                "popular": False,
                "capacity": 3,
                "bedType": "2 California King Beds + 1 Plush Queen Bed",
                "roomSize": "820 sq.ft (76 m²)",
                "image": "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80",
                "gallery": [
                    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80"
                ],
                "description": "Immerse in tranquility surrounded by botanical zen gardens and whispering bamboo water features. Includes in-room yoga mats, essential oil diffusers, and meditation veranda.",
                "amenities": [
                    "Botanical Garden Patio",
                    "Essential Oil Aromatherapy",
                    "Yoga & Meditation Kit",
                    "Herbal Tea Bar",
                    "Organic Bamboo Linens",
                    "Walk-in Rain Shower",
                    "Free Wi-Fi 6"
                ]
            }
        }

        canonical_order = [
            "Standard Skyline Suite",
            "Deluxe Ocean King Suite",
            "Zen Garden Wellness Suite"
        ]

        # Map db rows by room_type
        db_map = {r["room_type"]: r for r in rows}

        rooms = []
        for name in canonical_order:
            meta = meta_map[name]
            db_row = db_map.get(name) or {}
            avail_count = db_row.get("available_rooms")
            if avail_count is None:
                avail_count = 20
            avail_nums = db_row.get("available_numbers") or []

            price = float(db_row.get("price") or meta["pricePerNight"])

            rooms.append({
                "id": meta["id"],
                "room_type": name,
                "name": meta["name"],
                "typeName": meta["typeName"],
                "type": meta["type"],
                "pricePerNight": price,
                "capacity": meta["capacity"],
                "bedType": meta["bedType"],
                "roomSize": meta["roomSize"],
                "description": meta["description"],
                "image": meta["image"],
                "gallery": meta["gallery"],
                "amenities": meta["amenities"],
                "rating": meta["rating"],
                "reviews": meta["reviews"],
                "popular": meta["popular"],
                "availableCount": avail_count,
                "availableRoomNumbers": avail_nums
            })

        return jsonify({"rooms": rooms})

    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

# --- 4. SERVICES & SERVICE REQUESTS (Tables: Service, Service_request) ---

@app.route("/api/services", methods=["GET"])
def get_services():
    """Table: Service (service_id, service_type, price)"""
    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT service_id, service_type, price
            FROM "Service"
            ORDER BY service_id ASC;
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        services = []
        for r in rows:
            services.append({
                "service_id": r["service_id"],
                "id": str(r["service_id"]),
                "name": r["service_type"],
                "service_type": r["service_type"],
                "price": float(r["price"])
            })

        return jsonify({"services": services})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

# --- 5. BOOKINGS & BOOKING_ROOM (Tables: Booking, Booking_room) ---

@app.route("/api/bookings", methods=["POST"])
def create_booking():
    """
    Table: Booking (booking_no, checkInDate, checkOutDate, guest_id, adminid)
    Table: Booking_room (booking_no, room_no)
    Table: Service_request (request_id, service_id, guest_id, admin_id)
    Table: Room (updates availability)
    """
    data = request.json or {}
    check_in = data.get("checkIn") or data.get("checkInDate")
    check_out = data.get("checkOut") or data.get("checkOutDate")
    guest_id_raw = data.get("guest_id") or data.get("userId") or 1
    
    guest_id = parse_id(guest_id_raw, default=1)

    admin_id = data.get("adminid") or None
    room_no = data.get("room_no") or data.get("roomNumberAssigned")
    room_type = data.get("roomType") or data.get("roomName")
    addons = data.get("addons", [])

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Resolve guest_id (ensure foreign key exists in Guest table)
        cur.execute('SELECT guest_id FROM "Guest" WHERE guest_id = %s;', (guest_id,))
        if not cur.fetchone():
            guest_name = data.get("guestName") or data.get("guest_name") or "Valued Guest"
            id_proof = data.get("idProof") or "ID-GUEST-AUTO"
            cur.execute('SELECT guest_id FROM "Guest" WHERE LOWER(TRIM(guest_name)) = LOWER(TRIM(%s)) LIMIT 1;', (guest_name,))
            g_row = cur.fetchone()
            if g_row:
                guest_id = g_row["guest_id"]
            else:
                cur.execute('INSERT INTO "Guest" (guest_name, idproof) VALUES (%s, %s) RETURNING guest_id;', (guest_name, id_proof))
                guest_id = cur.fetchone()["guest_id"]
                phone = data.get("guestPhone") or data.get("phone") or "+1 (555) 000-0000"
                cur.execute('INSERT INTO "Guest_phone" (guest_id, mobile_number) VALUES (%s, %s) ON CONFLICT DO NOTHING;', (guest_id, phone))

        # 2. Resolve room_no dynamically based on room_type
        if not room_no and room_type:
            cur.execute('SELECT room_number FROM "Room" WHERE room_type = %s AND availability = \'available\' LIMIT 1;', (room_type,))
            r_row = cur.fetchone()
            if not r_row:
                cur.execute('SELECT room_number FROM "Room" WHERE room_type = %s LIMIT 1;', (room_type,))
                r_row = cur.fetchone()
            if r_row:
                room_no = r_row["room_number"]
        if not room_no:
            cur.execute('SELECT room_number FROM "Room" WHERE availability = \'available\' LIMIT 1;')
            r_row = cur.fetchone()
            room_no = r_row["room_number"] if r_row else "101"

        # 3. Insert into Booking
        cur.execute("""
            INSERT INTO "Booking" ("checkInDate", "checkOutDate", guest_id, adminid)
            VALUES (%s, %s, %s, %s)
            RETURNING booking_no, "checkInDate", "checkOutDate", guest_id, adminid;
        """, (check_in, check_out, guest_id, admin_id))
        new_booking = cur.fetchone()
        b_no = new_booking["booking_no"]

        # 4. Insert into Booking_room
        cur.execute("""
            INSERT INTO "Booking_room" (booking_no, room_no)
            VALUES (%s, %s)
            ON CONFLICT (booking_no, room_no) DO NOTHING;
        """, (b_no, room_no))

        # 5. Only mark Room as Occupied if staff explicitly provided admin_id (e.g., direct walk-in / staff override)
        # For standard guest bookings, Room remains available until receptionist approves details and hands over the key.
        if admin_id:
            cur.execute("""
                UPDATE "Room"
                SET availability = 'occupied'
                WHERE room_number = %s;
            """, (room_no,))

        # 6. Insert any add-ons into Service_request (admin_id is None = Pending approval by receptionist)
        for addon in addons:
            s_id = addon.get("service_id")
            if not s_id:
                s_name = addon.get("name") or addon.get("service_type") or addon.get("id") or ""
                cur.execute("""
                    SELECT service_id FROM "Service" WHERE service_type ILIKE %s LIMIT 1;
                """, (f"%{s_name}%",))
                s_row = cur.fetchone()
                s_id = s_row["service_id"] if s_row else 1

            cur.execute("""
                INSERT INTO "Service_request" (service_id, guest_id, admin_id)
                VALUES (%s, %s, %s);
            """, (s_id, guest_id, None))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "booking": {
                "booking_no": b_no,
                "bookingId": f"RES-2026-{b_no}",
                "checkIn": str(new_booking["checkInDate"]),
                "checkOut": str(new_booking["checkOutDate"]),
                "guest_id": guest_id,
                "room_no": room_no,
                "adminid": admin_id,
                "total": float(data.get("total", 0.0)),
                "addons": addons,
                "approvalStatus": "Approved" if admin_id else "Pending Approval",
                "overallBillStatus": "Draft",
                "status": "Confirmed"
            }
        }), 201

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/api/bookings/user/<user_id_raw>", methods=["GET"])
def get_user_bookings(user_id_raw):
    """Fetch all reservations for a specific guest ID."""
    guest_id = parse_id(user_id_raw, default=1)

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT 
                b.booking_no,
                b."checkInDate",
                b."checkOutDate",
                b.adminid,
                g.guest_id,
                g.guest_name,
                COALESCE(br.room_no, '101') as room_no,
                COALESCE(r.room_type, 'Deluxe Ocean King Suite') as room_type,
                COALESCE(rt.price, 3500.00) as room_price,
                GREATEST(1, (b."checkOutDate" - b."checkInDate")) as total_nights,
                (GREATEST(1, (b."checkOutDate" - b."checkInDate")) * COALESCE(rt.price, 3500.00)) as room_subtotal,
                COALESCE(
                    (SELECT json_agg(json_build_object(
                        'request_id', sr.request_id,
                        'service_id', s.service_id,
                        'name', s.service_type,
                        'cost', s.price,
                        'status', CASE WHEN sr.admin_id IS NOT NULL AND sr.admin_id != '' THEN 'Completed' ELSE 'Pending' END
                    ))
                    FROM "Service_request" sr
                    JOIN "Service" s ON sr.service_id = s.service_id
                    WHERE sr.guest_id = g.guest_id), '[]'::json
                ) as addons
            FROM "Booking" b
            JOIN "Guest" g ON b.guest_id = g.guest_id
            LEFT JOIN "Booking_room" br ON b.booking_no = br.booking_no
            LEFT JOIN "Room" r ON br.room_no = r.room_number
            LEFT JOIN "Room_type" rt ON r.room_type = rt.room_type
            WHERE b.guest_id = %s
            ORDER BY b.booking_no DESC;
        """, (guest_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        bookings = []
        for r in rows:
            addons = r["addons"] or []
            services_sum = sum(float(a.get("cost", 0.0)) for a in addons)
            base = float(r["room_subtotal"])
            tax = round((base + services_sum) * 0.12, 2)
            total = base + services_sum + tax

            bookings.append({
                "bookingId": f"RES-2026-{r['booking_no']}",
                "booking_no": r["booking_no"],
                "guestName": r["guest_name"],
                "roomName": r["room_type"],
                "roomType": r["room_type"],
                "roomNumberAssigned": r["room_no"],
                "checkIn": str(r["checkInDate"]),
                "checkOut": str(r["checkOutDate"]),
                "nights": r["total_nights"],
                "guests": 2,
                "subtotal": base,
                "taxes": tax,
                "total": total,
                "status": "Confirmed",
                "addons": addons
            })

        return jsonify({"bookings": bookings})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/api/bookings/<b_no_raw>/cancel", methods=["PUT"])
def cancel_booking(b_no_raw):
    """Cancel a reservation and release the room."""
    b_no = parse_id(b_no_raw, default=1001)

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # 1. Find room to release
        cur.execute('SELECT room_no FROM "Booking_room" WHERE booking_no = %s;', (b_no,))
        br = cur.fetchone()
        if br:
            cur.execute('UPDATE "Room" SET availability = \'available\' WHERE room_number = %s;', (br["room_no"],))

        # 2. Delete booking mapping and service requests
        cur.execute('DELETE FROM "Booking_room" WHERE booking_no = %s;', (b_no,))
        cur.execute('DELETE FROM "Booking" WHERE booking_no = %s;', (b_no,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "message": f"Reservation {b_no} cancelled successfully."})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/bookings", methods=["GET"])
def get_all_bookings_master():
    """
    Master query joining:
    - Booking (booking_no, checkInDate, checkOutDate, guest_id, adminid)
    - Booking_room (booking_no, room_no)
    - Guest (guest_id, guest_name, idProof)
    - Guest_phone (guest_id, mobile_number)
    - Room (room_number, room_type, availability)
    - Room_type (room_type, price)
    - Service_request (request_id, service_id, guest_id, admin_id)
    - Service (service_id, service_type, price)
    """
    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT 
                b.booking_no,
                b."checkInDate",
                b."checkOutDate",
                b.adminid,
                g.guest_id,
                g.guest_name,
                g.idProof,
                COALESCE(gp.mobile_number, 'N/A') as mobile_number,
                COALESCE(br.room_no, '101') as room_no,
                COALESCE(r.room_type, 'Deluxe Ocean King Suite') as room_type,
                COALESCE(rt.price, 3500.00) as room_price,
                COALESCE(r.availability, 'available') as room_availability,
                GREATEST(1, (b."checkOutDate" - b."checkInDate")) as total_nights,
                (GREATEST(1, (b."checkOutDate" - b."checkInDate")) * COALESCE(rt.price, 3500.00)) as room_subtotal,
                COALESCE(
                    (SELECT json_agg(json_build_object(
                        'request_id', sr.request_id,
                        'service_id', s.service_id,
                        'service_type', s.service_type,
                        'name', s.service_type,
                        'price', s.price,
                        'cost', s.price,
                        'admin_id', sr.admin_id,
                        'status', CASE WHEN sr.admin_id IS NOT NULL AND sr.admin_id != '' THEN 'Completed' ELSE 'Pending' END
                    ))
                    FROM "Service_request" sr
                    JOIN "Service" s ON sr.service_id = s.service_id
                    WHERE sr.guest_id = g.guest_id), '[]'::json
                ) as service_requests
            FROM "Booking" b
            JOIN "Guest" g ON b.guest_id = g.guest_id
            LEFT JOIN "Guest_phone" gp ON g.guest_id = gp.guest_id
            LEFT JOIN "Booking_room" br ON b.booking_no = br.booking_no
            LEFT JOIN "Room" r ON br.room_no = r.room_number
            LEFT JOIN "Room_type" rt ON r.room_type = rt.room_type
            ORDER BY b.booking_no DESC;
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        bookings = []
        for r in rows:
            # Calculate services total
            services_sum = 0.0
            addons = r["service_requests"] or []
            for s in addons:
                services_sum += float(s.get("price", 0.0))

            base = float(r["room_subtotal"])
            tax = round((base + services_sum) * 0.12, 2)
            total = base + services_sum + tax

            # Compute accurate approvalStatus & overallBillStatus based on DB columns
            room_avail = r.get("room_availability") or "available"
            if not r["adminid"]:
                approval_status = "Pending Approval"
            elif r["adminid"] and r["adminid"].startswith("MGR"):
                approval_status = "Checked-Out"
            elif room_avail == "occupied":
                approval_status = "Checked-In"
            elif room_avail == "available":
                approval_status = "Checked-Out"
            else:
                approval_status = "Approved"

            overall_status = "Finalized" if r["adminid"] and r["adminid"].startswith("MGR") else "Draft"

            bookings.append({
                "booking_no": r["booking_no"],
                "bookingId": f"RES-2026-{r['booking_no']}",
                "guest_id": r["guest_id"],
                "guestName": r["guest_name"],
                "guest_name": r["guest_name"],
                "guestPhone": r["mobile_number"],
                "guestEmail": f"guest{r['guest_id']}@hotel.com",
                "guestIdProof": r["idproof"],
                "idProof": r["idproof"],
                "room_no": r["room_no"],
                "roomNumberAssigned": r["room_no"],
                "roomName": r["room_type"],
                "room_type": r["room_type"],
                "pricePerNight": float(r["room_price"]),
                "checkIn": str(r["checkInDate"]),
                "checkOut": str(r["checkOutDate"]),
                "nights": r["total_nights"],
                "guests": 2,
                "subtotal": base,
                "taxes": tax,
                "discount": 0.0,
                "total": total,
                "adminid": r["adminid"],
                "approvalStatus": approval_status,
                "overallBillStatus": overall_status,
                "addons": addons
            })

        return jsonify({"bookings": bookings})

    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

# --- 6. RECEPTIONIST APPROVAL & SERVICE CONFIRMATION ---

@app.route("/api/admin/bookings/<b_no_raw>/approve", methods=["PUT", "POST"])
def approve_booking(b_no_raw):
    """
    Receptionist approves guest details and assigns room:
    Table: Booking_room (updates room_no)
    Table: Booking (updates adminid)
    Table: Room (updates availability to 'reserved')
    """
    b_no = parse_id(b_no_raw, default=1001)

    data = request.json or {}
    room_no = data.get("roomNumberAssigned") or data.get("room_no") or "101"
    staff_id = data.get("staffId") or data.get("adminid") or "REC-201"

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Ensure staff_id exists in Admin_details to satisfy foreign key
        cur.execute('SELECT admin_id FROM "Admin_details" WHERE admin_id = %s;', (staff_id,))
        if not cur.fetchone():
            cur.execute('SELECT admin_id FROM "Admin_details" WHERE type = \'receptionist\' LIMIT 1;')
            row = cur.fetchone()
            staff_id = row["admin_id"] if row else "REC-201"

        # 1. Update Booking adminid
        cur.execute("""
            UPDATE "Booking"
            SET adminid = %s
            WHERE booking_no = %s
            RETURNING booking_no;
        """, (staff_id, b_no))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"error": f"Booking {b_no} not found"}), 404

        # 2. Update Booking_room
        cur.execute("""
            INSERT INTO "Booking_room" (booking_no, room_no)
            VALUES (%s, %s)
            ON CONFLICT (booking_no, room_no) DO UPDATE SET room_no = EXCLUDED.room_no;
        """, (b_no, room_no))

        # 3. Update Room availability to reserved
        cur.execute("""
            UPDATE "Room"
            SET availability = 'reserved'
            WHERE room_number = %s;
        """, (room_no,))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": f"Guest booking {b_no} approved and assigned to Room {room_no}."})

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/bookings/<b_no_raw>/service-status", methods=["PUT", "POST"])
def update_booking_service_status(b_no_raw):
    """
    Receptionist updates status of a guest service request on the booking:
    Table: Service_request (sets admin_id)
    """
    b_no = parse_id(b_no_raw, default=1001)
    data = request.json or {}
    service_name = data.get("serviceName") or ""
    staff_id = data.get("staffId") or "REC-201"

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Ensure staff_id exists in Admin_details
        cur.execute('SELECT admin_id FROM "Admin_details" WHERE admin_id = %s;', (staff_id,))
        if not cur.fetchone():
            cur.execute('SELECT admin_id FROM "Admin_details" WHERE type = \'receptionist\' LIMIT 1;')
            row = cur.fetchone()
            staff_id = row["admin_id"] if row else "REC-201"

        # Find guest_id for this booking
        cur.execute('SELECT guest_id FROM "Booking" WHERE booking_no = %s;', (b_no,))
        b_row = cur.fetchone()
        if not b_row:
            cur.close()
            conn.close()
            return jsonify({"error": f"Booking {b_no} not found"}), 404

        guest_id = b_row["guest_id"]

        # Find service_id
        cur.execute('SELECT service_id FROM "Service" WHERE service_type ILIKE %s LIMIT 1;', (f"%{service_name}%",))
        s_row = cur.fetchone()
        service_id = s_row["service_id"] if s_row else None

        if service_id:
            cur.execute("""
                UPDATE "Service_request"
                SET admin_id = %s
                WHERE guest_id = %s AND service_id = %s;
            """, (staff_id, guest_id, service_id))
        else:
            cur.execute("""
                UPDATE "Service_request"
                SET admin_id = %s
                WHERE guest_id = %s;
            """, (staff_id, guest_id))

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "message": f"Service request updated by {staff_id}."})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/bookings/<b_no_raw>/checkin", methods=["PUT", "POST"])
def checkin_guest_booking(b_no_raw):
    """Receptionist checks in guest only after room has been approved and handed over."""
    b_no = parse_id(b_no_raw, default=1001)
    data = request.json or {}
    staff_id = data.get("staffId") or "REC-201"

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": str(err)}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT admin_id FROM "Admin_details" WHERE admin_id = %s;', (staff_id,))
        if not cur.fetchone():
            cur.execute('SELECT admin_id FROM "Admin_details" WHERE type = \'receptionist\' LIMIT 1;')
            row = cur.fetchone()
            staff_id = row["admin_id"] if row else "REC-201"

        cur.execute('SELECT booking_no, adminid FROM "Booking" WHERE booking_no = %s;', (b_no,))
        booking = cur.fetchone()
        if not booking:
            cur.close()
            conn.close()
            return jsonify({"error": f"Booking {b_no} not found"}), 404

        cur.execute('SELECT room_no FROM "Booking_room" WHERE booking_no = %s;', (b_no,))
        br = cur.fetchone()
        if not br:
            cur.close()
            conn.close()
            return jsonify({"error": f"Booking {b_no} is not assigned to a room yet. Approve details first."}), 409

        room_no = br["room_no"]
        cur.execute('SELECT availability FROM "Room" WHERE room_number = %s;', (room_no,))
        room = cur.fetchone()
        if not room:
            cur.close()
            conn.close()
            return jsonify({"error": f"Room {room_no} not found."}), 404

        if room["availability"] != "reserved":
            cur.close()
            conn.close()
            return jsonify({
                "error": f"Receptionist handover required before check-in. Room {room_no} must be approved and reserved first."
            }), 409

        cur.execute('UPDATE "Booking" SET adminid = %s WHERE booking_no = %s RETURNING booking_no;', (staff_id, b_no))
        cur.execute('UPDATE "Room" SET availability = \'occupied\' WHERE room_number = %s;', (room_no,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "message": f"Guest for booking {b_no} checked in successfully after receptionist key handover."})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/bookings/<b_no_raw>/checkout", methods=["PUT", "POST"])
def checkout_guest_booking(b_no_raw):
    """Receptionist checks out guest: marks assigned Room as available."""
    b_no = parse_id(b_no_raw, default=1001)

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": str(err)}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT room_no FROM "Booking_room" WHERE booking_no = %s;', (b_no,))
        br = cur.fetchone()
        if br:
            cur.execute('UPDATE "Room" SET availability = \'available\' WHERE room_number = %s;', (br["room_no"],))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True, "message": f"Guest for booking {b_no} checked out. Room is available."})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/service-requests/<int:req_id>/confirm", methods=["PUT", "POST"])
def confirm_service_request(req_id):
    """
    Receptionist confirms service request is performed:
    Table: Service_request (sets admin_id)
    """
    data = request.json or {}
    admin_id = data.get("staffId") or data.get("admin_id") or "REC-201"

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE "Service_request"
            SET admin_id = %s
            WHERE request_id = %s;
        """, (admin_id, req_id))
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": f"Service request {req_id} confirmed by {admin_id}."})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

# --- 7. RECEPTIONIST DIRECT WALK-IN GUEST REGISTRATION ---

@app.route("/api/admin/guests/walkin", methods=["POST"])
def register_walkin():
    """
    Receptionist registers new walk-in guest:
    Table: Guest (guest_name, idProof)
    Table: Guest_phone (guest_id, mobile_number)
    Table: Booking (checkInDate, checkOutDate, guest_id, adminid)
    Table: Booking_room (booking_no, room_no)
    Table: Room (updates availability)
    """
    data = request.json or {}
    guest_name = data.get("guest_name") or data.get("fullName")
    id_proof = data.get("idProof") or "WALKIN-ID"
    mobile = data.get("phone") or data.get("mobile_number") or "+1 (555) 123-4567"
    room_no = data.get("room_no") or data.get("roomNumberAssigned") or "102"
    check_in = data.get("checkIn") or data.get("checkInDate") or str(datetime.date.today())
    check_out = data.get("checkOut") or data.get("checkOutDate") or str(datetime.date.today() + datetime.timedelta(days=2))
    admin_id = data.get("adminid") or "REC-201"

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # 1. Insert Guest
        cur.execute("""
            INSERT INTO "Guest" (guest_name, idProof)
            VALUES (%s, %s)
            RETURNING guest_id, guest_name, idProof;
        """, (guest_name, id_proof))
        g = cur.fetchone()
        g_id = g["guest_id"]

        # 2. Insert Guest_phone
        cur.execute("""
            INSERT INTO "Guest_phone" (guest_id, mobile_number)
            VALUES (%s, %s);
        """, (g_id, mobile))

        # 3. Insert Booking
        cur.execute("""
            INSERT INTO "Booking" ("checkInDate", "checkOutDate", guest_id, adminid)
            VALUES (%s, %s, %s, %s)
            RETURNING booking_no;
        """, (check_in, check_out, g_id, admin_id))
        b = cur.fetchone()
        b_no = b["booking_no"]

        # 4. Insert Booking_room
        cur.execute("""
            INSERT INTO "Booking_room" (booking_no, room_no)
            VALUES (%s, %s);
        """, (b_no, room_no))

        # 5. Set Room availability to occupied
        cur.execute("""
            UPDATE "Room"
            SET availability = 'occupied'
            WHERE room_number = %s;
        """, (room_no,))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "guest": {
                "guest_id": g_id,
                "guest_name": guest_name,
                "idProof": id_proof,
                "mobile_number": mobile
            },
            "booking": {
                "booking_no": b_no,
                "room_no": room_no,
                "checkInDate": check_in,
                "checkOutDate": check_out,
                "adminid": admin_id
            }
        }), 201

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

# --- 8. MANAGER BILLING (Computes overall bill from Booking, Room_type, Service) ---

@app.route("/api/admin/bookings/<b_no_raw>/finalize-bill", methods=["PUT", "POST"])
def finalize_overall_bill(b_no_raw):
    """
    Manager calculates overall bill by summing:
    - (checkOutDate - checkInDate) * Room_type.price
    - Service.price for all Service_request records
    - Applies custom discount and sets adminid to Manager
    """
    b_no = parse_id(b_no_raw, default=1001)

    data = request.json or {}
    discount = float(data.get("discount", 0.0))
    additional_charges = float(data.get("additionalCharges", 0.0))
    manager_id = data.get("managerId") or data.get("admin_id") or "MGR-101"
    mark_as_paid = bool(data.get("markAsPaid", False))

    conn, err = get_db_connection()
    if err:
        return jsonify({"error": f"Database error: {err}"}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Ensure manager_id exists in Admin_details
        cur.execute('SELECT admin_id FROM "Admin_details" WHERE admin_id = %s;', (manager_id,))
        if not cur.fetchone():
            cur.execute('SELECT admin_id FROM "Admin_details" WHERE type = \'manager\' LIMIT 1;')
            row = cur.fetchone()
            manager_id = row["admin_id"] if row else "MGR-101"

        # 1. Update Booking adminid to manager who approved bill
        cur.execute("""
            UPDATE "Booking"
            SET adminid = %s
            WHERE booking_no = %s
            RETURNING booking_no, "checkInDate", "checkOutDate", guest_id, adminid;
        """, (manager_id, b_no))
        b = cur.fetchone()
        if not b:
            cur.close()
            conn.close()
            return jsonify({"error": f"Booking {b_no} not found"}), 404

        # 2. Get Room Price
        cur.execute("""
            SELECT rt.price, br.room_no
            FROM "Booking_room" br
            JOIN "Room" r ON br.room_no = r.room_number
            JOIN "Room_type" rt ON r.room_type = rt.room_type
            WHERE br.booking_no = %s;
        """, (b_no,))
        room_row = cur.fetchone()
        room_price = float(room_row["price"]) if room_row else 3500.00

        # 3. Get Services Price
        cur.execute("""
            SELECT COALESCE(SUM(s.price), 0.0) as services_total
            FROM "Service_request" sr
            JOIN "Service" s ON sr.service_id = s.service_id
            WHERE sr.guest_id = %s;
        """, (b["guest_id"],))
        srv_row = cur.fetchone()
        services_total = float(srv_row["services_total"])

        nights = max(1, (b["checkOutDate"] - b["checkInDate"]).days)
        base = room_price * nights
        taxable = (base + services_total + additional_charges) - discount
        tax = round(max(0.0, taxable * 0.12), 2)
        grand_total = max(0.0, taxable + tax)

        conn.commit()
        cur.close()
        conn.close()

        overall_status = "Paid" if mark_as_paid else "Finalized"

        return jsonify({
            "success": True,
            "booking_no": b_no,
            "overallBillStatus": overall_status,
            "manager_id": manager_id,
            "nights": nights,
            "base": base,
            "services_total": services_total,
            "discount": discount,
            "additionalCharges": additional_charges,
            "taxes": tax,
            "total": grand_total
        })

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

# --- Error Handlers (Guarantees API always returns JSON, never HTML) ---

@app.errorhandler(400)
def handle_400(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": f"Bad request: {getattr(e, 'description', str(e))}"}), 400
    return jsonify({"error": "Bad request"}), 400

@app.errorhandler(404)
def handle_404(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": f"API endpoint not found: {request.method} {request.path}"}), 404
    return send_from_directory(STATIC_DIR, "index.html")

@app.errorhandler(405)
def handle_405(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": f"Method {request.method} not allowed for {request.path}"}), 405
    return jsonify({"error": "Method Not Allowed"}), 405

@app.errorhandler(500)
def handle_500(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": f"Internal server error: {getattr(e, 'description', str(e))}"}), 500
    return jsonify({"error": "Internal Server Error"}), 500

# --- Static File Serving (Frontend) ---

@app.route("/")
def serve_index():
    return send_from_directory(STATIC_DIR, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    if path.startswith("api/"):
        return jsonify({"error": f"API endpoint not found: /{path}"}), 404
    file_path = os.path.join(STATIC_DIR, path)
    if os.path.exists(file_path) and not os.path.isdir(file_path):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")

# =====================================================================
# Main Application Launcher
# =====================================================================

if __name__ == "__main__":
    print("=" * 65)
    print("  The Grand Horizon Hotel System - PostgreSQL API Bridge")
    print(f"  Attempting connection to pgAdmin database: '{DB_CONFIG['database']}'...")
    auto_init_database()
    print("=" * 65)
    print("  Server is live at: http://localhost:5000")
    print("  API Health check:  http://localhost:5000/api/status")
    print("=" * 65)
    # Keep debug mode off to avoid Flask's reloader spawning a second process,
    # which can exhaust the Render Postgres connection limit and prevent writes.
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False, threaded=True)
