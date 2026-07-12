/**
 * router/AppRouter.jsx
 *
 * Application route definitions.
 *
 * Route map:
 * /              → redirect to /login
 * /login         → LoginPage (public)
 * /register      → RegisterPage (public — admin one-time setup)
 * /change-password → ChangePasswordPage (authenticated — any role)
 * /dashboard     → DashboardPage (authenticated — any role)
 * /users/create  → CreateEmployeePage (authenticated — ADMIN only)
 * *              → 404 redirect to /login
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LoginPage          from '../pages/LoginPage';
import RegisterPage       from '../pages/RegisterPage';
import ChangePasswordPage from '../pages/ChangePasswordPage';
import DashboardPage      from '../pages/DashboardPage';
import CreateEmployeePage from '../pages/CreateEmployeePage';
import EmployeeListPage   from '../pages/EmployeeListPage';

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {/* Default → Login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public routes */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected: any authenticated user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/dashboard"       element={<DashboardPage />} />
      </Route>

      {/* Protected: ADMIN only */}
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route path="/users/create" element={<CreateEmployeePage />} />
        <Route path="/employees"    element={<EmployeeListPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
