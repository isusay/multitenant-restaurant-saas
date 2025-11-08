# Project Requirements Document

## 1. Project Overview

This project is a multitenant Software-as-a-Service (SaaS) platform designed specifically for restaurants. Instead of building a separate instance for each restaurant, this single codebase and infrastructure will serve multiple independent tenants (restaurants) with strict data isolation. Three main user types will interact with the platform: Restaurant Owners, Restaurant Staff (e.g., kitchen or waiters), and a Super Admin who manages the overall system.

The goal is to give each restaurant a secure, branded dashboard where owners can manage menus, staff, and view sales analytics; staff can handle orders and table statuses; and the Super Admin can onboard new restaurants and oversee subscriptions. Success criteria include fully functional role-based access control, reliable tenant-level data isolation, a polished responsive UI, and a deployment-ready Docker setup.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1)
- Multitenant architecture with a `restaurantId` key on all data tables for strict isolation.  
- User Authentication via Better Auth for Owners, Staff, and Super Admin.  
- Role-Based Access Control (RBAC) enforced in Next.js middleware or API routes.  
- Protected Dashboard area in Next.js with:  
  • Restaurant Owner portal (menu CRUD, staff management, basic analytics).  
  • Kitchen staff view (order queue) and Waiter view (table status).  
  • Super Admin portal (restaurant onboarding, subscription overview).  
- Database integration with PostgreSQL using Drizzle ORM for type-safe queries.  
- Responsive UI built with Next.js, React, Tailwind CSS, shadcn/ui components, and next-themes for dark mode.  
- Docker and docker-compose setup for consistent local and production environments.

### Out-of-Scope (Later Phases)
- Customer-facing ordering pages and QR-code–driven menu access.  
- Payment and billing integration (e.g., Stripe subscriptions).  
- Real-time updates (WebSockets, Pusher).  
- Advanced modules (reservations, inventory).  
- Full CI/CD pipeline (will be addressed after core features are stable).

## 3. User Flow

When a Restaurant Owner first arrives, they sign up using an email and password via the Better Auth flow. After authentication, they land on the protected `/dashboard` area and are greeted by a sidebar (with links to Menu, Staff, Analytics) and a header. The Owner clicks “Menu,” creates categories and items, then invites Staff by entering their emails. Analytics displays basic sales charts filtered by the owner’s `restaurantId`.

A Staff member receives an invitation email and follows a link to set up their password. After signing in, they also land on `/dashboard` but see only the pages relevant to their role: a live order queue under “Kitchen” or a table status board under “Waiter.” The Super Admin signs in at `/admin`, sees a list of all onboarded restaurants, and can review subscription status and system health metrics.

## 4. Core Features

- **Multitenancy & Data Isolation**: Every record (menus, orders, staff) is scoped by `restaurantId` to prevent cross-tenant leakage.  
- **Authentication & RBAC**: Better Auth for sign-up/sign-in, plus role checks on every API endpoint.  
- **Protected Dashboard**: Next.js App Router route group (`/dashboard`) with a unified layout (sidebar + header).  
- **Restaurant Owner Module**: Menu creation, editing, staff invitations, and sales analytics charts.  
- **Staff Module**: Real-time order queue for kitchen staff and table status view for waiters.  
- **Super Admin Module**: Restaurant onboarding, tenant subscription overview, and basic system health dashboard.  
- **UI & Theming**: Responsive React components via shadcn/ui and Tailwind CSS; light/dark mode with next-themes.  
- **Database Layer**: PostgreSQL with Drizzle ORM for schema definitions, migrations, and type-safe queries.  
- **Containerization**: Dockerfiles and docker-compose for development and production parity.

## 5. Tech Stack & Tools

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, next-themes (dark mode).  
- **Backend**: Next.js API Routes (Node.js), TypeScript.  
- **Authentication**: Better Auth service for secure user management.  
- **Database**: PostgreSQL; Drizzle ORM for type-safe queries and schema migrations.  
- **Containerization**: Docker, docker-compose.  
- **IDE/Plugins**: VS Code recommended; ESLint and Prettier for code consistency.

## 6. Non-Functional Requirements

- **Performance**: Page loads under 2 seconds; API responses within 200 ms under average load.  
- **Scalability**: Support at least 100 concurrent restaurants and 1,000 concurrent users across tenants.  
- **Security**: TLS/HTTPS everywhere; encrypted credentials; RBAC enforcement on every endpoint; audit logs.  
- **Compliance**: Data isolation must satisfy GDPR/CCPA requirements; prepare data deletion workflows.  
- **Usability**: Responsive layouts for desktop and tablet; 95+ Lighthouse accessibility score.

## 7. Constraints & Assumptions

- Better Auth supports custom roles and session management at scale.  
- PostgreSQL instance is available and connections are managed per tenant.  
- Docker is installed in development and production environments.  
- Environment variables (DB credentials, auth keys) are configured per environment.  
- All developers use the same Node.js version and follow the defined ESLint/Prettier rules.

## 8. Known Issues & Potential Pitfalls

- **Tenant Data Leakage**: If a query forgets to filter by `restaurantId`, data could cross boundaries.  
  • Mitigation: Create a database helper that automatically adds `restaurantId` to all queries.  
- **Drizzle Migrations**: Schema changes require careful migration scripts.  
  • Mitigation: Enforce a strict review process for all schema_changes and include rollback scripts.  
- **Authentication Rate Limits**: Better Auth endpoints may throttle under load.  
  • Mitigation: Implement exponential backoff and caching for session tokens.  
- **Role Escalation**: Bugs in middleware could allow unauthorized actions.  
  • Mitigation: Write integration tests to cover every endpoint with every role.  
- **Docker Volume Conflicts**: Shared volumes in docker-compose may cause file permission issues.  
  • Mitigation: Document volume paths and permission fixes in the README.

---

This PRD contains all the essential information to guide the AI and development teams in building the first version of the multitenant restaurant SaaS platform without ambiguity. Subsequent documents (Tech Stack, Frontend Guidelines, Backend Structure, etc.) can now be drafted based on these clear requirements.