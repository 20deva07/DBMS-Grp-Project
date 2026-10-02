-- =====================================================================
-- PostgreSQL Database Schema for pgAdmin
-- EXACT Table Names & Attributes matching user's database:
--
-- 1.  Admin_details   (admin_id, name, password, type)
-- 2.  Admin_features  (type, feature)
-- 3.  Booking         (booking_no, checkInDate, checkOutDate, guest_id, adminid)
-- 4.  Booking_room    (booking_no, room_no)
-- 5.  Guest           (guest_id, guest_name, idProof)
-- 6.  Guest_phone     (guest_id, mobile_number)
-- 7.  Service         (service_id, service_type, price)
-- 8.  Service_request (request_id, service_id, guest_id, admin_id)
-- 9.  Room            (room_number, room_type, availability)
-- 10. Room_type       (room_type, price)
-- =====================================================================

-- Drop existing tables if re-creating
DROP TABLE IF EXISTS "Service_request" CASCADE;
DROP TABLE IF EXISTS "Booking_room" CASCADE;
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "Guest_phone" CASCADE;
DROP TABLE IF EXISTS "Guest" CASCADE;
DROP TABLE IF EXISTS "Room" CASCADE;
DROP TABLE IF EXISTS "Room_type" CASCADE;
DROP TABLE IF EXISTS "Service" CASCADE;
DROP TABLE IF EXISTS "Admin_features" CASCADE;
DROP TABLE IF EXISTS "Admin_details" CASCADE;

-- Also drop unquoted versions if any exist
DROP TABLE IF EXISTS service_request CASCADE;
DROP TABLE IF EXISTS booking_room CASCADE;
DROP TABLE IF EXISTS booking CASCADE;
DROP TABLE IF EXISTS guest_phone CASCADE;
DROP TABLE IF EXISTS guest CASCADE;
DROP TABLE IF EXISTS room CASCADE;
DROP TABLE IF EXISTS room_type CASCADE;
DROP TABLE IF EXISTS service CASCADE;
DROP TABLE IF EXISTS admin_features CASCADE;
DROP TABLE IF EXISTS admin_details CASCADE;

-- 1. Admin_details
CREATE TABLE "Admin_details" (
    admin_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    password VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL -- 'manager' or 'receptionist'
);

-- 2. Admin_features
CREATE TABLE "Admin_features" (
    type VARCHAR(50) NOT NULL,
    feature VARCHAR(255) NOT NULL
);

-- 3. Room_type
CREATE TABLE "Room_type" (
    room_type VARCHAR(100) PRIMARY KEY,
    price NUMERIC(10, 2) NOT NULL
);

-- 4. Room
CREATE TABLE "Room" (
    room_number VARCHAR(20) PRIMARY KEY,
    room_type VARCHAR(100) NOT NULL REFERENCES "Room_type"(room_type) ON UPDATE CASCADE ON DELETE CASCADE,
    availability VARCHAR(30) DEFAULT 'available' -- 'available', 'occupied', 'reserved'
);

-- 5. Guest
CREATE TABLE "Guest" (
    guest_id SERIAL PRIMARY KEY,
    guest_name VARCHAR(120) NOT NULL,
    idProof VARCHAR(100) NOT NULL
);

-- 6. Guest_phone
CREATE TABLE "Guest_phone" (
    guest_id INT NOT NULL REFERENCES "Guest"(guest_id) ON DELETE CASCADE,
    mobile_number VARCHAR(30) NOT NULL,
    PRIMARY KEY (guest_id, mobile_number)
);

-- 7. Booking
CREATE TABLE "Booking" (
    booking_no SERIAL PRIMARY KEY,
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    guest_id INT NOT NULL REFERENCES "Guest"(guest_id) ON DELETE CASCADE,
    adminid VARCHAR(50) REFERENCES "Admin_details"(admin_id) ON DELETE SET NULL
);

-- 8. Booking_room
CREATE TABLE "Booking_room" (
    booking_no INT NOT NULL REFERENCES "Booking"(booking_no) ON DELETE CASCADE,
    room_no VARCHAR(20) NOT NULL REFERENCES "Room"(room_number) ON DELETE CASCADE,
    PRIMARY KEY (booking_no, room_no)
);

-- 9. Service
CREATE TABLE "Service" (
    service_id SERIAL PRIMARY KEY,
    service_type VARCHAR(120) NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

-- 10. Service_request
CREATE TABLE "Service_request" (
    request_id SERIAL PRIMARY KEY,
    service_id INT NOT NULL REFERENCES "Service"(service_id) ON DELETE CASCADE,
    guest_id INT NOT NULL REFERENCES "Guest"(guest_id) ON DELETE CASCADE,
    admin_id VARCHAR(50) REFERENCES "Admin_details"(admin_id) ON DELETE SET NULL
);

-- =====================================================================
-- Initial Seed Data
-- =====================================================================

-- 1. Admin_details Seed (Manager & Receptionist)
INSERT INTO "Admin_details" (admin_id, name, password, type) VALUES
('MGR-101', 'Robert Sterling', 'manager123', 'manager'),
('MGR-102', 'Diana Prince', 'manager123', 'manager'),
('REC-201', 'Sarah Jenkins', 'reception123', 'receptionist'),
('REC-202', 'Michael Chang', 'reception123', 'receptionist');

-- 2. Admin_features Seed
INSERT INTO "Admin_features" (type, feature) VALUES
('manager', 'Make overall bill'),
('manager', 'Add other manager or receptionist & their details'),
('manager', 'View hotel analytics & revenue'),
('receptionist', 'Approve details of each guest'),
('receptionist', 'Confirm service requests are performed'),
('receptionist', 'Add new guests & details');

-- 3. Room_type Seed
INSERT INTO "Room_type" (room_type, price) VALUES
('Standard Skyline Suite', 2000.00),
('Deluxe Ocean King Suite', 3500.00),
('Zen Garden Wellness Suite', 6000.00);

-- 4. Room Seed
INSERT INTO "Room" (room_number, room_type, availability) VALUES
('101', 'Deluxe Ocean King Suite', 'available'),
('102', 'Deluxe Ocean King Suite', 'available'),
('201', 'Standard Skyline Suite', 'available'),
('202', 'Standard Skyline Suite', 'available'),
('Villa-1', 'Zen Garden Wellness Suite', 'available'),
('Villa-2', 'Zen Garden Wellness Suite', 'available');

-- 5. Guest Seed
INSERT INTO "Guest" (guest_id, guest_name, idProof) VALUES
(1, 'Alex Rivera', 'PASSPORT-US-984210'),
(2, 'Elena Rostova', 'DL-NY-849102'),
(3, 'Marcus Vance', 'PASSPORT-UK-44910');

SELECT setval(pg_get_serial_sequence('"Guest"', 'guest_id'), 3);

-- 6. Guest_phone Seed
INSERT INTO "Guest_phone" (guest_id, mobile_number) VALUES
(1, '+1 (555) 234-8899'),
(2, '+1 (555) 876-5432'),
(3, '+1 (555) 321-9988');

-- 7. Service Seed
INSERT INTO "Service" (service_id, service_type, price) VALUES
(1, 'Gourmet Artisan Breakfast Buffet', 25.00),
(2, 'VIP Airport Chauffeur Transfer', 65.00),
(3, 'Aura Hydrotherapy & Thermal Spa Pass', 45.00),
(4, 'Guaranteed Late Checkout (3:00 PM)', 35.00),
(5, 'Welcome Chilled Champagne & Exotic Fruit Basket', 40.00);

SELECT setval(pg_get_serial_sequence('"Service"', 'service_id'), 5);

-- 8. Booking Seed
INSERT INTO "Booking" (booking_no, "checkInDate", "checkOutDate", guest_id, adminid) VALUES
(1001, '2026-10-15', '2026-10-18', 1, 'REC-201'),
(1002, '2026-10-10', '2026-10-14', 2, 'REC-201'),
(1003, '2026-10-01', '2026-10-05', 3, 'REC-202');

SELECT setval(pg_get_serial_sequence('"Booking"', 'booking_no'), 1003);

-- 9. Booking_room Seed
INSERT INTO "Booking_room" (booking_no, room_no) VALUES
(1001, '101'),
(1002, '201'),
(1003, '104');

-- 10. Service_request Seed
INSERT INTO "Service_request" (request_id, service_id, guest_id, admin_id) VALUES
(1, 1, 1, 'REC-201'),
(2, 2, 1, 'REC-201'),
(3, 3, 2, 'REC-201'),
(4, 5, 2, 'REC-201'),
(5, 1, 3, 'REC-202'),
(6, 2, 3, 'REC-202');

SELECT setval(pg_get_serial_sequence('"Service_request"', 'request_id'), 6);
