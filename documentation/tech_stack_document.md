# Tech Stack Document

This document explains, in everyday language, the technology choices for our multitenant restaurant SaaS platform. It covers front-end and back-end tools, infrastructure, third-party services, security measures, and how everything works together to deliver a reliable, scalable application.

## 1. Frontend Technologies

We chose these tools to build a smooth, responsive, and easy-to-maintain user interface for restaurant owners, staff, and admins.

- **Next.js 15 (App Router)**
  - Handles page routing, server-side rendering, and API endpoints all in one framework.
  - Improves load times and SEO by pre-rendering pages on the server.

- **React**
  - Powers our dynamic UI components.
  - Lets us build reusable pieces of interface—like buttons, forms, and tables—that work the same everywhere.

- **TypeScript**
  - Adds type checks to JavaScript, catching mistakes early in development.
  - Makes it easier for developers to understand what data is expected in every component.

- **Tailwind CSS**
  - A utility-first styling framework that speeds up design by letting us apply styles directly in our markup.
  - Offers a consistent look without writing custom CSS from scratch.

- **shadcn/ui**
  - A library of prebuilt, accessible UI components that we can customize.
  - Ensures a professional, cohesive look across the app.

- **next-themes**
  - Manages light and dark mode settings with minimal setup.
  - Gives users control over their viewing preference.

These technologies together deliver a fast, accessible, and visually consistent user experience across desktops and mobile devices.

## 2. Backend Technologies

Our back end keeps data organized, secure, and easy to query, while supporting all the user roles and tenant isolation needs.

- **Next.js API Routes**
  - Serve as our serverless functions for handling requests like login, fetching menus, and submitting orders.

- **Better Auth**
  - Provides secure sign-up and sign-in flows for Restaurant Owners, Staff, and the Super Admin.
  - Manages session handling and user credentials without building authentication from scratch.

- **PostgreSQL**
  - A reliable, open-source relational database to store tenants (restaurants), users, menus, orders, and more.
  - Well-suited for complex queries and data relationships.

- **Drizzle ORM**
  - A lightweight, type-safe ORM (Object-Relational Mapper) that integrates smoothly with TypeScript.
  - Lets us define database schemas and write queries with compile-time safety, reducing runtime errors.

These components collaborate as follows:
1. A user logs in through Better Auth.
2. Next.js routes authenticate the session and attach user details (including their `restaurantId`).
3. Drizzle ORM builds and runs database queries against PostgreSQL, always filtered by `restaurantId` to enforce data isolation.
4. API routes send back JSON data to the React front end.

## 3. Infrastructure and Deployment

To keep development, testing, and production environments consistent, we rely on containerization and version control.

- **Docker & docker-compose**
  - Package the entire app (front end, back end, and database) into containers.
  - Ensure every developer and server runs the same environment, eliminating "it works on my machine" issues.

- **Git & GitHub (or similar)**
  - Maintain source code history and collaboration through branching, pull requests, and code reviews.

- **(Planned) CI/CD Pipeline**
  - Automate testing and deployments so new features and fixes flow safely from code review to production.
  - Tools like GitHub Actions or GitLab CI can run tests, build containers, and deploy updates.

This setup guarantees a repeatable, reliable, and scalable deployment process.

## 4. Third-Party Integrations

We integrate external services to handle specialized tasks so we can focus on core business logic.

- **Better Auth**
  - Manages all authentication flows and session storage.
  - Reduces security risk by outsourcing login logic to a proven provider.

- **(Future) Stripe**
  - Will power subscription billing for restaurant tenants.
  - Handles credit card processing, invoices, and plan management.

- **(Potential) Real-Time Service (Pusher, Ably, or WebSockets)**
  - Will enable instant order updates in kitchen and staff views without page reloads.

These integrations streamline development and augment the platform’s capabilities without reinventing the wheel.

## 5. Security and Performance Considerations

We’ve built in several safeguards and optimizations to protect data and ensure a smooth user experience.

- **Role-Based Access Control (RBAC)**
  - Every API route and database query checks the user’s role (owner, staff, super_admin) and `restaurantId`.
  - Prevents users from accessing or modifying data they shouldn’t see.

- **Type Safety**
  - TypeScript and Drizzle ORM catch mismatches before code runs, reducing potential bugs and data leaks.

- **Data Isolation**
  - All tables (menus, orders, staff) include a `restaurantId` foreign key.
  - Queries always filter by this ID, ensuring strict tenant separation.

- **Container Consistency**
  - Docker containers isolate dependencies and environment settings.
  - Reduces unexpected performance differences between development and production.

- **Future Security Audits and Testing**
  - Plan to add a thorough testing suite: unit, integration, and end-to-end tests.
  - Conduct periodic security audits to verify all tenant boundaries and authentication flows.

## 6. Conclusion and Overall Tech Stack Summary

In building this multitenant restaurant SaaS platform, we’ve chosen a modern, proven set of tools that balance developer productivity, user experience, and operational reliability. Here’s a quick recap:

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, next-themes
- **Backend**: Next.js API Routes, Better Auth, PostgreSQL, Drizzle ORM
- **Infrastructure**: Docker, docker-compose, Git, and planned CI/CD pipelines
- **Integrations**: Better Auth (auth), future Stripe (billing), and real-time messaging services
- **Security & Performance**: Role-based access, data isolation by `restaurantId`, type-safe queries, and container consistency

Together, these choices ensure:
- A responsive, consistent interface for all user roles
- Secure, isolated data handling for each restaurant tenant
- A repeatable, scalable deployment process
- The flexibility to add billing, real-time updates, and new features as the platform grows

This tech stack positions our SaaS platform for reliable operation, easy maintenance, and rapid feature development—all essential for serving multiple restaurants with one codebase.