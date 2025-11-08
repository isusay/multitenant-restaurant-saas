import { db } from "./index";
import { user } from "./schema/auth";
import {
    restaurant,
    restaurantUser,
    restaurantTable,
    menuCategory,
    menuItem
} from "./schema/restaurant";
import { eq } from "drizzle-orm";

async function seed() {
    console.log("🌱 Starting database seeding...");

    try {
        // Create sample users
        const [superAdminUser] = await db.insert(user).values([
            {
                id: "super-admin-001",
                name: "Super Admin",
                email: "admin@saas-platform.com",
                emailVerified: true,
            }
        ]).returning();

        const [restaurantOwnerUser] = await db.insert(user).values([
            {
                id: "owner-001",
                name: "Restaurant Owner",
                email: "owner@restaurant.com",
                emailVerified: true,
            }
        ]).returning();

        // Create sample restaurant
        const [sampleRestaurant] = await db.insert(restaurant).values([
            {
                id: "restaurant-001",
                name: "Warung Nusantara",
                description: "Restoran masakan Indonesia autentik dengan suasana yang nyaman",
                address: "Jl. Sudirman No. 123, Jakarta Pusat",
                phone: "+62-21-1234-5678",
                email: "info@warungnusantara.com",
                currency: "IDR",
                timezone: "Asia/Jakarta",
                isActive: true,
                subscriptionPlan: "premium",
                subscriptionStatus: "active",
                settings: {
                    theme: "traditional",
                    autoAcceptOrders: false,
                    preparationTimeBuffer: 5,
                    taxRate: 0.1,
                    serviceChargeRate: 0.05
                }
            }
        ]).returning();

        // Assign users to restaurant
        await db.insert(restaurantUser).values([
            {
                id: "restaurant-user-001",
                userId: restaurantOwnerUser.id,
                restaurantId: sampleRestaurant.id,
                role: "owner",
                isActive: true,
                permissions: ["manage_menu", "manage_staff", "view_analytics", "manage_settings"]
            }
        ]);

        // Create sample staff users
        const [waiterUser] = await db.insert(user).values([
            {
                id: "waiter-001",
                name: "Ahmad Pelayan",
                email: "ahmad@restaurant.com",
                emailVerified: true,
            }
        ]).returning();

        const [kitchenUser] = await db.insert(user).values([
            {
                id: "kitchen-001",
                name: "Budi Koki",
                email: "budi@restaurant.com",
                emailVerified: true,
            }
        ]).returning();

        const [cashierUser] = await db.insert(user).values([
            {
                id: "cashier-001",
                name: "Siti Kasir",
                email: "siti@restaurant.com",
                emailVerified: true,
            }
        ]).returning();

        // Assign staff to restaurant
        await db.insert(restaurantUser).values([
            {
                id: "restaurant-user-002",
                userId: waiterUser.id,
                restaurantId: sampleRestaurant.id,
                role: "waiter",
                isActive: true,
                permissions: ["view_orders", "update_order_status"]
            },
            {
                id: "restaurant-user-003",
                userId: kitchenUser.id,
                restaurantId: sampleRestaurant.id,
                role: "kitchen",
                isActive: true,
                permissions: ["view_orders", "update_item_status"]
            },
            {
                id: "restaurant-user-004",
                userId: cashierUser.id,
                restaurantId: sampleRestaurant.id,
                role: "cashier",
                isActive: true,
                permissions: ["view_orders", "process_payments", "view_reports"]
            }
        ]);

        // Create restaurant tables
        const tables = await db.insert(restaurantTable).values([
            { id: "table-001", restaurantId: sampleRestaurant.id, tableNumber: "T01", capacity: 4, qrCode: "qr-table-001" },
            { id: "table-002", restaurantId: sampleRestaurant.id, tableNumber: "T02", capacity: 4, qrCode: "qr-table-002" },
            { id: "table-003", restaurantId: sampleRestaurant.id, tableNumber: "T03", capacity: 2, qrCode: "qr-table-003" },
            { id: "table-004", restaurantId: sampleRestaurant.id, tableNumber: "T04", capacity: 6, qrCode: "qr-table-004" },
            { id: "table-005", restaurantId: sampleRestaurant.id, tableNumber: "T05", capacity: 4, qrCode: "qr-table-005" },
            { id: "table-006", restaurantId: sampleRestaurant.id, tableNumber: "T06", capacity: 8, qrCode: "qr-table-006" },
            { id: "table-007", restaurantId: sampleRestaurant.id, tableNumber: "T07", capacity: 4, qrCode: "qr-table-007" },
            { id: "table-008", restaurantId: sampleRestaurant.id, tableNumber: "T08", capacity: 2, qrCode: "qr-table-008" },
        ]).returning();

        // Create menu categories
        const [appetizerCategory] = await db.insert(menuCategory).values([
            {
                id: "category-001",
                restaurantId: sampleRestaurant.id,
                name: "Appetizer",
                description: "Makanan pembuka yang menggugah selera",
                displayOrder: 1,
                isActive: true
            }
        ]).returning();

        const [mainCourseCategory] = await db.insert(menuCategory).values([
            {
                id: "category-002",
                restaurantId: sampleRestaurant.id,
                name: "Main Course",
                description: "Hidangan utama pilihan terbaik",
                displayOrder: 2,
                isActive: true
            }
        ]).returning();

        const [beverageCategory] = await db.insert(menuCategory).values([
            {
                id: "category-003",
                restaurantId: sampleRestaurant.id,
                name: "Minuman",
                description: "Minuman segar dan menyegarkan",
                displayOrder: 3,
                isActive: true
            }
        ]).returning();

        const [dessertCategory] = await db.insert(menuCategory).values([
            {
                id: "category-004",
                restaurantId: sampleRestaurant.id,
                name: "Dessert",
                description: "Hidangan penutup yang manis dan lezat",
                displayOrder: 4,
                isActive: true
            }
        ]).returning();

        // Create menu items
        await db.insert(menuItem).values([
            // Appetizers
            {
                id: "menu-001",
                restaurantId: sampleRestaurant.id,
                categoryId: appetizerCategory.id,
                name: "Bakso Urat",
                description: "Bakso dengan daging sapi pilihan dan urat yang kenyal",
                price: "25000.00",
                ingredients: ["daging sapi", "urat", "tepung tapioka", "bawang merah", "bawang putih"],
                allergens: ["gluten"],
                spicyLevel: 1,
                isAvailable: true,
                isRecommended: true,
                preparationTime: 15,
                displayOrder: 1
            },
            {
                id: "menu-002",
                restaurantId: sampleRestaurant.id,
                categoryId: appetizerCategory.id,
                name: "Sate Ayam Madura",
                description: "Sate ayam dengan bumbu kacang khas Madura",
                price: "35000.00",
                ingredients: ["daging ayam", "bumbu kacang", "kecap manis", "cabai"],
                allergens: ["peanut"],
                spicyLevel: 2,
                isAvailable: true,
                isRecommended: true,
                preparationTime: 20,
                displayOrder: 2
            },
            // Main Courses
            {
                id: "menu-003",
                restaurantId: sampleRestaurant.id,
                categoryId: mainCourseCategory.id,
                name: "Nasi Goreng Spesial",
                description: "Nasi goreng dengan ayam, udang, dan telur mata sapi",
                price: "45000.00",
                ingredients: ["nasi", "ayam", "udang", "telur", "bawang merah", "bawang putih", "kecap", "cabai"],
                allergens: ["seafood", "egg"],
                spicyLevel: 3,
                isAvailable: true,
                isRecommended: true,
                preparationTime: 25,
                displayOrder: 1
            },
            {
                id: "menu-004",
                restaurantId: sampleRestaurant.id,
                categoryId: mainCourseCategory.id,
                name: "Rendang Padang",
                description: "Rendang daging sapi empuk dengan bumbu rempah khas Padang",
                price: "75000.00",
                ingredients: ["daging sapi", "santan", "cabai merah", "jahe", "serai", "daun jeruk"],
                allergens: ["coconut"],
                spicyLevel: 4,
                isAvailable: true,
                isRecommended: true,
                preparationTime: 45,
                displayOrder: 2
            },
            {
                id: "menu-005",
                restaurantId: sampleRestaurant.id,
                categoryId: mainCourseCategory.id,
                name: "Ayam Bakar Taliwang",
                description: "Ayam bakar dengan bumbu khas Lombok yang pedas dan gurih",
                price: "55000.00",
                ingredients: ["ayam", "cabai", "terasi", "kencur", "serai", "gula merah"],
                allergens: [],
                spicyLevel: 5,
                isAvailable: true,
                isRecommended: false,
                preparationTime: 30,
                displayOrder: 3
            },
            // Beverages
            {
                id: "menu-006",
                restaurantId: sampleRestaurant.id,
                categoryId: beverageCategory.id,
                name: "Es Teh Manis",
                description: "Teh manis dingin yang segar",
                price: "8000.00",
                ingredients: ["teh", "gula", "es batu"],
                allergens: [],
                spicyLevel: 0,
                isAvailable: true,
                isRecommended: false,
                preparationTime: 5,
                displayOrder: 1
            },
            {
                id: "menu-007",
                restaurantId: sampleRestaurant.id,
                categoryId: beverageCategory.id,
                name: "Es Jeruk",
                description: "Juice jeruk segar tanpa pemanis tambahan",
                price: "15000.00",
                ingredients: ["jeruk", "es batu", "madu"],
                allergens: [],
                spicyLevel: 0,
                isAvailable: true,
                isRecommended: true,
                preparationTime: 5,
                displayOrder: 2
            },
            {
                id: "menu-008",
                restaurantId: sampleRestaurant.id,
                categoryId: beverageCategory.id,
                name: "Jus Alpukat",
                description: "Jus alpukat creamy dengan susu dan madu",
                price: "20000.00",
                ingredients: ["alpukat", "susu", "madu", "es batu"],
                allergens: ["milk"],
                spicyLevel: 0,
                isAvailable: true,
                isRecommended: true,
                preparationTime: 8,
                displayOrder: 3
            },
            // Desserts
            {
                id: "menu-009",
                restaurantId: sampleRestaurant.id,
                categoryId: dessertCategory.id,
                name: "Es Campur",
                description: "Campuran buah-buahan segar dengan kelapa muda dan es krim",
                price: "25000.00",
                ingredients: ["kelapa muda", "nangka", "nanas", "kacang merah", "susu kental manis", "es krim vanila"],
                allergens: ["milk"],
                spicyLevel: 0,
                isAvailable: true,
                isRecommended: true,
                preparationTime: 10,
                displayOrder: 1
            },
            {
                id: "menu-010",
                restaurantId: sampleRestaurant.id,
                categoryId: dessertCategory.id,
                name: "Klepon",
                description: "Kue tradisional dengan isian gula merah dan kelapa parut",
                price: "15000.00",
                ingredients: ["tepung ketan", "gula merah", "kelapa parut", "pandan"],
                allergens: ["gluten"],
                spicyLevel: 0,
                isAvailable: true,
                isRecommended: false,
                preparationTime: 15,
                displayOrder: 2
            }
        ]);

        console.log("✅ Database seeding completed successfully!");
        console.log("📊 Created:");
        console.log(`   - 1 Restaurant: ${sampleRestaurant.name}`);
        console.log(`   - 4 Users (1 owner, 1 waiter, 1 kitchen, 1 cashier)`);
        console.log(`   - 8 Restaurant tables`);
        console.log(`   - 4 Menu categories`);
        console.log(`   - 10 Menu items`);

        console.log("\n🔑 Login credentials:");
        console.log("   Super Admin: admin@saas-platform.com");
        console.log("   Restaurant Owner: owner@restaurant.com");
        console.log("   Waiter: ahmad@restaurant.com");
        console.log("   Kitchen: budi@restaurant.com");
        console.log("   Cashier: siti@restaurant.com");

    } catch (error) {
        console.error("❌ Error during seeding:", error);
        process.exit(1);
    }
}

// Run the seed function
seed().then(() => {
    console.log("🎉 Seeding process completed!");
    process.exit(0);
}).catch((error) => {
    console.error("💥 Fatal error during seeding:", error);
    process.exit(1);
});