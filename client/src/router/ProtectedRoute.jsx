/**
 * router/ProtectedRoute.jsx
 *
 * Route guard for authenticated routes.
 * - Shows loading spinner while session is being restored.
 * - Redirects to /login if not authenticated.
 * - Optionally checks allowed roles and redirects to /dashboard if unauthorized.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * @param {string[]} [roles] - Optional allowed roles. If empty, any auth user is allowed.
 * @param {string} [redirectTo] - Where to redirect if not authenticated. Default: /login
 */
const ProtectedRoute = ({ roles = [], redirectTo = '/login' }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // While restoring session from localStorage
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-blue" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading AssetFlow...</p>
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Role-based guard
  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
