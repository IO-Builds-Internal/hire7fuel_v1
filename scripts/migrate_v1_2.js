const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../database/hire7_fuel.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database for migration.');
  runMigration();
});

function runMigration() {
  db.serialize(() => {
    // 0. Base carriers table
    db.run(`
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

    // 1. carrier_profiles
    db.run(`
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

    // 2. ifta_filings
    db.run(`
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

    // 3. kyu_filings
    db.run(`
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

    // 4. nyhut_filings
    db.run(`
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

    // 5. drivers
    db.run(`
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. trucks
    db.run(`
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. truck_plates
    db.run(`
      CREATE TABLE IF NOT EXISTS truck_plates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
        plate_number TEXT,
        plate_group TEXT,
        weight_group TEXT,
        expiry TEXT,
        status TEXT,           -- 'active', 'lost', 'returned'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. truck_maintenance
    db.run(`
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
        has_no_history INTEGER DEFAULT 0,
        no_history_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. trailers
    db.run(`
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. trailer_plates
    db.run(`
      CREATE TABLE IF NOT EXISTS trailer_plates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trailer_id INTEGER REFERENCES trailers(id) ON DELETE CASCADE,
        plate_number TEXT,
        status TEXT,           -- 'active', 'lost', 'returned'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. border_transponders
    db.run(`
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

    // 12. compliance_documents
    db.run(`
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

    // 13. expiry_reminders
    db.run(`
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

    console.log('All safety and compliance tables have been successfully verified/created.');

    // Seed default carrier if database is empty
    db.get("SELECT COUNT(*) as count FROM carriers", (err, row) => {
      if (err) {
        console.error('Error counting carriers:', err.message);
        db.close();
        return;
      }
      
      if (row.count === 0) {
        console.log('Seeding default carrier...');
        db.run(`
          INSERT INTO carriers (company_name, email, phone, usdot, mc_number, status)
          VALUES ('Hire7 Express Logistics', 'operations@hire7express.com', '1-800-555-0199', 'DOT3829104', 'MC928174', 'active')
        `, function(err) {
          if (err) {
            console.error('Failed to seed carrier:', err.message);
            db.close();
            return;
          }
          
          const carrierId = this.lastID;
          console.log(`Seeded carrier with ID: ${carrierId}`);

          const yardAddresses = JSON.stringify([
            '2575 Steeles Ave E, Unit 1, Brampton, ON',
            '450 Industrial Parkway, Mississauga, ON'
          ]);

          db.run(`
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
            if (err) {
              console.error('Failed to seed carrier profile:', err.message);
            } else {
              console.log('Seeded carrier profile.');
              // Seed IFTA & KYU filing defaults
              const currentYear = new Date().getFullYear();
              const quarters = [
                { q: 'Q1', due: `${currentYear}-04-30` },
                { q: 'Q2', due: `${currentYear}-07-31` },
                { q: 'Q3', due: `${currentYear}-10-31` },
                { q: 'Q4', due: `${currentYear + 1}-01-31` }
              ];
              
              quarters.forEach(q => {
                db.run(`
                  INSERT INTO ifta_filings (carrier_id, year, quarter, due_date, status)
                  VALUES (?, ?, ?, ?, 'PENDING')
                `, [carrierId, currentYear, q.q, q.due]);

                db.run(`
                  INSERT INTO kyu_filings (carrier_id, year, quarter, due_date, status)
                  VALUES (?, ?, ?, ?, 'PENDING')
                `, [carrierId, currentYear, q.q, q.due]);
              });

              // Seed NY-HUT quarterly filings as default
              quarters.forEach(q => {
                db.run(`
                  INSERT INTO nyhut_filings (carrier_id, year, period, due_date, status)
                  VALUES (?, ?, ?, ?, 'PENDING')
                `, [carrierId, currentYear, q.q, q.due]);
              });
              
              console.log('Seeded baseline filing records for Q1-Q4.');
            }
            db.close();
          });
        });
      } else {
        console.log('Carriers already exist, skipping seed.');
        db.close();
      }
    });
  });
}
