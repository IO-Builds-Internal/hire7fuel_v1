-- ============================================================================
-- Hire7 Fuel Database Migration Script
-- Designed for Supabase / PostgreSQL
-- ============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SETTINGS TABLE
-- Stores key-value overrides for branding, contacts, and social URLs.
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial settings matching config.js
INSERT INTO settings (key, value) VALUES
('brand_name', 'Hire7 Fuel'),
('brand_tagline', 'Powering Success with Every Drop'),
('logo_url', '/assets/logo.png'),
('contact_phone', '(905) 965-0308'),
('contact_email', 'support@hire7fuel.com'),
('contact_address', '2575 Steeles Ave E, Unit 1, Brampton, ON'),
('social_linkedin', ''),
('social_facebook', ''),
('social_instagram', '')
ON CONFLICT (key) DO NOTHING;

-- 2. JOBS TABLE
-- Stores active job postings shown dynamically on /careers page.
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT NOT NULL, -- Stored as newline-separated list
    type VARCHAR(100) DEFAULT 'Full-time', -- e.g. Full-time, Part-time, Contract
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SUBMISSIONS TABLE
-- Stores inquiry forms, fuel card signups, and job applications.
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'contact', 'fuelcard', 'career'
    payload JSONB NOT NULL,    -- Stores all submitted form data structures dynamically
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(active);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(type);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);

-- 4. API USERS TABLE (UAT)
CREATE TABLE IF NOT EXISTS api_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email_id VARCHAR(255) NOT NULL,
    address TEXT,
    api_token VARCHAR(255),
    role VARCHAR(100) NOT NULL DEFAULT 'Client',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_id VARCHAR(255) NOT NULL,
    user_status BOOLEAN DEFAULT true,
    phone_no VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    reset_token VARCHAR(255),
    reset_token_expiry VARCHAR(255),
    currency VARCHAR(50),
    broker_id VARCHAR(255),
    client_active BOOLEAN DEFAULT true,
    carrier_id INT
);

-- Seed baseline UAT user
INSERT INTO api_users (username, password, email_id, address, api_token, role, client_id, user_status, phone_no, name, currency, client_active, carrier_id)
VALUES ('clientuser126', 'Abcd@1234', 'clientuser126@ksgfuel.com', '2575 Steeles Ave E, Unit 1, Brampton, ON', 'uat_token_session_99812', 'Client', 'clientID_99812', true, '(905) 965-0308', 'Client User 126', 'CAD', true, 1)
ON CONFLICT (username) DO NOTHING;

-- 5. CARRIERS TABLE
CREATE TABLE IF NOT EXISTS carriers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    usdot VARCHAR(50),
    mc_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CARRIER PROFILES TABLE
CREATE TABLE IF NOT EXISTS carrier_profiles (
    id SERIAL PRIMARY KEY,
    carrier_id INT REFERENCES carriers(id) ON DELETE CASCADE,
    legal_name VARCHAR(255),
    dba_name VARCHAR(255),
    main_address TEXT,
    yard_addresses TEXT,         -- JSON array
    primary_email VARCHAR(255),
    secondary_email VARCHAR(255),
    billing_email VARCHAR(255),
    primary_phone VARCHAR(50),
    secondary_phone VARCHAR(50),
    primary_contact_name VARCHAR(255),
    billing_contact_name VARCHAR(255),
    federal_business_number VARCHAR(100),
    ein_fein VARCHAR(100),
    usdot VARCHAR(50),
    mc_number VARCHAR(50),
    carrier_code VARCHAR(100),
    carrier_code_expiry VARCHAR(50),
    scac VARCHAR(50),
    scac_expiry VARCHAR(50),
    cvor VARCHAR(100),
    cvor_expiry VARCHAR(50),
    cdn_bond VARCHAR(100),
    cdn_bond_expiry VARCHAR(50),
    usd_bond VARCHAR(100),
    usd_bond_expiry VARCHAR(50),
    ucr_year VARCHAR(50),
    ctpat_approved BOOLEAN DEFAULT false,
    ctpat_number VARCHAR(100),
    fast_approved BOOLEAN DEFAULT false,
    csa_approved BOOLEAN DEFAULT false,
    csa_number VARCHAR(100),
    pip_approved BOOLEAN DEFAULT false,
    smartway_approved BOOLEAN DEFAULT false,
    ifta_number VARCHAR(100),
    ifta_expiry VARCHAR(50),
    kyu_number VARCHAR(100),
    ny_hut_account VARCHAR(100),
    nm_permit VARCHAR(100),
    oregon_permit VARCHAR(100),
    irp_account VARCHAR(100),
    irp_fleet_number VARCHAR(100),
    irp_weight_groups TEXT,
    tolls_ezpass VARCHAR(100),
    tolls_apass VARCHAR(100),
    tolls_hwy407 VARCHAR(100),
    tolls_other TEXT,
    border_ambassador_account VARCHAR(100),
    border_bluewater_account VARCHAR(100),
    border_other TEXT,
    dtops_account VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    carrier_id INT REFERENCES carriers(id) ON DELETE CASCADE,
    first_name VARCHAR(150),
    middle_name VARCHAR(150),
    last_name VARCHAR(150),
    can_phone VARCHAR(50),
    usa_phone VARCHAR(50),
    primary_phone VARCHAR(10),     -- 'CAN' or 'USA'
    email VARCHAR(255),
    dl_number VARCHAR(100),
    dl_state VARCHAR(50),
    dl_expiry VARCHAR(50),
    driver_type VARCHAR(100),       -- 'Company Driver' or 'Owner Operator'
    citizenship VARCHAR(150),
    payment_type VARCHAR(100),      -- 'Payroll' or 'Independent Contractor'
    contractor_company_name VARCHAR(255),
    contractor_info TEXT,
    wcb_number VARCHAR(100),
    wcb_expiry VARCHAR(50),
    sin_number VARCHAR(100),
    passport_number VARCHAR(100),
    passport_expiry VARCHAR(50),
    fast_card_number VARCHAR(100),
    fast_card_expiry VARCHAR(50),
    cdrp_number VARCHAR(100),
    cdrp_expiry VARCHAR(50),
    visa_number VARCHAR(100),
    visa_expiry VARCHAR(50),
    medical_due_date VARCHAR(50),
    assigned_truck_id INT,
    status VARCHAR(50) DEFAULT 'active',
    emergency_contact_phone VARCHAR(50),
    hazmat_tdg BOOLEAN DEFAULT false,
    payment_classification VARCHAR(100),
    inc_name VARCHAR(255),
    inc_dba VARCHAR(255),
    inc_address TEXT,
    inc_phone VARCHAR(50),
    inc_email VARCHAR(255),
    inc_gst_hst VARCHAR(100),
    eld_company_name VARCHAR(255),
    eld_api_key TEXT,
    fuel_company_name VARCHAR(255),
    fuel_api_key TEXT,
    ref_check_driver_info TEXT,
    ref_check_recipient_info TEXT,
    ref_check_status VARCHAR(50) DEFAULT 'Pending',
    ref_check_pdf_path VARCHAR(255),
    ref_check_followup_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TRUCKS TABLE
CREATE TABLE IF NOT EXISTS trucks (
    id SERIAL PRIMARY KEY,
    carrier_id INT REFERENCES carriers(id) ON DELETE CASCADE,
    unit_number VARCHAR(100),
    vin VARCHAR(100),
    make VARCHAR(150),
    model VARCHAR(150),
    year INT,
    gps_tracker VARCHAR(100),
    fuel_card_number VARCHAR(100),
    tolls_ezpass VARCHAR(100),
    tolls_hwy407 VARCHAR(100),
    tolls_other TEXT,
    pmvi_last_date VARCHAR(50),
    pmvi_next_date VARCHAR(50),
    pmvi_frequency VARCHAR(100),
    annual_safety_expiry VARCHAR(50),
    oil_change_last VARCHAR(50),
    oil_change_next VARCHAR(50),
    dtops_transponders TEXT,
    ambassador_transponders TEXT,
    bluewater_transponders TEXT,
    other_toll_transponders TEXT,
    status VARCHAR(50) DEFAULT 'active',
    operating_region VARCHAR(100),
    equipment_type VARCHAR(150),
    axle_config VARCHAR(100),
    est_kms_per_litre REAL,
    calculated_kms_per_litre REAL,
    ownership_type VARCHAR(100),
    fuel_card_cad VARCHAR(100),
    fuel_card_usd VARCHAR(100),
    fleet_number VARCHAR(100),
    weight_group VARCHAR(100),
    ifta_decal VARCHAR(100),
    nyhut_decal VARCHAR(100),
    finance_type VARCHAR(100),
    purchase_date VARCHAR(50),
    purchase_price REAL,
    valuation REAL,
    hst_amount REAL,
    total_amount REAL,
    ach_value REAL,
    lease_term VARCHAR(100),
    lease_payment REAL,
    lease_frequency VARCHAR(50),
    rent_payment REAL,
    rent_amount_exc_hst REAL,
    rent_hst REAL,
    rent_total REAL,
    rent_frequency VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TRUCK PLATES
CREATE TABLE IF NOT EXISTS truck_plates (
    id SERIAL PRIMARY KEY,
    truck_id INT REFERENCES trucks(id) ON DELETE CASCADE,
    plate_number VARCHAR(100),
    plate_group VARCHAR(100),
    weight_group VARCHAR(100),
    expiry VARCHAR(50),
    status VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. TRUCK MAINTENANCE
CREATE TABLE IF NOT EXISTS truck_maintenance (
    id SERIAL PRIMARY KEY,
    truck_id INT REFERENCES trucks(id) ON DELETE CASCADE,
    carrier_id INT REFERENCES carriers(id) ON DELETE CASCADE,
    shop_name VARCHAR(255),
    country VARCHAR(100),
    city VARCHAR(150),
    province_state VARCHAR(150),
    repair_types TEXT,
    repair_date VARCHAR(50),
    amount REAL,
    currency VARCHAR(50),
    notes TEXT,
    month VARCHAR(50),
    technician VARCHAR(255),
    mop VARCHAR(100),
    bank VARCHAR(255),
    has_no_history INT DEFAULT 0,
    no_history_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. TRAILERS
CREATE TABLE IF NOT EXISTS trailers (
    id SERIAL PRIMARY KEY,
    carrier_id INT REFERENCES carriers(id) ON DELETE CASCADE,
    unit_number VARCHAR(100),
    vin VARCHAR(100),
    make VARCHAR(150),
    model VARCHAR(150),
    year INT,
    registration_state VARCHAR(100),
    gps_tracker VARCHAR(100),
    pmvi_last_date VARCHAR(50),
    pmvi_next_date VARCHAR(50),
    pmvi_frequency VARCHAR(100),
    annual_safety_expiry VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    trailer_type VARCHAR(150),
    axle_config VARCHAR(100),
    vented_status VARCHAR(100),
    high_cube INT DEFAULT 0,
    plated_status VARCHAR(100),
    horizontal_e_tracks INT DEFAULT 0,
    vertical_e_track_2ft INT DEFAULT 0,
    vertical_e_track_4ft INT DEFAULT 0,
    finance_type VARCHAR(100),
    purchase_date VARCHAR(50),
    purchase_price REAL,
    valuation REAL,
    hst_amount REAL,
    total_amount REAL,
    ach_value REAL,
    lease_term VARCHAR(100),
    lease_payment REAL,
    lease_frequency VARCHAR(50),
    rent_payment REAL,
    rent_amount_exc_hst REAL,
    rent_hst REAL,
    rent_total REAL,
    rent_frequency VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. TRAILER MAINTENANCE
CREATE TABLE IF NOT EXISTS trailer_maintenance (
    id SERIAL PRIMARY KEY,
    trailer_id INT REFERENCES trailers(id) ON DELETE CASCADE,
    carrier_id INT REFERENCES carriers(id) ON DELETE CASCADE,
    shop_name VARCHAR(255),
    country VARCHAR(100),
    city VARCHAR(150),
    province_state VARCHAR(150),
    repair_types TEXT,
    repair_date VARCHAR(50),
    amount REAL,
    currency VARCHAR(50),
    notes TEXT,
    month VARCHAR(50),
    technician VARCHAR(255),
    mop VARCHAR(100),
    bank VARCHAR(255),
    has_no_history INT DEFAULT 0,
    no_history_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. TRAILER PLATES
CREATE TABLE IF NOT EXISTS trailer_plates (
    id SERIAL PRIMARY KEY,
    trailer_id INT REFERENCES trailers(id) ON DELETE CASCADE,
    plate_number VARCHAR(100),
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. BORDER TRANSPONDERS MASTER
CREATE TABLE IF NOT EXISTS border_transponders_master (
    id SERIAL PRIMARY KEY,
    transponder_number VARCHAR(100) UNIQUE NOT NULL,
    bridge_name VARCHAR(100) DEFAULT 'Blue Water',
    status VARCHAR(50) DEFAULT 'active',
    assigned_truck_id INT REFERENCES trucks(id) ON DELETE SET NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. DTOPS TRANSPONDERS MASTER
CREATE TABLE IF NOT EXISTS dtops_transponders_master (
    id SERIAL PRIMARY KEY,
    transponder_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    assigned_truck_id INT REFERENCES trucks(id) ON DELETE SET NULL,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. TASK RATES
CREATE TABLE IF NOT EXISTS task_rates (
    id SERIAL PRIMARY KEY,
    task_type VARCHAR(255) UNIQUE NOT NULL,
    default_rate REAL NOT NULL,
    currency VARCHAR(50) DEFAULT 'CAD',
    tax_applicable INT DEFAULT 1,
    active INT DEFAULT 1,
    effective_date VARCHAR(50)
);

-- 17. TASKS
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    carrier_id INT REFERENCES carriers(id) ON DELETE CASCADE,
    task_type VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    assigned_to VARCHAR(255),
    checklist_items TEXT,
    missing_docs_email_sent INT DEFAULT 0,
    is_billable INT DEFAULT 1,
    amount REAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 18. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    carrier_id INT REFERENCES carriers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    month VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending Approval',
    total_before_tax REAL DEFAULT 0.0,
    tax_amount REAL DEFAULT 0.0,
    total_amount REAL DEFAULT 0.0,
    due_date VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE
);

-- 19. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    item_type VARCHAR(50),
    reference_id INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


