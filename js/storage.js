/**
 * Storage Service - Database Simulator
 * Mimics SQL table operations (USERS, STAFF, BOOKINGS, SESSIONS) in LocalStorage.
 * Easily swappable for real REST API / PostgreSQL endpoints in pgAdmin.
 */

const STORAGE_KEYS = {
    USERS: "gh_hotel_users",
    STAFF: "gh_hotel_staff",
    BOOKINGS: "gh_hotel_bookings",
    CURRENT_USER: "gh_hotel_current_user",
    CURRENT_STAFF: "gh_hotel_current_staff",
    SCROLL_PROMPT_SEEN: "gh_hotel_scroll_prompt_dismissed"
};

class DatabaseService {
    constructor() {
        this.initDefaults();
    }

    initDefaults() {
        // 1. Seed default demo staff (Manager & Receptionist)
        if (!localStorage.getItem(STORAGE_KEYS.STAFF)) {
            const defaultStaff = [
                {
                    staffId: "MGR-101",
                    fullName: "Robert Sterling",
                    email: "robert.manager@hotel.com",
                    phone: "+1 (555) 111-2233",
                    password: "manager123",
                    role: "manager",
                    department: "Executive Operations",
                    salary: 95000.00,
                    joinedDate: "2024-03-01"
                },
                {
                    staffId: "REC-201",
                    fullName: "Sarah Jenkins",
                    email: "sarah.reception@hotel.com",
                    phone: "+1 (555) 444-5566",
                    password: "reception123",
                    role: "receptionist",
                    department: "Front Desk & Concierge",
                    salary: 48000.00,
                    joinedDate: "2025-06-15"
                }
            ];
            localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(defaultStaff));
        }

        // 2. Seed default demo guests
        if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
            const defaultUsers = [
                {
                    id: "USR-001",
                    fullName: "Alex Rivera",
                    email: "alex.guest@hotel.com",
                    phone: "+1 (555) 234-8899",
                    idProof: "PASSPORT-US-984210",
                    password: "guest123",
                    role: "guest",
                    joinedDate: "2026-01-15"
                },
                {
                    id: "USR-002",
                    fullName: "Elena Rostova",
                    email: "elena@example.com",
                    phone: "+1 (555) 876-5432",
                    idProof: "DL-NY-849102",
                    password: "password123",
                    role: "guest",
                    joinedDate: "2026-02-10"
                },
                {
                    id: "USR-003",
                    fullName: "Marcus Vance",
                    email: "marcus.v@example.com",
                    phone: "+1 (555) 321-9988",
                    idProof: "PASSPORT-UK-44910",
                    password: "guest123",
                    role: "guest",
                    joinedDate: "2026-03-01"
                }
            ];
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
        }

        // 3. Seed sample bookings with Approval status & Service Requests
        if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
            const defaultBookings = [
                {
                    bookingId: "RES-2026-1042",
                    userId: "USR-001",
                    guestName: "Alex Rivera",
                    guestEmail: "alex.guest@hotel.com",
                    guestPhone: "+1 (555) 234-8899",
                    guestIdProof: "PASSPORT-US-984210",
                    roomId: "deluxe-ocean-king",
                    roomName: "Deluxe Ocean King Suite",
                    roomNumberAssigned: "101",
                    checkIn: "2026-10-15",
                    checkOut: "2026-10-18",
                    nights: 3,
                    guests: 2,
                    pricePerNight: 195,
                    addons: [
                        { id: "breakfast", name: "Gourmet Artisan Breakfast Buffet", cost: 150, status: "Pending" },
                        { id: "transfer", name: "VIP Airport Chauffeur Transfer", cost: 65, status: "Completed" }
                    ],
                    subtotal: 585,
                    taxes: 88.2,
                    discount: 0,
                    total: 888.2,
                    specialRequests: "High floor facing the sunset, extra feather pillows.",
                    approvalStatus: "Pending Approval", // 'Pending Approval', 'Approved', 'Checked-In', 'Checked-Out'
                    overallBillStatus: "Draft",         // 'Draft', 'Finalized', 'Paid'
                    status: "Confirmed",
                    createdAt: "2026-09-20T14:30:00Z"
                },
                {
                    bookingId: "RES-2026-2180",
                    userId: "USR-002",
                    guestName: "Elena Rostova",
                    guestEmail: "elena@example.com",
                    guestPhone: "+1 (555) 876-5432",
                    guestIdProof: "DL-NY-849102",
                    roomId: "executive-skyline-suite",
                    roomName: "Executive Skyline Suite",
                    roomNumberAssigned: "204",
                    checkIn: "2026-10-10",
                    checkOut: "2026-10-14",
                    nights: 4,
                    guests: 2,
                    pricePerNight: 275,
                    addons: [
                        { id: "spa_pass", name: "Aura Hydrotherapy & Thermal Spa Pass", cost: 90, status: "In Progress" },
                        { id: "champagne", name: "Welcome Chilled Champagne", cost: 40, status: "Completed" }
                    ],
                    subtotal: 1100,
                    taxes: 147.6,
                    discount: 50,
                    total: 1327.6,
                    specialRequests: "Quiet room away from elevators.",
                    approvalStatus: "Approved",
                    overallBillStatus: "Draft",
                    status: "Confirmed",
                    createdAt: "2026-09-25T11:15:00Z"
                },
                {
                    bookingId: "RES-2026-3091",
                    userId: "USR-003",
                    guestName: "Marcus Vance",
                    guestEmail: "marcus.v@example.com",
                    guestPhone: "+1 (555) 321-9988",
                    guestIdProof: "PASSPORT-UK-44910",
                    roomId: "oceanfront-villa-pool",
                    roomName: "Azure Oceanfront Private Villa",
                    roomNumberAssigned: "Villa-3",
                    checkIn: "2026-10-01",
                    checkOut: "2026-10-05",
                    nights: 4,
                    guests: 4,
                    pricePerNight: 480,
                    addons: [
                        { id: "breakfast", name: "Gourmet Artisan Breakfast Buffet", cost: 200, status: "Completed" },
                        { id: "transfer", name: "VIP Airport Chauffeur Transfer", cost: 65, status: "Completed" }
                    ],
                    subtotal: 1920,
                    taxes: 262.2,
                    discount: 100,
                    total: 2347.2,
                    specialRequests: "Early check-in requested if available.",
                    approvalStatus: "Checked-In",
                    overallBillStatus: "Finalized",
                    status: "Confirmed",
                    createdAt: "2026-09-28T09:00:00Z"
                }
            ];
            localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(defaultBookings));
        }
    }

    // --- Users (Auth) Operations ---
    getUsers() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
        } catch (e) {
            return [];
        }
    }

    findUserByEmail(email) {
        const users = this.getUsers();
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        return users.find(u => (u.email || "").toLowerCase() === normalizedEmail);
    }

    createUser(userData = {}) {
        const users = this.getUsers();
        const fullName = String(userData.fullName || userData.guest_name || userData.name || "Guest").trim();
        const email = (userData.email || `${fullName.replace(/\s+/g, "").toLowerCase()}${Date.now()}@hotel.com`).trim().toLowerCase();
        const phone = typeof userData.phone === "string" ? userData.phone.trim() : (typeof userData.mobile_number === "string" ? userData.mobile_number.trim() : "Not provided");
        const idProof = userData.idProof || userData.id_proof || "ID-ON-ARRIVAL";
        const password = userData.password || "guest";

        const existing = this.findUserByEmail(email);
        if (existing) {
            throw new Error("An account with this email address already exists.");
        }

        const newUser = {
            id: "USR-" + Date.now().toString().slice(-5),
            fullName,
            email,
            phone,
            idProof,
            password,
            role: "guest",
            joinedDate: new Date().toISOString().split("T")[0]
        };

        users.push(newUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        return newUser;
    }

    validateCredentials(identifier, password) {
        if (identifier && typeof identifier === "object") {
            const users = this.getUsers();
            const guestName = String(identifier.guest_name || identifier.fullName || identifier.name || "").trim().toLowerCase();
            const idProof = String(identifier.idProof || identifier.id_proof || "").trim().toLowerCase();
            const user = users.find(u => {
                const matchName = String(u.fullName || "").trim().toLowerCase() === guestName;
                const matchProof = String(u.idProof || "").trim().toLowerCase() === idProof;
                return matchName && matchProof;
            });
            return user && user.password === password ? user : null;
        }

        const user = this.findUserByEmail(identifier);
        if (!user) return null;
        if (user.password === password) {
            return user;
        }
        return null;
    }

    // --- STAFF (ADMIN) OPERATIONS ---
    getStaffList() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF)) || [];
        } catch (e) {
            return [];
        }
    }

    validateStaffCredentials(adminId, adminName, password) {
        const staffList = this.getStaffList();
        const cleanId = (adminId || "").trim().toUpperCase();
        const cleanName = (adminName || "").trim().toLowerCase();

        const staff = staffList.find(s => 
            s.staffId.toUpperCase() === cleanId &&
            s.fullName.trim().toLowerCase() === cleanName &&
            s.password === password
        );

        return staff || null;
    }

    createStaff(staffData) {
        const staffList = this.getStaffList();
        const cleanId = staffData.staffId ? staffData.staffId.trim().toUpperCase() : 
            (staffData.role === "manager" ? "MGR-" + Math.floor(100 + Math.random() * 900) : "REC-" + Math.floor(200 + Math.random() * 800));

        if (staffList.some(s => s.staffId.toUpperCase() === cleanId)) {
            throw new Error(`Staff ID ${cleanId} already exists. Please choose a unique ID.`);
        }

        if (staffList.some(s => s.email.toLowerCase() === staffData.email.trim().toLowerCase())) {
            throw new Error(`Email ${staffData.email} is already registered to another staff member.`);
        }

        const newStaff = {
            staffId: cleanId,
            fullName: staffData.fullName.trim(),
            email: staffData.email.trim().toLowerCase(),
            phone: staffData.phone ? staffData.phone.trim() : "+1 (555) 000-0000",
            password: staffData.password,
            role: staffData.role, // 'manager' or 'receptionist'
            department: staffData.department || (staffData.role === "manager" ? "Management" : "Front Desk"),
            salary: parseFloat(staffData.salary) || (staffData.role === "manager" ? 85000 : 45000),
            joinedDate: new Date().toISOString().split("T")[0]
        };

        staffList.push(newStaff);
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffList));
        return newStaff;
    }

    getCurrentStaff() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_STAFF));
        } catch (e) {
            return null;
        }
    }

    setCurrentStaff(staff) {
        if (staff) {
            const safe = { ...staff };
            delete safe.password;
            localStorage.setItem(STORAGE_KEYS.CURRENT_STAFF, JSON.stringify(safe));
        } else {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_STAFF);
        }
    }

    staffLogout() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_STAFF);
    }

    // --- SESSIONS ---
    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
        } catch (e) {
            return null;
        }
    }

    setCurrentUser(user) {
        if (user) {
            const safeUser = { ...user };
            delete safeUser.password;
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(safeUser));
        } else {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
    }

    logout() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }

    // --- BOOKINGS OPERATIONS ---
    getBookings() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS)) || [];
        } catch (e) {
            return [];
        }
    }

    getUserBookings(userId) {
        const all = this.getBookings();
        return all.filter(b => b.userId === userId || String(b.userId).includes(String(userId)))
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    createBooking(bookingPayload) {
        const bookings = this.getBookings();
        const newBooking = {
            ...bookingPayload,
            bookingId: "RES-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000),
            roomNumberAssigned: bookingPayload.roomNumberAssigned || "Unassigned",
            approvalStatus: "Pending Approval",
            overallBillStatus: "Draft",
            status: "Confirmed",
            createdAt: new Date().toISOString()
        };

        // Format addons with default pending status
        if (newBooking.addons && Array.isArray(newBooking.addons)) {
            newBooking.addons = newBooking.addons.map(a => ({
                ...a,
                status: a.status || "Pending"
            }));
        }

        bookings.unshift(newBooking);
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        return newBooking;
    }

    cancelBooking(bookingId, userId) {
        const bookings = this.getBookings();
        const index = bookings.findIndex(b => b.bookingId === bookingId);
        if (index !== -1) {
            bookings[index].status = "Cancelled";
            bookings[index].approvalStatus = "Cancelled";
            localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
            return bookings[index];
        }
        throw new Error("Booking not found.");
    }

    // --- RECEPTIONIST SPECIFIC ACTIONS ---
    approveGuestBooking(bookingId, roomNumberAssigned, receptionistStaffId) {
        const bookings = this.getBookings();
        const booking = bookings.find(b => b.bookingId === bookingId);
        if (!booking) throw new Error("Booking not found.");

        booking.approvalStatus = "Approved";
        booking.roomNumberAssigned = roomNumberAssigned || booking.roomNumberAssigned || "101";
        booking.approvedBy = receptionistStaffId;
        booking.approvedAt = new Date().toISOString();

        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        return booking;
    }

    checkinGuestBooking(bookingId) {
        const bookings = this.getBookings();
        const booking = bookings.find(b => b.bookingId === bookingId);
        if (!booking) throw new Error("Booking not found.");

        booking.approvalStatus = "Checked-In";
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        return booking;
    }

    checkoutGuestBooking(bookingId) {
        const bookings = this.getBookings();
        const booking = bookings.find(b => b.bookingId === bookingId);
        if (!booking) throw new Error("Booking not found.");

        booking.approvalStatus = "Checked-Out";
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        return booking;
    }

    updateServiceStatus(bookingId, serviceId, newStatus, staffId) {
        const bookings = this.getBookings();
        const booking = bookings.find(b => b.bookingId === bookingId);
        if (!booking) throw new Error("Booking not found.");

        if (booking.addons && Array.isArray(booking.addons)) {
            const addon = booking.addons.find(a => a.id === serviceId || a.name === serviceId);
            if (addon) {
                addon.status = newStatus;
                addon.fulfilledBy = staffId;
                addon.fulfilledAt = newStatus === "Completed" ? new Date().toISOString() : null;
            }
        }

        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        return booking;
    }

    registerWalkinGuest(guestData, bookingData) {
        // 1. Create Guest User
        let user = this.findUserByEmail(guestData.email);
        if (!user) {
            user = this.createUser({
                fullName: guestData.fullName,
                email: guestData.email,
                phone: guestData.phone,
                idProof: guestData.idProof,
                password: "guest" + Math.floor(100 + Math.random() * 900)
            });
        }

        // 2. Create Booking
        const newBooking = this.createBooking({
            ...bookingData,
            userId: user.id,
            guestName: user.fullName,
            guestEmail: user.email,
            guestPhone: user.phone,
            guestIdProof: guestData.idProof,
            approvalStatus: "Approved", // Pre-approved by receptionist
            roomNumberAssigned: bookingData.roomNumberAssigned || "102"
        });

        return { user, booking: newBooking };
    }

    // --- MANAGER SPECIFIC ACTIONS ---
    finalizeOverallBill(bookingId, billOptions = {}) {
        const bookings = this.getBookings();
        const booking = bookings.find(b => b.bookingId === bookingId);
        if (!booking) throw new Error("Booking not found.");

        const discount = parseFloat(billOptions.discount) || 0;
        const additionalCharges = parseFloat(billOptions.additionalCharges) || 0;
        
        booking.discount = discount;
        booking.additionalCharges = additionalCharges;
        
        // Recalculate grand total
        const base = booking.subtotal || (booking.pricePerNight * booking.nights);
        let servicesTotal = 0;
        if (booking.addons) {
            booking.addons.forEach(a => servicesTotal += (a.cost || 0));
        }
        
        const taxableAmount = (base + servicesTotal + additionalCharges) - discount;
        const calculatedTax = Math.round(taxableAmount * 0.12 * 100) / 100;
        const finalTotal = Math.max(0, taxableAmount + calculatedTax);

        booking.taxes = calculatedTax;
        booking.total = finalTotal;
        booking.overallBillStatus = billOptions.markAsPaid ? "Paid" : "Finalized";
        booking.billFinalizedAt = new Date().toISOString();
        booking.billFinalizedBy = billOptions.managerId;

        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
        return booking;
    }

    // --- SCROLL PROMPT FLAG ---
    hasDismissedScrollPrompt() {
        return sessionStorage.getItem(STORAGE_KEYS.SCROLL_PROMPT_SEEN) === "true";
    }

    setDismissedScrollPrompt(val = true) {
        sessionStorage.setItem(STORAGE_KEYS.SCROLL_PROMPT_SEEN, val ? "true" : "false");
    }
}

// Global database instance
window.db = new DatabaseService();
