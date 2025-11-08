import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { restaurantUser } from "@/db/schema/restaurant";
import { eq } from "drizzle-orm";

export interface TenantContext {
    restaurantId: string;
    userRole: string;
    permissions: string[];
    restaurant: {
        id: string;
        name: string;
        subscriptionPlan: string;
        subscriptionStatus: string;
        settings: Record<string, any>;
    };
}

declare global {
    interface Request {
        tenant?: TenantContext;
    }
}

export async function withTenant(request: NextRequest): Promise<NextResponse> {
    // Skip tenant middleware for auth routes and static assets
    if (
        request.nextUrl.pathname.startsWith("/api/auth") ||
        request.nextUrl.pathname.startsWith("/_next") ||
        request.nextUrl.pathname.startsWith("/sign-in") ||
        request.nextUrl.pathname.startsWith("/sign-up") ||
        request.nextUrl.pathname === "/"
    ) {
        return NextResponse.next();
    }

    // Get session token from cookies or headers
    const sessionToken = request.cookies.get("better-auth.session_token")?.value;

    if (!sessionToken) {
        // For public routes (like customer menu access), we don't require authentication
        if (request.nextUrl.pathname.startsWith("/menu") ||
            request.nextUrl.pathname.startsWith("/customer")) {
            return NextResponse.next();
        }

        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    try {
        // Get user from session (you'll need to implement this based on your auth system)
        const user = await getUserFromSession(sessionToken);
        if (!user) {
            return NextResponse.redirect(new URL("/sign-in", request.url));
        }

        // Get restaurant association for the user
        const userRestaurant = await db.query.restaurantUser.findFirst({
            where: eq(restaurantUser.userId, user.id),
            with: {
                restaurant: true
            }
        });

        if (!userRestaurant) {
            // User doesn't belong to any restaurant
            return NextResponse.redirect(new URL("/onboarding", request.url));
        }

        // Create tenant context
        const tenantContext: TenantContext = {
            restaurantId: userRestaurant.restaurantId,
            userRole: userRestaurant.role,
            permissions: userRestaurant.permissions || [],
            restaurant: {
                id: userRestaurant.restaurant.id,
                name: userRestaurant.restaurant.name,
                subscriptionPlan: userRestaurant.restaurant.subscriptionPlan,
                subscriptionStatus: userRestaurant.restaurant.subscriptionStatus,
                settings: userRestaurant.restaurant.settings || {}
            }
        };

        // Check if subscription is active
        if (userRestaurant.restaurant.subscriptionStatus !== "active") {
            if (request.nextUrl.pathname !== "/billing") {
                return NextResponse.redirect(new URL("/billing", request.url));
            }
        }

        // Add tenant context to request
        (request as any).tenant = tenantContext;

        // Role-based access control
        if (!hasRequiredAccess(request.nextUrl.pathname, tenantContext.userRole)) {
            return NextResponse.redirect(new URL("/unauthorized", request.url));
        }

        return NextResponse.next();

    } catch (error) {
        console.error("Tenant middleware error:", error);
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }
}

function hasRequiredAccess(pathname: string, userRole: string): boolean {
    // Define role-based access patterns
    const roleAccess: Record<string, RegExp[]> = {
        owner: [
            /^\/dashboard$/,
            /^\/dashboard\/menu/,
            /^\/dashboard\/staff/,
            /^\/dashboard\/tables/,
            /^\/dashboard\/analytics/,
            /^\/dashboard\/settings/,
            /^\/billing/
        ],
        admin: [
            /^\/dashboard$/,
            /^\/dashboard\/menu/,
            /^\/dashboard\/staff/,
            /^\/dashboard\/tables/,
            /^\/dashboard\/analytics/
        ],
        waiter: [
            /^\/dashboard$/,
            /^\/dashboard\/orders/,
            /^\/dashboard\/tables/
        ],
        kitchen: [
            /^\/dashboard$/,
            /^\/dashboard\/kitchen/
        ],
        cashier: [
            /^\/dashboard$/,
            /^\/dashboard\/orders/,
            /^\/dashboard\/payments/
        ]
    };

    // Super admin access
    if (userRole === "super_admin") {
        return pathname.startsWith("/admin") || pathname.startsWith("/dashboard");
    }

    const allowedPatterns = roleAccess[userRole] || [];

    // Check if the path matches any allowed pattern for this role
    return allowedPatterns.some(pattern => pattern.test(pathname));
}

// Helper function to get user from session (implement based on your auth system)
async function getUserFromSession(sessionToken: string): Promise<{ id: string; email: string } | null> {
    // This should integrate with your Better Auth implementation
    // For now, this is a placeholder
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/session`, {
            headers: {
                Cookie: `better-auth.session_token=${sessionToken}`
            }
        });

        if (response.ok) {
            const session = await response.json();
            return session?.user || null;
        }

        return null;
    } catch (error) {
        console.error("Error getting user from session:", error);
        return null;
    }
}

// Helper function to get tenant context from request
export function getTenantContext(request: Request): TenantContext | null {
    return (request as any).tenant || null;
}

// Middleware to ensure tenant context is available for API routes
export function requireTenantContext(request: Request): TenantContext {
    const tenant = getTenantContext(request);

    if (!tenant) {
        throw new Error("Tenant context not found. User may not be authenticated or not associated with a restaurant.");
    }

    return tenant;
}

// Helper function to check user permissions
export function hasPermission(tenant: TenantContext, permission: string): boolean {
    return tenant.permissions.includes(permission) || tenant.userRole === "owner" || tenant.userRole === "admin";
}

// Helper function to check if user can access specific restaurant data
export function canAccessRestaurant(tenant: TenantContext, restaurantId: string): boolean {
    return tenant.restaurantId === restaurantId || tenant.userRole === "super_admin";
}