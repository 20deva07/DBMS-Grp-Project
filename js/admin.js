/**
 * Admin Module (RBAC: Manager & Receptionist)
 * Coordinates Admin Authentication, Manager Billing & Staff CRUD,
 * and Receptionist Guest Approvals, Service Confirmation, and Walk-in Registrations.
 */

class AdminManager {
    constructor() {
        this.currentStaff = null;
        this.activeBillingBooking = null;
        this.init();
    }

    formatCurrency(value) {
        const amount = Number(value ?? 0);
        return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    init() {
        // Check if an admin was already logged in
        const saved = window.db.getCurrentStaff();
        if (saved) {
            this.currentStaff = saved;
        }

        this.bindEvents();
    }

    bindEvents() {
        // Admin Login Form
        const adminLoginForm = document.getElementById("adminLoginForm");
        if (adminLoginForm) {
            adminLoginForm.addEventListener("submit", (e) => this.handleAdminLogin(e));
        }

        // Demo buttons
        const demoManagerBtn = document.getElementById("demoManagerBtn");
        if (demoManagerBtn) {
            demoManagerBtn.addEventListener("click", () => this.fillDemoAdmin("MGR-101", "Robert Sterling", "manager123"));
        }

        const demoReceptionBtn = document.getElementById("demoReceptionBtn");
        if (demoReceptionBtn) {
            demoReceptionBtn.addEventListener("click", () => this.fillDemoAdmin("REC-201", "Sarah Jenkins", "reception123"));
        }

        // Manager: Add Staff Form
        const addStaffForm = document.getElementById("addStaffForm");
        if (addStaffForm) {
            addStaffForm.addEventListener("submit", (e) => this.handleAddStaffSubmit(e));
        }

        // Receptionist: Walk-in Guest Form
        const walkinGuestForm = document.getElementById("walkinGuestForm");
        if (walkinGuestForm) {
            walkinGuestForm.addEventListener("submit", (e) => this.handleWalkinGuestSubmit(e));
        }

        // Manager: Save Finalized Bill
        const saveBillBtn = document.getElementById("managerSaveBillBtn");
        if (saveBillBtn) {
            saveBillBtn.addEventListener("click", () => this.handleSaveBillSubmit());
        }

        // Close Bill Modal
        const closeBillModalBtn = document.getElementById("closeManagerBillModal");
        if (closeBillModalBtn) {
            closeBillModalBtn.addEventListener("click", () => this.closeBillModal());
        }

        // Admin Logout
        const adminLogoutBtn = document.getElementById("adminLogoutBtn");
        if (adminLogoutBtn) {
            adminLogoutBtn.addEventListener("click", () => this.handleAdminLogout());
        }

        // Bill Discount / Charge inputs live recalculation
        const billDiscountInput = document.getElementById("billDiscountInput");
        const billExtraInput = document.getElementById("billExtraInput");
        if (billDiscountInput && billExtraInput) {
            billDiscountInput.addEventListener("input", () => this.recalculateManagerBillModal());
            billExtraInput.addEventListener("input", () => this.recalculateManagerBillModal());
        }
    }

    fillDemoAdmin(id, name, pass) {
        const idInput = document.getElementById("adminLoginId");
        const nameInput = document.getElementById("adminLoginName");
        const passInput = document.getElementById("adminLoginPass");

        if (idInput) idInput.value = id;
        if (nameInput) nameInput.value = name;
        if (passInput) passInput.value = pass;

        // Auto submit for rapid testing
        this.submitAdminLogin(id, name, pass);
    }

    async handleAdminLogin(e) {
        if (e) e.preventDefault();
        const id = document.getElementById("adminLoginId")?.value;
        const name = document.getElementById("adminLoginName")?.value;
        const pass = document.getElementById("adminLoginPass")?.value;
        await this.submitAdminLogin(id, name, pass);
    }

    async submitAdminLogin(id, name, pass) {
        const errorEl = document.getElementById("adminAuthErrorMsg");
        if (errorEl) errorEl.style.display = "none";

        if (!id || !name || !pass) {
            this.showAdminError("Please fill in Admin ID, Admin Name, and Password.");
            return;
        }

        try {
            const staff = await window.api.adminLogin(id, name, pass);
            this.currentStaff = staff;
            window.db.setCurrentStaff(staff);

            // Clear credentials immediately from form feed
            const adminPass = document.getElementById("adminLoginPass");
            if (adminPass) adminPass.value = "";
            const adminName = document.getElementById("adminLoginName");
            if (adminName) adminName.value = "";
            const adminId = document.getElementById("adminLoginId");
            if (adminId) adminId.value = "";
            const adminForm = document.getElementById("adminLoginForm");
            if (adminForm) adminForm.reset();

            // Close auth modal
            if (window.auth) window.auth.closeModal();

            // Redirect to Admin Portal view based on role
            this.openAdminPortal(staff);
            window.app.showToast(`Welcome back, ${staff.fullName} (${staff.role.toUpperCase()})!`, "success");

        } catch (err) {
            this.showAdminError(err.message || "Invalid Admin ID, Name, or Password.");
        }
    }

    showAdminError(msg) {
        const errorEl = document.getElementById("adminAuthErrorMsg");
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = "block";
        }
    }

    openAdminPortal(staff) {
        if (!staff) return;

        // Hide other views
        document.getElementById("homeView").style.display = "none";
        document.getElementById("bookingView").style.display = "none";

        // Show Admin View
        const adminView = document.getElementById("adminView");
        if (adminView) adminView.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Update Admin Header
        document.getElementById("adminStaffName").textContent = staff.fullName;
        document.getElementById("adminStaffId").textContent = staff.staffId;
        document.getElementById("adminStaffRole").textContent = staff.role.toUpperCase();

        const roleTag = document.getElementById("adminRoleBadge");
        const iconWrap = document.getElementById("adminBadgeIcon");

        if (staff.role.toLowerCase() === "manager") {
            // SHOW MANAGER SECTION, HIDE RECEPTIONIST SECTION
            document.getElementById("adminManagerSection").style.display = "block";
            document.getElementById("adminReceptionistSection").style.display = "none";

            if (roleTag) {
                roleTag.textContent = "Executive Manager";
                roleTag.className = "admin-role-tag tag-manager";
            }
            if (iconWrap) {
                iconWrap.className = "admin-badge-icon icon-manager";
                iconWrap.innerHTML = '<i class="fas fa-crown"></i>';
            }

            // Load Manager Data
            this.loadManagerDashboard();

        } else {
            // SHOW RECEPTIONIST SECTION, HIDE MANAGER SECTION
            document.getElementById("adminManagerSection").style.display = "none";
            document.getElementById("adminReceptionistSection").style.display = "block";

            if (roleTag) {
                roleTag.textContent = "Front-Desk Receptionist";
                roleTag.className = "admin-role-tag tag-receptionist";
            }
            if (iconWrap) {
                iconWrap.className = "admin-badge-icon icon-receptionist";
                iconWrap.innerHTML = '<i class="fas fa-concierge-bell"></i>';
            }

            // Load Receptionist Data
            this.loadReceptionistDashboard();
        }
    }

    handleAdminLogout() {
        const staff = this.currentStaff;
        this.currentStaff = null;
        window.db.staffLogout();

        // Clear all login and staff credentials from feed
        if (window.auth && typeof window.auth.clearFormInputs === "function") {
            window.auth.clearFormInputs();
        } else {
            const adminPass = document.getElementById("adminLoginPass");
            if (adminPass) adminPass.value = "";
            const adminName = document.getElementById("adminLoginName");
            if (adminName) adminName.value = "";
            const adminId = document.getElementById("adminLoginId");
            if (adminId) adminId.value = "";
            const adminForm = document.getElementById("adminLoginForm");
            if (adminForm) adminForm.reset();
        }

        document.getElementById("adminView").style.display = "none";
        window.app.switchToHomeView();
        window.app.showToast(`Signed out of Staff Portal. Have a great day, ${staff ? staff.fullName : "Staff Member"}!`, "info");
    }

    // =================================================================
    // MANAGER VIEW LOGIC
    // =================================================================

    async loadManagerDashboard() {
        const bookings = await window.api.getAllAdminBookings();
        this.latestBookings = bookings;
        const staffList = await window.api.getStaffList();

        // 1. Calculate Manager Metrics
        let totalRevenue = 0;
        let pendingBillsCount = 0;
        let activeGuestsCount = 0;

        bookings.forEach(b => {
            if (b.status !== "Cancelled") {
                totalRevenue += (b.total || 0);
            }
            if (b.overallBillStatus === "Draft") {
                pendingBillsCount++;
            }
            if (b.approvalStatus === "Approved" || b.approvalStatus === "Checked-In") {
                activeGuestsCount++;
            }
        });

        document.getElementById("mgrMetricRevenue").textContent = this.formatCurrency(totalRevenue);
        document.getElementById("mgrMetricActiveGuests").textContent = activeGuestsCount;
        document.getElementById("mgrMetricPendingBills").textContent = pendingBillsCount;
        document.getElementById("mgrMetricStaffCount").textContent = staffList.length;

        // 2. Render Overall Billing Table
        this.renderManagerBillingTable(bookings);

        // 3. Render Staff Directory
        this.renderStaffDirectory(staffList);
    }

    renderManagerBillingTable(bookings) {
        const tbody = document.getElementById("managerBillingTableBody");
        if (!tbody) return;

        if (bookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 2rem;">No reservations currently on file.</td></tr>`;
            return;
        }

        tbody.innerHTML = bookings.map(b => {
            const isPaid = b.overallBillStatus === "Paid";
            const isFinalized = b.overallBillStatus === "Finalized";
            let statusBadge = `<span class="badge-bill-draft"><i class="fas fa-file-invoice"></i> Draft Bill</span>`;
            if (isPaid) statusBadge = `<span class="badge-bill-paid"><i class="fas fa-check-circle"></i> Paid & Finalized</span>`;
            else if (isFinalized) statusBadge = `<span class="badge-bill-finalized"><i class="fas fa-lock"></i> Bill Finalized</span>`;

            // Calculate services sum
            let servicesSum = 0;
            if (b.addons) {
                b.addons.forEach(a => servicesSum += (a.cost || 0));
            }

            return `
                <tr>
                    <td><strong>${b.bookingId}</strong><br><small class="text-muted">${b.roomNumberAssigned || "Unassigned"}</small></td>
                    <td><strong>${b.guestName}</strong><br><small class="text-muted">${b.guestEmail}</small></td>
                    <td>${b.roomName}<br><small class="text-muted">${b.nights} nights (${b.checkIn} → ${b.checkOut})</small></td>
                    <td>${this.formatCurrency(b.subtotal ? b.subtotal : (b.pricePerNight * b.nights))}</td>
                    <td>${this.formatCurrency(servicesSum)}</td>
                    <td>${this.formatCurrency(b.taxes || 0)}</td>
                    <td><strong class="text-gold" style="font-size: 1.05rem;">${this.formatCurrency(b.total || 0)}</strong></td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-outline-gold btn-sm" onclick="window.admin.openManagerBillModal('${b.bookingId}')">
                            <i class="fas fa-file-invoice-dollar"></i> Make Bill
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    openManagerBillModal(bookingRef) {
        let booking = (this.latestBookings || []).find(b => b.bookingId === bookingRef || String(b.booking_no) === String(bookingRef));
        if (!booking) {
            const bookings = window.db.getBookings();
            booking = bookings.find(b => b.bookingId === bookingRef || String(b.booking_no) === String(bookingRef));
        }
        if (!booking) return;

        this.activeBillingBooking = booking;

        // Populate Modal Fields
        document.getElementById("modalBillRef").textContent = booking.bookingId;
        document.getElementById("modalBillGuest").textContent = booking.guestName;
        document.getElementById("modalBillEmail").textContent = booking.guestEmail;
        document.getElementById("modalBillPhone").textContent = booking.guestPhone || "N/A";
        document.getElementById("modalBillRoom").textContent = `${booking.roomName} (Room ${booking.roomNumberAssigned || "101"})`;
        document.getElementById("modalBillDates").textContent = `${booking.checkIn} to ${booking.checkOut} (${booking.nights} nights)`;

        // Render Room line item
        const baseRate = booking.subtotal || (booking.pricePerNight * booking.nights);
        document.getElementById("invoiceRoomDesc").textContent = `${booking.roomName} (${booking.nights} nights × ₹${booking.pricePerNight || (baseRate / booking.nights).toFixed(0)})`;
        document.getElementById("invoiceRoomAmount").textContent = this.formatCurrency(baseRate);

        // Render Services table rows
        const servicesTable = document.getElementById("invoiceServicesList");
        if (servicesTable) {
            if (booking.addons && booking.addons.length > 0) {
                servicesTable.innerHTML = booking.addons.map(a => `
                    <tr>
                        <td><i class="fas fa-check-circle text-gold"></i> ${a.name}</td>
                        <td style="text-align: right;">${this.formatCurrency(a.cost || 0)}</td>
                    </tr>
                `).join("");
            } else {
                servicesTable.innerHTML = `<tr><td colspan="2" class="text-muted" style="font-style: italic;">No extra add-on services selected.</td></tr>`;
            }
        }

        // Set Discount & Extra inputs
        const discountInput = document.getElementById("billDiscountInput");
        const extraInput = document.getElementById("billExtraInput");
        if (discountInput) discountInput.value = booking.discount || 0;
        if (extraInput) extraInput.value = booking.additionalCharges || 0;

        // Set Paid Checkbox
        const paidCheckbox = document.getElementById("billMarkPaidCheckbox");
        if (paidCheckbox) paidCheckbox.checked = booking.overallBillStatus === "Paid";

        // Recalculate
        this.recalculateManagerBillModal();

        // Open modal
        const modal = document.getElementById("managerBillModal");
        if (modal) {
            modal.classList.add("active");
            document.body.classList.add("modal-open");
        }
    }

    recalculateManagerBillModal() {
        if (!this.activeBillingBooking) return;

        const booking = this.activeBillingBooking;
        const base = booking.subtotal || (booking.pricePerNight * booking.nights);

        let servicesSum = 0;
        if (booking.addons) {
            booking.addons.forEach(a => servicesSum += (a.cost || 0));
        }

        const discount = parseFloat(document.getElementById("billDiscountInput")?.value) || 0;
        const extra = parseFloat(document.getElementById("billExtraInput")?.value) || 0;

        const taxable = Math.max(0, (base + servicesSum + extra) - discount);
        const tax = Math.round(taxable * 0.12 * 100) / 100;
        const grandTotal = taxable + tax;

        document.getElementById("invoiceSubtotal").textContent = this.formatCurrency(base + servicesSum);
        document.getElementById("invoiceDiscountDisplay").textContent = `-${this.formatCurrency(discount)}`;
        document.getElementById("invoiceExtraDisplay").textContent = `+${this.formatCurrency(extra)}`;
        document.getElementById("invoiceTax").textContent = this.formatCurrency(tax);
        document.getElementById("invoiceGrandTotal").textContent = this.formatCurrency(grandTotal);
    }

    async handleSaveBillSubmit() {
        if (!this.activeBillingBooking) return;

        const bookingRef = this.activeBillingBooking.bookingId;
        const discount = parseFloat(document.getElementById("billDiscountInput")?.value) || 0;
        const extra = parseFloat(document.getElementById("billExtraInput")?.value) || 0;
        const markAsPaid = document.getElementById("billMarkPaidCheckbox")?.checked || false;

        const billData = {
            discount: discount,
            additionalCharges: extra,
            markAsPaid: markAsPaid,
            managerId: this.currentStaff?.staffId || "MGR-101"
        };

        try {
            await window.api.finalizeOverallBill(bookingRef, billData);
            this.closeBillModal();
            window.app.showToast(`Overall bill for ${bookingRef} has been finalized!`, "success");
            this.loadManagerDashboard(); // Refresh
        } catch (err) {
            alert("Error finalizing bill: " + err.message);
        }
    }

    closeBillModal() {
        const modal = document.getElementById("managerBillModal");
        if (modal) {
            modal.classList.remove("active");
            document.body.classList.remove("modal-open");
        }
    }

    renderStaffDirectory(staffList) {
        const grid = document.getElementById("managerStaffGrid");
        if (!grid) return;

        grid.innerHTML = staffList.map(s => {
            const isMgr = s.role.toLowerCase() === "manager";
            return `
                <div class="staff-member-card">
                    <div class="staff-avatar-badge" style="background: ${isMgr ? "var(--gold-gradient)" : "linear-gradient(135deg, #10b981, #059669)"}">
                        <i class="fas ${isMgr ? "fa-user-tie" : "fa-user-nurse"}"></i>
                    </div>
                    <div class="staff-info-col" style="flex-grow: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <h4 style="margin: 0;">${s.fullName}</h4>
                            <span class="admin-role-tag ${isMgr ? "tag-manager" : "tag-receptionist"}">${s.role}</span>
                        </div>
                        <p style="margin: 3px 0;"><i class="fas fa-id-badge text-gold"></i> ID: <strong>${s.staffId}</strong></p>
                        <p style="margin: 2px 0;"><i class="fas fa-envelope"></i> ${s.email}</p>
                        <p style="margin: 2px 0;"><i class="fas fa-briefcase"></i> ${s.department || "Front Office"}</p>
                    </div>
                </div>
            `;
        }).join("");
    }

    async handleAddStaffSubmit(e) {
        e.preventDefault();
        const staffId = document.getElementById("newStaffId").value;
        const fullName = document.getElementById("newStaffName").value;
        const email = document.getElementById("newStaffEmail").value;
        const phone = document.getElementById("newStaffPhone").value;
        const password = document.getElementById("newStaffPass").value;
        const role = document.getElementById("newStaffRole").value;
        const department = document.getElementById("newStaffDept").value;
        const salary = document.getElementById("newStaffSalary").value;

        try {
            await window.api.createStaff({
                staffId, fullName, email, phone, password, role, department, salary
            });

            document.getElementById("addStaffForm").reset();
            window.app.showToast(`New ${role.toUpperCase()} ${fullName} (${staffId}) added to database!`, "success");
            this.loadManagerDashboard(); // Refresh
        } catch (err) {
            alert("Error adding staff: " + err.message);
        }
    }

    // =================================================================
    // RECEPTIONIST VIEW LOGIC
    // =================================================================

    async loadReceptionistDashboard() {
        const bookings = await window.api.getAllAdminBookings();
        this.latestBookings = bookings;

        // 1. Calculate Receptionist Metrics
        let arrivalsToday = 0;
        let pendingApprovals = 0;
        let pendingServices = 0;

        bookings.forEach(b => {
            if (b.approvalStatus === "Pending Approval") pendingApprovals++;
            if (b.approvalStatus === "Approved" || b.approvalStatus === "Checked-In") arrivalsToday++;

            if (b.addons && Array.isArray(b.addons)) {
                b.addons.forEach(a => {
                    if (a.status !== "Completed") pendingServices++;
                });
            }
        });

        document.getElementById("recMetricArrivals").textContent = arrivalsToday;
        document.getElementById("recMetricPendingApprovals").textContent = pendingApprovals;
        document.getElementById("recMetricPendingServices").textContent = pendingServices;

        // 2. Render Guest Approvals Queue
        this.renderReceptionistApprovals(bookings);

        // 3. Render Service Fulfillment Queue
        this.renderReceptionistServices(bookings);
    }

    renderReceptionistApprovals(bookings) {
        const tbody = document.getElementById("receptionistApprovalTableBody");
        if (!tbody) return;

        if (bookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">No guests waiting for approval.</td></tr>`;
            return;
        }

        tbody.innerHTML = bookings.map(b => {
            const isApproved = b.approvalStatus === "Approved" || b.approvalStatus === "Checked-In";
            const isCheckedOut = b.approvalStatus === "Checked-Out";

            let statusPill = `<span class="badge-bill-draft"><i class="fas fa-clock"></i> Pending Verification</span>`;
            if (b.approvalStatus === "Checked-In") statusPill = `<span class="badge-bill-paid"><i class="fas fa-door-open"></i> Checked-In</span>`;
            else if (isApproved) statusPill = `<span class="badge-bill-finalized"><i class="fas fa-check-circle"></i> Approved</span>`;
            else if (isCheckedOut) statusPill = `<span class="badge-bill-draft" style="background:#e2e8f0; color:#475569;"><i class="fas fa-sign-out-alt"></i> Checked-Out</span>`;

            return `
                <tr>
                    <td><strong>${b.bookingId}</strong></td>
                    <td>
                        <strong>${b.guestName}</strong><br>
                        <small><i class="fas fa-id-card text-gold"></i> ID: ${b.guestIdProof || "Passport"}</small><br>
                        <small class="text-muted">${b.guestPhone || b.guestEmail}</small>
                    </td>
                    <td>${b.roomName}<br><small class="text-muted">${b.checkIn} to ${b.checkOut} (${b.nights}n)</small></td>
                    <td>
                        <input type="text" id="assign_room_${b.bookingId}" value="${b.roomNumberAssigned && b.roomNumberAssigned !== 'Unassigned' ? b.roomNumberAssigned : '101'}" 
                               style="width: 80px; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-weight: 700;">
                    </td>
                    <td>${b.guests} Guests</td>
                    <td>${statusPill}</td>
                    <td>
                        ${!isApproved ? `
                            <button class="btn btn-gold btn-sm" onclick="window.admin.approveGuest('${b.bookingId}')">
                                <i class="fas fa-user-check"></i> Approve Details
                            </button>
                        ` : (b.approvalStatus === "Approved" ? `
                            <button class="btn btn-primary btn-sm" onclick="window.admin.checkinGuest('${b.bookingId}')">
                                <i class="fas fa-key"></i> Hand Key (Check In)
                            </button>
                        ` : (b.approvalStatus === "Checked-In" ? `
                            <button class="btn btn-outline-secondary btn-sm" onclick="window.admin.checkoutGuest('${b.bookingId}')">
                                <i class="fas fa-sign-out-alt"></i> Check Out
                            </button>
                        ` : `<span class="text-muted"><i class="fas fa-check"></i> Completed</span>`))}
                    </td>
                </tr>
            `;
        }).join("");
    }

    async approveGuest(bookingRef) {
        const inputEl = document.getElementById(`assign_room_${bookingRef}`);
        const roomNumber = inputEl ? inputEl.value.trim() : "101";

        try {
            await window.api.approveGuestBooking(bookingRef, roomNumber, this.currentStaff?.staffId || "REC-201");
            window.app.showToast(`Guest details approved! Room ${roomNumber} assigned to ${bookingRef}.`, "success");
            this.loadReceptionistDashboard();
        } catch (err) {
            alert("Approval error: " + err.message);
        }
    }

    async checkinGuest(bookingRef) {
        const proceed = window.confirm(
            "Confirm receptionist handover: verify the guest identity, room assignment, and key handover before checking in."
        );
        if (!proceed) return;

        try {
            await window.api.checkinGuestBooking(bookingRef, this.currentStaff?.staffId || "REC-201");
            window.app.showToast(`Guest checked in after key handover.`, "success");
            this.loadReceptionistDashboard();
        } catch (err) {
            alert("Checkin error: " + err.message);
        }
    }

    async checkoutGuest(bookingRef) {
        try {
            await window.api.checkoutGuestBooking(bookingRef);
            window.app.showToast(`Guest checked out successfully. Room released.`, "info");
            this.loadReceptionistDashboard();
        } catch (err) {
            alert("Checkout error: " + err.message);
        }
    }

    renderReceptionistServices(bookings) {
        const grid = document.getElementById("receptionistServicesGrid");
        if (!grid) return;

        const allServices = [];
        bookings.forEach(b => {
            if (b.addons && Array.isArray(b.addons)) {
                b.addons.forEach(a => {
                    allServices.push({
                        bookingId: b.bookingId,
                        guestName: b.guestName,
                        roomNumber: b.roomNumberAssigned || "101",
                        serviceId: a.id || a.name,
                        serviceName: a.name,
                        cost: a.cost,
                        status: a.status || "Pending",
                        fulfilledBy: a.fulfilledBy
                    });
                });
            }
        });

        if (allServices.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">No active service requests right now.</div>`;
            return;
        }

        grid.innerHTML = allServices.map(s => {
            const isCompleted = s.status === "Completed";
            const isInProgress = s.status === "In Progress";
            let pillClass = "status-pending";
            if (isCompleted) pillClass = "status-completed";
            else if (isInProgress) pillClass = "status-in-progress";

            return `
                <div class="service-task-card">
                    <div>
                        <div class="service-task-header">
                            <span class="service-task-title">${s.serviceName}</span>
                            <span class="service-status-pill ${pillClass}">${s.status}</span>
                        </div>
                        <div class="service-task-meta">
                            <p><i class="fas fa-door-closed text-gold"></i> Room: <strong>${s.roomNumber}</strong></p>
                            <p><i class="fas fa-user"></i> Guest: <strong>${s.guestName}</strong></p>
                            <p><i class="fas fa-receipt"></i> Booking: <code>${s.bookingId}</code></p>
                            ${s.fulfilledBy ? `<p class="text-success"><i class="fas fa-check"></i> Fulfilled by: ${s.fulfilledBy}</p>` : ""}
                        </div>
                    </div>
                    
                    <div class="service-task-actions">
                        ${!isCompleted ? `
                            <button class="btn btn-outline-secondary btn-sm" onclick="window.admin.setServiceStatus('${s.bookingId}', '${s.serviceName}', 'In Progress')">
                                <i class="fas fa-spinner"></i> In Progress
                            </button>
                            <button class="btn btn-gold btn-sm" onclick="window.admin.setServiceStatus('${s.bookingId}', '${s.serviceName}', 'Completed')">
                                <i class="fas fa-check-double"></i> Confirm Performed
                            </button>
                        ` : `
                            <span class="text-success" style="font-weight: 700; font-size: 0.85rem;">
                                <i class="fas fa-check-circle"></i> Service Performed & Verified
                            </span>
                        `}
                    </div>
                </div>
            `;
        }).join("");
    }

    async setServiceStatus(bookingRef, serviceName, newStatus) {
        try {
            await window.api.updateServiceStatus(bookingRef, serviceName, newStatus, this.currentStaff?.staffId || "REC-201");
            window.app.showToast(`Service "${serviceName}" marked as ${newStatus}!`, "success");
            this.loadReceptionistDashboard();
        } catch (err) {
            alert("Error updating service: " + err.message);
        }
    }

    async handleWalkinGuestSubmit(e) {
        e.preventDefault();
        const fullName = document.getElementById("walkinGuestName").value;
        const email = document.getElementById("walkinGuestEmail").value;
        const phone = document.getElementById("walkinGuestPhone").value;
        const idProof = document.getElementById("walkinGuestIdProof").value;
        const roomType = document.getElementById("walkinRoomType").value;
        const roomNumber = document.getElementById("walkinRoomNumber").value;
        const checkIn = document.getElementById("walkinCheckIn").value;
        const checkOut = document.getElementById("walkinCheckOut").value;
        const guests = parseInt(document.getElementById("walkinGuests").value) || 2;

        const roomRates = {
            "standard": { name: "Standard Skyline Suite", price: 2000 },
            "deluxe": { name: "Deluxe Ocean King Suite", price: 3500 },
            "suite": { name: "Zen Garden Wellness Suite", price: 6000 }
        };

        const roomInfo = roomRates[roomType] || roomRates["deluxe"];
        const inDate = new Date(checkIn);
        const outDate = new Date(checkOut);
        const nights = Math.max(1, Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24)));
        const subtotal = roomInfo.price * nights;
        const taxes = Math.round(subtotal * 0.12 * 100) / 100;
        const total = subtotal + taxes;

        try {
            await window.api.registerWalkinGuest({
                fullName, email, phone, idProof
            }, {
                roomId: roomType,
                roomName: roomInfo.name,
                roomNumberAssigned: roomNumber || "102",
                checkIn, checkOut, nights, guests,
                pricePerNight: roomInfo.price,
                subtotal, taxes, total,
                addons: []
            });

            document.getElementById("walkinGuestForm").reset();
            window.app.showToast(`Walk-in guest ${fullName} checked in to Room ${roomNumber}!`, "success");
            this.loadReceptionistDashboard();
        } catch (err) {
            alert("Registration error: " + err.message);
        }
    }
}

// Global instance
window.admin = new AdminManager();
