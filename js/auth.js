/**
 * Auth Module
 * Handles scroll-triggered modal appearance, Login/Register tabs,
 * validation, one-click demo guest login, and session state.
 */

class AuthManager {
    constructor() {
        this.modal = document.getElementById("authModal");
        this.loginTabBtn = document.getElementById("tabLoginBtn");
        this.registerTabBtn = document.getElementById("tabRegisterBtn");
        this.loginForm = document.getElementById("loginForm");
        this.registerForm = document.getElementById("registerForm");
        this.closeModalBtn = document.getElementById("closeAuthModal");
        this.demoLoginBtn = document.getElementById("demoLoginBtn");
        this.navLoginBtn = document.getElementById("navLoginBtn");
        this.authErrorMsg = document.getElementById("authErrorMsg");

        this.adminTabBtn = document.getElementById("tabAdminBtn");
        this.adminForm = document.getElementById("adminLoginForm");
        this.navAdminBtn = document.getElementById("navAdminBtn");

        this.scrollTriggered = false;
        this.init();
    }

    init() {
        // Event Listeners for Tab Switching
        if (this.loginTabBtn) {
            this.loginTabBtn.addEventListener("click", () => this.switchTab("login"));
        }
        if (this.registerTabBtn) {
            this.registerTabBtn.addEventListener("click", () => this.switchTab("register"));
        }
        if (this.adminTabBtn) {
            this.adminTabBtn.addEventListener("click", () => this.switchTab("admin"));
        }

        // Close Modal Listeners
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener("click", () => this.closeModal(true));
        }

        // Close on clicking backdrop
        if (this.modal) {
            this.modal.addEventListener("click", (e) => {
                if (e.target === this.modal) {
                    this.closeModal(true);
                }
            });
        }

        // Manual open button in Navbar
        if (this.navLoginBtn) {
            this.navLoginBtn.addEventListener("click", (e) => {
                e.preventDefault();
                this.openModal("login");
            });
        }

        // Staff / Admin Navbar button
        if (this.navAdminBtn) {
            this.navAdminBtn.addEventListener("click", (e) => {
                e.preventDefault();
                this.openModal("admin");
            });
        }

        // Demo 1-Click Guest Login
        if (this.demoLoginBtn) {
            this.demoLoginBtn.addEventListener("click", () => this.handleDemoLogin());
        }

        // Form Submit Handlers
        if (this.loginForm) {
            this.loginForm.addEventListener("submit", (e) => this.handleLoginSubmit(e));
        }
        if (this.registerForm) {
            this.registerForm.addEventListener("submit", (e) => this.handleRegisterSubmit(e));
        }

        // Listen for Scroll to trigger login modal
        this.setupScrollTrigger();

        // Keyboard ESC to close modal
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.isModalOpen()) {
                this.closeModal(true);
            }
        });
    }

    setupScrollTrigger() {
        let scrollTimeout;
        const handleScroll = () => {
            // Only trigger if on home page, not logged in, and hasn't been dismissed in session
            const currentUser = window.db.getCurrentUser();
            const currentStaff = window.db.getCurrentStaff();
            if (currentUser || currentStaff) return; // Already logged in

            if (window.db.hasDismissedScrollPrompt() || this.scrollTriggered) {
                return;
            }

            const scrollY = window.scrollY || window.pageYOffset;
            const threshold = 350; // Trigger after scrolling past 350px down the hero

            if (scrollY > threshold && !this.isModalOpen()) {
                this.scrollTriggered = true;
                // Add a gentle micro-delay for smooth experience
                setTimeout(() => {
                    if (!window.db.getCurrentUser() && !window.db.getCurrentStaff() && !window.db.hasDismissedScrollPrompt()) {
                        this.openModal("login", true); // triggered by scroll
                    }
                }, 200);
            }
        };

        window.addEventListener("scroll", () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(handleScroll, 80);
        }, { passive: true });
    }

    clearFormInputs() {
        if (this.loginForm) this.loginForm.reset();
        if (this.registerForm) this.registerForm.reset();
        if (this.adminForm) this.adminForm.reset();

        const inputIds = [
            "loginGuestName", "loginIdProof",
            "regFullName", "regIdProof", "regPhone",
            "adminLoginId", "adminLoginName", "adminLoginPass"
        ];
        inputIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        this.clearErrors();
    }

    openModal(tab = "login", isFromScroll = false) {
        if (!this.modal) return;
        this.clearFormInputs();
        this.switchTab(tab);

        // Highlight scroll prompt banner if auto-triggered
        const promptBanner = document.getElementById("scrollPromptNotice");
        if (promptBanner) {
            promptBanner.style.display = isFromScroll ? "flex" : "none";
        }

        this.modal.classList.add("active");
        document.body.classList.add("modal-open");
    }

    closeModal(userDismissed = false) {
        if (!this.modal) return;
        this.modal.classList.remove("active");
        document.body.classList.remove("modal-open");
        this.clearFormInputs();

        if (userDismissed) {
            window.db.setDismissedScrollPrompt(true);
            this.scrollTriggered = true;
        }
    }

    isModalOpen() {
        return this.modal && this.modal.classList.contains("active");
    }

    switchTab(tab) {
        this.clearFormInputs();
        const demoBox = document.querySelector(".demo-login-box");
        const adminDemoBox = document.getElementById("adminDemoBox");

        if (tab === "login") {
            if (this.loginTabBtn) this.loginTabBtn.classList.add("active");
            if (this.registerTabBtn) this.registerTabBtn.classList.remove("active");
            if (this.adminTabBtn) this.adminTabBtn.classList.remove("active");

            if (this.loginForm) this.loginForm.style.display = "block";
            if (this.registerForm) this.registerForm.style.display = "none";
            if (this.adminForm) this.adminForm.style.display = "none";

            if (demoBox) demoBox.style.display = "block";
            if (adminDemoBox) adminDemoBox.style.display = "none";

            document.getElementById("modalTitle").textContent = "Welcome Back";
            document.getElementById("modalSubtitle").textContent = "Sign in to book rooms, customize luxury add-ons, and view reservations.";

        } else if (tab === "register") {
            if (this.registerTabBtn) this.registerTabBtn.classList.add("active");
            if (this.loginTabBtn) this.loginTabBtn.classList.remove("active");
            if (this.adminTabBtn) this.adminTabBtn.classList.remove("active");

            if (this.registerForm) this.registerForm.style.display = "block";
            if (this.loginForm) this.loginForm.style.display = "none";
            if (this.adminForm) this.adminForm.style.display = "none";

            if (demoBox) demoBox.style.display = "none";
            if (adminDemoBox) adminDemoBox.style.display = "none";

            document.getElementById("modalTitle").textContent = "Create Guest Account";
            document.getElementById("modalSubtitle").textContent = "Join our luxury rewards program and unlock exclusive reservation rates.";

        } else if (tab === "admin") {
            if (this.adminTabBtn) this.adminTabBtn.classList.add("active");
            if (this.loginTabBtn) this.loginTabBtn.classList.remove("active");
            if (this.registerTabBtn) this.registerTabBtn.classList.remove("active");

            if (this.adminForm) this.adminForm.style.display = "block";
            if (this.loginForm) this.loginForm.style.display = "none";
            if (this.registerForm) this.registerForm.style.display = "none";

            if (demoBox) demoBox.style.display = "none";
            if (adminDemoBox) adminDemoBox.style.display = "block";

            document.getElementById("modalTitle").textContent = "Staff & Admin Portal";
            document.getElementById("modalSubtitle").textContent = "Manager & Receptionist role-based control center.";
        }
    }

    showError(message) {
        if (this.authErrorMsg) {
            this.authErrorMsg.textContent = message;
            this.authErrorMsg.style.display = "block";
        }
    }

    clearErrors() {
        if (this.authErrorMsg) {
            this.authErrorMsg.textContent = "";
            this.authErrorMsg.style.display = "none";
        }
    }

    async handleDemoLogin() {
        try {
            const user = await window.api.loginUser({
                guest_name: "Alex Rivera",
                idProof: "PASSPORT-US-984210"
            });
            window.db.setCurrentUser(user);
            this.closeModal(false);
            window.app.onAuthSuccess(user, "Logged in as Demo Guest (Alex Rivera)");
        } catch (err) {
            this.showError("Demo guest login failed. Please use the seeded project_jqlp guest details.");
        }
    }

    async handleLoginSubmit(e) {
        e.preventDefault();
        this.clearErrors();

        const guestName = document.getElementById("loginGuestName")?.value || document.getElementById("loginEmail")?.value || "";
        const idProof = document.getElementById("loginIdProof")?.value || document.getElementById("loginPassword")?.value || "";

        if (!guestName || !idProof) {
            this.showError("Please enter both guest name and ID proof.");
            return;
        }

        try {
            const user = await window.api.loginUser({ guest_name: guestName, idProof });
            window.db.setCurrentUser(user);
            this.closeModal(false);
            this.loginForm.reset();
            window.app.onAuthSuccess(user, `Welcome back, ${user.fullName}!`);
        } catch (err) {
            this.showError(err.message || "Invalid guest name or ID proof. Use the seeded guest details from the project_jqlp database.");
        }
    }

    async handleRegisterSubmit(e) {
        e.preventDefault();
        this.clearErrors();

        const fullName = document.getElementById("regFullName")?.value?.trim() || "";
        const idProof = document.getElementById("regIdProof")?.value?.trim() || "";
        const phone = document.getElementById("regPhone")?.value?.trim() || "";

        if (!fullName || !idProof) {
            this.showError("Please enter guest name and ID proof.");
            return;
        }

        try {
            const newUser = await window.api.registerUser({
                fullName,
                guest_name: fullName,
                idProof,
                phone,
                mobile_number: phone,
                email: `${fullName.replace(/\s+/g, "").toLowerCase()}@hotel.com`
            });
            window.db.setCurrentUser(newUser);
            this.closeModal(false);
            this.registerForm.reset();
            window.app.onAuthSuccess(newUser, `Account created! Welcome to Grand Horizon, ${newUser.fullName}.`);
        } catch (err) {
            this.showError(err.message || "Registration failed. Please verify your guest details.");
        }
    }
}

window.AuthManager = AuthManager;
