# FleetPro — Modern Fleet Management Web Application

A responsive, production-ready Fleet Management web application built with **Next.js (App Router, React 19, TypeScript)** and **Tailwind CSS**, designed for direct connection with **Supabase**.

---

## Features Overview

### 1. Supabase Auth & Role-Based Protection
- Two roles: **`ADMIN`** and **`DRIVER`**.
- Next.js SSR middleware session management and role guards.
- Unauthenticated users are redirected to `/login`.
- Drivers are restricted to `/driver/*` routes; Admins have full access to `/admin/*` and management tools.
- Instant One-Click Demo Mode available for testing immediately without remote Supabase setup.

### 2. Driver Dashboard (`/driver`)
- **Big Start / End Duty Toggle**:
  - Automatically records start and end timestamps in `duty_sessions` in **Asia/Kolkata (IST)** timezone.
  - Live duration timer while on duty.
  - Confirmation dialog before ending duty.
- **Add Trip Flow with Confirmation Modal**:
  - Select client company from active companies.
  - Enter One-Side KM.
  - Select `ONE_SIDE` (multiplier 1) or `TWO_SIDE` (multiplier 2).
  - **Confirmation Modal** explicitly calculates and displays:  
    `One-Side KM × Multiplier = Total KM` before submitting!
- **Add Fuel Flow**:
  - Quick toggle between **CNG** and **PETROL**.
  - Amount spent (₹) and date (defaults to today in IST).
  - Quantity in Kg/Liters and station notes.
- **Today's Summary Card**:
  - Shift Start and End time in IST (`hh:mm a`).
  - Working Hours (calculated difference with live timer).
  - Total Trips count for today.
  - Total KM accumulated today.
  - Fuel Expense (₹) logged today.
  - **Fuel Cost / KM** (`Fuel Expense / Total KM`) calculated in real time.

### 3. Admin Operations Portal (`/admin`)
- **7 Summary Metric Cards**:
  1. Total Drivers
  2. Active Drivers
  3. On-Duty Drivers (currently active duty sessions)
  4. Today's Trips
  5. Today's KM
  6. Today's Fuel Expense (₹)
  7. Today's Fuel Cost / KM (₹/KM)
- **Management Screens**:
  - **Drivers (`/admin/drivers`)**: Register drivers, view license numbers, assign fleet vehicles, edit records, toggle active/deactivate.
  - **Vehicles (`/admin/vehicles`)**: Register vehicle license plates, models, fuel types (CNG/Petrol), edit, toggle active/deactivate.
  - **Companies (`/admin/companies`)**: Register client companies, contact details, per-KM billing rates, edit, toggle active/deactivate.
- **Reports & Analytics (`/admin/reports`)**:
  - Filter by Date Range (Start Date, End Date), Driver, and Company.
  - Real-time aggregate KPI strip (Filtered Distance, Fuel, Cost/KM).
  - Activity breakdown table.
  - **Multi-Format One-Click Export**:
    - **Excel (.xlsx)** via SheetJS
    - **CSV (.csv)** with UTF-8 BOM
    - **PDF (.pdf)** with autoTable formatting and summary header

---

## Supabase Database Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. In your Supabase Dashboard:
   - Go to **Project Settings -> API**.
   - Copy **Project URL** into `NEXT_PUBLIC_SUPABASE_URL`.
   - Copy **anon public key** into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Open the Supabase **SQL Editor** and execute the entire script located in `supabase/schema.sql`.
   - This creates all tables (`profiles`, `vehicles`, `companies`, `duty_sessions`, `trips`, `fuel_logs`), RLS policies, automated `handle_new_user` triggers, and seed demo records.

---

## Local Development & Build

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```
