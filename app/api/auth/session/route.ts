import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { restaurantUser, restaurant } from "@/db/schema/restaurant";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers
        });

        if (!session?.user) {
            return NextResponse.json({ user: null });
        }

        // Get user's restaurant associations
        const userRestaurants = await db.query.restaurantUser.findMany({
            where: eq(restaurantUser.userId, session.user.id),
            with: {
                restaurant: {
                    columns: {
                        id: true,
                        name: true,
                        subscriptionPlan: true,
                        subscriptionStatus: true,
                        isActive: true,
                        settings: true
                    }
                }
            }
        });

        if (userRestaurants.length === 0) {
            return NextResponse.json({
                user: session.user,
                tenant: null,
                restaurants: [],
                needsOnboarding: true
            });
        }

        // Filter to active restaurants only
        const activeRestaurants = userRestaurants.filter(ur =>
            ur.restaurant.isActive && ur.isActive
        );

        if (activeRestaurants.length === 0) {
            return NextResponse.json({
                user: session.user,
                tenant: null,
                restaurants: userRestaurants.map(ur => ({
                    ...ur.restaurant,
                    userRole: ur.role,
                    permissions: ur.permissions || [],
                    isActive: ur.isActive
                })),
                needsOnboarding: false
            });
        }

        // For now, use the first active restaurant as default
        // In a real app, you might want restaurant selection logic
        const primaryRestaurant = activeRestaurants[0];

        const tenantContext = {
            restaurantId: primaryRestaurant.restaurantId,
            userRole: primaryRestaurant.role,
            permissions: primaryRestaurant.permissions || [],
            restaurant: primaryRestaurant.restaurant
        };

        return NextResponse.json({
            user: session.user,
            tenant: tenantContext,
            restaurants: userRestaurants.map(ur => ({
                ...ur.restaurant,
                userRole: ur.role,
                permissions: ur.permissions || [],
                isActive: ur.isActive
            })),
            needsOnboarding: false
        });

    } catch (error) {
        console.error("Session error:", error);
        return NextResponse.json({ user: null }, { status: 500 });
    }
}

// Switch between restaurants for users with multiple restaurants
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { restaurantId } = await request.json();

        if (!restaurantId) {
            return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
        }

        // Check if user has access to this restaurant
        const userRestaurant = await db.query.restaurantUser.findFirst({
            where: eq(restaurantUser.userId, session.user.id),
            with: {
                restaurant: true
            }
        });

        if (!userRestaurant || userRestaurant.restaurantId !== restaurantId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (!userRestaurant.isActive || !userRestaurant.restaurant.isActive) {
            return NextResponse.json({ error: "Restaurant is not active" }, { status: 403 });
        }

        const tenantContext = {
            restaurantId: userRestaurant.restaurantId,
            userRole: userRestaurant.role,
            permissions: userRestaurant.permissions || [],
            restaurant: userRestaurant.restaurant
        };

        return NextResponse.json({
            success: true,
            tenant: tenantContext
        });

    } catch (error) {
        console.error("Restaurant switch error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}