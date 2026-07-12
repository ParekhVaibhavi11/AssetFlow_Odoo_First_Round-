-- AssetFlow Database Seed File
-- Hashed passwords correspond to 'password123' (bcrypt hash: $2a$10$CT02UiGqtqI4mKbF6LuAFebWwQ1sR9PR9iDyKx5ekr8Dru/.ujQde)

-- 1. Insert Departments
INSERT INTO departments (id, name, parent_department_id, status) VALUES 
(1, 'Executive', NULL, 'Active'),
(2, 'IT Department', 1, 'Active'),
(3, 'HR Department', 1, 'Active'),
(4, 'Operations Department', 1, 'Active'),
(5, 'IT Helpdesk', 2, 'Active'); -- Hierarchical sub-department

-- 2. Insert Asset Categories with custom metadata configurations
INSERT INTO asset_categories (id, name, custom_fields) VALUES 
(1, 'Electronics', '[
    {"name": "manufacturer", "type": "text", "required": true},
    {"name": "model", "type": "text", "required": true},
    {"name": "warranty_months", "type": "number", "required": false}
]'::jsonb),
(2, 'Furniture', '[
    {"name": "material", "type": "text", "required": true},
    {"name": "dimensions", "type": "text", "required": false}
]'::jsonb),
(3, 'Vehicles', '[
    {"name": "license_plate", "type": "text", "required": true},
    {"name": "engine_number", "type": "text", "required": true},
    {"name": "next_service_date", "type": "date", "required": false}
]'::jsonb),
(4, 'Shared Spaces', '[
    {"name": "capacity", "type": "number", "required": true},
    {"name": "facilities", "type": "text", "required": false}
]'::jsonb);

-- 3. Insert Employees
INSERT INTO employees (id, name, email, password_hash, role, status, department_id) VALUES 
(1, 'System Admin', 'admin@assetflow.com', '$2a$10$CT02UiGqtqI4mKbF6LuAFebWwQ1sR9PR9iDyKx5ekr8Dru/.ujQde', 'Admin', 'Active', 1),
(2, 'Sarah Jenkins', 'manager@assetflow.com', '$2a$10$CT02UiGqtqI4mKbF6LuAFebWwQ1sR9PR9iDyKx5ekr8Dru/.ujQde', 'Asset Manager', 'Active', 2),
(3, 'John Doe', 'ithead@assetflow.com', '$2a$10$CT02UiGqtqI4mKbF6LuAFebWwQ1sR9PR9iDyKx5ekr8Dru/.ujQde', 'Department Head', 'Active', 2),
(4, 'Emily Vance', 'hrhead@assetflow.com', '$2a$10$CT02UiGqtqI4mKbF6LuAFebWwQ1sR9PR9iDyKx5ekr8Dru/.ujQde', 'Department Head', 'Active', 3),
(5, 'Priya Sharma', 'priya@assetflow.com', '$2a$10$CT02UiGqtqI4mKbF6LuAFebWwQ1sR9PR9iDyKx5ekr8Dru/.ujQde', 'Employee', 'Active', 2),
(6, 'Raj Patel', 'raj@assetflow.com', '$2a$10$CT02UiGqtqI4mKbF6LuAFebWwQ1sR9PR9iDyKx5ekr8Dru/.ujQde', 'Employee', 'Active', 4),
(7, 'David Miller', 'david@assetflow.com', '$2a$10$CT02UiGqtqI4mKbF6LuAFebWwQ1sR9PR9iDyKx5ekr8Dru/.ujQde', 'Employee', 'Active', 5);

-- Associate managers with their departments
UPDATE departments SET manager_id = 3 WHERE id = 2; -- IT Head
UPDATE departments SET manager_id = 4 WHERE id = 3; -- HR Head

-- 4. Insert Assets
INSERT INTO assets (id, name, category_id, asset_tag, serial_number, acquisition_date, acquisition_cost, condition, location, shared_bookable, status, department_id, assigned_to, custom_attributes, expected_return_date) VALUES 
(1, 'MacBook Pro 16"', 1, 'AF-0001', 'SN-MBP16001', '2025-01-15', 2499.00, 'Excellent', 'IT Office Room 204', FALSE, 'Allocated', 2, 5, '{"manufacturer": "Apple", "model": "MacBook Pro 16 M3", "warranty_months": 36}', '2026-12-31'),
(2, 'Dell XPS 15', 1, 'AF-0002', 'SN-DELLXPS02', '2025-03-10', 1850.00, 'Good', 'IT Storage', FALSE, 'Available', 2, NULL, '{"manufacturer": "Dell", "model": "XPS 15 9530", "warranty_months": 24}', NULL),
(3, 'Ergonomic Desk Chair', 2, 'AF-0003', 'SN-CHAIR-99', '2025-02-01', 350.00, 'Excellent', 'HQ Floor 1', FALSE, 'Available', 3, NULL, '{"material": "Mesh", "dimensions": "65x65x120 cm"}', NULL),
(4, 'Company Delivery Van', 3, 'AF-0004', 'SN-FORDVAN-01', '2024-06-18', 35000.00, 'Fair', 'Basement Garage G-12', TRUE, 'Available', 4, NULL, '{"license_plate": "NY-789-XYZ", "engine_number": "ENG-FORD-992288", "next_service_date": "2026-09-01"}', NULL),
(5, 'Main Conference Room B2', 4, 'AF-0005', 'CONF-B2', '2024-01-01', 0.00, 'Excellent', 'HQ Floor 2', TRUE, 'Available', 1, NULL, '{"capacity": 15, "facilities": "Projector, Whiteboard, Video Conference System"}', NULL),
(6, 'Lenovo ThinkPad X1', 1, 'AF-0114', 'SN-TPX1-4422', '2025-05-20', 1600.00, 'Good', 'HR Storage', FALSE, 'Allocated', 3, 4, '{"manufacturer": "Lenovo", "model": "ThinkPad X1 Carbon", "warranty_months": 12}', '2026-07-01');

-- 5. Insert Asset History Logs
INSERT INTO asset_history (asset_id, action, action_by, notes) VALUES 
(1, 'Registration', 2, 'Asset registered on system check-in by Asset Manager.'),
(1, 'Allocation', 2, 'Allocated to Priya Sharma. Expected return: 2026-12-31.'),
(2, 'Registration', 2, 'Dell laptop registered and stored in IT cabinet.'),
(4, 'Registration', 2, 'Ford Transit van registered as shared bookable fleet vehicle.'),
(5, 'Registration', 1, 'Conference Room B2 registered for online calendar booking.'),
(6, 'Registration', 2, 'ThinkPad laptop registered and allocated to Emily Vance.');

-- 6. Insert Resource Bookings (Overlaps verification testing)
-- Mock bookings for Conference Room B2 (asset_id = 5)
INSERT INTO bookings (id, asset_id, employee_id, start_time, end_time, status) VALUES 
(1, 5, 5, '2026-07-13 09:00:00', '2026-07-13 10:00:00', 'Upcoming'),
(2, 5, 6, '2026-07-13 10:00:00', '2026-07-13 11:30:00', 'Upcoming'),
(3, 4, 7, '2026-07-14 08:00:00', '2026-07-14 17:00:00', 'Upcoming');

-- 7. Insert Maintenance Requests
INSERT INTO maintenance (id, asset_id, reported_by, description, priority, status) VALUES 
(1, 4, 7, 'Rear brake pads squeaking, needs immediate inspection.', 'High', 'Pending');

-- 8. Insert Audit Cycles
INSERT INTO audits (id, name, scope_department_id, scope_location, start_date, end_date, status) VALUES 
(1, 'Q3 IT Asset Audit', 2, 'HQ Floor 2', '2026-07-01', '2026-07-31', 'Open');

-- 9. Insert Audit Results
INSERT INTO audit_results (audit_id, asset_id, audited_by, status, notes) VALUES 
(1, 1, 2, 'Verified', 'Verified in possession of Priya. Laptop is clean and working.'),
(1, 2, 2, 'Verified', 'Checked in IT cabinet.');

-- 10. Insert Notifications
INSERT INTO notifications (employee_id, title, message) VALUES 
(5, 'Asset Allocated', 'MacBook Pro 16" (AF-0001) has been successfully allocated to you.'),
(7, 'Booking Confirmed', 'Your booking for the Delivery Van (AF-0004) on 2026-07-14 is confirmed.');

-- 11. Insert System Audit Logs
INSERT INTO audit_logs (employee_id, action, details) VALUES 
(1, 'ROLE_PROMOTION', 'Promoted Sarah Jenkins to Asset Manager.'),
(1, 'ROLE_PROMOTION', 'Promoted John Doe to Department Head of IT.');

-- Reset sequence generator values so that SERIAL primary keys auto-increment correctly past the seeded IDs
SELECT setval('departments_id_seq', (SELECT MAX(id) FROM departments));
SELECT setval('asset_categories_id_seq', (SELECT MAX(id) FROM asset_categories));
SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));
SELECT setval('assets_id_seq', (SELECT MAX(id) FROM assets));
SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));
SELECT setval('maintenance_id_seq', (SELECT MAX(id) FROM maintenance));
SELECT setval('audits_id_seq', (SELECT MAX(id) FROM audits));
SELECT setval('audit_results_id_seq', (SELECT MAX(id) FROM audit_results));
SELECT setval('notifications_id_seq', (SELECT MAX(id) FROM notifications));
SELECT setval('audit_logs_id_seq', (SELECT MAX(id) FROM audit_logs));
SELECT setval('transfers_id_seq', 1);
