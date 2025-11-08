import { createAuthClient } from "better-auth/react";
import { useEffect, useState } from "react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
});

export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession,
} = authClient;

// Extended session hook with tenant context
export function useTenantSession() {
    const { data: session, isPending } = useSession();
    const [tenantData, setTenantData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchTenantSession() {
            try {
                const response = await fetch("/api/auth/session");
                if (response.ok) {
                    const data = await response.json();
                    setTenantData(data);
                }
            } catch (error) {
                console.error("Failed to fetch tenant session:", error);
            } finally {
                setIsLoading(false);
            }
        }

        if (session) {
            fetchTenantSession();
        } else {
            setTenantData(null);
            setIsLoading(false);
        }
    }, [session]);

    return {
        user: tenantData?.user || null,
        tenant: tenantData?.tenant || null,
        restaurants: tenantData?.restaurants || [],
        needsOnboarding: tenantData?.needsOnboarding || false,
        isLoading: isPending || isLoading,
    };
}

// Hook for restaurant management
export function useRestaurantSwitch() {
    const [isSwitching, setIsSwitching] = useState(false);

    const switchRestaurant = async (restaurantId: string) => {
        setIsSwitching(true);
        try {
            const response = await fetch("/api/auth/session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ restaurantId }),
            });

            if (!response.ok) {
                throw new Error("Failed to switch restaurant");
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error switching restaurant:", error);
            throw error;
        } finally {
            setIsSwitching(false);
        }
    };

    return {
        switchRestaurant,
        isSwitching,
    };
}

// Hook for role-based permissions
export function usePermissions() {
    const { tenant } = useTenantSession();

    const hasPermission = (permission: string) => {
        if (!tenant) return false;

        // Owner and admin have all permissions
        if (tenant.userRole === "owner" || tenant.userRole === "admin") {
            return true;
        }

        return tenant.permissions?.includes(permission) || false;
    };

    const hasRole = (role: string) => {
        return tenant?.userRole === role;
    };

    const canAccess = (requiredPermissions: string[]) => {
        if (!tenant) return false;

        // Owner and admin can access everything
        if (tenant.userRole === "owner" || tenant.userRole === "admin") {
            return true;
        }

        return requiredPermissions.every(permission =>
            tenant.permissions?.includes(permission)
        );
    };

    return {
        hasPermission,
        hasRole,
        canAccess,
        userRole: tenant?.userRole || null,
        permissions: tenant?.permissions || [],
        isOwner: tenant?.userRole === "owner",
        isAdmin: tenant?.userRole === "admin",
        isWaiter: tenant?.userRole === "waiter",
        isKitchen: tenant?.userRole === "kitchen",
        isCashier: tenant?.userRole === "cashier",
    };
}