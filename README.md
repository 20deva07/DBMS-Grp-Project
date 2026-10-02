# The Grand Horizon Luxury Resort & Spa
## Hotel Management System (HMS) - Full-Stack DBMS Project

A modern, responsive, luxury frontend and PostgreSQL backend for a **Hotel Management System**, developed for the **Semester 3 DBMS Course Project**.

---

## 🌟 Core System Roles & Features

### 1. Public Showcase (Home Page)
- **Luxury Hero Ambiance**: Full-screen hotel photography, ambient overlay, trust stats (`⭐ 4.95/5` from 2,840+ reviews), and quick availability search bar.
- **6 Signature Specialities**: Michelin-Star Gastronomy, Horizon Infinity Pool, Aura Holistic Spa, Smart Luxury Suites, VIP Chauffeur Transit, and 24/7 Royal Butler.
- **Scroll-Triggered Login**: Pops up automatically with guest demo login, guest registration, and **Staff Admin Login** tabs.

### 2. Customer Guest Booking Experience
- **Interactive Suite Catalog**: Real-time room filtering by category, guest count, dates, and sort by rate or rating.
- **Dynamic Pricing Engine**: Automatic calculation of nights, custom add-on experiences (Breakfast, Chauffeur, Spa Pass, Late Checkout), and 12% hotel tax.
- **Digital Reservation Voucher**: Generates unique reference ID (e.g. `RES-2026-8842`), QR code pass, and printable voucher.
- **My Reservations**: Persistent booking history with cancellation options.

### 3. Role-Based Admin Portal (Manager & Receptionist)
Access via the **"Staff Portal"** button in the top navbar or the **"Staff / Admin"** tab in the login popup.
Credentials require: **Admin ID**, **Staff Full Name**, and **Password**.

#### 👑 Manager Portal (if Admin ID is type `Manager`, e.g. `MGR-101`)
- **Make the Overall Bill**:
  - Itemized invoice generator calculating room charges, all ordered services, and taxes.
  - Apply custom promotional discounts (₹) and incidental surcharges (₹).
  - Mark bill as settled/paid and print official receipt.
- **Staff Management**:
  - Add other **Managers** or **Receptionists** with Admin ID, full name, role, email, phone, password, department, and salary.
  - Live Staff Directory displaying active personnel.
- **Executive Revenue Metrics**: Gross Revenue, Active Stays, Pending Bills, Staff Headcount.

#### 🛎️ Receptionist Portal (if Admin ID is type `Receptionist`, e.g. `REC-201`)
- **Approve Details of Each Guest**:
  - Verification queue displaying guest name, ID Proof (Passport / DL), dates, and party size.
  - Assign physical room number (e.g., `101`, `102`, `204`, etc.).
  - Actions: **"Approve Details"**, **"Check In (Hand Key)"**, and **"Check Out"**.
- **Confirm Service Requests Are Performed**:
  - Track guest amenity requests (Artisan Breakfast, Chauffeur Transfer, Spa Pass, Champagne).
  - Status updates: `Pending` &rarr; `In Progress` &rarr; `Completed / Fulfilled` with timestamp and receptionist ID.
- **Direct Walk-in Guest Registration**:
  - Register counter guests: Name, Email, Phone, ID Proof, Room selection, Dates, and Party Size.
  - Instantly creates user and checked-in booking in database.

---

## 🔑 Demo Login Credentials (Ready to Test)

| Role | Admin ID | Full Name | Password | Features Accessible |
|---|---|---|---|---|
| **Manager** | `MGR-101` | `Robert Sterling` | `manager123` | Make Overall Bill, Add Staff, View Revenue |
| **Receptionist** | `REC-201` | `Sarah Jenkins` | `reception123` | Approve Guests, Confirm Services, Add Walk-ins |
| **Guest Customer** | *(Email)* | `alex.guest@hotel.com` | `guest123` | Book Rooms, Customize Add-ons, View Vouchers |

*(Convenient **1-Click Demo Buttons** are provided in the login modal for instant evaluation!)*

---

## 📁 Project Structure

```
DBMS Grp Project/
│
├── index.html                  # Single Page Application (Home, Guest Booking & Admin Portal)
│
├── css/
│   ├── style.css               # Global tokens, reset, typography, header, footer, toasts
│   ├── hero.css                # Hero section, 6-pillar specialities grid & stats
│   ├── auth-modal.css          # Scroll-triggered login modal & tabs
│   ├── booking.css             # Guest booking portal, room cards, checkout, voucher
│   └── admin.css               # Manager billing, staff management & Receptionist queues
│
├── js/
│   ├── app.js                  # Main application controller
│   ├── auth.js                 # Authentication & modal tab controller
│   ├── admin.js                # Manager & Receptionist RBAC controller
│   ├── roomsData.js            # Mock room catalog & hotel specialities seed
│   ├── booking.js              # Filter engine, dynamic pricing & voucher
│   ├── storage.js              # LocalStorage relational database simulator
│   └── api.js                  # API client connecting frontend to PostgreSQL
│
├── backend/
│   ├── app.py                  # Python Flask REST API server
│   └── db_config.py            # PostgreSQL credentials for pgAdmin
│
├── database/
│   ├── postgres_schema.sql     # PostgreSQL / pgAdmin tables and demo seeds
│   └── schema.sql              # MySQL relational schema
│
├── server.py                   # Zero-dependency local dev server
└── README.md                   # Complete documentation
```

---

## 🚀 How to Run the Website (Live PostgreSQL Database)

You can launch the complete full-stack website with a single command:

### Option 1: Live Server on Port 8000 (Recommended)
1. Run the live full-stack server from the project root:
   ```powershell
   python server.py
   ```
2. Open **`http://localhost:8000`** in your browser.
3. Look at the top navbar: you will see a green badge **`🟢 PostgreSQL: project_jqlp`**.
4. Every form on the website (Registration, Login, Room Booking, Manager Billing, Staff Addition, Receptionist Approvals, and Walk-ins) writes directly to your live PostgreSQL database!

### Option 2: Live Server on Port 5000
1. Start the Flask backend server directly:
   ```powershell
   python backend/app.py
   ```
2. Open **`http://localhost:5000`** in your browser.

---

## 🔍 Database Tables Connected
The website directly feeds into and queries all 10 tables:
1. `Admin_details`: Staff credentials (Managers & Receptionists)
2. `Admin_features`: Role-based system permissions
3. `Guest`: Guest profile records (`guest_name`, `idproof`)
4. `Guest_phone`: Multi-phone mapping (`guest_id`, `mobile_number`)
5. `Room`: Live room inventory & occupancy status
6. `Room_type`: Tier pricing (`price` per night)
7. `Booking`: Reservation dates, assigned staff, and guest reference
8. `Booking_room`: Room-to-booking assignment mapping
9. `Service`: Add-on amenities & catalog pricing
10. `Service_request`: Guest amenity fulfillment tracking
