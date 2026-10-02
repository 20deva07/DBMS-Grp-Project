/**
 * Booking Module
 * Manages the Customer Booking Portal, room filtering, date math,
 * dynamic pricing, add-on services, reservation modal, and confirmation voucher.
 */

class BookingManager {
    constructor() {
        this.rooms = window.ROOMS_DATA || [];
        this.addons = window.ADDON_SERVICES || [];
        this.selectedRoom = null;
        this.currentFilterType = "all";
        this.currentCapacityFilter = 0;
        this.currentSort = "recommended";
        this.selectedAddons = new Set(["breakfast"]); // default selected

        // Booking dates state
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 2);

        this.checkInDate = this.formatDateForInput(today);
        this.checkOutDate = this.formatDateForInput(tomorrow);
        this.calculatedNights = 2;
        this.guestCount = 1;

        this.init();
    }

    formatCurrency(value) {
        const amount = Number(value ?? 0);
        return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    canonicalRoomNames() {
        return [
            "Standard Skyline Suite",
            "Deluxe Ocean King Suite",
            "Zen Garden Wellness Suite"
        ];
    }

    normalizeRoomList(rooms) {
        const fallbackRooms = Array.isArray(window.ROOMS_DATA) ? window.ROOMS_DATA : [];
        if (!Array.isArray(rooms) || rooms.length === 0) {
            return fallbackRooms;
        }

        const canonicalDefs = {
            "Standard Skyline Suite": {
                id: "executive-skyline-suite",
                name: "Standard Skyline Suite",
                type: "standard",
                typeName: "Standard Suite",
                pricePerNight: 2000,
                capacity: 1
            },
            "Deluxe Ocean King Suite": {
                id: "deluxe-ocean-king",
                name: "Deluxe Ocean King Suite",
                type: "deluxe",
                typeName: "Deluxe Suite",
                pricePerNight: 3500,
                capacity: 2
            },
            "Zen Garden Wellness Suite": {
                id: "garden-wellness-deluxe",
                name: "Zen Garden Wellness Suite",
                type: "suite",
                typeName: "Wellness Suite",
                pricePerNight: 6000,
                capacity: 3
            }
        };

        const result = [];
        const canonicalNames = this.canonicalRoomNames();

        for (const name of canonicalNames) {
            const def = canonicalDefs[name];
            const fallbackRoom = fallbackRooms.find(r => r.name === name) || {};
            const liveMatch = rooms.find(r => {
                const rName = (r.room_type || r.typeName || r.name || "").trim().toLowerCase();
                if (name === "Standard Skyline Suite") {
                    return rName.includes("standard") || rName.includes("skyline");
                }
                if (name === "Deluxe Ocean King Suite") {
                    return rName.includes("deluxe") || rName.includes("ocean");
                }
                if (name === "Zen Garden Wellness Suite") {
                    return rName.includes("zen") || rName.includes("wellness") || rName.includes("garden");
                }
                return false;
            }) || {};

            result.push({
                ...fallbackRoom,
                ...liveMatch,
                id: def.id,
                name: def.name,
                room_type: def.name,
                type: def.type,
                typeName: def.typeName,
                pricePerNight: def.pricePerNight,
                capacity: def.capacity,
                rating: Number(liveMatch.rating || fallbackRoom.rating || 4.9),
                reviews: Number(liveMatch.reviews || fallbackRoom.reviews || 200),
                popular: fallbackRoom.popular ?? liveMatch.popular ?? false,
                image: liveMatch.image || fallbackRoom.image,
                gallery: liveMatch.gallery || fallbackRoom.gallery || [liveMatch.image || fallbackRoom.image],
                description: liveMatch.description || fallbackRoom.description || "Signature resort suite.",
                amenities: Array.isArray(liveMatch.amenities) && liveMatch.amenities.length ? liveMatch.amenities : (fallbackRoom.amenities || []),
                availableCount: liveMatch.availableCount ?? fallbackRoom.availableCount ?? 20,
                availableRoomNumbers: liveMatch.availableRoomNumbers || []
            });
        }

        return result;
    }

    async init() {
        this.bindElements();
        this.attachEventListeners();
        this.syncDateInputs();
        this.rooms = this.normalizeRoomList(this.rooms);
        await this.loadLiveRoomsAndAddons();
    }

    async loadLiveRoomsAndAddons() {
        try {
            if (window.api && typeof window.api.getRooms === "function") {
                const liveRooms = await window.api.getRooms();
                const normalizedRooms = this.normalizeRoomList(liveRooms);
                if (Array.isArray(normalizedRooms) && normalizedRooms.length === 3) {
                    this.rooms = normalizedRooms;
                    this.renderRooms();
                } else {
                    this.rooms = Array.isArray(window.ROOMS_DATA) ? window.ROOMS_DATA : [];
                    this.renderRooms();
                }
            }
            if (window.api && typeof window.api.getServices === "function") {
                const liveServices = await window.api.getServices();
                if (liveServices && liveServices.length > 0) {
                    this.addons = liveServices.map(s => ({
                        id: String(s.service_id || s.id),
                        service_id: s.service_id,
                        name: s.service_type || s.name,
                        description: s.service_type || s.name,
                        price: parseFloat(s.price || 0),
                        priceType: "flat",
                        icon: "fas fa-concierge-bell"
                    }));
                }
            }
        } catch (e) {
            console.warn("Could not load live rooms/addons from PostgreSQL", e);
            this.rooms = Array.isArray(window.ROOMS_DATA) ? window.ROOMS_DATA : [];
            this.renderRooms();
        }
    }

    bindElements() {
        // Filter inputs
        this.roomGrid = document.getElementById("roomCatalogGrid");
        this.typeFiltersContainer = document.getElementById("roomTypePills");
        this.sortSelect = document.getElementById("bookingSortSelect");
        this.guestCountSelect = document.getElementById("bookingGuestsSelect");
        this.checkInInput = document.getElementById("portalCheckIn");
        this.checkOutInput = document.getElementById("portalCheckOut");
        this.nightsBadge = document.getElementById("portalNightsBadge");

        // Reservation Checkout Modal elements
        this.checkoutModal = document.getElementById("checkoutModal");
        this.closeCheckoutBtn = document.getElementById("closeCheckoutModal");
        this.addonsContainer = document.getElementById("checkoutAddonsList");
        this.confirmBookingBtn = document.getElementById("confirmBookingBtn");

        // Confirmation Voucher Modal
        this.voucherModal = document.getElementById("voucherModal");
        this.closeVoucherBtn = document.getElementById("closeVoucherModal");

        // Room Details Modal
        this.detailsModal = document.getElementById("roomDetailsModal");
        this.closeDetailsBtn = document.getElementById("closeRoomDetailsModal");

        // My Reservations Modal
        this.myBookingsModal = document.getElementById("myBookingsModal");
        this.closeMyBookingsBtn = document.getElementById("closeMyBookingsModal");
    }

    attachEventListeners() {
        // Date changes
        if (this.checkInInput && this.checkOutInput) {
            this.checkInInput.addEventListener("change", () => this.handleDateChange());
            this.checkOutInput.addEventListener("change", () => this.handleDateChange());
        }

        // Guest count change
        if (this.guestCountSelect) {
            this.guestCountSelect.addEventListener("change", (e) => {
                this.guestCount = parseInt(e.target.value) || 2;
                this.renderRooms();
            });
        }

        // Sorting change
        if (this.sortSelect) {
            this.sortSelect.addEventListener("change", (e) => {
                this.currentSort = e.target.value;
                this.renderRooms();
            });
        }

        // Filter pills (Category filter)
        if (this.typeFiltersContainer) {
            this.typeFiltersContainer.addEventListener("click", (e) => {
                const btn = e.target.closest(".filter-pill");
                if (!btn) return;
                this.typeFiltersContainer.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
                btn.classList.add("active");
                this.currentFilterType = btn.dataset.type;
                this.renderRooms();
            });
        }

        // Close modals on buttons or backdrop
        if (this.closeCheckoutBtn) {
            this.closeCheckoutBtn.addEventListener("click", () => this.closeCheckoutModal());
        }
        if (this.checkoutModal) {
            this.checkoutModal.addEventListener("click", (e) => {
                if (e.target === this.checkoutModal) this.closeCheckoutModal();
            });
        }

        if (this.closeVoucherBtn) {
            this.closeVoucherBtn.addEventListener("click", () => this.closeVoucherModal());
        }
        if (this.voucherModal) {
            this.voucherModal.addEventListener("click", (e) => {
                if (e.target === this.voucherModal) this.closeVoucherModal();
            });
        }

        if (this.closeDetailsBtn) {
            this.closeDetailsBtn.addEventListener("click", () => this.closeDetailsModal());
        }
        if (this.detailsModal) {
            this.detailsModal.addEventListener("click", (e) => {
                if (e.target === this.detailsModal) this.closeDetailsModal();
            });
        }

        if (this.closeMyBookingsBtn) {
            this.closeMyBookingsBtn.addEventListener("click", () => this.closeMyBookingsModal());
        }
        if (this.myBookingsModal) {
            this.myBookingsModal.addEventListener("click", (e) => {
                if (e.target === this.myBookingsModal) this.closeMyBookingsModal();
            });
        }

        // Confirm Booking Submission
        if (this.confirmBookingBtn) {
            this.confirmBookingBtn.addEventListener("click", () => this.processBookingConfirmation());
        }
    }

    formatDateForInput(date) {
        const d = new Date(date);
        let month = "" + (d.getMonth() + 1);
        let day = "" + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = "0" + month;
        if (day.length < 2) day = "0" + day;

        return [year, month, day].join("-");
    }

    syncDateInputs() {
        if (this.checkInInput) {
            this.checkInInput.value = this.checkInDate;
            this.checkInInput.min = this.formatDateForInput(new Date());
        }
        if (this.checkOutInput) {
            this.checkOutInput.value = this.checkOutDate;
            this.checkOutInput.min = this.checkInDate;
        }
        this.updateNightsCalculation();
    }

    handleDateChange() {
        const inVal = this.checkInInput.value;
        const outVal = this.checkOutInput.value;

        if (new Date(outVal) <= new Date(inVal)) {
            // Automatically advance check-out by 1 day
            const nextDay = new Date(inVal);
            nextDay.setDate(nextDay.getDate() + 1);
            this.checkOutDate = this.formatDateForInput(nextDay);
            this.checkOutInput.value = this.checkOutDate;
        } else {
            this.checkOutDate = outVal;
        }

        this.checkInDate = inVal;
        this.checkOutInput.min = this.checkInDate;
        this.updateNightsCalculation();
        this.renderRooms();
    }

    updateNightsCalculation() {
        const inDate = new Date(this.checkInDate);
        const outDate = new Date(this.checkOutDate);
        const diffTime = Math.abs(outDate - inDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        this.calculatedNights = Math.max(1, diffDays);

        if (this.nightsBadge) {
            this.nightsBadge.innerHTML = `<i class="fas fa-moon"></i> ${this.calculatedNights} Night${this.calculatedNights > 1 ? "s" : ""}`;
        }
    }

    findRoom(roomId) {
        if (!roomId) return (this.rooms && this.rooms[0]) || (window.ROOMS_DATA && window.ROOMS_DATA[0]) || null;
        const normalized = String(roomId).trim().toLowerCase();

        // 1. Try exact ID or name in loaded rooms
        let found = (this.rooms || []).find(r => 
            String(r.id || "").toLowerCase() === normalized || 
            String(r.room_type || "").toLowerCase() === normalized ||
            String(r.name || "").toLowerCase() === normalized
        );
        if (found) return found;

        // 2. Try partial match in loaded rooms
        found = (this.rooms || []).find(r => 
            String(r.id || "").toLowerCase().includes(normalized) ||
            normalized.includes(String(r.id || "").toLowerCase()) ||
            String(r.name || "").toLowerCase().includes(normalized) ||
            normalized.includes(String(r.name || "").toLowerCase()) ||
            String(r.typeName || "").toLowerCase().includes(normalized)
        );
        if (found) return found;

        // 3. Fallback to ROOMS_DATA
        found = (window.ROOMS_DATA || []).find(r => 
            String(r.id || "").toLowerCase() === normalized || 
            String(r.name || "").toLowerCase() === normalized ||
            String(r.typeName || "").toLowerCase() === normalized
        );
        if (found) return found;

        // 4. Default to first room
        return (this.rooms && this.rooms[0]) || (window.ROOMS_DATA && window.ROOMS_DATA[0]) || null;
    }

    filterAndSortRooms() {
        let list = [...this.rooms];

        // Filter by Room Type
        if (this.currentFilterType !== "all") {
            list = list.filter(r => r.type === this.currentFilterType);
        }

        // Filter by capacity
        if (this.guestCount > 0) {
            list = list.filter(r => r.capacity >= this.guestCount);
        }

        // Sorting
        if (this.currentSort === "price-low") {
            list.sort((a, b) => a.pricePerNight - b.pricePerNight);
        } else if (this.currentSort === "price-high") {
            list.sort((a, b) => b.pricePerNight - a.pricePerNight);
        } else if (this.currentSort === "rating") {
            list.sort((a, b) => b.rating - a.rating);
        } else {
            // Recommended default
            list.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
        }

        return list;
    }

    renderRooms() {
        if (!this.roomGrid) return;

        const filtered = this.filterAndSortRooms();

        if (filtered.length === 0) {
            this.roomGrid.innerHTML = `
                <div class="no-rooms-message">
                    <i class="fas fa-bed"></i>
                    <h3>No suites match your specific filters</h3>
                    <p>Try reducing guest count or clearing your category filters to view more available suites.</p>
                    <button class="btn btn-primary" onclick="window.booking.resetFilters()">Reset All Filters</button>
                </div>
            `;
            return;
        }

        this.roomGrid.innerHTML = filtered.map(room => {
            const totalPrice = (room.pricePerNight || 195) * this.calculatedNights;
            const amenities = Array.isArray(room.amenities) && room.amenities.length > 0
                ? room.amenities
                : ["High-Speed Wi-Fi 6", "Ocean View Balcony", "24/7 Room Service"];

            return `
                <div class="room-card card-hover-effect">
                    <div class="room-card-img-wrap">
                        <img src="${room.image || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80'}" alt="${room.name}" loading="lazy">
                        ${room.popular ? `<span class="room-badge badge-popular"><i class="fas fa-crown"></i> Exclusive</span>` : ""}
                        <span class="room-type-tag">${room.typeName || room.room_type || 'Luxury Suite'}</span>
                        <div class="room-availability"><i class="fas fa-check-circle"></i> Available</div>
                    </div>
                    
                    <div class="room-card-body">
                        <div class="room-card-header">
                            <h3 class="room-title">${room.name}</h3>
                            <div class="room-rating">
                                <i class="fas fa-star text-gold"></i>
                                <span>${room.rating || 4.9}</span>
                                <small class="text-muted">(${room.reviews || 215})</small>
                            </div>
                        </div>

                        <div class="room-specs">
                            <span title="Max Capacity"><i class="fas fa-user-friends"></i> Up to ${room.capacity || 2} Guests</span>
                            <span title="Bed Configuration"><i class="fas fa-bed"></i> ${room.bedType || '1 King Bed'}</span>
                            <span title="Room Area"><i class="fas fa-ruler-combined"></i> ${room.roomSize || '580 sq.ft'}</span>
                        </div>

                        <p class="room-desc">${(room.description || '').slice(0, 115)}...</p>

                        <div class="room-amenity-tags">
                            ${amenities.slice(0, 3).map(a => `<span class="amenity-pill"><i class="fas fa-check"></i> ${a}</span>`).join("")}
                            ${amenities.length > 3 ? `<span class="amenity-more">+${amenities.length - 3} more</span>` : ""}
                        </div>

                        <div class="room-card-footer">
                            <div class="room-pricing">
                                <div class="price-rate">
                                    <span class="currency">₹</span><span class="amount">${room.pricePerNight}</span>
                                    <span class="period">/ night</span>
                                </div>
                                <div class="total-calc-hint">
                                    Total: <strong>${this.formatCurrency(totalPrice)}</strong> for ${this.calculatedNights} night${this.calculatedNights > 1 ? "s" : ""}
                                </div>
                            </div>

                            <div class="room-actions">
                                <button class="btn btn-outline-secondary btn-sm" onclick="window.booking.openRoomDetails('${room.id}')">
                                    <i class="fas fa-info-circle"></i> Details
                                </button>
                                <button class="btn btn-gold btn-sm" onclick="window.booking.startBooking('${room.id}')">
                                    <i class="fas fa-calendar-check"></i> Book Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    resetFilters() {
        this.currentFilterType = "all";
        this.guestCount = 1;
        this.currentSort = "recommended";
        if (this.guestCountSelect) this.guestCountSelect.value = "1";
        if (this.sortSelect) this.sortSelect.value = "recommended";
        if (this.typeFiltersContainer) {
            this.typeFiltersContainer.querySelectorAll(".filter-pill").forEach((p, idx) => {
                if (idx === 0) p.classList.add("active");
                else p.classList.remove("active");
            });
        }
        this.renderRooms();
    }

    openRoomDetails(roomId) {
        const room = this.findRoom(roomId);
        if (!room || !this.detailsModal) return;

        const titleEl = document.getElementById("detailModalTitle");
        const typeEl = document.getElementById("detailModalType");
        const imgEl = document.getElementById("detailModalHeroImg");
        const priceEl = document.getElementById("detailModalPrice");
        const ratingEl = document.getElementById("detailModalRating");
        const reviewsEl = document.getElementById("detailModalReviews");
        const sizeEl = document.getElementById("detailModalSize");
        const capEl = document.getElementById("detailModalCapacity");
        const bedEl = document.getElementById("detailModalBed");
        const descEl = document.getElementById("detailModalDesc");

        if (titleEl) titleEl.textContent = room.name;
        if (typeEl) typeEl.textContent = room.typeName || room.room_type || "Luxury Suite";
        if (imgEl && room.image) imgEl.src = room.image;
        if (priceEl) priceEl.textContent = this.formatCurrency(room.pricePerNight);
        if (ratingEl) ratingEl.textContent = room.rating || "4.9";
        if (reviewsEl) reviewsEl.textContent = `(${room.reviews || 215} verified guest reviews)`;
        if (sizeEl) sizeEl.textContent = room.roomSize || "580 sq.ft";
        if (capEl) capEl.textContent = `${room.capacity || 2} Guests`;
        if (bedEl) bedEl.textContent = room.bedType || "1 California King Bed";
        if (descEl) descEl.textContent = room.description || "";

        // Amenities list (safely handles any array or missing amenities)
        const amenities = Array.isArray(room.amenities) && room.amenities.length > 0
            ? room.amenities
            : ["Panoramic Ocean/Skyline View", "High-Speed Wi-Fi 6", "24/7 Room Service", "Luxury Marble Bath", "Smart Room Automation"];

        const amenitiesEl = document.getElementById("detailModalAmenities");
        if (amenitiesEl) {
            amenitiesEl.innerHTML = amenities.map(a => `
                <div class="detail-amenity-item">
                    <i class="fas fa-check-circle text-gold"></i>
                    <span>${a}</span>
                </div>
            `).join("");
        }

        // Action button inside details modal
        const bookBtn = document.getElementById("detailModalBookBtn");
        if (bookBtn) {
            bookBtn.onclick = () => {
                this.closeDetailsModal();
                this.startBooking(room.id);
            };
        }

        this.detailsModal.classList.add("active");
        document.body.classList.add("modal-open");
    }

    closeDetailsModal() {
        if (!this.detailsModal) return;
        this.detailsModal.classList.remove("active");
        document.body.classList.remove("modal-open");
    }

    startBooking(roomId) {
        const room = this.findRoom(roomId);
        if (!room) return;
        this.selectedRoom = room;

        const currentUser = window.db.getCurrentUser();
        if (!currentUser) {
            this.pendingBookingRoomId = room.id;
            if (window.auth && typeof window.auth.openModal === "function") {
                window.auth.openModal("login");
            }
            if (window.app && typeof window.app.showToast === "function") {
                window.app.showToast(`Please sign in or click Demo Guest Login to reserve ${room.name}.`, "info");
            }
            return;
        }

        // Populate Checkout Modal info
        const nameEl = document.getElementById("checkoutRoomName");
        const imgEl = document.getElementById("checkoutRoomImage");
        const datesEl = document.getElementById("checkoutDatesSummary");
        const guestsEl = document.getElementById("checkoutGuestsSummary");

        if (nameEl) nameEl.textContent = room.name;
        if (imgEl && room.image) imgEl.src = room.image;
        if (datesEl) datesEl.textContent = `${this.checkInDate} to ${this.checkOutDate} (${this.calculatedNights} nights)`;
        if (guestsEl) guestsEl.textContent = `${this.guestCount} Guest(s)`;

        // Pre-fill Guest details
        const nameInput = document.getElementById("checkoutGuestName");
        const emailInput = document.getElementById("checkoutGuestEmail");
        const phoneInput = document.getElementById("checkoutGuestPhone");

        if (nameInput) nameInput.value = currentUser.fullName || currentUser.guest_name || "";
        if (emailInput) emailInput.value = currentUser.email || "";
        if (phoneInput) phoneInput.value = currentUser.phone || currentUser.mobile_number || "";

        // Render Addons with live total calculation
        this.renderAddonsList();
        this.recalculateCheckoutBill();

        if (this.checkoutModal) {
            this.checkoutModal.classList.add("active");
            document.body.classList.add("modal-open");
        }
    }

    closeCheckoutModal() {
        if (!this.checkoutModal) return;
        this.checkoutModal.classList.remove("active");
        document.body.classList.remove("modal-open");
    }

    renderAddonsList() {
        if (!this.addonsContainer) return;

        this.addonsContainer.innerHTML = this.addons.map(addon => {
            const isChecked = this.selectedAddons.has(addon.id) ? "checked" : "";
            let priceLabel = `₹${addon.price}`;
            if (addon.priceType === "per_guest_per_day") {
                priceLabel = `₹${addon.price} / guest / night`;
            } else if (addon.priceType === "per_guest") {
                priceLabel = `₹${addon.price} / guest`;
            } else {
                priceLabel = `₹${addon.price} (flat)`;
            }

            return `
                <label class="addon-card-label ${isChecked ? "selected" : ""}" for="addon_${addon.id}">
                    <div class="addon-left">
                        <input type="checkbox" id="addon_${addon.id}" class="addon-checkbox" 
                               value="${addon.id}" ${isChecked} 
                               onchange="window.booking.toggleAddon('${addon.id}', this.checked)">
                        <div class="addon-icon"><i class="${addon.icon}"></i></div>
                        <div class="addon-details">
                            <span class="addon-name">${addon.name}</span>
                            <span class="addon-desc">${addon.description}</span>
                        </div>
                    </div>
                    <div class="addon-price">${priceLabel}</div>
                </label>
            `;
        }).join("");
    }

    toggleAddon(addonId, isChecked) {
        if (isChecked) {
            this.selectedAddons.add(addonId);
        } else {
            this.selectedAddons.delete(addonId);
        }
        this.renderAddonsList();
        this.recalculateCheckoutBill();
    }

    calculateAddonTotal(addon) {
        if (addon.priceType === "per_guest_per_day") {
            return addon.price * this.guestCount * this.calculatedNights;
        } else if (addon.priceType === "per_guest") {
            return addon.price * this.guestCount;
        }
        return addon.price; // flat
    }

    recalculateCheckoutBill() {
        if (!this.selectedRoom) return;

        const baseFare = this.selectedRoom.pricePerNight * this.calculatedNights;

        let addonsTotal = 0;
        this.selectedAddons.forEach(addonId => {
            const addon = this.addons.find(a => a.id === addonId);
            if (addon) {
                addonsTotal += this.calculateAddonTotal(addon);
            }
        });

        const subtotal = baseFare + addonsTotal;
        const taxes = Math.round(subtotal * 0.12 * 100) / 100; // 12% luxury hotel tax
        const total = subtotal + taxes;

        // Update DOM breakdown
        document.getElementById("billBaseRate").textContent = `₹${this.selectedRoom.pricePerNight} × ${this.calculatedNights} nights`;
        document.getElementById("billBaseAmount").textContent = this.formatCurrency(baseFare);
        document.getElementById("billAddonsAmount").textContent = this.formatCurrency(addonsTotal);
        document.getElementById("billTaxesAmount").textContent = this.formatCurrency(taxes);
        document.getElementById("billTotalAmount").textContent = this.formatCurrency(total);
    }

    async processBookingConfirmation() {
        const currentUser = window.db.getCurrentUser();
        if (!currentUser || !this.selectedRoom) return;

        const baseFare = this.selectedRoom.pricePerNight * this.calculatedNights;
        const selectedAddonsData = [];
        let addonsTotal = 0;

        this.selectedAddons.forEach(addonId => {
            const addon = this.addons.find(a => a.id === addonId);
            if (addon) {
                const cost = this.calculateAddonTotal(addon);
                addonsTotal += cost;
                selectedAddonsData.push({
                    id: addon.id,
                    name: addon.name,
                    cost: cost
                });
            }
        });

        const subtotal = baseFare + addonsTotal;
        const taxes = Math.round(subtotal * 0.12 * 100) / 100;
        const total = subtotal + taxes;
        const specialRequests = document.getElementById("checkoutSpecialRequests")?.value || "";

        // Construct booking payload
        const assignedRoomNo = this.selectedRoom.availableRoomNumbers && this.selectedRoom.availableRoomNumbers.length > 0
            ? this.selectedRoom.availableRoomNumbers[0]
            : null;

        const payload = {
            userId: currentUser.userId || currentUser.id,
            guest_id: currentUser.guest_id || currentUser.userId || currentUser.id,
            guestName: currentUser.fullName || currentUser.guest_name,
            guest_name: currentUser.fullName || currentUser.guest_name,
            guestEmail: currentUser.email,
            guestPhone: currentUser.phone || currentUser.mobile_number,
            roomId: this.selectedRoom.id,
            roomName: this.selectedRoom.name || this.selectedRoom.room_type,
            roomType: this.selectedRoom.room_type || this.selectedRoom.typeName || this.selectedRoom.name,
            roomNumberAssigned: assignedRoomNo,
            room_no: assignedRoomNo,
            roomImage: this.selectedRoom.image,
            checkIn: this.checkInDate,
            checkOut: this.checkOutDate,
            nights: this.calculatedNights,
            guests: this.guestCount,
            pricePerNight: this.selectedRoom.pricePerNight,
            addons: selectedAddonsData,
            specialRequests: specialRequests,
            subtotal: subtotal,
            taxes: taxes,
            total: total
        };

        try {
            const confirmedBooking = await window.api.createBooking(payload);

            // Close checkout modal and show voucher
            this.closeCheckoutModal();
            this.showConfirmationVoucher(confirmedBooking);
            window.app.showToast(`🎉 Reservation ${confirmedBooking.bookingId} confirmed in PostgreSQL!`, "success");
        } catch (err) {
            window.app.showToast(`Booking error: ${err.message}`, "danger");
        }
    }

    showConfirmationVoucher(booking) {
        if (!this.voucherModal) return;

        const refEl = document.getElementById("voucherRefNumber");
        const guestNameEl = document.getElementById("voucherGuestName");
        const roomNameEl = document.getElementById("voucherRoomName");
        const checkInEl = document.getElementById("voucherCheckIn");
        const checkOutEl = document.getElementById("voucherCheckOut");
        const nightsEl = document.getElementById("voucherNights");
        const guestsEl = document.getElementById("voucherGuests");
        const totalEl = document.getElementById("voucherTotalPaid");

        if (refEl) refEl.textContent = booking.bookingId;
        if (guestNameEl) guestNameEl.textContent = booking.guestName;
        if (roomNameEl) roomNameEl.textContent = booking.roomName;
        if (checkInEl) checkInEl.textContent = booking.checkIn;
        if (checkOutEl) checkOutEl.textContent = booking.checkOut;
        if (nightsEl) nightsEl.textContent = `${booking.nights} Night(s)`;
        if (guestsEl) guestsEl.textContent = `${booking.guests} Guest(s)`;
        if (totalEl) totalEl.textContent = this.formatCurrency(booking.total);

        // Addons list in voucher
        const addonsListEl = document.getElementById("voucherAddonsList");
        if (addonsListEl) {
            if (booking.addons && booking.addons.length > 0) {
                addonsListEl.innerHTML = booking.addons.map(a => `<li>${a.name} (₹${a.cost.toFixed(2)})</li>`).join("");
            } else {
                addonsListEl.innerHTML = `<li class="text-muted">Standard stay (No extra add-on services)</li>`;
            }
        }

        this.voucherModal.classList.add("active");
        document.body.classList.add("modal-open");
    }

    closeVoucherModal() {
        if (!this.voucherModal) return;
        this.voucherModal.classList.remove("active");
        document.body.classList.remove("modal-open");
    }

    async openMyBookings() {
        const currentUser = window.db.getCurrentUser();
        if (!currentUser) {
            window.auth.openModal("login");
            return;
        }

        const container = document.getElementById("myBookingsListContainer");
        if (container) {
            container.innerHTML = `<div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin text-gold" style="font-size: 2rem;"></i><p style="margin-top: 0.5rem; color: var(--text-muted);">Loading bookings from database...</p></div>`;
        }

        if (this.myBookingsModal) {
            this.myBookingsModal.classList.add("active");
            document.body.classList.add("modal-open");
        }

        try {
            const bookings = await window.api.getUserBookings(currentUser.userId || currentUser.id);

            if (container) {
                if (bookings.length === 0) {
                    container.innerHTML = `
                        <div class="empty-bookings-notice">
                            <i class="fas fa-calendar-times"></i>
                            <h4>No reservations found</h4>
                            <p>You haven't made any reservations yet. Browse our luxury suites to book your first getaway!</p>
                            <button class="btn btn-gold btn-sm" onclick="window.booking.closeMyBookingsModal(); window.app.switchToBookingView();">
                                Explore Available Suites
                            </button>
                        </div>
                    `;
                } else {
                    container.innerHTML = bookings.map(b => {
                        const isCancelled = b.status === "Cancelled";
                        return `
                            <div class="my-booking-card ${isCancelled ? "is-cancelled" : ""}">
                                <div class="booking-card-top">
                                    <div>
                                        <span class="booking-id-tag">${b.bookingId}</span>
                                        <span class="booking-status-badge ${isCancelled ? "badge-cancelled" : "badge-confirmed"}">
                                            <i class="fas ${isCancelled ? "fa-ban" : "fa-check-circle"}"></i> ${b.status}
                                        </span>
                                    </div>
                                    <div class="booking-total-amount">${this.formatCurrency(b.total)}</div>
                                </div>
                                <div class="booking-card-body">
                                    <h4>${b.roomName}</h4>
                                    <div class="booking-meta-row">
                                        <span><i class="fas fa-calendar-alt text-gold"></i> ${b.checkIn} → ${b.checkOut} (${b.nights} nights)</span>
                                        <span><i class="fas fa-user-friends text-gold"></i> ${b.guests} Guests</span>
                                    </div>
                                    ${b.addons && b.addons.length > 0 ? `
                                        <div class="booking-addons-preview">
                                            <small><strong>Add-ons:</strong> ${b.addons.map(a => a.name).join(", ")}</small>
                                        </div>
                                    ` : ""}
                                </div>
                                <div class="booking-card-actions">
                                    <button class="btn btn-outline-secondary btn-sm" onclick="window.booking.reViewVoucher('${b.bookingId}')">
                                        <i class="fas fa-receipt"></i> View Voucher
                                    </button>
                                    ${!isCancelled ? `
                                        <button class="btn btn-outline-danger btn-sm" onclick="window.booking.cancelUserBooking('${b.bookingId}')">
                                            <i class="fas fa-times"></i> Cancel Reservation
                                        </button>
                                    ` : `<span class="cancelled-tag text-muted"><i class="fas fa-info-circle"></i> Reservation Cancelled</span>`}
                                </div>
                            </div>
                        `;
                    }).join("");
                }
            }
        } catch (err) {
            if (container) {
                container.innerHTML = `<div class="empty-bookings-notice"><p class="text-danger">Failed to load bookings: ${err.message}</p></div>`;
            }
        }
    }

    closeMyBookingsModal() {
        if (!this.myBookingsModal) return;
        this.myBookingsModal.classList.remove("active");
        document.body.classList.remove("modal-open");
    }

    reViewVoucher(bookingId) {
        const bookings = window.db.getBookings();
        const found = bookings.find(b => b.bookingId === bookingId);
        if (found) {
            this.closeMyBookingsModal();
            this.showConfirmationVoucher(found);
        }
    }

    async cancelUserBooking(bookingId) {
        const currentUser = window.db.getCurrentUser();
        if (!currentUser) return;

        if (confirm(`Are you sure you want to cancel reservation ${bookingId}?`)) {
            try {
                await window.api.cancelBooking(bookingId, currentUser.userId || currentUser.id);
                window.app.showToast(`Reservation ${bookingId} has been cancelled in PostgreSQL.`, "info");
                this.openMyBookings(); // refresh list
            } catch (err) {
                window.app.showToast(err.message, "danger");
            }
        }
    }
}

window.BookingManager = BookingManager;
