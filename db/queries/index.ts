import { db } from "../index";
import { eq, and, desc, asc, ilike, gte, lte, sql } from "drizzle-orm";
import {
    restaurant,
    restaurantUser,
    restaurantTable,
    menuCategory,
    menuItem,
    order,
    orderItem,
    orderStatusHistory,
    dailySales,
    customerFeedback
} from "../schema/restaurant";
import { user } from "../schema/auth";

// Restaurant queries
export const getRestaurantById = (id: string) => {
    return db.query.restaurant.findFirst({
        where: eq(restaurant.id, id),
        with: {
            users: {
                with: {
                    user: true
                }
            },
            tables: true,
            menuCategories: {
                with: {
                    menuItems: true
                },
                orderBy: asc(menuCategory.displayOrder)
            }
        }
    });
};

export const getRestaurantsByUserId = (userId: string) => {
    return db.query.restaurantUser.findMany({
        where: eq(restaurantUser.userId, userId),
        with: {
            restaurant: true
        }
    });
};

export const getUserRoleInRestaurant = (userId: string, restaurantId: string) => {
    return db.query.restaurantUser.findFirst({
        where: and(
            eq(restaurantUser.userId, userId),
            eq(restaurantUser.restaurantId, restaurantId),
            eq(restaurantUser.isActive, true)
        )
    });
};

// Menu queries
export const getMenuCategoriesByRestaurant = (restaurantId: string) => {
    return db.query.menuCategory.findMany({
        where: and(
            eq(menuCategory.restaurantId, restaurantId),
            eq(menuCategory.isActive, true)
        ),
        orderBy: asc(menuCategory.displayOrder),
        with: {
            menuItems: {
                where: eq(menuItem.isAvailable, true),
                orderBy: asc(menuItem.displayOrder)
            }
        }
    });
};

export const getMenuItemsByCategory = (categoryId: string) => {
    return db.query.menuItem.findMany({
        where: and(
            eq(menuItem.categoryId, categoryId),
            eq(menuItem.isAvailable, true)
        ),
        orderBy: asc(menuItem.displayOrder)
    });
};

export const searchMenuItems = (restaurantId: string, searchTerm: string) => {
    return db.query.menuItem.findMany({
        where: and(
            eq(menuItem.restaurantId, restaurantId),
            eq(menuItem.isAvailable, true),
            ilike(menuItem.name, `%${searchTerm}%`)
        ),
        with: {
            category: true
        },
        orderBy: asc(menuItem.name)
    });
};

// Table queries
export const getTablesByRestaurant = (restaurantId: string) => {
    return db.query.restaurantTable.findMany({
        where: and(
            eq(restaurantTable.restaurantId, restaurantId),
            eq(restaurantTable.isActive, true)
        ),
        orderBy: asc(restaurantTable.tableNumber)
    });
};

export const getTableById = (id: string, restaurantId: string) => {
    return db.query.restaurantTable.findFirst({
        where: and(
            eq(restaurantTable.id, id),
            eq(restaurantTable.restaurantId, restaurantId)
        )
    });
};

// Order queries
export const getOrdersByRestaurant = (restaurantId: string, filters?: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    tableId?: string;
}) => {
    let whereConditions = [eq(order.restaurantId, restaurantId)];

    if (filters?.status) {
        whereConditions.push(eq(order.status, filters.status));
    }

    if (filters?.tableId) {
        whereConditions.push(eq(order.tableId, filters.tableId));
    }

    if (filters?.dateFrom) {
        whereConditions.push(gte(order.createdAt, filters.dateFrom));
    }

    if (filters?.dateTo) {
        whereConditions.push(lte(order.createdAt, filters.dateTo));
    }

    return db.query.order.findMany({
        where: and(...whereConditions),
        with: {
            table: true,
            orderItems: {
                with: {
                    menuItem: true
                }
            },
            waiter: {
                columns: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        },
        orderBy: desc(order.createdAt)
    });
};

export const getOrderById = (id: string, restaurantId: string) => {
    return db.query.order.findFirst({
        where: and(
            eq(order.id, id),
            eq(order.restaurantId, restaurantId)
        ),
        with: {
            table: true,
            orderItems: {
                with: {
                    menuItem: true
                }
            },
            waiter: {
                columns: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            statusHistory: {
                with: {
                    changedByUser: {
                        columns: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: asc(orderStatusHistory.createdAt)
            }
        }
    });
};

export const createOrder = async (orderData: typeof order.$inferInsert) => {
    return db.transaction(async (tx) => {
        // Generate unique order number
        const restaurantData = await tx.query.restaurant.findFirst({
            where: eq(restaurant.id, orderData.restaurantId!)
        });

        const orderNumber = `${restaurantData?.name?.substring(0, 3).toUpperCase() || 'RES'}${Date.now()}`;

        const [newOrder] = await tx.insert(order).values({
            ...orderData,
            orderNumber
        }).returning();

        // Create initial status history
        await tx.insert(orderStatusHistory).values({
            orderId: newOrder.id,
            newStatus: newOrder.status,
            notes: "Order created"
        });

        return newOrder;
    });
};

export const updateOrderStatus = async (orderId: string, newStatus: string, changedBy: string, notes?: string) => {
    return db.transaction(async (tx) => {
        // Get current order
        const currentOrder = await tx.query.order.findFirst({
            where: eq(order.id, orderId)
        });

        if (!currentOrder) {
            throw new Error("Order not found");
        }

        // Update order status
        await tx.update(order)
            .set({
                status: newStatus,
                updatedAt: new Date(),
                completedAt: newStatus === 'completed' ? new Date() : currentOrder.completedAt
            })
            .where(eq(order.id, orderId));

        // Create status history entry
        await tx.insert(orderStatusHistory).values({
            orderId,
            previousStatus: currentOrder.status,
            newStatus,
            changedBy,
            notes
        });

        return currentOrder;
    });
};

// Analytics queries
export const getDailySales = (restaurantId: string, dateFrom: Date, dateTo: Date) => {
    return db.query.dailySales.findMany({
        where: and(
            eq(dailySales.restaurantId, restaurantId),
            gte(dailySales.date, dateFrom.toISOString().split('T')[0]),
            lte(dailySales.date, dateTo.toISOString().split('T')[0])
        ),
        orderBy: asc(dailySales.date)
    });
};

export const getTopMenuItems = (restaurantId: string, limit: number = 10) => {
    return db.select({
        menuItemId: orderItem.menuItemId,
        itemName: menuItem.name,
        categoryName: menuCategory.name,
        totalQuantity: sql<number>`sum(${orderItem.quantity})`.as('total_quantity'),
        totalRevenue: sql<number>`sum(${orderItem.totalPrice})`.as('total_revenue')
    })
    .from(orderItem)
    .innerJoin(order, eq(orderItem.orderId, order.id))
    .innerJoin(menuItem, eq(orderItem.menuItemId, menuItem.id))
    .innerJoin(menuCategory, eq(menuItem.categoryId, menuCategory.id))
    .where(and(
        eq(order.restaurantId, restaurantId),
        eq(order.status, 'completed')
    ))
    .groupBy(orderItem.menuItemId, menuItem.name, menuCategory.name)
    .orderBy(desc(sql`sum(${orderItem.quantity})`))
    .limit(limit);
};

export const getSalesSummary = (restaurantId: string, dateFrom: Date, dateTo: Date) => {
    return db.select({
        totalOrders: sql<number>`count(*)`.as('total_orders'),
        totalRevenue: sql<number>`sum(${order.totalAmount})`.as('total_revenue'),
        averageOrderValue: sql<number>`avg(${order.totalAmount})`.as('average_order_value'),
        totalCustomers: sql<number>`count(distinct ${order.customerEmail})`.as('total_customers')
    })
    .from(order)
    .where(and(
        eq(order.restaurantId, restaurantId),
        eq(order.status, 'completed'),
        gte(order.createdAt, dateFrom),
        lte(order.createdAt, dateTo)
    ));
};

// Customer feedback queries
export const getCustomerFeedback = (restaurantId: string, filters?: {
    rating?: number;
    isResolved?: boolean;
    feedbackType?: string;
}) => {
    let whereConditions = [eq(customerFeedback.restaurantId, restaurantId)];

    if (filters?.rating !== undefined) {
        whereConditions.push(eq(customerFeedback.rating, filters.rating));
    }

    if (filters?.isResolved !== undefined) {
        whereConditions.push(eq(customerFeedback.isResolved, filters.isResolved));
    }

    if (filters?.feedbackType) {
        whereConditions.push(eq(customerFeedback.feedbackType, filters.feedbackType));
    }

    return db.query.customerFeedback.findMany({
        where: and(...whereConditions),
        with: {
            order: {
                columns: {
                    id: true,
                    orderNumber: true,
                    totalAmount: true,
                    createdAt: true
                }
            },
            resolvedByUser: {
                columns: {
                    id: true,
                    name: true
                }
            }
        },
        orderBy: desc(customerFeedback.createdAt)
    });
};

export const getFeedbackStats = (restaurantId: string) => {
    return db.select({
        averageRating: sql<number>`avg(${customerFeedback.rating})`.as('average_rating'),
        totalFeedback: sql<number>`count(*)`.as('total_feedback'),
        resolvedCount: sql<number>`count(case when ${customerFeedback.isResolved} then 1 end)`.as('resolved_count'),
        unresolvedCount: sql<number>`count(case when not ${customerFeedback.isResolved} then 1 end)`.as('unresolved_count')
    })
    .from(customerFeedback)
    .where(eq(customerFeedback.restaurantId, restaurantId));
};