import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { restaurantUser, restaurant } from "@/db/schema/restaurant";
import { eq } from "drizzle-orm";

// Handle restaurant owner onboarding after signup
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { restaurantId, role = "owner" } = await request.json();

        if (!restaurantId) {
            return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
        }

        // Check if restaurant exists
        const existingRestaurant = await db.query.restaurant.findFirst({
            where: eq(restaurant.id, restaurantId)
        });

        if (!existingRestaurant) {
            return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
        }

        // Check if user is already assigned to this restaurant
        const existingAssignment = await db.query.restaurantUser.findFirst({
            where: eq(restaurantUser.userId, session.user.id)
        });

        if (existingAssignment) {
            return NextResponse.json({ error: "User already assigned to a restaurant" }, { status: 400 });
        }

        // Assign user to restaurant
        await db.insert(restaurantUser).values({
            userId: session.user.id,
            restaurantId,
            role,
            isActive: true,
            permissions: getDefaultPermissions(role)
        });

        return NextResponse.json({
            success: true,
            message: "Successfully onboarded to restaurant",
            restaurant: {
                id: existingRestaurant.id,
                name: existingRestaurant.name,
                subscriptionPlan: existingRestaurant.subscriptionPlan,
                subscriptionStatus: existingRestaurant.subscriptionStatus
            }
        });

    } catch (error) {
        console.error("Onboarding error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Get default permissions based on role
function getDefaultPermissions(role: string): string[] {
    switch (role) {
        case "owner":
            return [
                "manage_menu",
                "manage_staff",
                "manage_tables",
                "view_analytics",
                "manage_settings",
                "manage_billing",
                "view_reports"
            ];
        case "admin":
            return [
                "manage_menu",
                "manage_staff",
                "manage_tables",
                "view_analytics",
                "view_reports"
            ];
        case "waiter":
            return [
                "view_orders",
                "update_order_status",
                "manage_tables"
            ];
        case "kitchen":
            return [
                "view_orders",
                "update_item_status"
            ];
        case "cashier":
            return [
                "view_orders",
                "process_payments",
                "view_reports"
            ];
        default:
            return [];
    }
}

// Handle restaurant creation during signup
export async function PUT(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const {
            name,
            description,
            address,
            phone,
            email,
            currency = "IDR",
            timezone = "Asia/Jakarta"
        } = await request.json();

        if (!name || !email) {
            return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
        }

        // Create new restaurant
        const [newRestaurant] = await db.insert(restaurant).values({
            name,
            description,
            address,
            phone,
            email,
            currency,
            timezone,
            isActive: true,
            subscriptionPlan: "trial",
            subscriptionStatus: "active",
            subscriptionEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
            settings: {
                autoAcceptOrders: false,
                taxRate: 0.1,
                serviceChargeRate: 0.05,
                currency,
                timezone
            }
        }).returning();

        // Assign user as owner
        await db.insert(restaurantUser).values({
            userId: session.user.id,
            restaurantId: newRestaurant.id,
            role: "owner",
            isActive: true,
            permissions: getDefaultPermissions("owner")
        });

        return NextResponse.json({
            success: true,
            message: "Restaurant created successfully",
            restaurant: newRestaurant
        });

    } catch (error) {
        console.error("Restaurant creation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}