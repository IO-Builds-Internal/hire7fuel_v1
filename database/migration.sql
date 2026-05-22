-- ============================================================================
-- KSG Fuel Database Migration Script
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
('brand_name', 'KSG Fuel'),
('brand_tagline', 'Powering Success with Every Drop'),
('logo_url', '/assets/logo.png'),
('contact_phone', '(905) 965-0308'),
('contact_email', 'support@ksgfuel.com'),
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
