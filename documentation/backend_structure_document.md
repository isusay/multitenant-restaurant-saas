# Backend Structure Document for Multitenant Restaurant SaaS

## 1. Backend Architecture

**Overall Design**
- We use a modern, modular backend built with Next.js (App Router) and TypeScript.  
- All server-side code (API routes, authentication, database access) lives alongside the UI code, making it easy to evolve features end to end.  
- Authentication is handled by Better Auth, plugged into Next.js API routes for sign-in, sign-up, and session management.  
- Database access is done via Drizzle ORM, a type-safe query builder on top of PostgreSQL.  

**Scalability**  
- The app is stateless: any server instance can handle any request, so we scale horizontally by adding more containers or instances.  
- Data partitioning by `restaurantId` (tenant) ensures each restaurant’s data remains isolated.  

**Maintainability**  
- Clear separation of concerns: UI components, API routes, and database schema live in separate folders (`/components`, `/app/api`, `/db`).  
- TypeScript everywhere means fewer runtime surprises and better IDE support.  

**Performance**  
- Drizzle ORM compiles queries at build time for fast execution.  
- Static assets and UI components are optimized by Next.js, minimizing load times.  

## 2. Database Management

**Technology Choices**  
- Relational database (SQL): PostgreSQL  
- ORM: Drizzle ORM for schema definitions, migrations, and type-safe queries  

**Data Organization**  
- Each core entity (restaurants, users, menus, orders, staff, roles) is a separate table.  
- Every table that holds tenant-specific data includes a `restaurantId` foreign key to enforce multitenancy.  
- Role-based access: users have a `role` field (`owner`, `staff`, `super_admin`) for authorization checks.  

**Data Access Patterns**  
- All queries filter by `restaurantId` (for tenant-aware access).  
- Drizzle migrations track schema changes and allow versioned updates to the database structure.  

**Best Practices**  
- Index important columns (`restaurantId`, `userId`, `orderStatus`) for fast lookups.  
- Use database transactions for multi-step operations (e.g., creating an order and decrementing inventory).  

## 3. Database Schema

**Human-Readable Overview**  
- **restaurants**: Holds each tenant’s profile (name, address, subscription status).  
- **users**: Stores user accounts with authentication info, `role`, and linked `restaurantId`.  
- **menus**: Contains menu items (name, description, price) and `restaurantId`.  
- **orders**: Tracks customer orders (items, quantities, status, timestamps) with `restaurantId` and `tableId`.  
- **staff**: Details on staff members (userId, role-specific settings) tied to `restaurantId`.  
- **roles**: Defines roles and their permissions.  
- **subscriptions**: Stores billing info and plan details per restaurant.  

**SQL Schema (PostgreSQL)**  
```sql
-- Restaurants (Tenants)
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  subscription_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Menus
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id TEXT,
  items JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  role_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  plan TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```  

## 4. API Design and Endpoints

**Approach**  
- RESTful API routes under `/api/*` in Next.js.  
- Authentication routes: `/api/auth/[...nextauth]` handle login, logout, and session checks via Better Auth.  
- Protected routes use Next.js middleware to verify the user session and inject `restaurantId` and `role` into the request context.  

**Key Endpoints**  
- **POST /api/auth/login**: Sign in a user and return a session token.  
- **POST /api/auth/register**: Create a new user or restaurant owner account.  
- **GET /api/restaurants**: List all restaurants (Super Admin only).  
- **GET /api/menus**: Fetch menu items for the authenticated user’s restaurant.  
- **POST /api/menus**: Create a new menu item (Owners only).  
- **GET /api/orders**: Get active orders for a restaurant.  
- **POST /api/orders**: Place a new order (public customer-facing route).  
- **PATCH /api/orders/:id**: Update order status (Staff or Kitchen role).  
- **GET /api/subscriptions**: Retrieve billing info (Super Admin or Owner).  

## 5. Hosting Solutions

**Cloud Provider**  
- We recommend AWS for flexibility, cost control, and global scale.  
- Core services used:  
  • Elastic Container Service (ECS) or Elastic Kubernetes Service (EKS) for container orchestration  
  • Amazon RDS for managed PostgreSQL  
  • Amazon S3 for static assets (optional)  
  • AWS Secrets Manager for storing database credentials and API keys  

**Benefits**  
- Automatic server provisioning, scaling, and health checks.  
- Enterprise-grade security and compliance.  
- Pay-as-you-go pricing minimizes costs for early-stage deployments.  

## 6. Infrastructure Components

**Load Balancer**  
- AWS Application Load Balancer (ALB) distributes incoming HTTP(S) traffic across backend containers.  

**Caching**  
- Redis (Amazon ElastiCache) for session caching, rate limiting, and frequently accessed data (e.g., menu lists).  

**Content Delivery Network (CDN)**  
- Amazon CloudFront to cache and serve static assets (images, CSS, JS) close to users for faster load times.  

**Real-Time Updates**  
- Pusher or Ably for WebSocket connections, delivering live order updates to kitchen and staff interfaces.  

## 7. Security Measures

**Authentication & Authorization**  
- Better Auth handles password hashing, token generation, and session management.  
- Role-based checks in middleware and API routes enforce that only permitted roles can access or modify data.  

**Data Encryption**  
- All traffic is encrypted in transit via HTTPS/TLS.  
- Sensitive data (passwords, secrets) is encrypted at rest using AWS-managed encryption keys.  

**Network Security**  
- Private subnets for database instances, public subnets for load balancers.  
- Security groups and network ACLs restrict inbound and outbound traffic to only necessary ports.  

**Compliance & Best Practices**  
- Periodic security audits and penetration tests.  
- Adherence to OWASP Top 10 guidelines for API security.  

## 8. Monitoring and Maintenance

**Monitoring Tools**  
- AWS CloudWatch for server logs, metrics (CPU, memory, HTTP status codes).  
- New Relic or DataDog for application performance monitoring (APM) and real-time alerts.  

**Logging**  
- Structured logs (JSON) from API routes, ingested into CloudWatch or ELK stack for troubleshooting.  

**Maintenance Practices**  
- Automated backups of RDS snapshots daily.  
- Drizzle migration pipelines run on every release to apply schema changes safely.  
- Scheduled dependency updates and security patching via CI pipeline.  

## 9. Conclusion and Overall Backend Summary

This backend is a fully containerized, cloud-ready foundation for a multitenant restaurant SaaS.  
- **Scalability**: Horizontal scaling, load balancing, and managed services ensure we can grow seamlessly.  
- **Security & Isolation**: Tenant-aware queries, RBAC, and encrypted communications protect each restaurant’s data.  
- **Maintainability**: TypeScript, Drizzle ORM, and clear code organization keep the codebase clean and evolvable.  
- **Performance**: Caching layers, a CDN, and well-indexed data tables deliver a responsive experience for users around the globe.  

With this structure in place, you can confidently add new modules (reservations, inventory, analytics) and onboard your first restaurant tenants, knowing that data isolation, security, and reliability are already built into the core.
