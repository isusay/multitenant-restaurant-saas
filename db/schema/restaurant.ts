import {
    pgTable,
    text,
    timestamp,
    boolean,
    integer,
    decimal,
    uuid,
    json,
    primaryKey,
    index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// Restaurant table - This is the tenant table
export const restaurant = pgTable("restaurant", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    logo: text("logo"), // URL to restaurant logo
    currency: text("currency").default("IDR").notNull(),
    timezone: text("timezone").default("Asia/Jakarta").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    subscriptionPlan: text("subscription_plan").default("basic").notNull(), // basic, premium, enterprise
    subscriptionStatus: text("subscription_status").default("active").notNull(), // active, inactive, trial, cancelled
    subscriptionEndsAt: timestamp("subscription_ends_at"),
    settings: json("settings").$type<Record<string, any>>(), // Restaurant-specific settings
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    emailIdx: index("restaurant_email_idx").on(table.email),
    activeIdx: index("restaurant_active_idx").on(table.isActive),
}));

// Enhanced user table with tenant support
export const restaurantUser = pgTable("restaurant_user", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    restaurantId: text("restaurant_id").notNull().references(() => restaurant.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // owner, admin, waiter, kitchen, cashier
    isActive: boolean("is_active").default(true).notNull(),
    permissions: json("permissions").$type<string[]>(), // Additional permissions if needed
    hiredAt: timestamp("hired_at").defaultNow(),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    userRestaurantIdx: index("user_restaurant_idx").on(table.userId, table.restaurantId),
    restaurantIdx: index("restaurant_user_restaurant_idx").on(table.restaurantId),
    roleIdx: index("restaurant_user_role_idx").on(table.role),
}));

// Restaurant staff assignment/shift table
export const staffAssignment = pgTable("staff_assignment", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    restaurantId: text("restaurant_id").notNull().references(() => restaurant.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    shiftName: text("shift_name").notNull(), // morning, evening, night
    startTime: text("start_time").notNull(), // HH:MM format
    endTime: text("end_time").notNull(), // HH:MM format
    daysOfWeek: text("days_of_week").notNull().$type<string[]>(), // ["monday", "tuesday", ...]
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    restaurantUserIdx: index("staff_assignment_restaurant_user_idx").on(table.restaurantId, table.userId),
    shiftIdx: index("staff_assignment_shift_idx").on(table.restaurantId, table.shiftName),
}));

// Restaurant tables
export const restaurantTable = pgTable("restaurant_table", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    restaurantId: text("restaurant_id").notNull().references(() => restaurant.id, { onDelete: "cascade" }),
    tableNumber: text("table_number").notNull(),
    capacity: integer("capacity").notNull().default(4),
    qrCode: text("qr_code"), // URL to QR code image or unique identifier
    position: json("position").$type<{ x: number; y: number }>(), // Table position in restaurant layout
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    restaurantTableIdx: index("restaurant_table_restaurant_table_idx").on(table.restaurantId, table.tableNumber).unique(),
    restaurantIdx: index("restaurant_table_restaurant_idx").on(table.restaurantId),
}));

// Menu categories
export const menuCategory = pgTable("menu_category", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    restaurantId: text("restaurant_id").notNull().references(() => restaurant.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    displayOrder: integer("display_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    restaurantCategoryIdx: index("menu_category_restaurant_name_idx").on(table.restaurantId, table.name),
    orderIdx: index("menu_category_order_idx").on(table.restaurantId, table.displayOrder),
}));

// Menu items
export const menuItem = pgTable("menu_item", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    restaurantId: text("restaurant_id").notNull().references(() => restaurant.id, { onDelete: "cascade" }),
    categoryId: text("category_id").notNull().references(() => menuCategory.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    imageUrl: text("image_url"),
    ingredients: text("ingredients").array(), // Array of ingredients
    allergens: text("allergens").array(), // Array of allergens
    nutritionInfo: json("nutrition_info").$type<Record<string, any>>(), // Nutrition information
    spicyLevel: integer("spicy_level").default(0), // 0-5 scale
    isAvailable: boolean("is_available").default(true).notNull(),
    isRecommended: boolean("is_recommended").default(false).notNull(),
    preparationTime: integer("preparation_time"), // In minutes
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    restaurantItemIdx: index("menu_item_restaurant_name_idx").on(table.restaurantId, table.name),
    categoryIdx: index("menu_item_category_idx").on(table.categoryId),
    availableIdx: index("menu_item_available_idx").on(table.isAvailable),
    orderIdx: index("menu_item_order_idx").on(table.categoryId, table.displayOrder),
}));

// Orders
export const order = pgTable("order", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    restaurantId: text("restaurant_id").notNull().references(() => restaurant.id, { onDelete: "cascade" }),
    tableId: text("table_id").references(() => restaurantTable.id, { onDelete: "set null" }),
    orderNumber: text("order_number").notNull(), // Auto-generated unique order number
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    customerEmail: text("customer_email"),
    status: text("status").notNull().default("pending"), // pending, confirmed, preparing, ready, served, completed, cancelled
    paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, refunded, failed
    paymentMethod: text("payment_method"), // cash, card, transfer, ewallet
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0.00"),
    tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0.00"),
    serviceCharge: decimal("service_charge", { precision: 10, scale: 2 }).notNull().default("0.00"),
    discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0.00"),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
    notes: text("notes"),
    specialRequests: text("special_requests"),
    orderType: text("order_type").notNull().default("dine_in"), // dine_in, takeaway, delivery
    waiterId: text("waiter_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
}, (table) => ({
    restaurantOrderIdx: index("order_restaurant_number_idx").on(table.restaurantId, table.orderNumber).unique(),
    restaurantIdx: index("order_restaurant_idx").on(table.restaurantId),
    tableIdx: index("order_table_idx").on(table.tableId),
    statusIdx: index("order_status_idx").on(table.status),
    dateIdx: index("order_date_idx").on(table.restaurantId, table.createdAt),
}));

// Order items
export const orderItem = pgTable("order_item", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    orderId: text("order_id").notNull().references(() => order.id, { onDelete: "cascade" }),
    menuItemId: text("menu_item_id").notNull().references(() => menuItem.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    specialInstructions: text("special_instructions"),
    status: text("status").notNull().default("pending"), // pending, confirmed, preparing, ready, served, cancelled
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    orderItemIdx: index("order_item_order_menu_idx").on(table.orderId, table.menuItemId),
    orderIdx: index("order_item_order_idx").on(table.orderId),
    statusIdx: index("order_item_status_idx").on(table.status),
}));

// Order status history for tracking
export const orderStatusHistory = pgTable("order_status_history", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    orderId: text("order_id").notNull().references(() => order.id, { onDelete: "cascade" }),
    previousStatus: text("previous_status"),
    newStatus: text("new_status").notNull(),
    changedBy: text("changed_by").references(() => user.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    orderHistoryIdx: index("order_status_history_order_idx").on(table.orderId),
    dateIdx: index("order_status_history_date_idx").on(table.orderId, table.createdAt),
}));

// Restaurant analytics/sales data
export const dailySales = pgTable("daily_sales", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    restaurantId: text("restaurant_id").notNull().references(() => restaurant.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD format
    totalOrders: integer("total_orders").notNull().default(0),
    totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).notNull().default("0.00"),
    totalCustomers: integer("total_customers").notNull().default(0),
    averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }).notNull().default("0.00"),
    peakHour: text("peak_hour"), // HH:00 format
    topMenuItem: text("top_menu_item"),
    topCategory: text("top_category"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    restaurantDateIdx: index("daily_sales_restaurant_date_idx").on(table.restaurantId, table.date).unique(),
    restaurantIdx: index("daily_sales_restaurant_idx").on(table.restaurantId),
    dateIdx: index("daily_sales_date_idx").on(table.date),
}));

// Customer feedback/reviews
export const customerFeedback = pgTable("customer_feedback", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    restaurantId: text("restaurant_id").notNull().references(() => restaurant.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => order.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(), // 1-5 scale
    comment: text("comment"),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    feedbackType: text("feedback_type").default("general"), // general, complaint, compliment, suggestion
    isPublic: boolean("is_public").default(false).notNull(),
    isResolved: boolean("is_resolved").default(false).notNull(),
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    restaurantFeedbackIdx: index("customer_feedback_restaurant_idx").on(table.restaurantId),
    orderIdx: index("customer_feedback_order_idx").on(table.orderId),
    ratingIdx: index("customer_feedback_rating_idx").on(table.rating),
    resolvedIdx: index("customer_feedback_resolved_idx").on(table.isResolved),
}));

// Relations
export const restaurantRelations = relations(restaurant, ({ many }) => ({
    users: many(restaurantUser),
    staffAssignments: many(staffAssignment),
    tables: many(restaurantTable),
    menuCategories: many(menuCategory),
    menuItems: many(menuItem),
    orders: many(order),
    dailySales: many(dailySales),
    feedback: many(customerFeedback),
}));

export const restaurantUserRelations = relations(restaurantUser, ({ one, many }) => ({
    user: one(user, { fields: [restaurantUser.userId], references: [user.id] }),
    restaurant: one(restaurant, { fields: [restaurantUser.restaurantId], references: [restaurant.id] }),
    staffAssignments: many(staffAssignment),
}));

export const staffAssignmentRelations = relations(staffAssignment, ({ one }) => ({
    restaurant: one(restaurant, { fields: [staffAssignment.restaurantId], references: [restaurant.id] }),
    user: one(user, { fields: [staffAssignment.userId], references: [user.id] }),
}));

export const restaurantTableRelations = relations(restaurantTable, ({ one, many }) => ({
    restaurant: one(restaurant, { fields: [restaurantTable.restaurantId], references: [restaurant.id] }),
    orders: many(order),
}));

export const menuCategoryRelations = relations(menuCategory, ({ one, many }) => ({
    restaurant: one(restaurant, { fields: [menuCategory.restaurantId], references: [restaurant.id] }),
    menuItems: many(menuItem),
}));

export const menuItemRelations = relations(menuItem, ({ one, many }) => ({
    restaurant: one(restaurant, { fields: [menuItem.restaurantId], references: [restaurant.id] }),
    category: one(menuCategory, { fields: [menuItem.categoryId], references: [menuCategory.id] }),
    orderItems: many(orderItem),
}));

export const orderRelations = relations(order, ({ one, many }) => ({
    restaurant: one(restaurant, { fields: [order.restaurantId], references: [restaurant.id] }),
    table: one(restaurantTable, { fields: [order.tableId], references: [restaurantTable.id] }),
    waiter: one(user, { fields: [order.waiterId], references: [user.id] }),
    orderItems: many(orderItem),
    statusHistory: many(orderStatusHistory),
    feedback: many(customerFeedback),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
    order: one(order, { fields: [orderItem.orderId], references: [order.id] }),
    menuItem: one(menuItem, { fields: [orderItem.menuItemId], references: [menuItem.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
    order: one(order, { fields: [orderStatusHistory.orderId], references: [order.id] }),
    changedByUser: one(user, { fields: [orderStatusHistory.changedBy], references: [user.id] }),
}));

export const dailySalesRelations = relations(dailySales, ({ one }) => ({
    restaurant: one(restaurant, { fields: [dailySales.restaurantId], references: [restaurant.id] }),
}));

export const customerFeedbackRelations = relations(customerFeedback, ({ one }) => ({
    restaurant: one(restaurant, { fields: [customerFeedback.restaurantId], references: [restaurant.id] }),
    order: one(order, { fields: [customerFeedback.orderId], references: [order.id] }),
    resolvedByUser: one(user, { fields: [customerFeedback.resolvedBy], references: [user.id] }),
}));