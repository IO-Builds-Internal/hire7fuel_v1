const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const baseConfig = require('../config');

// Secure password hashing and verification functions (using native Node.js crypto scrypt)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.includes(':')) return false;
  const [salt, hash] = storedPassword.split(':');
  const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === verifyHash;
}

// Load environment variables if available
require('dotenv').config();

// Path to local SQLite database file
const localDbFile = path.join(__dirname, 'hire7_fuel.sqlite');

// Initialize SQLite connection
const sqliteDb = new sqlite3.Database(localDbFile, (err) => {
  if (err) {
    console.error('================================================================');
    console.error('CRITICAL Error connecting to SQLite database:', err.message);
    console.error('Troubleshooting: Check if the database/ directory has write permissions.');
    console.error("You can try running: 'chmod -R 777 database' in the project folder.");
    console.error('================================================================');
  } else {
    console.log('SQLite Client: Connected to local hire7_fuel.sqlite database.');
    initSqliteTables();
  }
});

/**
 * Bootstraps SQLite tables and seeds initial data if the database is new.
 */
function initSqliteTables() {
  sqliteDb.serialize(() => {
    // 1. Settings Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Jobs Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT NOT NULL,
        type TEXT DEFAULT 'Full-time',
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Submissions Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Testimonials Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id TEXT PRIMARY KEY,
        author TEXT NOT NULL,
        role TEXT NOT NULL,
        quote TEXT NOT NULL,
        stars INTEGER DEFAULT 5,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed settings if empty
    sqliteDb.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('SQLite Client: Seeding baseline brand settings...');
        const stmt = sqliteDb.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
        stmt.run('brand_name', baseConfig.brand.name);
        stmt.run('brand_tagline', baseConfig.brand.tagline);
        stmt.run('logo_url', baseConfig.brand.logo);
        stmt.run('contact_phone', baseConfig.contact.phone);
        stmt.run('contact_email', baseConfig.contact.email);
        stmt.run('contact_address', baseConfig.contact.address);
        stmt.run('social_linkedin', baseConfig.social.linkedin);
        stmt.run('social_facebook', baseConfig.social.facebook);
        stmt.run('social_instagram', baseConfig.social.instagram);
        stmt.run('app_playstore', baseConfig.app.playstore);
        stmt.run('app_appstore', baseConfig.app.appstore);
        stmt.finalize();
      }
    });

    // Seed default jobs if empty
    sqliteDb.get("SELECT COUNT(*) as count FROM jobs", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('SQLite Client: Seeding baseline carrier logistics and technical jobs...');
        const stmt = sqliteDb.prepare("INSERT INTO jobs (id, title, department, location, description, requirements, type, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");

        stmt.run(
          'job-1',
          'Commercial Fleet Logistics Coordinator',
          'Dispatch Operations',
          'Brampton, ON - Hybrid',
          'Oversee fuel purchase logs, coordinate active fleet routes across primary highway lanes, and assist commercial carriers in minimizing out-of-route refueling overhead using the Hire7 Shield AI™ tracking system.',
          '2+ years experience dispatching long-haul commercial trucks or handling fleet fuel procurement.\nStrong familiarity with North American highway corridors and freight route planning.\nProficient communication skills and rapid multi-tasking abilities.',
          'Full-time'
        );

        stmt.run(
          'job-2',
          'Staff Software Engineer, Fleet Analytics',
          'Engineering & Security',
          'Brampton, ON - Hybrid',
          'Help build and expand the Hire7 Shield AI™ real-time security tracking engine. Drive optimizations in telemetry geofencing databases, automated state IFTA compilation pipelines, and responsive glassmorphic dashboard management interfaces.',
          '4+ years of professional backend software development experience with Node.js and relational databases.\nDeep understanding of geospatial indexing, real-time streaming pipelines, and API architecture.\nStrong dedication to clean code, modular frameworks, and premium visual components.',
          'Full-time'
        );

        stmt.run(
          'job-3',
          'Enterprise Carrier Account Executive',
          'Sales & Fleet Growth',
          'Brampton, ON - Remote',
          'Identify and partner with mid-to-large-size commercial truck fleets across Canada and the United States. Conduct custom lane savings assessments demonstrating the clear financial advantages of Hire7 Fuel\'s transparent wholesale cost-plus pricing structures.',
          'Proven track record of B2B sales inside the logistics, freight brokerage, or commercial transportation sectors.\nAbility to analyze financial reports and contrast legacy retail pricing with wholesale Cost-Plus structures.\nOutstanding relationship building skills with fleet owners and dispatch directors.',
          'Full-time'
        );

        stmt.finalize();
      }
    });

    // Seed default testimonials if empty
    sqliteDb.get("SELECT COUNT(*) as count FROM testimonials", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('SQLite Client: Seeding baseline carrier testimonials...');
        const stmt = sqliteDb.prepare("INSERT INTO testimonials (id, author, role, quote, stars, active) VALUES (?, ?, ?, ?, ?, 1)");

        stmt.run(
          'testi-1',
          'Marcus Howell',
          'Director of Logistics, Howell Transport',
          'Implementing the Hire7 Fuel Card completely resolved our card abuse issues. The geofencing tool blocked two out-of-bounds fills in our first month alone, saving us hundreds of dollars in leakage.',
          5
        );

        stmt.run(
          'testi-2',
          'Sandeep Dhillon',
          'Operations Manager, GTA Freightways',
          'We scaled our fleet from 5 to 25 trucks without adding a single administrative hire. The automated IFTA tax logs export seamlessly to our accounting platform. It\'s clean, rapid, and transparent.',
          5
        );

        stmt.run(
          'testi-3',
          'Terri Lafleur',
          'Fleet Coordinator, Lafleur Transport Inc.',
          'Outstanding customer care. Whenever our drivers encounter weather route delays or require sudden limit extensions for truck maintenance, the phone dispatchers respond in under a minute.',
          5
        );

        stmt.finalize();
      }
    });

    // 5. Carriers Table (v1.2)
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS carriers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        usdot TEXT,
        mc_number TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5a. API Users Table (UAT)
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS api_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email_id TEXT NOT NULL,
        address TEXT,
        api_token TEXT,
        role TEXT NOT NULL DEFAULT 'Client',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        client_id TEXT NOT NULL,
        user_status INTEGER DEFAULT 1,
        phone_no TEXT NOT NULL,
        name TEXT NOT NULL,
        reset_token TEXT,
        reset_token_expiry TEXT,
        currency TEXT,
        broker_id TEXT,
        client_active INTEGER DEFAULT 1,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE SET NULL
      )
    `);

    // 6. carrier_profiles
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS carrier_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        legal_name TEXT,
        dba_name TEXT,
        main_address TEXT,
        yard_addresses TEXT,         -- JSON array of yard address strings
        primary_email TEXT,
        secondary_email TEXT,
        billing_email TEXT,
        primary_phone TEXT,
        secondary_phone TEXT,
        primary_contact_name TEXT,
        billing_contact_name TEXT,
        federal_business_number TEXT, -- masked display only
        ein_fein TEXT,
        usdot TEXT,
        mc_number TEXT,
        carrier_code TEXT,
        carrier_code_expiry TEXT,
        scac TEXT,
        scac_expiry TEXT,
        cvor TEXT,
        cvor_expiry TEXT,
        cdn_bond TEXT,
        cdn_bond_expiry TEXT,
        usd_bond TEXT,
        usd_bond_expiry TEXT,
        ucr_year TEXT,
        ctpat_approved INTEGER DEFAULT 0,
        ctpat_number TEXT,
        fast_approved INTEGER DEFAULT 0,
        csa_approved INTEGER DEFAULT 0,
        csa_number TEXT,
        pip_approved INTEGER DEFAULT 0,
        smartway_approved INTEGER DEFAULT 0,
        ifta_number TEXT,
        ifta_expiry TEXT,
        kyu_number TEXT,
        ny_hut_account TEXT,
        nm_permit TEXT,
        oregon_permit TEXT,
        irp_account TEXT,
        irp_fleet_number TEXT,
        irp_weight_groups TEXT,      -- JSON array
        tolls_ezpass TEXT,
        tolls_apass TEXT,
        tolls_hwy407 TEXT,
        tolls_other TEXT,            -- JSON array {name, account}
        border_ambassador_account TEXT,
        border_bluewater_account TEXT,
        border_other TEXT,           -- JSON array {name, account}
        dtops_account TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. ifta_filings
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS ifta_filings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        year INTEGER,
        quarter TEXT,           -- Q1, Q2, Q3, Q4
        due_date TEXT,
        status TEXT,            -- FILED, PENDING, OVERDUE
        filed_date TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. kyu_filings
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS kyu_filings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        year INTEGER,
        quarter TEXT,
        due_date TEXT,
        status TEXT,
        filed_date TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. nyhut_filings
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS nyhut_filings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        year INTEGER,
        period TEXT,            -- Q1/Q2/Q3/Q4 or ANNUAL
        due_date TEXT,
        status TEXT,
        tag_number TEXT,
        filed_date TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. drivers
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        first_name TEXT,
        middle_name TEXT,
        last_name TEXT,
        can_phone TEXT,
        usa_phone TEXT,
        primary_phone TEXT,     -- 'CAN' or 'USA'
        email TEXT,
        dl_number TEXT,
        dl_state TEXT,
        dl_expiry TEXT,
        driver_type TEXT,       -- 'Company Driver' or 'Owner Operator'
        citizenship TEXT,
        payment_type TEXT,      -- 'Payroll' or 'Independent Contractor'
        contractor_company_name TEXT,
        contractor_info TEXT,   -- JSON string or object
        wcb_number TEXT,
        wcb_expiry TEXT,
        sin_number TEXT,
        passport_number TEXT,
        passport_expiry TEXT,
        fast_card_number TEXT,
        fast_card_expiry TEXT,
        cdrp_number TEXT,
        cdrp_expiry TEXT,
        visa_number TEXT,
        visa_expiry TEXT,
        medical_due_date TEXT,
        assigned_truck_id INTEGER,
        status TEXT DEFAULT 'active',
        emergency_contact_phone TEXT,
        hazmat_tdg INTEGER DEFAULT 0,
        payment_classification TEXT, -- 'Payroll' or 'In-Corporation'
        inc_name TEXT,
        inc_dba TEXT,
        inc_address TEXT,
        inc_phone TEXT,
        inc_email TEXT,
        inc_gst_hst TEXT,
        eld_company_name TEXT,
        eld_api_key TEXT,
        fuel_company_name TEXT,
        fuel_api_key TEXT,
        ref_check_driver_info TEXT,
        ref_check_recipient_info TEXT,
        ref_check_status TEXT DEFAULT 'Pending',
        ref_check_pdf_path TEXT,
        ref_check_followup_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. trucks
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS trucks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        unit_number TEXT,
        vin TEXT,
        make TEXT,
        model TEXT,
        year INTEGER,
        gps_tracker TEXT,
        fuel_card_number TEXT,
        tolls_ezpass TEXT,
        tolls_hwy407 TEXT,
        tolls_other TEXT,          -- JSON array {name, number}
        pmvi_last_date TEXT,
        pmvi_next_date TEXT,
        pmvi_frequency TEXT,       -- 'monthly', 'quarterly', 'annually'
        annual_safety_expiry TEXT,
        oil_change_last TEXT,
        oil_change_next TEXT,
        dtops_transponders TEXT,   -- JSON array {number, status}
        ambassador_transponders TEXT, -- JSON array {number, status}
        bluewater_transponders TEXT,  -- JSON array {number, status}
        other_toll_transponders TEXT, -- JSON array {name, number, status}
        status TEXT DEFAULT 'active',
        operating_region TEXT,     -- 'Provincial', 'Canada Wide', 'Cross-Border'
        equipment_type TEXT,       -- 'Cargo Van', 'Sprinter Van', 'Cube Van', 'Straight Truck', 'Tractor – Day Cab', 'Tractor – Sleeper Cab'
        axle_config TEXT,          -- 'Single Axle', 'Tandem', etc.
        est_kms_per_litre REAL,
        calculated_kms_per_litre REAL,
        ownership_type TEXT,       -- 'Company Truck' or 'Owner Operator'
        fuel_card_cad TEXT,
        fuel_card_usd TEXT,
        fleet_number TEXT,         -- plate group / Fleet #
        weight_group TEXT,
        ifta_decal TEXT,
        nyhut_decal TEXT,
        finance_type TEXT,         -- 'Owned', 'Leased', 'Rented'
        purchase_date TEXT,
        purchase_price REAL,
        valuation REAL,
        hst_amount REAL,
        total_amount REAL,
        ach_value REAL,
        lease_term TEXT,
        lease_payment REAL,
        lease_frequency TEXT,      -- 'Monthly', 'Bi-Monthly', 'Weekly'
        rent_payment REAL,
        rent_amount_exc_hst REAL,
        rent_hst REAL,
        rent_total REAL,
        rent_frequency TEXT,       -- 'Monthly', 'Bi-Monthly', 'Weekly'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. truck_plates
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS truck_plates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
        plate_number TEXT,
        plate_group TEXT,
        weight_group TEXT,
        expiry TEXT,
        status TEXT,           -- 'active', 'lost', 'returned'
        reason TEXT,           -- comments for plate replacement
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13. truck_maintenance
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS truck_maintenance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        shop_name TEXT,
        country TEXT,
        city TEXT,
        province_state TEXT,
        repair_types TEXT,     -- JSON array of repair type strings
        repair_date TEXT,
        amount REAL,
        currency TEXT,         -- 'CAD' or 'USD'
        notes TEXT,
        month TEXT,            -- YYYY-MM for monthly grouping
        technician TEXT,
        mop TEXT,
        bank TEXT,
        has_no_history INTEGER DEFAULT 0,
        no_history_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 14. trailers
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS trailers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        unit_number TEXT,
        vin TEXT,
        make TEXT,
        model TEXT,
        year INTEGER,
        registration_state TEXT,
        gps_tracker TEXT,
        pmvi_last_date TEXT,
        pmvi_next_date TEXT,
        pmvi_frequency TEXT,
        annual_safety_expiry TEXT,
        status TEXT DEFAULT 'active',
        trailer_type TEXT,      -- 'Dry Van', 'Reefer', etc.
        axle_config TEXT,       -- 'Single Axle', 'Tandem', 'Tr-Axle', etc.
        vented_status TEXT,     -- 'Vented' or 'Non-Vented'
        high_cube INTEGER DEFAULT 0,
        plated_status TEXT,     -- 'Plated' or 'Non-Plated'
        horizontal_e_tracks INTEGER DEFAULT 0,
        vertical_e_track_2ft INTEGER DEFAULT 0,
        vertical_e_track_4ft INTEGER DEFAULT 0,
        finance_type TEXT,      -- 'Owned', 'Leased', 'Rented'
        purchase_date TEXT,
        purchase_price REAL,
        valuation REAL,
        hst_amount REAL,
        total_amount REAL,
        ach_value REAL,
        lease_term TEXT,
        lease_payment REAL,
        lease_frequency TEXT,
        rent_payment REAL,
        rent_amount_exc_hst REAL,
        rent_hst REAL,
        rent_total REAL,
        rent_frequency TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 14a. trailer_maintenance
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS trailer_maintenance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trailer_id INTEGER REFERENCES trailers(id) ON DELETE CASCADE,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        shop_name TEXT,
        country TEXT,
        city TEXT,
        province_state TEXT,
        repair_types TEXT,     -- JSON array of repair type strings
        repair_date TEXT,
        amount REAL,
        currency TEXT,         -- 'CAD' or 'USD'
        notes TEXT,
        month TEXT,            -- YYYY-MM for monthly grouping
        technician TEXT,
        mop TEXT,
        bank TEXT,
        has_no_history INTEGER DEFAULT 0,
        no_history_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 15. trailer_plates
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS trailer_plates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trailer_id INTEGER REFERENCES trailers(id) ON DELETE CASCADE,
        plate_number TEXT,
        status TEXT,           -- 'active', 'lost', 'returned'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 16. border_transponders
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS border_transponders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
        bridge_name TEXT,      -- 'Ambassador', 'Blue Water', or custom
        unit_number TEXT,
        vin TEXT,
        plate_number TEXT,
        transponder_number TEXT,
        expiry TEXT,
        status TEXT,           -- 'active', 'lost', 'deactivated'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 16a. dtops_transponders_master
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS dtops_transponders_master (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transponder_number TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'active', -- 'active', 'inactive', 'transferred', 'replaced'
        assigned_truck_id INTEGER REFERENCES trucks(id) ON DELETE SET NULL,
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 16b. border_transponders_master
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS border_transponders_master (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transponder_number TEXT UNIQUE NOT NULL,
        bridge_name TEXT DEFAULT 'Blue Water', -- 'Blue Water' or 'Ambassador'
        status TEXT DEFAULT 'active', -- 'active', 'inactive', 'transferred', 'replaced'
        assigned_truck_id INTEGER REFERENCES trucks(id) ON DELETE SET NULL,
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 17. compliance_documents
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS compliance_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        entity_type TEXT,      -- 'company', 'truck', 'trailer', 'driver'
        entity_id INTEGER,
        doc_category TEXT,     -- e.g. 'Article of Incorporation', 'Cab Card', etc.
        doc_label TEXT,        -- custom label if "other"
        file_path TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 18. expiry_reminders
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS expiry_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        entity_type TEXT,
        entity_id INTEGER,
        field_label TEXT,
        expiry_date TEXT,
        reminder_sent_30 INTEGER DEFAULT 0,
        reminder_sent_14 INTEGER DEFAULT 0,
        reminder_sent_7 INTEGER DEFAULT 0,
        last_sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 19. task_rates
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS task_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_type TEXT UNIQUE NOT NULL,
        default_rate REAL NOT NULL,
        currency TEXT DEFAULT 'CAD',
        tax_applicable INTEGER DEFAULT 1,
        active INTEGER DEFAULT 1,
        effective_date TEXT
      )
    `);

    // 20. tasks (work orders)
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        task_type TEXT NOT NULL,
        status TEXT DEFAULT 'Pending', -- 'Pending', 'Assigned', 'Progressing', 'Completed', 'Cancelled'
        assigned_to TEXT,
        checklist_items TEXT,          -- JSON array of {name, received (1/0), file_path}
        missing_docs_email_sent INTEGER DEFAULT 0,
        is_billable INTEGER DEFAULT 1,
        amount REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);

    // 21. invoices
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE CASCADE,
        invoice_number TEXT UNIQUE NOT NULL,
        month TEXT NOT NULL,           -- YYYY-MM
        status TEXT DEFAULT 'Pending Approval', -- 'Draft', 'Pending Approval', 'Approved', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'
        total_before_tax REAL DEFAULT 0.0,
        tax_amount REAL DEFAULT 0.0,
        total_amount REAL DEFAULT 0.0,
        due_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME,
        sent_at DATETIME
      )
    `);

    // 22. invoice_items
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        quantity REAL NOT NULL,
        rate REAL NOT NULL,
        amount REAL NOT NULL,
        item_type TEXT,                -- 'active_truck_fee', 'billable_task', 'custom'
        reference_id INTEGER,          -- references task_id if item_type is 'billable_task'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);


    // Seed default carrier if database is empty
    sqliteDb.get("SELECT COUNT(*) as count FROM carriers", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('SQLite Client: Seeding baseline carrier for compliance...');
        sqliteDb.run(`
          INSERT INTO carriers (company_name, email, phone, usdot, mc_number, status)
          VALUES ('Hire7 Express Logistics', 'operations@hire7express.com', '1-800-555-0199', 'DOT3829104', 'MC928174', 'active')
        `, function(err) {
          if (!err) {
            const carrierId = this.lastID;
            const yardAddresses = JSON.stringify([
              '2575 Steeles Ave E, Unit 1, Brampton, ON',
              '450 Industrial Parkway, Mississauga, ON'
            ]);

            sqliteDb.run(`
              INSERT INTO carrier_profiles (
                carrier_id, legal_name, dba_name, main_address, yard_addresses,
                primary_email, secondary_email, billing_email, primary_phone, primary_contact_name,
                federal_business_number, ein_fein, usdot, mc_number, cvor, cvor_expiry, carrier_code, scac,
                ctpat_approved, fast_approved, csa_approved, pip_approved, smartway_approved,
                ifta_number, ifta_expiry, kyu_number, ny_hut_account, nm_permit, oregon_permit
              ) VALUES (
                ?, 'Hire7 Express Logistics Inc.', 'Hire7 Express', '2575 Steeles Ave E, Unit 1, Brampton, ON', ?,
                'operations@hire7express.com', 'safety@hire7express.com', 'billing@hire7express.com', '1-800-555-0199', 'John Doe',
                '123456789', '98-7654321', 'DOT3829104', 'MC928174', 'CVOR987654', '2027-06-30', 'CCODE123', 'HSE7',
                1, 1, 1, 1, 1,
                'IFTA-982749', '2026-12-31', 'KYU-8827', 'NYHUT-99201', 'NM-776251', 'OR-18291'
              )
            `, [carrierId, yardAddresses], (err) => {
              if (!err) {
                // Seed default API User linked to this default carrier (hashing the password)
                console.log('SQLite Client: Seeding baseline API user linked to default carrier...');
                const hashedPass = hashPassword('Abcd@1234');
                sqliteDb.run(`
                  INSERT INTO api_users (username, password, email_id, address, api_token, role, client_id, user_status, phone_no, name, currency, client_active, carrier_id)
                  VALUES ('clientuser126', ?, 'clientuser126@ksgfuel.com', '2575 Steeles Ave E, Unit 1, Brampton, ON', 'uat_token_session_99812', 'Client', 'clientID_99812', 1, '(905) 965-0308', 'Client User 126', 'CAD', 1, ?)
                `, [hashedPass, carrierId]);

                const currentYear = new Date().getFullYear();
                const quarters = [
                  { q: 'Q1', due: `${currentYear}-04-30` },
                  { q: 'Q2', due: `${currentYear}-07-31` },
                  { q: 'Q3', due: `${currentYear}-10-31` },
                  { q: 'Q4', due: `${currentYear + 1}-01-31` }
                ];
                
                quarters.forEach(q => {
                  sqliteDb.run(`
                    INSERT INTO ifta_filings (carrier_id, year, quarter, due_date, status)
                    VALUES (?, ?, ?, ?, 'PENDING')
                  `, [carrierId, currentYear, q.q, q.due]);

                  sqliteDb.run(`
                    INSERT INTO kyu_filings (carrier_id, year, quarter, due_date, status)
                    VALUES (?, ?, ?, ?, 'PENDING')
                  `, [carrierId, currentYear, q.q, q.due]);
                });

                quarters.forEach(q => {
                  sqliteDb.run(`
                    INSERT INTO nyhut_filings (carrier_id, year, period, due_date, status)
                    VALUES (?, ?, ?, ?, 'PENDING')
                  `, [carrierId, currentYear, q.q, q.due]);
                });
                console.log('SQLite Client: Seeded default carrier and compliance schedules successfully.');
              }
            });
          }
        });
      }
    });

    // Seed default task rates if empty
    sqliteDb.get("SELECT COUNT(*) as count FROM task_rates", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('SQLite Client: Seeding baseline task rates...');
        const stmt = sqliteDb.prepare("INSERT INTO task_rates (task_type, default_rate, currency, tax_applicable, active, effective_date) VALUES (?, ?, ?, ?, 1, ?)");
        stmt.run('Annual Safety Renewal', 50.00, 'CAD', 1, '2026-01-01');
        stmt.run('Driver Document Follow-Up', 20.00, 'CAD', 1, '2026-01-01');
        stmt.run('IFTA Filing Audit', 120.00, 'CAD', 1, '2026-01-01');
        stmt.finalize();
      }
    });

    // Seed master transponders if empty
    sqliteDb.get("SELECT COUNT(*) as count FROM dtops_transponders_master", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('SQLite Client: Seeding master D-TOPS transponders...');
        const stmt = sqliteDb.prepare("INSERT INTO dtops_transponders_master (transponder_number, status, comments) VALUES (?, 'active', ?)");
        stmt.run('D-100201', 'Unassigned inventory');
        stmt.run('D-100202', 'Unassigned inventory');
        stmt.run('D-100203', 'Unassigned inventory');
        stmt.finalize();
      }
    });

    sqliteDb.get("SELECT COUNT(*) as count FROM border_transponders_master", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('SQLite Client: Seeding master Blue Water transponders...');
        const stmt = sqliteDb.prepare("INSERT INTO border_transponders_master (transponder_number, bridge_name, status, comments) VALUES (?, 'Blue Water', 'active', ?)");
        stmt.run('B-200301', 'Unassigned inventory');
        stmt.run('B-200302', 'Unassigned inventory');
        stmt.run('B-200303', 'Unassigned inventory');
        stmt.finalize();
      }
    });

  });
}

/**
 * Async promisified helpers for SQLite transactions
 */
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  sqliteDb.run(sql, params, function(err) {
    if (err) {
      const msg = err.message || '';
      if (msg.includes('CANTOPEN') || msg.includes('readonly') || msg.includes('permission') || msg.includes('ACCESS')) {
        err.message += " (Troubleshooting: Check if the 'database/' directory exists and has write permissions. Try: 'chmod -R 777 database')";
      }
      reject(err);
    }
    else resolve(this);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  sqliteDb.get(sql, params, (err, row) => {
    if (err) {
      const msg = err.message || '';
      if (msg.includes('CANTOPEN') || msg.includes('readonly') || msg.includes('permission') || msg.includes('ACCESS')) {
        err.message += " (Troubleshooting: Check if the 'database/' directory exists and has write permissions. Try: 'chmod -R 777 database')";
      }
      reject(err);
    }
    else resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  sqliteDb.all(sql, params, (err, rows) => {
    if (err) {
      const msg = err.message || '';
      if (msg.includes('CANTOPEN') || msg.includes('readonly') || msg.includes('permission') || msg.includes('ACCESS')) {
        err.message += " (Troubleshooting: Check if the 'database/' directory exists and has write permissions. Try: 'chmod -R 777 database')";
      }
      reject(err);
    }
    else resolve(rows);
  });
});

// Generate a unique ID for new records
const generateId = () => Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);

// ============================================================================
// Exported DB Interface — SQLite Only
// ============================================================================
module.exports = {
  sqliteDb,
  dbRun,
  dbGet,
  dbAll,
  hashPassword,
  verifyPassword,


  /**
   * Fetch all site settings, merged over the base config defaults.
   */
  async getSettings() {
    const settingsObj = {
      brand: { ...baseConfig.brand },
      colors: { ...baseConfig.colors },
      contact: { ...baseConfig.contact },
      social: { ...baseConfig.social },
      app: { ...baseConfig.app },
      smtp: { ...baseConfig.smtp },
      programs: {
        cash_coming_soon: 'true',
        cash_redirect: '/contact',
        maint_coming_soon: 'true',
        maint_redirect: '/contact'
      }
    };

    try {
      const rows = await dbAll("SELECT key, value FROM settings");
      if (rows && rows.length > 0) {
        rows.forEach(row => {
          if (row.key === 'brand_name') settingsObj.brand.name = row.value;
          if (row.key === 'brand_tagline') settingsObj.brand.tagline = row.value;
          if (row.key === 'logo_url') settingsObj.brand.logo = row.value;
          if (row.key === 'contact_phone') settingsObj.contact.phone = row.value;
          if (row.key === 'contact_email') settingsObj.contact.email = row.value;
          if (row.key === 'contact_address') settingsObj.contact.address = row.value;
          if (row.key === 'social_linkedin') settingsObj.social.linkedin = row.value;
          if (row.key === 'social_facebook') settingsObj.social.facebook = row.value;
          if (row.key === 'social_instagram') settingsObj.social.instagram = row.value;
          if (row.key === 'smtp_host') settingsObj.smtp.host = row.value;
          if (row.key === 'smtp_port') settingsObj.smtp.port = row.value;
          if (row.key === 'smtp_user') settingsObj.smtp.user = row.value;
          if (row.key === 'smtp_pass') settingsObj.smtp.pass = row.value;
          if (row.key === 'smtp_from') settingsObj.smtp.from = row.value;
          if (row.key === 'smtp_to') settingsObj.smtp.to = row.value;
          if (row.key === 'smtp_enabled') settingsObj.smtp.enabled = row.value;
          if (row.key === 'app_playstore') settingsObj.app.playstore = row.value;
          if (row.key === 'app_appstore') settingsObj.app.appstore = row.value;
          
          if (row.key === 'program_cash_coming_soon') settingsObj.programs.cash_coming_soon = row.value;
          if (row.key === 'program_cash_redirect') settingsObj.programs.cash_redirect = row.value;
          if (row.key === 'program_maint_coming_soon') settingsObj.programs.maint_coming_soon = row.value;
          if (row.key === 'program_maint_redirect') settingsObj.programs.maint_redirect = row.value;
        });
      }
    } catch (err) {
      console.error('SQLite getSettings failed, using config defaults:', err.message);
    }

    return settingsObj;
  },

  /**
   * Update a specific key-value setting.
   */
  async updateSetting(key, value) {
    try {
      await dbRun(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        [key, value]
      );
      return true;
    } catch (err) {
      console.error('SQLite updateSetting failed:', err.message);
      return false;
    }
  },

  /**
   * Bulk update multiple settings.
   */
  async updateSettings(settingsMap) {
    let success = true;
    for (const [key, val] of Object.entries(settingsMap)) {
      const ok = await this.updateSetting(key, val);
      if (!ok) success = false;
    }
    return success;
  },

  /**
   * Fetch all jobs, optionally only active ones (for public views).
   */
  async getJobs(onlyActive = false) {
    try {
      let sql = "SELECT * FROM jobs ORDER BY created_at DESC";
      let params = [];
      if (onlyActive) {
        sql = "SELECT * FROM jobs WHERE active = 1 ORDER BY created_at DESC";
      }
      const rows = await dbAll(sql, params);
      return rows.map(r => ({ ...r, active: !!r.active }));
    } catch (err) {
      console.error('SQLite getJobs failed:', err.message);
      return [];
    }
  },

  /**
   * Fetch a single job by ID.
   */
  async getJob(id) {
    try {
      const row = await dbGet("SELECT * FROM jobs WHERE id = ?", [id]);
      if (!row) return null;
      return { ...row, active: !!row.active };
    } catch (err) {
      console.error('SQLite getJob failed:', err.message);
      return null;
    }
  },

  /**
   * Insert a new job posting.
   */
  async addJob({ title, department, location, description, requirements, type = 'Full-time' }) {
    try {
      const id = generateId();
      await dbRun(
        "INSERT INTO jobs (id, title, department, location, description, requirements, type, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)",
        [id, title, department, location, description, requirements, type]
      );
      return { id, title, department, location, description, requirements, type, active: true };
    } catch (err) {
      console.error('SQLite addJob failed:', err.message);
      return false;
    }
  },

  /**
   * Update an existing job posting.
   */
  async updateJob(id, { title, department, location, description, requirements, type }) {
    try {
      await dbRun(
        "UPDATE jobs SET title = ?, department = ?, location = ?, description = ?, requirements = ?, type = ? WHERE id = ?",
        [title, department, location, description, requirements, type, id]
      );
      return true;
    } catch (err) {
      console.error('SQLite updateJob failed:', err.message);
      return false;
    }
  },

  /**
   * Toggle a job's active/inactive status.
   */
  async toggleJobStatus(id, active) {
    try {
      await dbRun("UPDATE jobs SET active = ? WHERE id = ?", [active ? 1 : 0, id]);
      return true;
    } catch (err) {
      console.error('SQLite toggleJobStatus failed:', err.message);
      return false;
    }
  },

  /**
   * Delete a job posting.
   */
  async deleteJob(id) {
    try {
      await dbRun("DELETE FROM jobs WHERE id = ?", [id]);
      return true;
    } catch (err) {
      console.error('SQLite deleteJob failed:', err.message);
      return false;
    }
  },

  /**
   * Save a form submission (contact, fuelcard application, etc.)
   */
  async saveSubmission(type, payload) {
    try {
      const id = generateId();
      const payloadStr = JSON.stringify(payload);
      await dbRun(
        "INSERT INTO submissions (id, type, payload, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
        [id, type, payloadStr]
      );
      return true;
    } catch (err) {
      console.error('SQLite saveSubmission failed:', err.message);
      return false;
    }
  },

  /**
   * Retrieve all submissions, optionally filtered by type.
   */
  async getSubmissions(type = null) {
    try {
      let sql = "SELECT * FROM submissions ORDER BY created_at DESC";
      let params = [];
      if (type) {
        sql = "SELECT * FROM submissions WHERE type = ? ORDER BY created_at DESC";
        params = [type];
      }
      const rows = await dbAll(sql, params);
      return rows.map(r => ({ ...r, payload: JSON.parse(r.payload) }));
    } catch (err) {
      console.error('SQLite getSubmissions failed:', err.message);
      return [];
    }
  },

  /**
   * Delete a submission by ID.
   */
  async deleteSubmission(id) {
    try {
      await dbRun("DELETE FROM submissions WHERE id = ?", [id]);
      return true;
    } catch (err) {
      console.error('SQLite deleteSubmission failed:', err.message);
      return false;
    }
  },

  /**
   * Fetch all testimonials, optionally only active ones.
   */
  async getTestimonials(onlyActive = false) {
    try {
      let sql = "SELECT * FROM testimonials ORDER BY created_at DESC";
      let params = [];
      if (onlyActive) {
        sql = "SELECT * FROM testimonials WHERE active = 1 ORDER BY created_at DESC";
      }
      const rows = await dbAll(sql, params);
      return rows.map(r => ({ ...r, active: !!r.active }));
    } catch (err) {
      console.error('SQLite getTestimonials failed:', err.message);
      return [];
    }
  },

  /**
   * Fetch a single testimonial by ID.
   */
  async getTestimonial(id) {
    try {
      const row = await dbGet("SELECT * FROM testimonials WHERE id = ?", [id]);
      if (!row) return null;
      return { ...row, active: !!row.active };
    } catch (err) {
      console.error('SQLite getTestimonial failed:', err.message);
      return null;
    }
  },

  /**
   * Insert a new testimonial.
   */
  async addTestimonial({ author, role, quote, stars = 5 }) {
    try {
      const id = generateId();
      const parsedStars = parseInt(stars, 10) || 5;
      await dbRun(
        "INSERT INTO testimonials (id, author, role, quote, stars, active, created_at) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)",
        [id, author, role, quote, parsedStars]
      );
      return { id, author, role, quote, stars: parsedStars, active: true };
    } catch (err) {
      console.error('SQLite addTestimonial failed:', err.message);
      return false;
    }
  },

  /**
   * Update an existing testimonial.
   */
  async updateTestimonial(id, { author, role, quote, stars }) {
    try {
      const parsedStars = parseInt(stars, 10) || 5;
      await dbRun(
        "UPDATE testimonials SET author = ?, role = ?, quote = ?, stars = ? WHERE id = ?",
        [author, role, quote, parsedStars, id]
      );
      return true;
    } catch (err) {
      console.error('SQLite updateTestimonial failed:', err.message);
      return false;
    }
  },

  /**
   * Toggle a testimonial's active/inactive status.
   */
  async toggleTestimonialStatus(id, active) {
    try {
      await dbRun("UPDATE testimonials SET active = ? WHERE id = ?", [active ? 1 : 0, id]);
      return true;
    } catch (err) {
      console.error('SQLite toggleTestimonialStatus failed:', err.message);
      return false;
    }
  },

  /**
   * Delete a testimonial.
   */
  async deleteTestimonial(id) {
    try {
      await dbRun("DELETE FROM testimonials WHERE id = ?", [id]);
      return true;
    } catch (err) {
      console.error('SQLite deleteTestimonial failed:', err.message);
      return false;
    }
  }
};
