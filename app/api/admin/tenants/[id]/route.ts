import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { restaurant, restaurantUser, order, menuItem, dailySales } from "@/db/schema/restaurant";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { withTenantContext, requireRole, createApiResponse } from "@/lib/api-helpers";

// Get specific restaurant details - Super Admin only
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withTenantContext(async (request: NextRequest, context: any) => {
        // Only super admin can access this endpoint
        requireRole(["super_admin"])(context);

        const restaurantId = params.id;

        const restaurantDetails = await db.query.restaurant.findFirst({
            where: eq(restaurant.id, restaurantId),
            with: {
                users: {
                    with: {
                        user: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                                createdAt: true
                            }
                        }
                    }
                }
            }
        });

        if (!restaurantDetails) {
            return NextResponse.json(
                { error: "Restaurant not found" },
                { status: 404 }
            );
        }

        // Get restaurant statistics
        const stats = await getRestaurantStats(restaurantId);

        return NextResponse.json(
            createApiResponse({
                restaurant: restaurantDetails,
                stats
            })
        );
    });
}

// Update restaurant - Super Admin only
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withTenantContext(async (request: NextRequest, context: any) => {
        // Only super admin can access this endpoint
        requireRole(["super_admin"])(context);

        const restaurantId = params.id;
        const updateData = await request.json();

        // Check if restaurant exists
        const existingRestaurant = await db.query.restaurant.findFirst({
            where: eq(restaurant.id, restaurantId)
        });

        if (!existingRestaurant) {
            return NextResponse.json(
                { error: "Restaurant not found" },
                { status: 404 }
            );
        }

        // Update restaurant
        const [updatedRestaurant] = await db
            .update(restaurant)
            .set({
                ...updateData,
                updatedAt: new Date()
            })
            .where(eq(restaurant.id, restaurantId))
            .returning();

        return NextResponse.json(
            createApiResponse(updatedRestaurant, "Restaurant updated successfully")
        );
    });
}

// Delete/Deactivate restaurant - Super Admin only
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withTenantContext(async (request: NextRequest, context: any) => {
        // Only super admin can access this endpoint
        requireRole(["super_admin"])(context);

        const restaurantId = params.id;

        // Check if restaurant exists
        const existingRestaurant = await db.query.restaurant.findFirst({
            where: eq(restaurant.id, restaurantId)
        });

        if (!existingRestaurant) {
            return NextResponse.json(
                { error: "Restaurant not found" },
                { status: 404 }
            );
        }

        // Deactivate restaurant (soft delete)
        await db
            .update(restaurant)
            .set({
                isActive: false,
                updatedAt: new Date()
            })
            .where(eq(restaurant.id, restaurantId));

        return NextResponse.json(
            createApiResponse(null, "Restaurant deactivated successfully")
        );
    });
}

// Activate/Deactivate restaurant subscription
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withTenantContext(async (request: NextRequest, context: any) => {
        // Only super admin can access this endpoint
        requireRole(["super_admin"])(context);

        const restaurantId = params.id;
        const { action, subscriptionPlan, extensionDays } = await request.json();

        // Check if restaurant exists
        const existingRestaurant = await db.query.restaurant.findFirst({
            where: eq(restaurant.id, restaurantId)
        });

        if (!existingRestaurant) {
            return NextResponse.json(
                { error: "Restaurant not found" },
                { status: 404 }
            );
        }

        let updateData: any = { updatedAt: new Date() };

        switch (action) {
            case "activate":
                updateData.subscriptionStatus = "active";
                updateData.isActive = true;
                if (extensionDays) {
                    const newEndDate = new Date();
                    newEndDate.setDate(newEndDate.getDate() + extensionDays);
                    updateData.subscriptionEndsAt = newEndDate;
                }
                break;

            case "deactivate":
                updateData.subscriptionStatus = "inactive";
                break;

            case "change_plan":
                if (!subscriptionPlan) {
                    return NextResponse.json(
                        { error: "Subscription plan is required" },
                        { status: 400 }
                    );
                }
                updateData.subscriptionPlan = subscriptionPlan;
                break;

            case "extend":
                if (!extensionDays) {
                    return NextResponse.json(
                        { error: "Extension days is required" },
                        { status: 400 }
                    );
                }
                const currentEndDate = existingRestaurant.subscriptionEndsAt || new Date();
                const newEndDate = new Date(currentEndDate);
                newEndDate.setDate(newEndDate.getDate() + extensionDays);
                updateData.subscriptionEndsAt = newEndDate;
                updateData.subscriptionStatus = "active";
                break;

            default:
                return NextResponse.json(
                    { error: "Invalid action" },
                    { status: 400 }
                );
        }

        const [updatedRestaurant] = await db
            .update(restaurant)
            .set(updateData)
            .where(eq(restaurant.id, restaurantId))
            .returning();

        return NextResponse.json(
            createApiResponse(updatedRestaurant, `Restaurant ${action}d successfully`)
        );
    });
}

// Helper function to get restaurant statistics
async function getRestaurantStats(restaurantId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get order stats
    const orderStats = await db
        .select({
            totalOrders: db.fn.count(order.id),
            totalRevenue: db.fn.sum(order.totalAmount),
            completedOrders: db.fn.count(
                db.sql<number>`case when ${order.status} = 'completed' then 1 end`
            )
        })
        .from(order)
        .where(
            and(
                eq(order.restaurantId, restaurantId),
                gte(order.createdAt, thirtyDaysAgo)
            )
        );

    // Get menu items count
    const menuItemsCount = await db
        .select({ count: db.fn.count(menuItem.id) })
        .from(menuItem)
        .where(eq(menuItem.restaurantId, restaurantId));

    // Get daily sales for last 30 days
    const dailySalesData = await db.query.dailySales.findMany({
        where: and(
            eq(dailySales.restaurantId, restaurantId),
            gte(dailySales.date, thirtyDaysAgo.toISOString().split('T')[0])
        ),
        orderBy: desc(dailySales.date),
        limit: 30
    });

    return {
        totalOrders: Number(orderStats[0]?.totalOrders || 0),
        totalRevenue: Number(orderStats[0]?.totalRevenue || 0),
        completedOrders: Number(orderStats[0]?.completedOrders || 0),
        totalMenuItems: Number(menuItemsCount[0]?.count || 0),
        dailySalesData,
        period: "last_30_days"
    };
}