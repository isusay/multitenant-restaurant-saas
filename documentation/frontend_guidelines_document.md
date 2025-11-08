# Frontend Guideline Document for Multitenant Restaurant SaaS

## Frontend Architecture

**Frameworks & Libraries**
- **Next.js 15 (App Router)**: Provides server-side rendering (SSR), file-based routing, and API routes in a single framework.  
- **React + TypeScript**: Ensures a type-safe, component-based UI.  
- **shadcn/ui**: A collection of accessible, customizable UI components built on Radix UI.  
- **Tailwind CSS**: Utility-first styling for fast, consistent design.  
- **next-themes**: Handles theming (light/dark modes) at runtime.  
- **Better Auth**: Manages authentication flows for Owners, Staff, and Super Admin.  

**Scalability, Maintainability & Performance**
- **Modular Folder Structure**: `/app` for routes/layouts, `/components` for reusable UI pieces, `/lib` for utilities, and `/db` for schema configs.  
- **Component-Based Architecture**: Encourages reuse and isolation, simplifying feature additions (e.g., new dashboards, menus).  
- **Server & Client Components**: Next.js App Router splits work—heavy data fetching on the server, interactive parts on the client.  
- **Automatic Code Splitting**: Next.js only loads the code needed for each route, reducing initial bundle sizes.  
- **Type-Safe Data Layer**: Although Drizzle ORM is part of the full stack, frontend interacts via typed API routes to ensure correct data shapes.

## Design Principles

1. **Usability**  
   - Clear navigation (sidebar & header) with role-based menus.  
   - Consistent layouts across pages reduce learning curves.  

2. **Accessibility**  
   - shadcn/ui and Radix components follow WCAG guidelines.  
   - Keyboard-friendly modals, forms, and focus states.  
   - Proper ARIA labels on custom components.  

3. **Responsiveness**  
   - Mobile-first approach using Tailwind’s responsive utilities.  
   - Flexbox and CSS Grid for fluid layouts.  
   - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px).  

4. **Consistency**  
   - Shared design tokens (colors, spacing, typography).  
   - Centralized theming via `next-themes` ensures uniform light/dark switches.

## Styling and Theming

**Styling Approach**
- **Tailwind CSS** (utility-first) with JIT compilation.  
- **Custom CSS** for edge cases, scoped via CSS modules when needed.  
- **BEM-Like Naming** for standalone `.css`/`.module.css` files.

**Design Style**
- **Modern & Flat**: Minimal shadows, clean lines, subtle rounding (6px).  
- **Glassmorphism Accents**: Translucent cards for highlights (e.g., analytics widgets).  

**Theming**
- **Light Mode**: Light backgrounds, dark text.  
- **Dark Mode**: Dark backgrounds, light text.  
- Toggle stored in `localStorage` and managed by `next-themes`.

**Color Palette**
- Primary: #6366F1 (indigo-500)  
- Secondary: #EC4899 (pink-500)  
- Accent/Success: #10B981 (green-500)  
- Warning: #F59E0B (yellow-500)  
- Danger: #EF4444 (red-500)  
- Background Light: #F9FAFB  
- Surface Light: #FFFFFF  
- Background Dark: #111827  
- Surface Dark: #1F2937  
- Text Light: #1F2937  
- Text Dark: #F9FAFB

**Typography**
- Primary Font: Inter, system-ui, -apple-system, sans-serif.  
- Headings: 600–700 weight; Body text: 400.  
- Base font-size: 16px; scale by 1.25 for H2, 1.5 for H1.

## Component Structure

**Organization**
- `/components/atoms`: Basic UI elements (Button, Input, Badge).  
- `/components/molecules`: Composed elements (FormField, CardHeader).  
- `/components/organisms`: Complex sections (SidebarMenu, AnalyticsCard).  
- `/components/templates`: Page-level layouts or repeated patterns.  

**Reusability**
- Props-driven customization, minimal inline logic.  
- Only UI concerns; data fetching and business logic live in pages or hooks.  

**Benefits**
- **Maintainability**: Updating design or behavior in one place updates everywhere.  
- **Scalability**: New features slot into existing atoms/molecules without duplication.  

## State Management

- **Server Components**: Next.js handles data fetching and caching on the server.  
- **Client Components**:
  - **React Context API** for global state (AuthContext, ThemeContext).  
  - **useState/useReducer** for local UI state (modals, form inputs).  
- **Data Fetching**:
  - Built-in `fetch` in server components for SSR/ISR.  
  - Client calls to `/api` routes with built-in caching headers.  

*Note*: For advanced client caching (optional), libraries like SWR or React Query can be introduced later.

## Routing and Navigation

- **File-based Routing** via Next.js App Router:
  - `/app/page.tsx` → Public homepage.  
  - `/app/dashboard/layout.tsx` & `/app/dashboard/page.tsx` → Protected dashboard.  
  - Route groups (e.g., `/app/dashboard/kitchen`) for role-specific views.  
- **Protected Routes**:
  - Middleware checks for valid session via Better Auth.  
  - Unauthenticated users are redirected to `/api/auth/signin`.
- **Linking**:
  - Next.js `<Link>` component for client-side navigation.  
  - Sidebar and header menus driven by an array of route definitions.

## Performance Optimization

1. **Code Splitting**: Next.js auto-splits per route; dynamic imports (`next/dynamic`) for heavy components (e.g., charts).  
2. **Image Optimization**: Use `<Image>` component for responsive, lazy-loaded images.  
3. **CSS Purging**: Tailwind JIT removes unused styles in production builds.  
4. **SSR & ISR**: Pre-renders frequently accessed pages, reducing client workload.  
5. **Caching**: Set proper `Cache-Control` headers on API routes and static assets. 
6. **Lazy Loading**: Defer modals, offscreen charts, and third-party scripts until needed.

## Testing and Quality Assurance

1. **Unit Tests**:
   - **Jest** + **React Testing Library** for components and hooks.  
   - Aim for >80% coverage on critical UI elements and utility functions.
2. **Integration Tests**:
   - Test component interactions and flows (e.g., login form → redirect → sidebar).  
3. **End-to-End (E2E) Tests**:
   - **Cypress** or **Playwright** to simulate user journeys (sign-in, role-based dashboard use, menu CRUD).  
4. **Accessibility Testing**:
   - **axe-core** or **jest-axe** integrated into unit tests.  
5. **Linting & Formatting**:
   - **ESLint** (with TypeScript and Next.js plugin) and **Prettier** for consistent code style.  
6. **Continuous Integration**:
   - Run tests, lint, and type checks on every pull request via GitHub Actions (or equivalent).

## Conclusion and Overall Frontend Summary

This frontend setup leverages Next.js, React, and Tailwind CSS to deliver a modern, responsive, and accessible dashboard for multiple restaurant tenants. Its component-based architecture, combined with server-side rendering and type safety, ensures that the application is both maintainable and performant. By following these guidelines—from design principles to testing strategies—you can confidently build out feature modules (Owner portal, Kitchen queue, Customer ordering) while preserving consistency, security, and a high-quality user experience across all roles.