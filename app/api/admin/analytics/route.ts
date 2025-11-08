import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { restaurant, restaurantUser, order, dailySales, menuItem, menuCategory } from "@/db/schema/restaurant";
import { user } from "@/db/schema/auth";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { withTenantContext, requireRole, createApiResponse } from "@/lib/api-helpers";

// Get platform analytics - Super Admin only
export async function GET(request: NextRequest) {
    return withTenantContext(async (request: NextRequest, context: any) => {
        // Only super admin can access this endpoint
        requireRole(["super_admin"])(context);

        const { searchParams } = new URL(request.url);
        const period = searchParams.get("period") || "30"; // days

        const now = new Date();
        const daysAgo = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);
        const dateFrom = daysAgo.toISOString().split('T')[0];
        const dateTo = now.toISOString().split('T')[0];

        // Get platform overview stats
        const [
            totalRestaurants,
            activeRestaurants,
            totalUsers,
            activeUsers,
            totalOrders,
            totalRevenue
        ] = await Promise.all([
            // Total restaurants
            db.select({ count: db.fn.count(restaurant.id) }).from(restaurant),

            // Active restaurants
            db.select({ count: db.fn.count(restaurant.id) })
                .from(restaurant)
                .where(eq(restaurant.isActive, true)),

            // Total users
            db.select({ count: db.fn.count(user.id) }).from(user),

            // Active users (users with active restaurant assignments)
            db.select({ count: db.fn.count(sql<string>`distinct ${restaurantUser.userId}`) })
                .from(restaurantUser)
                .where(eq(restaurantUser.isActive, true)),

            // Total orders in period
            db.select({ count: db.fn.count(order.id), revenue: db.fn.sum(order.totalAmount) })
                .from(order)
                .where(
                    and(
                        gte(order.createdAt, daysAgo),
                        eq(order.status, 'completed')
                    )
                ),

            // Platform revenue (sum of all restaurant revenues)
            db.select({ total: db.fn.sum(dailySales.totalRevenue) })
                .from(dailySales)
                .where(
                    and(
                        gte(dailySales.date, dateFrom),
                        lte(dailySales.date, dateTo)
                    )
                )
        ]);

        // Get subscription breakdown
        const subscriptionStats = await db
            .select({
                plan: restaurant.subscriptionPlan,
                status: restaurant.subscriptionStatus,
                count: db.fn.count(restaurant.id)
            })
            .from(restaurant)
            .groupBy(restaurant.subscriptionPlan, restaurant.subscriptionStatus)
            .orderBy(desc(sql<string>`count`));

        // Get growth metrics (new restaurants per day in the period)
        const growthData = await db
            .select({
                date: restaurant.createdAt,
                count: db.fn.count(restaurant.id)
            })
            .from(restaurant)
            .where(gte(restaurant.createdAt, daysAgo))
            .groupBy(sql<string>`DATE(${restaurant.createdAt})`)
            .orderBy(desc(sql<string>`DATE(${restaurant.createdAt})`));

        // Get top performing restaurants
        const topRestaurants = await db
            .select({
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                totalOrders: db.fn.count(order.id),
                totalRevenue: db.fn.sum(order.totalAmount),
                averageOrderValue: db.fn.avg(order.totalAmount)
            })
            .from(restaurant)
            .leftJoin(order, eq(restaurant.id, order.restaurantId))
            .where(
                and(
                    gte(order.createdAt, daysAgo),
                    eq(order.status, 'completed')
                )
            )
            .groupBy(restaurant.id, restaurant.name)
            .orderBy(desc(sql<string>`sum(${order.totalAmount})`))
            .limit(10);

        // Get user role distribution
        const roleDistribution = await db
            .select({
                role: restaurantUser.role,
                count: db.fn.count(restaurantUser.userId)
            })
            .from(restaurantUser)
            .where(eq(restaurantUser.isActive, true))
            .groupBy(restaurantUser.role)
            .orderBy(desc(sql<string>`count`));

        // Get recent activity
        const recentActivity = await db.query.restaurant.findMany({
            where: gte(restaurant.createdAt, daysAgo),
            orderBy: desc(restaurant.createdAt),
            limit: 5,
            with: {
                users: {
                    where: eq(restaurantUser.role, "owner"),
                    with: {
                        user: {
                            columns: {
                                name: true,
                                email: true
                            }
                        }
                    },
                    limit: 1
                }
            }
        });

        // Format response data
        const analytics = {
            overview: {
                totalRestaurants: Number(totalRestaurants[0]?.count || 0),
                activeRestaurants: Number(activeRestaurants[0]?.count || 0),
                totalUsers: Number(totalUsers[0]?.count || 0),
                activeUsers: Number(activeUsers[0]?.count || 0),
                totalOrders: Number(totalOrders[0]?.count || 0),
                totalRevenue: Number(totalOrders[0]?.revenue || 0),
                platformRevenue: Number(totalRevenue[0]?.total || 0),
                period: `last_${period}_days`
            },
            subscriptionStats,
            growthData,
            topRestaurants: topRestaurants.map(r => ({
                ...r,
                totalOrders: Number(r.totalOrders),
                totalRevenue: Number(r.totalRevenue || 0),
                averageOrderValue: Number(r.averageOrderValue || 0)
            })),
            roleDistribution: roleDistribution.map(r => ({
                ...r,
                count: Number(r.count)
            })),
            recentActivity: recentActivity.map(r => ({
                id: r.id,
                name: r.name,
                email: r.email,
                createdAt: r.createdAt,
                owner: r.users[0]?.user || null
            }))
        };

        return NextResponse.json(createApiResponse(analytics));
    });
}