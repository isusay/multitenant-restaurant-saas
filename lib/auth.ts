import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // your drizzle instance
import { account, session, user, verification } from "@/db/schema/auth";
import { restaurantUser, restaurant } from "@/db/schema/restaurant";
import { eq, and } from "drizzle-orm";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema: {
            user: user,
            account: account,
            session: session,
            verification: verification,
        }
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes
        }
    },
    account: {
        accountLinking: {
            enabled: true,
        },
    },
    // Custom hooks for multi-tenancy
    hooks: {
        after: [
            {
                matcher(context) {
                    return context.path === "/sign-in" || context.path === "/sign-up";
                },
                handler: async (ctx) => {
                    // After successful authentication, add tenant context to session
                    if (ctx.context?.user && !ctx.context.returned) {
                        const userId = ctx.context.user.id;

                        // Get user's restaurant associations
                        const userRestaurants = await db.query.restaurantUser.findMany({
                            where: eq(restaurantUser.userId, userId),
                            with: {
                                restaurant: {
                                    columns: {
                                        id: true,
                                        name: true,
                                        subscriptionPlan: true,
                                        subscriptionStatus: true,
                                        isActive: true
                                    }
                                }
                            }
                        });

                        if (userRestaurants.length > 0) {
                            // For now, we'll use the first active restaurant
                            // In a real app, you might want to show a restaurant selection screen
                            const activeRestaurant = userRestaurants.find(ur => ur.restaurant.isActive && ur.restaurant.isActive);

                            if (activeRestaurant) {
                                // Add tenant info to session data
                                ctx.context.session = {
                                    ...ctx.context.session,
                                    tenantId: activeRestaurant.restaurantId,
                                    userRole: activeRestaurant.role,
                                    permissions: activeRestaurant.permissions || [],
                                    restaurant: activeRestaurant.restaurant
                                };
                            }
                        }
                    }
                }
            }
        ],
        before: [
            {
                matcher(context) {
                    return context.path === "/sign-up";
                },
                handler: async (ctx) => {
                    // Before sign-up, check if this is restaurant owner registration
                    const body = ctx.context?.body;
                    if (body?.restaurantName && body?.role === "owner") {
                        // Create restaurant first, then user
                        const newRestaurant = await db.insert(restaurant).values({
                            name: body.restaurantName,
                            email: body.email,
                            phone: body.phone,
                            address: body.address,
                            isActive: true,
                            subscriptionPlan: "trial",
                            subscriptionStatus: "active",
                            subscriptionEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
                            settings: {
                                autoAcceptOrders: false,
                                taxRate: 0.1,
                                serviceChargeRate: 0.05
                            }
                        }).returning();

                        // Store restaurant ID in context for post-signup processing
                        ctx.context.newRestaurantId = newRestaurant[0].id;
                    }
                }
            }
        ]
    },
    // Custom fields for multi-tenancy
    user: {
        additionalFields: {
            tenantId: {
                type: "string",
                required: false,
            },
            userRole: {
                type: "string",
                required: false,
            },
            permissions: {
                type: "string[]",
                required: false,
            }
        }
    }
});