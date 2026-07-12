import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Allocation from './pages/Allocation';
import Bookings from './pages/Bookings';
import Maintenance from './pages/Maintenance';
import Audit from './pages/Audit';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import OrgSetup from './pages/OrgSetup';
import Employees from './pages/Employees';
import { LogOut } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);

  // Return user initials for the profile avatar tag
  const getInitials = (name) => {
    if (!name) return 'FT';
    const split = name.split(' ');
    if (split.length > 1) return `${split[0][0]}${split[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="app-container">
      {/* 1. Sidebar Nav */}
      <Navbar />
      
      {/* 2. Main Content Frame */}
      <main className="main-content">
        {/* Top profile settings headers */}
        <div className="top-nav">
          <div className="user-profile">
            <div className="avatar">{getInitials(user?.name)}</div>
            <div className="user-details">
              <span className="user-name">
                {user?.name || 'falguni Thakor'}
                <span className="role-badge">{user?.role || 'Administrator'}</span>
              </span>
              <span className="user-email">{user?.email || 'falgunithakor987@gmail.com'}</span>
            </div>
          </div>
          
          <button className="btn-signout" onClick={logout}>
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>

        {/* Dynamic page contents */}
        {children}
      </main>
    </div>
  );
};

const PrivateRoute = ({ children }) => {
  const { token, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        <p>Validating authentication token...</p>
      </div>
    );
  }

  return token ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Secured Routes */}
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/assets" element={<PrivateRoute><Assets /></PrivateRoute>} />
      <Route path="/allocation" element={<PrivateRoute><Allocation /></PrivateRoute>} />
      <Route path="/bookings" element={<PrivateRoute><Bookings /></PrivateRoute>} />
      <Route path="/maintenance" element={<PrivateRoute><Maintenance /></PrivateRoute>} />
      <Route path="/audit" element={<PrivateRoute><Audit /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/org-setup" element={<PrivateRoute><OrgSetup /></PrivateRoute>} />
      <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />

      {/* Wildcard redirect */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
