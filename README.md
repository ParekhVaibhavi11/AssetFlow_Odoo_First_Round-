# AssetFlow - Enterprise Asset & Resource Management System

AssetFlow is a high-fidelity, full-stack **PERN (PostgreSQL, Express, React, Node.js)** enterprise application designed to track physical assets, manage department allocations, schedule shared bookable resources, route maintenance tickets, and perform audits.

The application features a modern, responsive user interface styled with premium HSL color tokens, dark mode support, glassmorphic panels, and smooth micro-animations.

---

## 🚀 Key Features

### Frontend
- React.js
- Vite
- Venila CSS
- React Router DOM
- Axios
* 📊 **Live Analytics Dashboard:** Metric KPI counters, overdue checkout warnings, quick action navigation shortcuts, and chronological activity feeds.
* 📦 **Dynamic Asset Registry:** Centralized directory supporting dynamic forms that render category-specific properties (e.g. warranty, manufacturer) stored as JSONB.
* 🔄 **Allocation & Transfer Workflows:** Check-out assets to staff/departments, log returned condition notes, and review transfer requests. Includes conflict warnings if an asset is already checked out.
* 📅 **Resource Bookings:** Interactive week agendas and calendar slots for shared assets (e.g., conference rooms, vans) with automatic time-slot overlap blocking.
* 🛠️ **Maintenance Management:** File repair requests, assign technicians, and track ticket status. Asset statuses update between `Available` ↔ `Under Maintenance` automatically.
* 🔍 **Audit Cycles & Reconciliation:** Scoped audit launches, checklist verifications (Verified/Missing/Damaged), and reconciliation closures that set missing items to `Lost`.
* 📈 **Reports & Analytics:** Segment utilization bars, department valuations, ticket tables, hourly booking heatmaps, and one-click CSV report exports.
* ⚙️ **Org Settings (Admin Gates):** Hierarchical department structures, custom category attributes builders, and employee promotion directories.
* 🔔 **Alerts & System Logs:** Personal notification inbox (read/all-read actions) and a System Audit Log trail.

---

## 🛠️ Tech Stack

* **Frontend:** React.js, Vite, React Router, Lucide Icons, Vanilla CSS (Variables, HSL Palettes, Glassmorphism).
* **Backend:** Node.js, Express, pg (PostgreSQL Client), JSON Web Tokens (JWT), Bcrypt.js (Password Hashing).
* **Database:** PostgreSQL (V14+) with constraints, parent-child department foreign keys, and indexes.

---

## 📂 Project Structure

```text
assetflow/
├── backend/
│   ├── db/
│   │   ├── index.js          # PostgreSQL pool connection
│   │   ├── init.js           # Database table builder & seeder script
│   │   ├── schema.sql        # Database tables & constraints
│   │   └── seed.sql          # Initial mock seeder records
│   ├── middleware/
│   │   └── auth.js           # JWT verification & role authorization
│   ├── routes/
│   │   ├── auth.js           # Authentication & directory
│   │   ├── org.js            # Departments & categories
│   │   ├── assets.js         # Asset directory registry
│   │   ├── allocations.js    # Checkouts, returns, transfers
│   │   ├── bookings.js       # Resource slots schedules
│   │   ├── maintenance.js    # Tickets & repair triggers
│   │   ├── audits.js         # Audit lists checklists
│   │   ├── dashboard.js      # Stats counts & activity streams
│   │   ├── analytics.js      # Reports, valuation, heatmap data
│   │   └── notifications.js  # Notifications & audit logs
│   ├── .env                  # Environment config variables
│   ├── index.js              # Express app entrypoint
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx    # Sidebar navigation menu
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Login/Logout validation state
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Assets.jsx
│   │   │   ├── Allocation.jsx
│   │   │   ├── Bookings.jsx
│   │   │   ├── Maintenance.jsx
│   │   │   ├── Audit.jsx
│   │   │   ├── OrgSetup.jsx
│   │   │   ├── Employees.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Notifications.jsx
│   │   ├── utils/
│   │   │   └── api.js        # API fetch wrapper
│   │   ├── App.jsx           # Routes routing structure
│   │   ├── index.css         # Typography, global HSL classes
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md                 # Project documentation
```

---

## ⚙️ Installation & Setup

### **Prerequisites**
* [Node.js](https://nodejs.org/) (v16+)
* [PostgreSQL](https://www.postgresql.org/) (v14+) running locally

---

### **1. Backend Database Config**
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install server dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` root directory and add your connection string and security details:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/assetflow
   JWT_SECRET=supersecretkey12345
   ```
4. Run the database initializer to create all tables and populate seed data:
   ```bash
   npm run db:init
   ```
5. Start the API server:
   ```bash
   npm run start
   ```
   The backend will start running at `http://localhost:5000`.

---

### **2. Frontend Setup**
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install client dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173/`.

---

## 🔐 Credentials for Testing

Use the following seeded accounts to test different role capabilities:

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `admin@assetflow.com` | `password123` |
| **Asset Manager** | `manager@assetflow.com` | `password123` |
| **Department Head** | `ithead@assetflow.com` | `password123` |
| **Standard Employee** | `priya@assetflow.com` | `password123` |
