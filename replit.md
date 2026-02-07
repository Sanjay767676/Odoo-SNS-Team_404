# SubsManager - Multi-Tenant Subscription Marketplace

## Overview
A full-stack subscription management system with three distinct role-based portals:
- **Admin Portal** - Company admins create products and assign to internal reviewers
- **Internal Portal** - Internal reviewers add subscription plans and publish products
- **User Portal** - End customers browse, subscribe, and manage subscriptions

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Shadcn UI + wouter routing
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Session-based (express-session)

## Project Structure
- `client/src/pages/login.tsx` - Login/Signup with role selection
- `client/src/pages/admin/` - Admin dashboard, products, reports
- `client/src/pages/internal/` - Internal dashboard (plan creation, publish), invoices
- `client/src/pages/user/` - Browse products, subscriptions, invoices, profile
- `client/src/components/app-sidebar.tsx` - Role-based sidebar navigation
- `client/src/lib/auth.tsx` - Auth context provider
- `client/src/lib/theme.tsx` - Dark mode theme provider
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database storage layer
- `server/seed.ts` - Seed data for demo
- `shared/schema.ts` - Drizzle schema + Zod validation

## Demo Accounts (password: Admin@123)
- Admin: admin@netflix.com, admin@aws.com
- Internal: sarah@internal.com, marcus@internal.com, priya@internal.com
- User: user@demo.com

## Key Flows
1. Admin creates product -> assigns to internal reviewer
2. Admin creates quotation templates with product lines and optional recurring plans
3. Internal adds subscription plans with discount options and tax percentage -> publishes product
4. Users browse published products -> apply discount codes -> subscribe with price breakdown -> invoices generated

## Discount System
- Plan-level discounts: "10% off first month", "Fixed ₹200 off" (set by internal reviewers)
- User discount codes: FIRST10 (10%), SAVE200 (₹200), WELCOME15 (15%), FLAT500 (₹500)
- Tax: Default 18% GST, configurable per plan
- Price breakdown: Subtotal -> Discount -> Tax -> Total (stored in subscriptions and invoices)

## Quotation Templates (Admin)
- Templates with name, validity days, optional recurring plan, and product lines
- Each product line has product, quantity, unit price, and calculated total
- API: GET/POST /api/quotation-templates, DELETE /api/quotation-templates/:id
