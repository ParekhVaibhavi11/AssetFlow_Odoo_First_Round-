import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Box, 
  Repeat, 
  Calendar, 
  Wrench, 
  ClipboardCheck, 
  BarChart2, 
  Bell, 
  Settings, 
  Users 
} from 'lucide-react';

const Navbar = () => {
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Assets', path: '/assets', icon: Box },
    { name: 'Allocation', path: '/allocation', icon: Repeat },
    { name: 'Bookings', path: '/bookings', icon: Calendar },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Audit', path: '/audit', icon: ClipboardCheck },
    { name: 'Reports', path: '/reports', icon: BarChart2 },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Org Setup', path: '/org-setup', icon: Settings },
    { name: 'Employees', path: '/employees', icon: Users },
  ];

  return (
    <nav className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">AF</div>
        <span className="logo-text">AssetFlow</span>
      </div>
      
      <div className="nav-label">Navigation</div>
      
      <ul className="nav-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.name}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                end={item.path === '/'}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Navbar;
