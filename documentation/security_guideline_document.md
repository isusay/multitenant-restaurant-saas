# Security Guidelines for multitenant-restaurant-saas

This document outlines the security best practices you must follow when extending and hardening the “multitenant-restaurant-saas” codebase. It is organized by core security principles and tailored to the project’s technology stack (Next.js, TypeScript, Better Auth, Drizzle ORM, PostgreSQL, Docker).

---

## 1. Security by Design & Architecture

- Embed security reviews into each feature milestone: design, implementation, testing, and deployment.
- Define a threat model for multitenancy, identifying data-flow boundaries between tenants (restaurants) and user roles.
- Enforce the **principle of least privilege** on every service, API route, database connection, and Docker container.
- Implement **defense in depth** by layering authentication, authorization, input validation, and encryption.
- Fail securely: ensure errors expose minimal information (no stack traces in production).

---

## 2. Authentication & Access Control

### 2.1 Robust Authentication
- Use Better Auth’s strongest available flows, enforcing MFA for Restaurant Owners and Super Admins.
- Enforce strong password policies (minimum length 12, complexity rules) and secure storage (bcrypt or Argon2 with unique salt).
- Protect against brute-force: apply rate limiting (e.g., 5 attempts per 10 minutes) and account lockout after repeated failures.

### 2.2 Session & Token Management
- If using JWTs: sign with RS256 or HS256, never accept `alg=none`.
- Validate `exp`, `iat`, and `aud` claims on every request.
- Store tokens in HttpOnly, Secure, SameSite-strict cookies to mitigate XSS/CSRF.
- Implement idle and absolute session timeouts with automatic logout flows.

### 2.3 Role-Based Access Control (RBAC)
- Extend your `users` schema with a `role` field: `owner`, `staff`, `super_admin`, etc.
- Enforce authorization in Next.js Middleware and at the API-route level:
    - Verify `restaurantId` in JWT/session matches requested resource.
    - Block actions (menu CRUD, billing, onboarding) for unauthorized roles.
- Log all authorization failures for audit trails.

---

## 3. Input Validation & Output Encoding

- Treat *all* client data as untrusted.
- Use schema-based validation (e.g., Zod, Joi) on API routes for JSON bodies and query parameters.
- Rely exclusively on Drizzle ORM parameterized queries to prevent SQL injection.
- Sanitize dynamic HTML before server-side rendering; apply React’s built-in escaping for user content.
- Validate file uploads (type, size, extension) and store them outside the public webroot.
- For any redirects (e.g., after login), enforce an allow-list of safe URLs to prevent open redirects.

---

## 4. Data Protection & Privacy

- Enforce TLS 1.2+ for all inbound and outbound connections.
- Encrypt sensitive data at rest:
    - Use PostgreSQL’s Transparent Data Encryption or filesystem-level encryption (e.g., LUKS).
    - Hash all passwords with Argon2 or bcrypt.
- Use a secrets manager (AWS Secrets Manager, Vault) for database credentials, API keys, and JWT signing keys—never store secrets in Git or `.env` files.
- Mask or redact PII in logs; sanitize error messages to avoid leaking internal state.
- Implement data retention policies and GDPR/CCPA-compliant deletion for tenant data upon request.

---

## 5. API & Service Security

- Enforce HTTPS and HSTS for all API endpoints.
- Implement per-tenant rate limiting and global throttling using a tool like `express-rate-limit` or an API gateway.
- Apply strict CORS policies, allowing only known origins (`dashboard.example.com`, etc.).
- Version APIs (`/api/v1/...`) to manage breaking changes safely.
- Return minimal data in API responses; avoid overfetching user or tenant metadata.
- Validate HTTP methods: only use GET for reads, POST for creates, PUT/PATCH for updates, DELETE for deletions.

---

## 6. Web Application Security Hygiene

- Enable security headers in Next.js’s `next.config.js` or via custom server:
    - Content-Security-Policy (CSP)
    - X-Content-Type-Options: `nosniff`
    - X-Frame-Options: `DENY`
    - Referrer-Policy: `no-referrer-when-downgrade`
    - Strict-Transport-Security: `max-age=31536000; includeSubDomains`
- Protect state-changing requests with CSRF tokens (e.g., `@/lib/csrf.ts`).
- Set all cookies `HttpOnly`, `Secure`, and `SameSite=Strict` where possible.
- Use Subresource Integrity (SRI) for any third-party scripts loaded from CDNs.
- Avoid storing any user tokens or PII in `localStorage` or `sessionStorage`.

---

## 7. Infrastructure & Configuration Management

- Harden host OS and container images:
    - Use minimal base images (e.g., `node:18-alpine`).
    - Remove unnecessary packages and disable root login inside containers.
- Expose only required ports; firewall all others.
- Scan Docker images for vulnerabilities (e.g., using Trivy) and rebuild when base images update.
- Disable debug and verbose logging in production builds.
- Automate TLS certificate issuance and renewal (e.g., Let’s Encrypt with Certbot or AWS ACM).

---

## 8. Dependency Management

- Lock dependencies with `package-lock.json` (or `yarn.lock`).
- Vet all third-party packages for active maintenance and known CVEs.
- Integrate an SCA tool (e.g., Dependabot, Snyk) for automated vulnerability alerts.
- Review and update critical libraries quarterly.
- Remove unused dependencies to minimize attack surface.

---

## 9. DevOps & CI/CD Security

- Store CI credentials and deployment secrets in secure vaults; never echo secrets in pipeline logs.
- Require branch protection rules and code reviews before merging to `main`.
- Run automated security tests in pipeline:
    - Static Application Security Testing (SAST)
    - Dependency vulnerability scans
    - Integration tests for tenant isolation and RBAC enforcement
- Deploy behind a web application firewall (WAF) and DDoS protection service.
- Monitor application health and security events; configure alerts for anomalous behavior (failed logins, sudden traffic spikes).

---

## Conclusion
By adhering to these guidelines, you will build a resilient, privacy-preserving, and secure multitenant SaaS platform. Incorporate security checks into every sprint, and perform regular audits to maintain compliance with industry standards and data protection regulations.