// Mock Database Seed for Rooms & Hotel Specialities
// In a full DBMS setup, this data would come from the `ROOMS` and `SERVICES` SQL tables.

const HOTEL_INFO = {
    name: "The Grand Horizon Luxury Resort & Spa",
    tagline: "Where Timeless Elegance Meets Coastal Serenity",
    rating: 4.95,
    reviewsCount: 2840,
    phone: "+1 (800) 555-4726",
    email: "concierge@grandhorizonresort.com",
    address: "742 Azure Coastline Boulevard, Marina Bay",
    checkInTime: "3:00 PM",
    checkOutTime: "11:00 AM"
};

const HOTEL_SPECIALITIES = [
    {
        id: "dining",
        title: "Michelin-Star Gastronomy",
        subtitle: "3 World-Class Signature Restaurants",
        description: "Indulge in culinary artistry overseen by Master Chefs. Enjoy panoramic ocean views at our rooftop terrace, farm-to-table organic produce, and our private cellar with over 1,200 curated vintage wines.",
        icon: "fas fa-utensils",
        image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
        badge: "Fine Dining"
    },
    {
        id: "pool",
        title: "Horizon Infinity Pool & Cabanas",
        subtitle: "Temperature-Controlled Sunset Oasis",
        description: "Submerge yourself into our multi-tiered glass-edge infinity pool overlooking the ocean. Includes private poolside cabanas, chilled towel service, artisanal cocktail bar, and underwater sound system.",
        icon: "fas fa-swimming-pool",
        image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
        badge: "Panoramic Views"
    },
    {
        id: "spa",
        title: "Aura Holistic Spa & Wellness",
        subtitle: "Ancient Ayurvedic & Modern Hydrotherapy",
        description: "Rejuvenate mind, body, and spirit with bespoke thermal suites, Himalayan salt crystal rooms, steam grottos, and organic botanical massage rituals customized to your personal bio-profile.",
        icon: "fas fa-spa",
        image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
        badge: "Award Winning"
    },
    {
        id: "suites",
        title: "Smart Luxury Living Suites",
        subtitle: "Next-Gen Tech & Italian Marble Interiors",
        description: "Voice and tablet-controlled mood lighting, ambient climate scheduling, motorized blackout drapes, Bang & Olufsen acoustic systems, and en-suite jacuzzis overlooking the coastline.",
        icon: "fas fa-hotel",
        image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
        badge: "Ultra Luxury"
    },
    {
        id: "chauffeur",
        title: "Private Chauffeur & VIP Transit",
        subtitle: "Complimentary Airport Luxury Fleet",
        description: "Experience effortless travel from the moment you land. Our fleet of Rolls-Royce and Mercedes S-Class limousines with certified executive chauffeurs ensure seamless transfers and bespoke city tours.",
        icon: "fas fa-car-side",
        image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80",
        badge: "VIP Service"
    },
    {
        id: "concierge",
        title: "24/7 Royal Butler & Concierge",
        subtitle: "Personalized Hospitality Tailored to You",
        description: "From securing last-minute yacht charters and private helicopter transfers to organizing bespoke beachfront candlelight dinners, our Les Clefs d'Or concierges make every desire a reality.",
        icon: "fas fa-bell-concierge",
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
        badge: "24/7 Assistance"
    }
];

const ROOMS_DATA = [
    {
        id: "executive-skyline-suite",
        name: "Standard Skyline Suite",
        type: "standard",
        typeName: "Standard Suite",
        pricePerNight: 2000,
        rating: 4.92,
        reviews: 215,
        capacity: 1,
        bedType: "1 King Bed",
        roomSize: "580 sq.ft (54 m²)",
        image: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=80",
        gallery: [
            "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=900&q=80"
        ],
        description: "Tailored for the modern luxury traveler, this suite boasts separate living and sleeping quarters, executive ergonomic workspace, marble wet bar, and high-altitude skyline panoramas.",
        amenities: [
            "Panoramic Skyline View",
            "Executive Lounge Access",
            "Private Workstation",
            "Complimentary Mini-Bar",
            "Deep Soaking Jacuzzi",
            "Smart Home Automation",
            "Soundproofed Glass"
        ],
        popular: false,
        availableCount: 30
    },
    {
        id: "deluxe-ocean-king",
        name: "Deluxe Ocean King Suite",
        type: "deluxe",
        typeName: "Deluxe Suite",
        pricePerNight: 3500,
        rating: 4.9,
        reviews: 320,
        capacity: 2,
        bedType: "2 California King Beds",
        roomSize: "750 sq.ft (70 m²)",
        image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
        gallery: [
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=80"
        ],
        description: "Perched gracefully above the coastline, this sanctuary features floor-to-ceiling glass doors opening onto a private furnished sun deck. Handcrafted oak furnishings and Italian marble rain-shower.",
        amenities: [
            "Ocean View Balcony",
            "High-Speed Wi-Fi 6",
            "55-inch 4K OLED TV",
            "Nespresso Bar",
            "Rainfall Shower & Soaking Tub",
            "Free Gourmet Breakfast",
            "24/7 Room Service"
        ],
        popular: true,
        availableCount: 20
    },
    {
        id: "garden-wellness-deluxe",
        name: "Zen Garden Wellness Suite",
        type: "suite",
        typeName: "Wellness Suite",
        pricePerNight: 6000,
        rating: 4.88,
        reviews: 142,
        capacity: 3,
        bedType: "2 California King Beds + 1 Plush Queen Bed",
        roomSize: "820 sq.ft (76 m²)",
        image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80",
        gallery: [
            "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80"
        ],
        description: "Immerse in tranquility surrounded by botanical zen gardens and whispering bamboo water features. Includes in-room yoga mats, essential oil diffusers, and meditation veranda.",
        amenities: [
            "Botanical Garden Patio",
            "Essential Oil Aromatherapy",
            "Yoga & Meditation Kit",
            "Herbal Tea Bar",
            "Organic Bamboo Linens",
            "Walk-in Rain Shower",
            "Free Wi-Fi 6"
        ],
        popular: false,
        availableCount: 20
    }
];

const ADDON_SERVICES = [
    {
        id: "breakfast",
        name: "Gourmet Artisan Breakfast Buffet",
        price: 25,
        priceType: "per_guest_per_day",
        description: "Daily farm-fresh artisan buffet, made-to-order omelets, French pastries, and specialty coffees.",
        icon: "fas fa-coffee"
    },
    {
        id: "transfer",
        name: "VIP Airport Chauffeur Transfer (Roundtrip)",
        price: 65,
        priceType: "flat",
        description: "Meet-and-greet curbside service with private luxury Mercedes-Benz sedan.",
        icon: "fas fa-car"
    },
    {
        id: "spa_pass",
        name: "Aura Hydrotherapy & Thermal Spa Pass",
        price: 45,
        priceType: "per_guest",
        description: "Unlimited day access to Himalayan salt sauna, herbal steam baths, and heated whirlpools.",
        icon: "fas fa-spa"
    },
    {
        id: "late_checkout",
        name: "Guaranteed Late Checkout (3:00 PM)",
        price: 35,
        priceType: "flat",
        description: "Relax without rushing on your departure day with guaranteed late room access.",
        icon: "fas fa-clock"
    },
    {
        id: "champagne",
        name: "Welcome Chilled Champagne & Exotic Fruit Basket",
        price: 40,
        priceType: "flat",
        description: "Chilled French champagne on ice and seasonal tropical fruit platter awaiting your arrival.",
        icon: "fas fa-wine-glass"
    }
];

// Export to window
window.HOTEL_INFO = HOTEL_INFO;
window.HOTEL_SPECIALITIES = HOTEL_SPECIALITIES;
window.ROOMS_DATA = ROOMS_DATA;
window.ADDON_SERVICES = ADDON_SERVICES;
