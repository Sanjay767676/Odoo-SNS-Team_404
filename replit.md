# SubsManager - Multi-Tenant Subscription Marketplace

## Overview
A full-stack subscription management system with three distinct role-based portals:
- **Admin Portal** - Company admins create products, assign reviewers, manage settings/discounts/taxes
- **Internal Portal** - Internal reviewers add subscription plans and publish products
- **User Portal** - End customers browse, subscribe, and manage subscriptions

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Shadcn UI + wouter routing
- **Backend**: Express.js + TypeScript + node-cron (daily invoice generation)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Session-based (express-session)
- **Cross-platform**: Uses cross-env for environment variables

## Project Structure
- `client/src/pages/login.tsx` - Login/Signup with role selection
- `client/src/pages/admin/` - Admin dashboard, products, reports, quotation templates, settings
- `client/src/pages/internal/` - Internal dashboard (plan creation, publish), invoices
- `client/src/pages/user/` - Browse products, subscriptions, invoices, profile
- `client/src/components/app-sidebar.tsx` - Role-based sidebar navigation
- `client/src/lib/auth.tsx` - Auth context provider
- `client/src/lib/theme.tsx` - Dark mode theme provider
- `server/routes.ts` - All API endpoints + cron job
- `server/storage.ts` - Database storage layer
- `server/seed.ts` - Seed data for demo
- `shared/schema.ts` - Drizzle schema + Zod validation

## Database Tables
- **users** - id, email, password, name, role, companyId
- **companies** - id, name, logoUrl, primaryColor, createdById
- **products** - id, name, type, salesPrice, costPrice, variants, adminId, assignedInternalId, status, companyName
- **plans** - id, productId, name, price, billingPeriod, minQuantity, options (pausable, renewable, closable, autoClose), discountType, discountValue, taxPercent
- **subscriptions** - id, userId, productId, planId, quantity, status, startDate, endDate, pricing fields
- **invoices** - id, subscriptionId, userId, amount, status, dueDate, paidDate, lines, tax fields
- **payments** - id, invoiceId, amount, method, date
- **discounts** - id, companyId, name, type, value, minPurchase, minQuantity, dates, limitUsage, usedCount
- **taxes** - id, companyId, name, percentage, type
- **quotation_templates** - id, name, validityDays, recurringPlanId, productLines, adminId

## Demo Accounts (password: Admin@123)
- Admin: admin@netflix.com, admin@aws.com
- Internal: sarah@internal.com, marcus@internal.com, priya@internal.com
- User: user@demo.com

## Key Flows
1. Admin creates product -> assigns to internal reviewer
2. Admin creates quotation templates with product lines and optional recurring plans
3. Admin manages settings, discounts, and tax configurations
4. Internal adds subscription plans with discount options and tax percentage -> publishes product
5. Users browse published products -> apply discount codes -> subscribe with price breakdown -> invoices generated
6. Daily cron job auto-generates invoices for active subscriptions

## API Endpoints
### Auth
- POST /api/auth/signup, /api/auth/login, /api/auth/logout, GET /api/auth/me

### Products & Plans
- GET/POST /api/products, PATCH /api/products/:id/assign, PATCH /api/products/:id/publish
- GET/POST /api/plans

### Subscriptions & Invoices
- GET/POST /api/subscriptions
- GET /api/invoices, PATCH /api/invoices/:id/pay
- POST /api/discount-codes/validate

### Companies, Payments, Discounts, Taxes
- GET/POST /api/companies
- GET/POST /api/payments
- GET/POST/DELETE /api/discounts, /api/discounts/:id
- GET/POST/DELETE /api/taxes, /api/taxes/:id

### Quotation Templates
- GET/POST /api/quotation-templates, DELETE /api/quotation-templates/:id

## Discount System
- Plan-level discounts: "10% off first month", "Fixed ₹200 off" (set by internal reviewers)
- User discount codes: FIRST10 (10%), SAVE200 (₹200), WELCOME15 (15%), FLAT500 (₹500)
- Database-managed discounts: Admin can create custom discounts via /api/discounts
- Tax: Default 18% GST, configurable per plan or via /api/taxes
