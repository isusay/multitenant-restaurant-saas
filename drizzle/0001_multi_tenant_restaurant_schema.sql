-- Multi-tenant Restaurant SaaS Schema Migration
-- This migration creates a comprehensive database schema for multi-tenant restaurant management

-- Restaurant table (tenant table)
CREATE TABLE IF NOT EXISTS "restaurant" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "address" text,
    "phone" text,
    "email" text,
    "logo" text,
    "currency" text DEFAULT 'IDR' NOT NULL,
    "timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "subscription_plan" text DEFAULT 'basic' NOT NULL,
    "subscription_status" text DEFAULT 'active' NOT NULL,
    "subscription_ends_at" timestamp,
    "settings" json,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Restaurant user mapping table
CREATE TABLE IF NOT EXISTS "restaurant_user" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "restaurant_id" text NOT NULL,
    "role" text NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "permissions" json,
    "hired_at" timestamp DEFAULT now(),
    "last_login_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "restaurant_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "restaurant_user_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE no action ON UPDATE no action
);

-- Staff assignment table
CREATE TABLE IF NOT EXISTS "staff_assignment" (
    "id" text PRIMARY KEY NOT NULL,
    "restaurant_id" text NOT NULL,
    "user_id" text NOT NULL,
    "shift_name" text NOT NULL,
    "start_time" text NOT NULL,
    "end_time" text NOT NULL,
    "days_of_week" text NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "staff_assignment_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "staff_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action
);

-- Restaurant tables
CREATE TABLE IF NOT EXISTS "restaurant_table" (
    "id" text PRIMARY KEY NOT NULL,
    "restaurant_id" text NOT NULL,
    "table_number" text NOT NULL,
    "capacity" integer DEFAULT 4 NOT NULL,
    "qr_code" text,
    "position" json,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "restaurant_table_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE no action ON UPDATE no action
);

-- Menu categories
CREATE TABLE IF NOT EXISTS "menu_category" (
    "id" text PRIMARY KEY NOT NULL,
    "restaurant_id" text NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "image_url" text,
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "menu_category_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE no action ON UPDATE no action
);

-- Menu items
CREATE TABLE IF NOT EXISTS "menu_item" (
    "id" text PRIMARY KEY NOT NULL,
    "restaurant_id" text NOT NULL,
    "category_id" text NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "price" decimal(10,2) NOT NULL,
    "image_url" text,
    "ingredients" text[],
    "allergens" text[],
    "nutrition_info" json,
    "spicy_level" integer DEFAULT 0,
    "is_available" boolean DEFAULT true NOT NULL,
    "is_recommended" boolean DEFAULT false NOT NULL,
    "preparation_time" integer,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "menu_item_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "menu_item_category_id_menu_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "menu_category"("id") ON DELETE no action ON UPDATE no action
);

-- Orders
CREATE TABLE IF NOT EXISTS "order" (
    "id" text PRIMARY KEY NOT NULL,
    "restaurant_id" text NOT NULL,
    "table_id" text,
    "order_number" text NOT NULL,
    "customer_name" text,
    "customer_phone" text,
    "customer_email" text,
    "status" text DEFAULT 'pending' NOT NULL,
    "payment_status" text DEFAULT 'pending' NOT NULL,
    "payment_method" text,
    "subtotal" decimal(10,2) DEFAULT '0.00' NOT NULL,
    "tax" decimal(10,2) DEFAULT '0.00' NOT NULL,
    "service_charge" decimal(10,2) DEFAULT '0.00' NOT NULL,
    "discount" decimal(10,2) DEFAULT '0.00' NOT NULL,
    "total_amount" decimal(10,2) DEFAULT '0.00' NOT NULL,
    "notes" text,
    "special_requests" text,
    "order_type" text DEFAULT 'dine_in' NOT NULL,
    "waiter_id" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "completed_at" timestamp,
    CONSTRAINT "order_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "order_table_id_restaurant_table_id_fk" FOREIGN KEY ("table_id") REFERENCES "restaurant_table"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "order_waiter_id_user_id_fk" FOREIGN KEY ("waiter_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action
);

-- Order items
CREATE TABLE IF NOT EXISTS "order_item" (
    "id" text PRIMARY KEY NOT NULL,
    "order_id" text NOT NULL,
    "menu_item_id" text NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" decimal(10,2) NOT NULL,
    "total_price" decimal(10,2) NOT NULL,
    "special_instructions" text,
    "status" text DEFAULT 'pending' NOT NULL,
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "order_item_menu_item_id_menu_item_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "menu_item"("id") ON DELETE no action ON UPDATE no action
);

-- Order status history
CREATE TABLE IF NOT EXISTS "order_status_history" (
    "id" text PRIMARY KEY NOT NULL,
    "order_id" text NOT NULL,
    "previous_status" text,
    "new_status" text NOT NULL,
    "changed_by" text,
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "order_status_history_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "order_status_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action
);

-- Daily sales analytics
CREATE TABLE IF NOT EXISTS "daily_sales" (
    "id" text PRIMARY KEY NOT NULL,
    "restaurant_id" text NOT NULL,
    "date" text NOT NULL,
    "total_orders" integer DEFAULT 0 NOT NULL,
    "total_revenue" decimal(12,2) DEFAULT '0.00' NOT NULL,
    "total_customers" integer DEFAULT 0 NOT NULL,
    "average_order_value" decimal(10,2) DEFAULT '0.00' NOT NULL,
    "peak_hour" text,
    "top_menu_item" text,
    "top_category" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "daily_sales_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE no action ON UPDATE no action
);

-- Customer feedback
CREATE TABLE IF NOT EXISTS "customer_feedback" (
    "id" text PRIMARY KEY NOT NULL,
    "restaurant_id" text NOT NULL,
    "order_id" text,
    "rating" integer NOT NULL,
    "comment" text,
    "customer_name" text,
    "customer_email" text,
    "feedback_type" text DEFAULT 'general',
    "is_public" boolean DEFAULT false NOT NULL,
    "is_resolved" boolean DEFAULT false NOT NULL,
    "resolved_by" text,
    "resolved_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "customer_feedback_restaurant_id_restaurant_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "customer_feedback_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "customer_feedback_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "restaurant_email_idx" ON "restaurant" ("email");
CREATE INDEX IF NOT EXISTS "restaurant_active_idx" ON "restaurant" ("is_active");
CREATE INDEX IF NOT EXISTS "restaurant_user_user_restaurant_idx" ON "restaurant_user" ("user_id", "restaurant_id");
CREATE INDEX IF NOT EXISTS "restaurant_user_restaurant_idx" ON "restaurant_user" ("restaurant_id");
CREATE INDEX IF NOT EXISTS "restaurant_user_role_idx" ON "restaurant_user" ("role");
CREATE INDEX IF NOT EXISTS "staff_assignment_restaurant_user_idx" ON "staff_assignment" ("restaurant_id", "user_id");
CREATE INDEX IF NOT EXISTS "staff_assignment_shift_idx" ON "staff_assignment" ("restaurant_id", "shift_name");
CREATE INDEX IF NOT EXISTS "restaurant_table_restaurant_table_idx" ON "restaurant_table" ("restaurant_id", "table_number");
CREATE INDEX IF NOT EXISTS "restaurant_table_restaurant_idx" ON "restaurant_table" ("restaurant_id");
CREATE INDEX IF NOT EXISTS "menu_category_restaurant_name_idx" ON "menu_category" ("restaurant_id", "name");
CREATE INDEX IF NOT EXISTS "menu_category_order_idx" ON "menu_category" ("restaurant_id", "display_order");
CREATE INDEX IF NOT EXISTS "menu_item_restaurant_name_idx" ON "menu_item" ("restaurant_id", "name");
CREATE INDEX IF NOT EXISTS "menu_item_category_idx" ON "menu_item" ("category_id");
CREATE INDEX IF NOT EXISTS "menu_item_available_idx" ON "menu_item" ("is_available");
CREATE INDEX IF NOT EXISTS "menu_item_order_idx" ON "menu_item" ("category_id", "display_order");
CREATE INDEX IF NOT EXISTS "order_restaurant_number_idx" ON "order" ("restaurant_id", "order_number");
CREATE INDEX IF NOT EXISTS "order_restaurant_idx" ON "order" ("restaurant_id");
CREATE INDEX IF NOT EXISTS "order_table_idx" ON "order" ("table_id");
CREATE INDEX IF NOT EXISTS "order_status_idx" ON "order" ("status");
CREATE INDEX IF NOT EXISTS "order_date_idx" ON "order" ("restaurant_id", "created_at");
CREATE INDEX IF NOT EXISTS "order_item_order_menu_idx" ON "order_item" ("order_id", "menu_item_id");
CREATE INDEX IF NOT EXISTS "order_item_order_idx" ON "order_item" ("order_id");
CREATE INDEX IF NOT EXISTS "order_item_status_idx" ON "order_item" ("status");
CREATE INDEX IF NOT EXISTS "order_status_history_order_idx" ON "order_status_history" ("order_id");
CREATE INDEX IF NOT EXISTS "order_status_history_date_idx" ON "order_status_history" ("order_id", "created_at");
CREATE INDEX IF NOT EXISTS "daily_sales_restaurant_date_idx" ON "daily_sales" ("restaurant_id", "date");
CREATE INDEX IF NOT EXISTS "daily_sales_restaurant_idx" ON "daily_sales" ("restaurant_id");
CREATE INDEX IF NOT EXISTS "daily_sales_date_idx" ON "daily_sales" ("date");
CREATE INDEX IF NOT EXISTS "customer_feedback_restaurant_idx" ON "customer_feedback" ("restaurant_id");
CREATE INDEX IF NOT EXISTS "customer_feedback_order_idx" ON "customer_feedback" ("order_id");
CREATE INDEX IF NOT EXISTS "customer_feedback_rating_idx" ON "customer_feedback" ("rating");
CREATE INDEX IF NOT EXISTS "customer_feedback_resolved_idx" ON "customer_feedback" ("is_resolved");

-- Create unique constraints
DO $$ BEGIN
    CREATE UNIQUE INDEX "restaurant_table_restaurant_table_unique" ON "restaurant_table" ("restaurant_id", "table_number");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX "daily_sales_restaurant_date_unique" ON "daily_sales" ("restaurant_id", "date");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;