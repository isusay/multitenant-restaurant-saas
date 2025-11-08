"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Building2,
    Users,
    TrendingUp,
    DollarSign,
    Activity,
    Search,
    Plus,
    Eye,
    Edit,
    Trash2,
    Power,
    PowerOff,
    Calendar,
    Mail,
    Phone
} from "lucide-react";
import { useTenantSession } from "@/lib/auth-client";

interface Restaurant {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    isActive: boolean;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionEndsAt?: string;
    totalUsers: number;
    owner: {
        id: string;
        name: string;
        email: string;
    } | null;
    createdAt: string;
    updatedAt: string;
}

interface Analytics {
    overview: {
        totalRestaurants: number;
        activeRestaurants: number;
        totalUsers: number;
        activeUsers: number;
        totalOrders: number;
        totalRevenue: number;
        platformRevenue: number;
        period: string;
    };
    subscriptionStats: Array<{
        plan: string;
        status: string;
        count: number;
    }>;
    topRestaurants: Array<{
        restaurantId: string;
        restaurantName: string;
        totalOrders: number;
        totalRevenue: number;
        averageOrderValue: number;
    }>;
    roleDistribution: Array<{
        role: string;
        count: number;
    }>;
    recentActivity: Array<{
        id: string;
        name: string;
        email: string;
        createdAt: string;
        owner: {
            name: string;
            email: string;
        } | null;
    }>;
}

export default function SuperAdminDashboard() {
    const { user, tenant } = useTenantSession();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [planFilter, setPlanFilter] = useState("all");
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Check if user is super admin
    useEffect(() => {
        if (user && tenant?.userRole !== "super_admin") {
            window.location.href = "/dashboard";
        }
    }, [user, tenant]);

    // Fetch restaurants
    const fetchRestaurants = async () => {
        try {
            const params = new URLSearchParams({
                page: "1",
                limit: "50",
            });

            if (searchTerm) params.append("search", searchTerm);
            if (statusFilter !== "all") params.append("status", statusFilter);
            if (planFilter !== "all") params.append("plan", planFilter);

            const response = await fetch(`/api/admin/tenants?${params}`);
            if (response.ok) {
                const data = await response.json();
                setRestaurants(data.data.items);
            }
        } catch (error) {
            console.error("Failed to fetch restaurants:", error);
        }
    };

    // Fetch analytics
    const fetchAnalytics = async () => {
        try {
            const response = await fetch("/api/admin/analytics?period=30");
            if (response.ok) {
                const data = await response.json();
                setAnalytics(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        }
    };

    // Load data
    useEffect(() => {
        if (tenant?.userRole === "super_admin") {
            const loadData = async () => {
                setLoading(true);
                await Promise.all([fetchRestaurants(), fetchAnalytics()]);
                setLoading(false);
            };
            loadData();
        }
    }, [tenant, searchTerm, statusFilter, planFilter]);

    // Toggle restaurant status
    const toggleRestaurantStatus = async (restaurantId: string, isActive: boolean) => {
        try {
            const response = await fetch(`/api/admin/tenants/${restaurantId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: isActive ? "deactivate" : "activate"
                })
            });

            if (response.ok) {
                fetchRestaurants();
                fetchAnalytics();
            }
        } catch (error) {
            console.error("Failed to toggle restaurant status:", error);
        }
    };

    // Delete restaurant
    const deleteRestaurant = async (restaurantId: string) => {
        try {
            const response = await fetch(`/api/admin/tenants/${restaurantId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                fetchRestaurants();
                fetchAnalytics();
            }
        } catch (error) {
            console.error("Failed to delete restaurant:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user || tenant?.userRole !== "super_admin") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
                    <p className="text-muted-foreground">Manage restaurants and monitor platform performance</p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Restaurant
                </Button>
            </div>

            {/* Overview Cards */}
            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Restaurants</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.overview.totalRestaurants}</div>
                            <p className="text-xs text-muted-foreground">
                                {analytics.overview.activeRestaurants} active
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.overview.totalUsers}</div>
                            <p className="text-xs text-muted-foreground">
                                {analytics.overview.activeUsers} active
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.overview.totalOrders}</div>
                            <p className="text-xs text-muted-foreground">
                                {analytics.overview.period}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ${analytics.overview.platformRevenue.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {analytics.overview.period}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Content */}
            <Tabs defaultValue="restaurants" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="restaurants" className="space-y-4">
                    {/* Filters */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Restaurant Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 mb-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search restaurants..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="trial">Trial</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={planFilter} onValueChange={setPlanFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Plans</SelectItem>
                                        <SelectItem value="basic">Basic</SelectItem>
                                        <SelectItem value="premium">Premium</SelectItem>
                                        <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Restaurants Table */}
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Restaurant</TableHead>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Users</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {restaurants.map((restaurant) => (
                                        <TableRow key={restaurant.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{restaurant.name}</div>
                                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <Mail className="w-3 h-3" />
                                                        {restaurant.email}
                                                    </div>
                                                    {restaurant.phone && (
                                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                            <Phone className="w-3 h-3" />
                                                            {restaurant.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {restaurant.owner ? (
                                                    <div>
                                                        <div className="font-medium">{restaurant.owner.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {restaurant.owner.email}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">No owner</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {restaurant.subscriptionPlan}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        restaurant.subscriptionStatus === "active"
                                                            ? "default"
                                                            : restaurant.subscriptionStatus === "trial"
                                                            ? "secondary"
                                                            : "destructive"
                                                    }
                                                >
                                                    {restaurant.subscriptionStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{restaurant.totalUsers}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {new Date(restaurant.createdAt).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.location.href = `/admin/tenants/${restaurant.id}`}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleRestaurantStatus(restaurant.id, restaurant.isActive)}
                                                    >
                                                        {restaurant.isActive ? (
                                                            <PowerOff className="w-4 h-4" />
                                                        ) : (
                                                            <Power className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>
                                                                    Are you sure?
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete the restaurant and all associated data.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => deleteRestaurant(restaurant.id)}
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    {analytics && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Performing Restaurants */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top Performing Restaurants</CardTitle>
                                    <CardDescription>By revenue in the last 30 days</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {analytics.topRestaurants.map((restaurant, index) => (
                                            <div key={restaurant.restaurantId} className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{restaurant.restaurantName}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {restaurant.totalOrders} orders • ${restaurant.averageOrderValue.toFixed(2)} avg
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium">
                                                        ${restaurant.totalRevenue.toFixed(2)}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        #{index + 1}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Subscription Distribution */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Subscription Distribution</CardTitle>
                                    <CardDescription>Restaurants by plan and status</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {analytics.subscriptionStats.map((stat) => (
                                            <div key={`${stat.plan}-${stat.status}`} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{stat.plan}</Badge>
                                                    <Badge
                                                        variant={
                                                            stat.status === "active"
                                                                ? "default"
                                                                : stat.status === "trial"
                                                                ? "secondary"
                                                                : "destructive"
                                                        }
                                                    >
                                                        {stat.status}
                                                    </Badge>
                                                </div>
                                                <div className="font-medium">{stat.count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Role Distribution */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>User Role Distribution</CardTitle>
                                    <CardDescription>Active users by role</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {analytics.roleDistribution.map((role) => (
                                            <div key={role.role} className="flex items-center justify-between">
                                                <div className="font-medium capitalize">
                                                    {role.role.replace("_", " ")}
                                                </div>
                                                <div className="font-medium">{role.count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Activity */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Activity</CardTitle>
                                    <CardDescription>Newly registered restaurants</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {analytics.recentActivity.map((activity) => (
                                            <div key={activity.id} className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{activity.name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Owner: {activity.owner?.name || "N/A"}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {new Date(activity.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Create Restaurant Dialog - Placeholder */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create New Restaurant</DialogTitle>
                        <DialogDescription>
                            Add a new restaurant to the platform. This will create the restaurant and owner account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">
                            Restaurant creation form will be implemented here.
                        </p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setShowCreateDialog(false)}
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}