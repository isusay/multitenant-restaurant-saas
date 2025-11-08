import { NextRequest } from "next/server";
import { db } from "@/db";
import { restaurantUser, restaurant } from "@/db/schema/restaurant";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

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
    user: {
        id: string;
        email: string;
        name: string;
    };
}

// Middleware function for API routes to ensure tenant context
export async function getApiTenantContext(request: NextRequest): Promise<TenantContext> {
    // Get session from Better Auth
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session?.user) {
        throw new Error("Unauthorized: No active session found");
    }

    // Get user's restaurant association
    const userRestaurant = await db.query.restaurantUser.findFirst({
        where: eq(restaurantUser.userId, session.user.id),
        with: {
            restaurant: true
        }
    });

    if (!userRestaurant) {
        throw new Error("Forbidden: User is not associated with any restaurant");
    }

    if (!userRestaurant.isActive || !userRestaurant.restaurant.isActive) {
        throw new Error("Forbidden: Restaurant or user account is not active");
    }

    return {
        restaurantId: userRestaurant.restaurantId,
        userRole: userRestaurant.role,
        permissions: userRestaurant.permissions || [],
        restaurant: {
            id: userRestaurant.restaurant.id,
            name: userRestaurant.restaurant.name,
            subscriptionPlan: userRestaurant.restaurant.subscriptionPlan,
            subscriptionStatus: userRestaurant.restaurant.subscriptionStatus,
            settings: userRestaurant.restaurant.settings || {}
        },
        user: {
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.name || ""
        }
    };
}

// Role-based access control for API routes
export function requireRole(allowedRoles: string[]) {
    return (tenantContext: TenantContext) => {
        if (!allowedRoles.includes(tenantContext.userRole)) {
            throw new Error(`Forbidden: Required role not found. Required: ${allowedRoles.join(", ")}, Current: ${tenantContext.userRole}`);
        }
    };
}

// Permission-based access control for API routes
export function requirePermission(permission: string) {
    return (tenantContext: TenantContext) => {
        // Owner and admin have all permissions
        if (tenantContext.userRole === "owner" || tenantContext.userRole === "admin") {
            return;
        }

        if (!tenantContext.permissions.includes(permission)) {
            throw new Error(`Forbidden: Required permission '${permission}' not found`);
        }
    };
}

// Check if user can access specific restaurant data
export function requireRestaurantAccess(restaurantId: string) {
    return (tenantContext: TenantContext) => {
        if (tenantContext.restaurantId !== restaurantId) {
            throw new Error("Forbidden: Cannot access data from other restaurants");
        }
    };
}

// Check subscription status
export function requireActiveSubscription() {
    return (tenantContext: TenantContext) => {
        if (tenantContext.restaurant.subscriptionStatus !== "active") {
            throw new Error("Forbidden: Restaurant subscription is not active");
        }
    };
}

// Helper function to create consistent API responses
export function createApiResponse<T>(
    data: T,
    message?: string,
    status: "success" | "error" = "success"
) {
    return {
        status,
        message: message || (status === "success" ? "Operation successful" : "Operation failed"),
        data,
        timestamp: new Date().toISOString()
    };
}

// Helper function to create error responses
export function createApiError(
    message: string,
    details?: any,
    status: "error" | "warning" = "error"
) {
    return {
        status,
        message,
        details,
        timestamp: new Date().toISOString()
    };
}

// Wrapper function for API handlers with tenant context
export function withTenantContext<T extends any[]>(
    handler: (request: NextRequest, context: TenantContext, ...args: T) => Promise<Response>,
    options?: {
        requiredRoles?: string[];
        requiredPermissions?: string[];
        requireActiveSubscription?: boolean;
    }
) {
    return async (request: NextRequest, ...args: T): Promise<Response> => {
        try {
            // Get tenant context
            const tenantContext = await getApiTenantContext(request);

            // Apply role-based checks
            if (options?.requiredRoles) {
                requireRole(options.requiredRoles)(tenantContext);
            }

            // Apply permission-based checks
            if (options?.requiredPermissions) {
                for (const permission of options.requiredPermissions) {
                    requirePermission(permission)(tenantContext);
                }
            }

            // Apply subscription check
            if (options?.requireActiveSubscription) {
                requireActiveSubscription()(tenantContext);
            }

            // Call the original handler
            return await handler(request, tenantContext, ...args);

        } catch (error) {
            console.error("API Error:", error);

            if (error instanceof Error) {
                if (error.message.includes("Unauthorized")) {
                    return new Response(
                        JSON.stringify(createApiError(error.message)),
                        { status: 401, headers: { "Content-Type": "application/json" } }
                    );
                }

                if (error.message.includes("Forbidden")) {
                    return new Response(
                        JSON.stringify(createApiError(error.message)),
                        { status: 403, headers: { "Content-Type": "application/json" } }
                    );
                }
            }

            return new Response(
                JSON.stringify(createApiError("Internal server error")),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    };
}

// Pagination helper for API responses
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export function parsePaginationParams(request: NextRequest): PaginationParams {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    return { page, limit, sortBy, sortOrder };
}

export function createPaginatedResponse<T>(
    data: T[],
    total: number,
    pagination: PaginationParams
) {
    const totalPages = Math.ceil(total / pagination.limit);
    const hasNext = pagination.page < totalPages;
    const hasPrev = pagination.page > 1;

    return createApiResponse({
        items: data,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages,
            hasNext,
            hasPrev,
            sortBy: pagination.sortBy,
            sortOrder: pagination.sortOrder
        }
    });
}