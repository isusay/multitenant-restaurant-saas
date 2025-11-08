import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { restaurant, restaurantUser } from "@/db/schema/restaurant";
import { user, account } from "@/db/schema/auth";
import { eq, desc, ilike, and, or } from "drizzle-orm";
import { withTenantContext, requireRole, createApiResponse, createPaginatedResponse, parsePaginationParams } from "@/lib/api-helpers";

// Get all restaurants (tenants) - Super Admin only
export async function GET(request: NextRequest) {
    return withTenantContext(async (request: NextRequest, context: any) => {
        // Only super admin can access this endpoint
        requireRole(["super_admin"])(context);

        const { searchParams } = new URL(request.url);
        const pagination = parsePaginationParams(request);

        // Parse filters
        const status = searchParams.get("status");
        const plan = searchParams.get("plan");
        const search = searchParams.get("search");

        // Build where conditions
        let whereConditions = [];

        if (status) {
            whereConditions.push(eq(restaurant.subscriptionStatus, status));
        }

        if (plan) {
            whereConditions.push(eq(restaurant.subscriptionPlan, plan));
        }

        if (search) {
            whereConditions.push(
                or(
                    ilike(restaurant.name, `%${search}%`),
                    ilike(restaurant.email, `%${search}%`),
                    ilike(restaurant.phone, `%${search}%`)
                )
            );
        }

        // Get total count
        const totalResult = await db
            .select({ count: db.fn.count(restaurant.id) })
            .from(restaurant)
            .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

        const total = Number(totalResult[0]?.count || 0);

        // Get restaurants with pagination
        const restaurants = await db.query.restaurant.findMany({
            where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
            orderBy: desc(restaurant.createdAt),
            limit: pagination.limit,
            offset: (pagination.page - 1) * pagination.limit,
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

        // Transform data for response
        const transformedRestaurants = restaurants.map(r => ({
            id: r.id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            address: r.address,
            logo: r.logo,
            currency: r.currency,
            timezone: r.timezone,
            isActive: r.isActive,
            subscriptionPlan: r.subscriptionPlan,
            subscriptionStatus: r.subscriptionStatus,
            subscriptionEndsAt: r.subscriptionEndsAt,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            totalUsers: r.users.length,
            owner: r.users.find(u => u.role === "owner")?.user || null
        }));

        return NextResponse.json(
            createPaginatedResponse(transformedRestaurants, total, pagination)
        );
    });
}

// Create new restaurant (tenant) - Super Admin only
export async function POST(request: NextRequest) {
    return withTenantContext(async (request: NextRequest, context: TenantContext) => {
        // Only super admin can access this endpoint
        requireRole(["super_admin"])(context);

        const {
            name,
            description,
            address,
            phone,
            email,
            ownerName,
            ownerEmail,
            ownerPassword,
            subscriptionPlan = "basic",
            subscriptionDays = 30
        } = await request.json();

        if (!name || !email || !ownerName || !ownerEmail || !ownerPassword) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if restaurant already exists
        const existingRestaurant = await db.query.restaurant.findFirst({
            where: eq(restaurant.email, email)
        });

        if (existingRestaurant) {
            return NextResponse.json(
                { error: "Restaurant with this email already exists" },
                { status: 409 }
            );
        }

        // Check if owner user already exists
        const existingUser = await db.query.user.findFirst({
            where: eq(user.email, ownerEmail)
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 409 }
            );
        }

        // Calculate subscription end date
        const subscriptionEndsAt = new Date();
        subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + subscriptionDays);

        // Create restaurant and owner user in a transaction
        const result = await db.transaction(async (tx) => {
            // Create restaurant
            const [newRestaurant] = await tx.insert(restaurant).values({
                name,
                description,
                address,
                phone,
                email,
                isActive: true,
                subscriptionPlan,
                subscriptionStatus: "active",
                subscriptionEndsAt,
                settings: {
                    autoAcceptOrders: false,
                    taxRate: 0.1,
                    serviceChargeRate: 0.05
                }
            }).returning();

            // Create owner user
            const [newUser] = await tx.insert(user).values({
                name: ownerName,
                email: ownerEmail,
                emailVerified: true
            }).returning();

            // Create password hash (you should use a proper password hashing library)
            const passwordHash = await Bun.password.hash(ownerPassword);

            // Create user account for authentication
            await tx.insert(account).values({
                userId: newUser.id,
                providerId: "credential",
                accountId: ownerEmail,
                password: passwordHash
            });

            // Assign user to restaurant as owner
            await tx.insert(restaurantUser).values({
                userId: newUser.id,
                restaurantId: newRestaurant.id,
                role: "owner",
                isActive: true,
                permissions: [
                    "manage_menu",
                    "manage_staff",
                    "manage_tables",
                    "view_analytics",
                    "manage_settings",
                    "manage_billing",
                    "view_reports"
                ]
            });

            return { restaurant: newRestaurant, user: newUser };
        });

        return NextResponse.json(
            createApiResponse(result, "Restaurant created successfully")
        );
    });
}