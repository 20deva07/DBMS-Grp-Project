/**
 * Application Controller
 * Coordinates Views (Home View vs Guest Booking View), User Sessions,
 * Navbar state, Specialities rendering, and Toasts.
 */

class AppController {
    constructor() {
        this.currentView = "home"; // 'home' or 'booking'
        this.toastContainer = document.getElementById("toastContainer");
        this.init();
    }

    init() {
        // Instantiate services
        window.auth = new window.AuthManager();
        window.booking = new window.BookingManager();

        // Render Specialities section
        this.renderSpecialities();

        // Render Featured Showcase Carousel/Grid on home page
        this.renderFeaturedSuites();

        // Check if user is already logged in
        const user = window.db.getCurrentUser();
        this.updateNavAuthState(user);

        // Bind navigation links
        this.bindNavLinks();

        // If URL hash is #booking or query param is set, or if user is logged in
        if (window.location.hash === "#booking" && user) {
            this.switchToBookingView();
        } else {
            this.switchToHomeView();
        }
    }

    renderSpecialities() {
        const container = document.getElementById("specialitiesGrid");
        if (!container || !window.HOTEL_SPECIALITIES) return;

        container.innerHTML = window.HOTEL_SPECIALITIES.map((spec, index) => `
            <div class="speciality-card" style="animation-delay: ${index * 0.1}s">
                <div class="speciality-img-wrap">
                    <img src="${spec.image}" alt="${spec.title}" loading="lazy">
                    <span class="speciality-badge">${spec.badge}</span>
                </div>
                <div class="speciality-content">
                    <div class="speciality-icon"><i class="${spec.icon}"></i></div>
                    <span class="speciality-sub">${spec.subtitle}</span>
                    <h3 class="speciality-title">${spec.title}</h3>
                    <p class="speciality-desc">${spec.description}</p>
                </div>
            </div>
        `).join("");
    }

    renderFeaturedSuites() {
        const container = document.getElementById("featuredSuitesGrid");
        if (!container || !window.ROOMS_DATA) return;

        const featured = window.ROOMS_DATA.slice(0, 3);
        container.innerHTML = featured.map(room => `
            <div class="showcase-card">
                <div class="showcase-img">
                    <img src="${room.image}" alt="${room.name}" loading="lazy">
                    <span class="showcase-price-tag">₹${room.pricePerNight} <span>/ night</span></span>
                </div>
                <div class="showcase-details">
                    <span class="showcase-type">${room.typeName}</span>
                    <h4>${room.name}</h4>
                    <p>${room.description.slice(0, 95)}...</p>
                    <div class="showcase-meta">
                        <span><i class="fas fa-user-friends"></i> Up to ${room.capacity} Guests</span>
                        <span><i class="fas fa-star text-gold"></i> ${room.rating} (${room.reviews})</span>
                    </div>
                    <button class="btn btn-gold btn-block" onclick="window.app.handleHomeSuiteAction('${room.id}')">
                        <i class="fas fa-calendar-alt"></i> Reserve Suite
                    </button>
                </div>
            </div>
        `).join("");
    }

    handleHomeSuiteAction(roomId) {
        const user = window.db.getCurrentUser();
        if (!user) {
            window.auth.openModal("login");
            this.showToast("Please sign in or use 1-click Demo Login to book your room.", "info");
        } else {
            this.switchToBookingView();
            setTimeout(() => {
                window.booking.startBooking(roomId);
            }, 100);
        }
    }

    bindNavLinks() {
        // Home view link
        const navHomeLinks = document.querySelectorAll(".nav-link-home");
        navHomeLinks.forEach(l => l.addEventListener("click", (e) => {
            e.preventDefault();
            this.switchToHomeView();
        }));

        // Booking portal link
        const navBookingLinks = document.querySelectorAll(".nav-link-booking");
        navBookingLinks.forEach(l => l.addEventListener("click", (e) => {
            e.preventDefault();
            const user = window.db.getCurrentUser();
            if (!user) {
                window.auth.openModal("login");
                this.showToast("Please log in to access the customer booking portal.", "info");
            } else {
                this.switchToBookingView();
            }
        }));

        // Hero Quick Book button
        const heroBookBtn = document.getElementById("heroBookNowBtn");
        if (heroBookBtn) {
            heroBookBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const user = window.db.getCurrentUser();
                if (!user) {
                    window.auth.openModal("login");
                } else {
                    this.switchToBookingView();
                }
            });
        }

        // Hero "Explore Specialities" smooth scroll
        const heroExploreBtn = document.getElementById("heroExploreBtn");
        if (heroExploreBtn) {
            heroExploreBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const target = document.getElementById("specialities");
                if (target) {
                    target.scrollIntoView({ behavior: "smooth" });
                }
            });
        }

        // My Bookings Nav button
        const navMyBookingsBtn = document.getElementById("navMyBookingsBtn");
        if (navMyBookingsBtn) {
            navMyBookingsBtn.addEventListener("click", (e) => {
                e.preventDefault();
                window.booking.openMyBookings();
            });
        }

        // Logout Nav button
        const navLogoutBtn = document.getElementById("navLogoutBtn");
        if (navLogoutBtn) {
            navLogoutBtn.addEventListener("click", (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Portal Switch to Home link inside booking view
        const portalBackHomeBtn = document.getElementById("portalBackHomeBtn");
        if (portalBackHomeBtn) {
            portalBackHomeBtn.addEventListener("click", (e) => {
                e.preventDefault();
                this.switchToHomeView();
            });
        }
    }

    onAuthSuccess(user, message) {
        this.updateNavAuthState(user);
        this.showToast(message || `Welcome, ${user.fullName}!`, "success");
        // Automatically transition into the customer booking portal as requested!
        this.switchToBookingView();

        if (window.booking && window.booking.pendingBookingRoomId) {
            const pendingRoomId = window.booking.pendingBookingRoomId;
            window.booking.pendingBookingRoomId = null;
            setTimeout(() => {
                window.booking.startBooking(pendingRoomId);
            }, 150);
        }
    }

    updateNavAuthState(user) {
        const guestMenu = document.getElementById("navGuestMenu");
        const guestNameEl = document.getElementById("navGuestName");
        const loginBtn = document.getElementById("navLoginBtn");

        if (user) {
            if (guestMenu) guestMenu.style.display = "flex";
            if (loginBtn) loginBtn.style.display = "none";
            if (guestNameEl) guestNameEl.textContent = user.fullName;

            // Update portal welcome banner
            const portalBannerName = document.getElementById("portalUserWelcomeName");
            if (portalBannerName) portalBannerName.textContent = user.fullName;
        } else {
            if (guestMenu) guestMenu.style.display = "none";
            if (loginBtn) loginBtn.style.display = "inline-flex";
        }
    }

    switchToBookingView() {
        this.currentView = "booking";
        window.location.hash = "#booking";

        document.getElementById("homeView").style.display = "none";
        document.getElementById("bookingView").style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Update nav active indicators
        document.querySelectorAll(".nav-link-home").forEach(el => el.classList.remove("active"));
        document.querySelectorAll(".nav-link-booking").forEach(el => el.classList.add("active"));

        // Render rooms
        window.booking.renderRooms();
    }

    switchToHomeView() {
        this.currentView = "home";
        window.location.hash = "";

        document.getElementById("homeView").style.display = "block";
        document.getElementById("bookingView").style.display = "none";
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Update nav active indicators
        document.querySelectorAll(".nav-link-home").forEach(el => el.classList.add("active"));
        document.querySelectorAll(".nav-link-booking").forEach(el => el.classList.remove("active"));
    }

    handleLogout() {
        const user = window.db.getCurrentUser();
        window.db.logout();
        this.updateNavAuthState(null);

        // Clear all authentication form inputs upon logout to prevent credential leakage
        if (window.auth && typeof window.auth.clearFormInputs === "function") {
            window.auth.clearFormInputs();
        }

        this.showToast(`You have safely signed out. See you soon, ${user ? user.fullName : "Guest"}!`, "info");
        this.switchToHomeView();
    }

    showToast(message, type = "info") {
        if (!this.toastContainer) return;

        const toast = document.createElement("div");
        toast.className = `toast-item toast-${type}`;
        
        let icon = "fa-info-circle";
        if (type === "success") icon = "fa-check-circle";
        if (type === "danger") icon = "fa-exclamation-triangle";

        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        this.toastContainer.appendChild(toast);

        // Auto remove after 4.5 seconds
        setTimeout(() => {
            toast.classList.add("fade-out");
            setTimeout(() => toast.remove(), 400);
        }, 4500);
    }
}

// Instantiate after DOM loaded
document.addEventListener("DOMContentLoaded", () => {
    window.app = new AppController();
});
