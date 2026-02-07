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
2. Internal adds subscription plans -> publishes product
3. Users browse published products -> subscribe -> invoices generated
