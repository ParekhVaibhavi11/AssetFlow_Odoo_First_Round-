# 🚀 AssetFlow
### Enterprise Asset & Resource Management System

AssetFlow is a full-stack ERP application built during an 8-hour hackathon. It helps organizations manage assets, employees, departments, resource bookings, maintenance workflows, audits, and analytics from a centralized platform.

---

## 👨‍💻 Team

| Name | Responsibility |
|------|----------------|
| Member 1 | Authentication & Database |
| Member 2 | Asset & Allocation Backend |
| Member 3 | Frontend Dashboard & UI |
| Member 4 | Booking, Maintenance & Reports |

---

# 🛠 Tech Stack

### Frontend
- React.js
- Vite
- Venila CSS
- React Router DOM
- Axios

### Backend
- Node.js
- Express.js

### Database
- PostgreSQL
- Prisma ORM

### Authentication
- JWT
- bcrypt

---

# 📂 Project Structure

```
assetflow/
│
├── client/
│
└── server/
```

---

# Features

## Authentication
- Login
- Signup
- JWT Authentication
- Role Based Access

## Organization
- Departments
- Employees
- Asset Categories

## Asset Management
- Register Assets
- Update Asset
- Asset Lifecycle
- Asset History

## Allocation
- Allocate Asset
- Return Asset
- Transfer Request

## Resource Booking
- Calendar Booking
- Conflict Detection

## Maintenance
- Raise Request
- Approval Workflow
- Resolution Tracking

## Audit
- Audit Cycle
- Verification
- Discrepancy Report

## Dashboard
- KPI Cards
- Notifications
- Reports

---

# User Roles

### Admin
- Manage Departments
- Manage Employees
- Assign Roles
- Analytics

### Asset Manager
- Register Assets
- Allocate Assets
- Maintenance Approval

### Department Head
- Approve Transfers
- Department Assets

### Employee
- Book Resources
- Raise Maintenance
- Return Assets

---

# Installation

## Clone Repository

git clone <repository-url>

cd assetflow

---

## Frontend

cd client

npm install

npm run dev

---

## Backend

cd server

npm install

npx prisma generate

npx prisma migrate dev

npm run dev

---

# Environment Variables

## Server (.env)

PORT=5000

DATABASE_URL="postgresql://username:password@localhost:5432/assetflow"

JWT_SECRET=your_secret_key

---

# Git Workflow

main

feature/auth

feature/assets

feature/dashboard

feature/booking

feature/reports

---

# Future Scope

- QR Code Scanning
- Email Notifications
- Cloud Storage
- AI Analytics
- Mobile App

---

# License

MIT License
