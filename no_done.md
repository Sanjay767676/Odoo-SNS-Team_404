# Gap Analysis: Missing Features & Corrections

This document outlines the gaps between the current implementation and the requirements in `Subscription Management System.pdf`.

## ❌ Not Done (Missing Features)

### 1. Authentication Module
- **Reset Password (Section 5.3)**: 
    - Server-side email verification and token generation logic.
    - Frontend pages for "Forgot Password" and "Reset Password".
    - Email integration (SMTP/API) to send reset links.

### 2. Admin Operational Management (Crucial Misses)
- **Admin Subscription Portal**: 
    - There is currently no page for the Admin to view, filter, or manage all customer subscriptions.
- **Admin Invoice Management**: 
    - Missing UI for the "Actions" described in the PDF: **Confirm**, **Cancel**, **Send**, and **Print**.
    - No central list of all system-wide invoices for the Admin.
- **Payment History View**: 
    - No page to view a ledger of all payments recorded in the system.

### 3. Product & Multi-Tenancy Enhancements
- **User-Side Variant Selection**: 
    - The `UserBrowse` page (Marketplace) allows subscribing to a plan but **does not** let the user select a Product Variant (e.g., Brand: Odoo) even if variants are defined.
- **Variant Pricing Impact**: 
    - Extra prices defined in variants are currently NOT added to the subscription total during checkout.

### 4. Subscription Workflow (Section 9)
- **Status Lifecycle Implementation**: 
    - The system lacks the `Draft` → `Quotation` → `Confirmed` workflow. Subscriptions start as `Active` immediately.
- **Quotation Templates integration**: 
    - Admins can create templates, but there is no feature to "Send Quote" to a user based on a template.

---

## 🛠️ Corrections Needed

### 1. Database & Backend
- **Subscription Numbering**: UUIDs are used currently. Requirement 9.0 implies a human-readable "Subscription Number" (e.g., `SUB-001`).
- **Subscription Expiry Automation**: Background task to mark expired subscriptions as `Closed` is not fully implemented.

### 2. User Interface (UI/UX)
- **Invoice Status Visibility**: The `sent` and `printed` backend statuses need corresponding badges/filters in the UI.
- **Branding Consistency**: Ensure the "Primary Color" set in Admin Settings dynamic applies to all interactive elements (buttons, links) in the User Portal.

### 3. Validation Rules (Section 5.4)
- **Signup Validations**: Ensure the frontend signup form strictly prevents passwords without uppercase/special characters before even hitting the API.
