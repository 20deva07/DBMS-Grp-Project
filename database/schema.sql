-- =====================================================================
-- Database Management Systems (DBMS) Course Project
-- Hotel Management System Relational Database Schema (MySQL / MariaDB)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS hotel_management_db;
USE hotel_management_db;

-- 1. USERS Table (Guests, Staff, Admins)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('guest', 'staff', 'admin') DEFAULT 'guest',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. ROOM_TYPES Table (Metadata for room categorization)
CREATE TABLE IF NOT EXISTS room_types (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_code VARCHAR(50) NOT NULL UNIQUE, -- 'deluxe', 'suite', 'villa', 'penthouse'
    type_name VARCHAR(100) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    max_capacity INT NOT NULL,
    bed_type VARCHAR(100) NOT NULL,
    room_size VARCHAR(50) NOT NULL,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. ROOMS Table (Physical room units)
CREATE TABLE IF NOT EXISTS rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    type_id INT NOT NULL,
    floor_number INT NOT NULL,
    status ENUM('available', 'occupied', 'maintenance', 'reserved') DEFAULT 'available',
    FOREIGN KEY (type_id) REFERENCES room_types(type_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. SERVICES Table (Add-on hotel experiences and amenities)
CREATE TABLE IF NOT EXISTS services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_code VARCHAR(50) NOT NULL UNIQUE,
    service_name VARCHAR(120) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    price_type ENUM('flat', 'per_guest', 'per_guest_per_day') DEFAULT 'flat',
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. BOOKINGS Table (Guest reservations)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    reference_no VARCHAR(50) NOT NULL UNIQUE, -- e.g. RES-2026-8842
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_nights INT NOT NULL,
    guests_count INT NOT NULL,
    room_subtotal DECIMAL(10, 2) NOT NULL,
    services_subtotal DECIMAL(10, 2) DEFAULT 0.00,
    taxes_amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    special_requests TEXT,
    booking_status ENUM('Confirmed', 'Cancelled', 'Checked-In', 'Completed') DEFAULT 'Confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. BOOKING_SERVICES Table (Junction table linking bookings to selected add-on amenities)
CREATE TABLE IF NOT EXISTS booking_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT DEFAULT 1,
    charged_amount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Sample Seed Data
-- =====================================================================

-- Seed Demo Users
INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
('Alex Rivera', 'alex.guest@hotel.com', '+1 (555) 234-8899', 'guest123', 'guest'),
('Elena Rostova', 'elena@example.com', '+1 (555) 876-5432', 'password123', 'guest');

-- Seed Room Types
INSERT INTO room_types (type_code, type_name, base_price, max_capacity, bed_type, room_size, description) VALUES
('deluxe', 'Deluxe Ocean King Suite', 195.00, 2, '1 California King Bed', '580 sq.ft', 'Perched gracefully above the coastline with panoramic ocean views.'),
('suite', 'Executive Skyline Suite', 275.00, 3, '1 King Bed + 1 Queen Daybed', '750 sq.ft', 'Spacious executive quarters with dedicated workstation and skyline view.'),
('villa', 'Azure Oceanfront Private Villa', 480.00, 4, '2 California King Beds', '1,250 sq.ft', 'Ultra-exclusive private beachfront haven with private plunge pool.'),
('penthouse', 'The Royal Horizon Penthouse', 750.00, 6, '3 Master King Suites', '2,400 sq.ft', 'The pinnacle of luxury occupying the top floor with 360 wrap-around terrace.');

-- Seed Addon Services
INSERT INTO services (service_code, service_name, price, price_type, description) VALUES
('breakfast', 'Gourmet Artisan Breakfast Buffet', 25.00, 'per_guest_per_day', 'Daily fresh artisan buffet and specialty coffees.'),
('transfer', 'VIP Airport Chauffeur Transfer (Roundtrip)', 65.00, 'flat', 'Curbside meet-and-greet with luxury Mercedes sedan.'),
('spa_pass', 'Aura Hydrotherapy & Thermal Spa Pass', 45.00, 'per_guest', 'Day pass to Himalayan salt sauna and heated whirlpools.'),
('late_checkout', 'Guaranteed Late Checkout (3:00 PM)', 35.00, 'flat', 'Relaxed departure with guaranteed late room access.'),
('champagne', 'Welcome Chilled Champagne & Exotic Fruit Basket', 40.00, 'flat', 'Chilled champagne and tropical fruit upon arrival.');
