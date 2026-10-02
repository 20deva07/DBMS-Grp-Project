/**
 * API Service Client
 * Bridges the Frontend with the PostgreSQL Backend Server (Flask).
 * Automatically detects whether the PostgreSQL backend is online,
 * synchronizes all user inputs (Guests, Staff, Bookings, Services, Billing) directly
 * into the live PostgreSQL database, and falls back to local storage if offline.
 */

class ApiService {
    constructor() {
        this.baseUrl = "";
        this.isBackendOnline = false;
        this.dbInfo = null;
        this.connectionPromise = this.checkConnection();
    }

    async checkConnection() {
        const candidates = [];

        // 1. Current origin if running on http/https
        if (window.location.origin && window.location.origin.startsWith("http")) {
            candidates.push(window.location.origin);
        }

        // 2. Standard backend ports (Port 5000 for app.py, Port 8000 for server.py)
        candidates.push(
            "http://127.0.0.1:5000",
            "http://localhost:5000",
            "http://127.0.0.1:8000",
            "http://localhost:8000"
        );

        // Deduplicate candidates
        const uniqueCandidates = [...new Set(candidates)];

        for (const candidate of uniqueCandidates) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2500);

                const apiUrl = `${candidate}/api/status`;
                const res = await fetch(apiUrl, {
                    signal: controller.signal,
                    cache: "no-store",
                    mode: "cors"
                });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    if (data.connected === true) {
                        this.baseUrl = candidate === window.location.origin ? "" : candidate;
                        this.isBackendOnline = true;
                        this.dbInfo = data;
                        this.renderDbIndicator(true, data.database);
                        console.log(`[API Service] Connected to PostgreSQL DB '${data.database}' via ${candidate}`);
                        return true;
                    }
                }
            } catch (e) {
                // Try next candidate
            }
        }

        this.isBackendOnline = false;
        this.dbInfo = null;
        this.renderDbIndicator(false);
        console.warn("[API Service] Backend not reached. Operating in Local Demo Mode.");
        return false;
    }

    async ensureConnected() {
        if (this.connectionPromise) {
            await this.connectionPromise;
        }
        return this.isBackendOnline;
    }

    async parseResponse(res, fallbackMessage = "Request failed") {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.message || `${fallbackMessage} (Status ${res.status})`);
            }
            return data;
        }
        const text = await res.text();
        if (!res.ok) {
            throw new Error(`${fallbackMessage}: Server returned HTTP ${res.status} (${res.statusText || 'Error'}). Please ensure the Python server is running with 'python server.py'.`);
        }
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error(`${fallbackMessage}: Received unexpected non-JSON response from server.`);
        }
    }

    renderDbIndicator(connected, dbName = "") {
        let badge = document.getElementById("dbStatusBadge");
        if (!badge) {
            badge = document.createElement("div");
            badge.id = "dbStatusBadge";
            badge.className = "db-status-pill";
            const navActions = document.querySelector(".nav-actions");
            if (navActions) {
                navActions.insertBefore(badge, navActions.firstChild);
            }
        }

        if (connected) {
            badge.className = "db-status-pill db-connected";
            badge.innerHTML = `
                <span class="db-indicator-dot"></span>
                <span><strong>PostgreSQL:</strong> ${dbName || "project_jqlp"}</span>
            `;
            badge.title = `Connected to live PostgreSQL database '${dbName}'! All inputs save directly to DB.`;
            badge.onclick = () => window.app?.showToast(`Connected to live database '${dbName}' on PostgreSQL!`, "success");
        } else {
            badge.className = "db-status-pill db-demo";
            badge.innerHTML = `
                <span class="db-indicator-dot"></span>
                <span>Offline (Local Demo)</span>
            `;
            badge.title = "Backend server offline. Run 'python backend/app.py' or 'python server.py' to connect to PostgreSQL!";
            badge.onclick = () => {
                this.checkConnection();
                window.app?.showToast("Retrying connection to PostgreSQL backend...", "info");
            };
        }
    }

    // --- Rooms & Catalog ---

    async getRooms() {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            try {
                const res = await fetch(`${this.baseUrl}/api/rooms`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.rooms && data.rooms.length > 0) {
                        return data.rooms;
                    }
                }
            } catch (e) {
                console.warn("[API] Could not fetch live rooms, falling back to roomsData.js", e);
            }
        }
        return window.ROOMS_DATA || [];
    }

    async getServices() {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            try {
                const res = await fetch(`${this.baseUrl}/api/services`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.services && data.services.length > 0) {
                        return data.services;
                    }
                }
            } catch (e) {
                console.warn("[API] Could not fetch live services, falling back to roomsData.js", e);
            }
        }
        return window.ADDON_SERVICES || [];
    }

    // --- Authentication (Guest) ---

    async registerUser(userData) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const payload = {
                guest_name: userData.guest_name || userData.fullName || userData.name || "",
                fullName: userData.fullName || userData.guest_name || userData.name || "",
                idProof: userData.idProof || userData.id_proof || "",
                phone: userData.phone || userData.mobile_number || userData.mobile || "",
                mobile_number: userData.mobile_number || userData.phone || userData.mobile || "",
                email: userData.email || ""
            };

            const res = await fetch(`${this.baseUrl}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await this.parseResponse(res, "Registration failed");
            return data.user;
        } else {
            // Local fallback
            return window.db.createUser(userData);
        }
    }

    async loginUser(guestNameOrEmail, idProofOrPassword) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const payload = typeof guestNameOrEmail === "object" && guestNameOrEmail !== null
                ? guestNameOrEmail
                : {
                    guest_name: guestNameOrEmail,
                    idProof: idProofOrPassword
                };

            const res = await fetch(`${this.baseUrl}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await this.parseResponse(res, "Invalid guest name or ID proof");
            return data.user;
        } else {
            // Local fallback
            const user = window.db.validateCredentials(guestNameOrEmail, idProofOrPassword);
            if (!user) throw new Error("Invalid guest name or ID proof");
            return user;
        }
    }

    // --- Bookings ---

    async createBooking(bookingPayload) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const res = await fetch(`${this.baseUrl}/api/bookings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingPayload)
            });
            const data = await this.parseResponse(res, "Failed to save booking to PostgreSQL");
            return data.booking;
        } else {
            // Local fallback
            return window.db.createBooking(bookingPayload);
        }
    }

    async getUserBookings(userId) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            try {
                const res = await fetch(`${this.baseUrl}/api/bookings/user/${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    return data.bookings || [];
                }
            } catch (e) {
                console.warn("[API] Could not fetch remote bookings, using local storage", e);
            }
        }
        return window.db.getUserBookings(userId);
    }

    async cancelBooking(bookingId, userId) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const res = await fetch(`${this.baseUrl}/api/bookings/${bookingId}/cancel`, {
                method: "PUT"
            });
            const data = await this.parseResponse(res, "Could not cancel booking in database");
            return data;
        } else {
            return window.db.cancelBooking(bookingId, userId);
        }
    }

    // --- ADMIN & STAFF RBAC API ---

    async adminLogin(adminId, adminName, password) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const res = await fetch(`${this.baseUrl}/api/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminId, adminName, password })
            });
            const data = await this.parseResponse(res, "Invalid Admin credentials");
            return data.staff;
        } else {
            const staff = window.db.validateStaffCredentials(adminId, adminName, password);
            if (!staff) throw new Error("Invalid Admin ID, Name, or Password.");
            return staff;
        }
    }

    async getStaffList() {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            try {
                const res = await fetch(`${this.baseUrl}/api/admin/staff`);
                if (res.ok) {
                    const data = await res.json();
                    return data.staff || [];
                }
            } catch (e) {
                console.warn("[API] Could not fetch remote staff, using local storage", e);
            }
        }
        return window.db.getStaffList();
    }

    async createStaff(staffData) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const res = await fetch(`${this.baseUrl}/api/admin/staff`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(staffData)
            });
            const data = await this.parseResponse(res, "Failed to create staff member in database");
            return data.staff;
        } else {
            return window.db.createStaff(staffData);
        }
    }

    async getAllAdminBookings() {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            try {
                const res = await fetch(`${this.baseUrl}/api/admin/bookings`);
                if (res.ok) {
                    const data = await res.json();
                    return data.bookings || [];
                }
            } catch (e) {
                console.warn("[API] Could not fetch admin bookings from PostgreSQL, using local fallback", e);
            }
        }
        return window.db.getBookings();
    }

    async approveGuestBooking(bookingRef, roomNumber, staffId) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const res = await fetch(`${this.baseUrl}/api/admin/bookings/${bookingRef}/approve`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomNumberAssigned: roomNumber, staffId, approvalStatus: "Approved" })
            });
            const data = await this.parseResponse(res, "Approval failed");
            if (window.db && typeof window.db.approveGuestBooking === "function") {
                try { window.db.approveGuestBooking(bookingRef, roomNumber, staffId); } catch (e) {}
            }
            return data;
        } else {
            return window.db.approveGuestBooking(bookingRef, roomNumber, staffId);
        }
    }

    async checkinGuestBooking(bookingRef, staffId) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const res = await fetch(`${this.baseUrl}/api/admin/bookings/${bookingRef}/checkin`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ staffId })
            });
            const data = await this.parseResponse(res, "Checkin failed");
            if (window.db && typeof window.db.checkinGuestBooking === "function") {
                try { window.db.checkinGuestBooking(bookingRef); } catch (e) {}
            }
            return data;
        } else {
            return window.db.checkinGuestBooking(bookingRef);
        }
    }

    async checkoutGuestBooking(bookingRef) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const res = await fetch(`${this.baseUrl}/api/admin/bookings/${bookingRef}/checkout`, {
                method: "PUT"
            });
            const data = await this.parseResponse(res, "Checkout failed");
            if (window.db && typeof window.db.checkoutGuestBooking === "function") {
                try { window.db.checkoutGuestBooking(bookingRef); } catch (e) {}
            }
            return data;
        } else {
            return window.db.checkoutGuestBooking(bookingRef);
        }
    }

    async updateServiceStatus(bookingRef, serviceName, status, staffId) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const res = await fetch(`${this.baseUrl}/api/admin/bookings/${bookingRef}/service-status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serviceName, status, staffId })
            });
            const data = await this.parseResponse(res, "Failed to update service status in database");
            if (window.db && typeof window.db.updateServiceStatus === "function") {
                try { window.db.updateServiceStatus(bookingRef, serviceName, status, staffId); } catch (e) {}
            }
            return data;
        } else {
            return window.db.updateServiceStatus(bookingRef, serviceName, status, staffId);
        }
    }

    async finalizeOverallBill(bookingRef, billData) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const res = await fetch(`${this.baseUrl}/api/admin/bookings/${bookingRef}/finalize-bill`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(billData)
            });
            const data = await this.parseResponse(res, "Failed to finalize bill in database");
            if (window.db && typeof window.db.finalizeOverallBill === "function") {
                try { window.db.finalizeOverallBill(bookingRef, billData); } catch (e) {}
            }
            return data;
        } else {
            return window.db.finalizeOverallBill(bookingRef, billData);
        }
    }

    async registerWalkinGuest(guestData, bookingData) {
        await this.ensureConnected();
        if (this.isBackendOnline) {
            const payload = {
                guest_name: guestData.fullName || guestData.guest_name,
                fullName: guestData.fullName,
                idProof: guestData.idProof,
                phone: guestData.phone,
                email: guestData.email,
                room_no: bookingData.roomNumberAssigned || bookingData.room_no || "102",
                roomNumberAssigned: bookingData.roomNumberAssigned || bookingData.room_no || "102",
                roomType: bookingData.roomName || bookingData.roomType,
                checkIn: bookingData.checkIn,
                checkOut: bookingData.checkOut,
                adminid: window.db.getCurrentStaff()?.staffId || "REC-201"
            };
            const res = await fetch(`${this.baseUrl}/api/admin/guests/walkin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await this.parseResponse(res, "Walk-in registration failed in database");
            return data;
        } else {
            return window.db.registerWalkinGuest(guestData, bookingData);
        }
    }
}

// Global API client instance
window.api = new ApiService();
