# SubHub - Subscription Management System

Welcome to SubHub! This is a modern subscription marketplace and management system built with React, Express, and PostgreSQL (Drizzle ORM).

## Project Structure

To make it easier for you to navigate, here is an overview of the folders:

- **`backend/`**: Contains the server-side code (Express.js).
  - `routes.ts`: This is where all the API endpoints are defined.
  - `storage.ts`: Handles all database operations (saving/fetching data).
  - `mail.ts`: Logic for sending OTP and Reset emails.
  - `index.ts`: The entry point for the backend server.
- **`frontend/`**: Contains the client-side code (React + Vite).
  - `src/pages/`: All the different pages of the website.
    - `admin/`: Pages for the Company Admin.
    - `auth/`: Login, Signup, OTP Verification, and Password Reset pages.
    - `internal/`: Pages for the Internal Reviewer/Staff.
    - `user/`: Pages for the Marketplace and Customer portal.
  - `src/components/`: Reusable UI elements like buttons, cards, and inputs.
  - `src/lib/`: Helper functions, including authentication context (`auth.tsx`).
- **`shared/`**: Contains code that both the frontend and backend use.
  - `schema.ts`: Defines the database tables and data validation rules using Zod.

## Setup Instructions

1. **Database**: Ensure your PostgreSQL database is running and matching the `DATABASE_URL` in your `.env` file.
2. **Environment Variables**:
   - `SMTP_USER` & `SMTP_PASS`: Your Gmail credentials for sending emails.
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID for the frontend.
3. **Running the App**:
   - Run `npm run dev` in the root folder to start both frontend and backend.
   - The frontend will be available at `http://localhost:5173` (or similar).
   - The backend runs at `http://localhost:5000`.

## Key Features Implemented
- **Secure Auth**: OTP-verified signup and password reset.
- **Google Login**: One-click login with role detection.
- **Product Workflow**: Admin creates -> Internal Approves -> User Subscribes.
- **Real-time Search**: Search bar implemented for all users.
