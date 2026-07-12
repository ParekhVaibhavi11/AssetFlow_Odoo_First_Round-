-- AssetFlow Database Schema
-- Target: PostgreSQL (v14+)

-- Drop tables if they exist to allow clean initialization
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_results CASCADE;
DROP TABLE IF EXISTS audits CASCADE;
DROP TABLE IF EXISTS maintenance CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS asset_history CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS asset_categories CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- 1. Departments Table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    manager_id INT, -- Will reference employees(id) later via ALTER TABLE to avoid circular dependency
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Asset Categories Table
CREATE TABLE asset_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    custom_fields JSONB DEFAULT '[]'::jsonb, -- Store category-specific schema (e.g. [{"name": "warranty_months", "type": "number", "required": true}])
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Employees Table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) DEFAULT 'Employee' CHECK (role IN ('Admin', 'Asset Manager', 'Department Head', 'Employee')),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Apply the circular reference foreign key on departments
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager 
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- 4. Assets Table
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category_id INT REFERENCES asset_categories(id) ON DELETE RESTRICT,
    asset_tag VARCHAR(50) UNIQUE NOT NULL, -- e.g. AF-0001, AF-0002
    serial_number VARCHAR(100),
    acquisition_date DATE NOT NULL,
    acquisition_cost DECIMAL(12,2) DEFAULT 0.00,
    condition VARCHAR(50) DEFAULT 'Excellent' CHECK (condition IN ('Excellent', 'Good', 'Fair', 'Poor')),
    location VARCHAR(150),
    shared_bookable BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'Available' CHECK (status IN (
        'Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed'
    )),
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    assigned_to INT REFERENCES employees(id) ON DELETE SET NULL,
    custom_attributes JSONB DEFAULT '{}'::jsonb, -- Store actual key-value values matching custom_fields
    expected_return_date DATE,
    photo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Asset History / Audit Trail Table
CREATE TABLE asset_history (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'Registration', 'Allocation', 'Return', 'Transfer', 'Maintenance', 'Audit'
    action_by INT REFERENCES employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Asset Transfers Table
CREATE TABLE transfers (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    from_employee_id INT REFERENCES employees(id) ON DELETE SET NULL,
    to_employee_id INT REFERENCES employees(id) ON DELETE SET NULL,
    requested_by INT REFERENCES employees(id) ON DELETE SET NULL,
    approved_by INT REFERENCES employees(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Resource Bookings Table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Ongoing', 'Completed', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_booking_times CHECK (start_time < end_time)
);

-- 8. Maintenance Management Table
CREATE TABLE maintenance (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    reported_by INT REFERENCES employees(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN (
        'Pending', 'Approved', 'Rejected', 'Technician Assigned', 'In Progress', 'Resolved'
    )),
    assigned_technician VARCHAR(100),
    photo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- 9. Audits Table
CREATE TABLE audits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    scope_department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    scope_location VARCHAR(150),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Results / Verification Table
CREATE TABLE audit_results (
    id SERIAL PRIMARY KEY,
    audit_id INT REFERENCES audits(id) ON DELETE CASCADE,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    audited_by INT REFERENCES employees(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Verified', 'Missing', 'Damaged')),
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Full System Activity Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create basic indexes to optimize queries
CREATE INDEX idx_assets_tag ON assets(asset_tag);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_bookings_times ON bookings(start_time, end_time);
CREATE INDEX idx_maintenance_status ON maintenance(status);
