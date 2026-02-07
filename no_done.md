# Gap Analysis: Missing Features & Corrections

Based on the requirements in `Subscription Management System.pdf`, the following features are currently **not done** or require **correction** to meet the full specification.

## ❌ Not Done (Missing Features)

### 1. Authentication Module
- **Reset Password (Section 5.3)**: 
    - Email verification logic.
    - Sending reset links to registered emails.
    - Password reset confirmation UI.

### 2. Product Management
- **Structured Variants UI (Section 8)**: 
    - Dedicated interface for adding/editing variants with fields for **Attribute**, **Value**, and **Extra Price**.
    - Applying extra price logic during the checkout/subscription process.

### 3. Subscription Management
- **Subscription Lifecycle Statuses (Section 9)**: 
    - Implementation of the `Draft` and `Quotation` phases within the Subscription lifecycle.
    - A mechanism to move a subscription from `Quotation` to `Confirmed`.
    - `Closed` status handling (end-of-life for a subscription).

### 4. Workflow Integration
- **Quotation to Subscription Conversion**: 
    - Missing a button/action to convert a **Quotation Template** or a **Draft Subscription** directly into an **Active Subscription**.

---

## 🛠️ Corrections Needed

### 1. User Interface
- **Subscription Numbering**: Replace or supplement internal UUIDs with human-readable serial numbers (e.g., `SUB-2026-001`) as implied by the "Subscription Number" requirement.
- **Invoice Status Visibility**: The `sent` and `printed` states are implemented in the backend but should be more prominently visible/trackable in the User Portal's invoice list.

### 2. Functional Logic
- **Subscription Expiration**: While `endDate` exists, an automated background task to transition status to `Closed` or `Expired` upon reaching the date is not fully verified.
- **Variant Pricing**: The subscription total calculation needs to be updated to account for "Extra Price" from selected product variants.
