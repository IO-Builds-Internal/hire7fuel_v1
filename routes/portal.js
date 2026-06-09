const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db'); // Uses modified db.js

// Destructure query helpers
const { dbRun, dbGet, dbAll } = db;

/**
 * Mask helper: store full, display masked (last 4 only)
 */
function maskNumber(number) {
  if (!number) return '';
  const str = String(number).trim();
  if (str.toUpperCase() === 'N/A') return 'N/A';
  if (str.length <= 4) return str;
  return '*'.repeat(str.length - 4) + str.slice(-4);
}

/**
 * PMVI Next Date Calculation: Last Date + Frequency
 */
function calculatePmviNext(lastDateStr, frequency) {
  if (!lastDateStr) return '';
  const date = new Date(lastDateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  
  if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (frequency === 'quarterly') {
    date.setMonth(date.getMonth() + 3);
  } else if (frequency === 'annually') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    // Default to annually if unrecognized
    date.setFullYear(date.getFullYear() + 1);
  }
  return date.toISOString().split('T')[0];
}

/**
 * Oil Change Next Calculation: Last Date + 3 months
 */
function calculateOilChangeNext(lastDateStr) {
  if (!lastDateStr) return '';
  const date = new Date(lastDateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  date.setMonth(date.getMonth() + 3);
  return date.toISOString().split('T')[0];
}

/**
 * Configure Multer for Compliance Document Uploads
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const carrierId = req.session.carrierId || 1;
    const entityType = req.body.entityType || req.params.entityType || 'company';
    const entityId = req.body.entityId || req.params.entityId || 0;
    const dir = path.join(__dirname, `../public/uploads/compliance/${carrierId}/${entityType}/${entityId}/`);
    
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Clean spaces and prepend timestamp
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const upload = multer({ storage });

/**
 * Shared Middleware to load active carrier context, all carriers, and settings
 */
router.use(async (req, res, next) => {
  try {
    // 1. Load brand settings
    res.locals.config = await db.getSettings();
    res.locals.session = req.session;
    res.locals.maskNumber = maskNumber;

    // 2. Fetch all carriers (for switcher dropdown)
    const carriers = await dbAll("SELECT * FROM carriers ORDER BY company_name ASC");
    res.locals.allCarriers = carriers;

    // 3. Determine active carrier context
    if (!req.session.carrierId && carriers.length > 0) {
      req.session.carrierId = carriers[0].id;
    }
    
    if (req.session.carrierId) {
      const active = await dbGet("SELECT * FROM carriers WHERE id = ?", [req.session.carrierId]);
      res.locals.activeCarrier = active;
    } else {
      res.locals.activeCarrier = null;
    }
    
    next();
  } catch (err) {
    console.error('Error loading carrier context middleware:', err);
    next(err);
  }
});

/**
 * GET /portal/switch-carrier/:id - Administrative context switcher
 */
router.get('/switch-carrier/:id', (req, res) => {
  const { id } = req.params;
  req.session.carrierId = parseInt(id, 10);
  res.redirect(req.headers.referer || '/portal/compliance');
});

/**
 * GET /portal/register - Public Carrier Onboarding Form (Optional but critical for setting up data)
 */
router.get('/register', (req, res) => {
  res.render('apply', {
    page: 'portal-register',
    success: req.query.success === 'true',
    layout: false
  });
});

/**
 * POST /portal/register - Create carrier & auto-populate profiles/filings
 */
router.post('/register', async (req, res) => {
  const { company_name, email, phone, usdot, mc_number } = req.body;
  if (!company_name) {
    return res.status(400).send('Company Name is required.');
  }

  try {
    const result = await dbRun(
      "INSERT INTO carriers (company_name, email, phone, usdot, mc_number, status) VALUES (?, ?, ?, ?, ?, 'active')",
      [company_name, email, phone, usdot, mc_number]
    );
    const carrierId = result.lastID;

    // Auto-create carrier profile
    await dbRun(
      "INSERT INTO carrier_profiles (carrier_id, legal_name, dba_name, primary_email, primary_phone, usdot, mc_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [carrierId, company_name, company_name, email, phone, usdot, mc_number]
    );

    // Auto-populate filings rows for the current year
    const currentYear = new Date().getFullYear();
    const quarters = [
      { q: 'Q1', due: `${currentYear}-04-30` },
      { q: 'Q2', due: `${currentYear}-07-31` },
      { q: 'Q3', due: `${currentYear}-10-31` },
      { q: 'Q4', due: `${currentYear + 1}-01-31` }
    ];

    quarters.forEach(async (q) => {
      await dbRun("INSERT INTO ifta_filings (carrier_id, year, quarter, due_date, status) VALUES (?, ?, ?, ?, 'PENDING')", [carrierId, currentYear, q.q, q.due]);
      await dbRun("INSERT INTO kyu_filings (carrier_id, year, quarter, due_date, status) VALUES (?, ?, ?, ?, 'PENDING')", [carrierId, currentYear, q.q, q.due]);
      await dbRun("INSERT INTO nyhut_filings (carrier_id, year, period, due_date, status) VALUES (?, ?, ?, ?, 'PENDING')", [carrierId, currentYear, q.q, q.due]);
    });

    req.session.carrierId = carrierId;
    req.session.isAuthenticated = true;

    res.redirect('/portal/compliance?success=true');
  } catch (err) {
    console.error('Failed to register carrier:', err);
    res.status(500).send('Failed to register carrier: ' + err.message);
  }
});

/**
 * GET /portal/compliance - Compliance Overview Dashboard
 */
router.get('/compliance', async (req, res) => {
  const carrierId = req.session.carrierId;
  if (!carrierId) {
    return res.redirect('/portal/register');
  }

  try {
    const profile = await dbGet("SELECT * FROM carrier_profiles WHERE carrier_id = ?", [carrierId]);
    
    // Get current quarter filings
    const currentYear = new Date().getFullYear();
    // Derive current quarter
    const month = new Date().getMonth();
    let currentQ = 'Q1';
    if (month >= 3 && month <= 5) currentQ = 'Q2';
    else if (month >= 6 && month <= 8) currentQ = 'Q3';
    else if (month >= 9) currentQ = 'Q4';

    const ifta = await dbGet("SELECT * FROM ifta_filings WHERE carrier_id = ? AND year = ? AND quarter = ?", [carrierId, currentYear, currentQ]);
    const kyu = await dbGet("SELECT * FROM kyu_filings WHERE carrier_id = ? AND year = ? AND quarter = ?", [carrierId, currentYear, currentQ]);
    const nyhut = await dbGet("SELECT * FROM nyhut_filings WHERE carrier_id = ? AND year = ? ORDER BY id DESC LIMIT 1", [carrierId, currentYear]);

    // Find all expiring documents within 30 days
    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const expiries = [];

    // Check profile expiries
    if (profile) {
      const profileExpiries = [
        { label: 'CVOR', date: profile.cvor_expiry },
        { label: 'Carrier Code', date: profile.carrier_code_expiry },
        { label: 'SCAC Code', date: profile.scac_expiry },
        { label: 'Canadian Bond', date: profile.cdn_bond_expiry },
        { label: 'US Bond', date: profile.usd_bond_expiry },
        { label: 'IFTA Certificate', date: profile.ifta_expiry }
      ];
      profileExpiries.forEach(e => {
        if (e.date && e.date !== 'N/A' && e.date >= todayStr && e.date <= targetDateStr) {
          expiries.push({ entity: 'Company Profile', field: e.label, date: e.date });
        }
      });
    }

    // Check drivers expiries
    const drivers = await dbAll("SELECT * FROM drivers WHERE carrier_id = ? AND status = 'active'", [carrierId]);
    drivers.forEach(d => {
      const fields = [
        { label: 'DL Expiry', date: d.dl_expiry },
        { label: 'WCB Expiry', date: d.wcb_expiry },
        { label: 'Passport Expiry', date: d.passport_expiry },
        { label: 'FAST Card Expiry', date: d.fast_card_expiry },
        { label: 'CDRP Card Expiry', date: d.cdrp_expiry },
        { label: 'Visa Expiry', date: d.visa_expiry },
        { label: 'Medical Review', date: d.medical_due_date }
      ];
      fields.forEach(f => {
        if (f.date && f.date !== 'N/A' && f.date >= todayStr && f.date <= targetDateStr) {
          expiries.push({ entity: `Driver: ${d.first_name} ${d.last_name}`, field: f.label, date: f.date });
        }
      });
    });

    // Check trucks expiries
    const trucks = await dbAll("SELECT * FROM trucks WHERE carrier_id = ? AND status = 'active'", [carrierId]);
    for (const t of trucks) {
      const fields = [
        { label: 'Annual Safety', date: t.annual_safety_expiry },
        { label: 'PMVI Due', date: t.pmvi_next_date },
        { label: 'Oil Change Due', date: t.oil_change_next }
      ];
      fields.forEach(f => {
        if (f.date && f.date !== 'N/A' && f.date >= todayStr && f.date <= targetDateStr) {
          expiries.push({ entity: `Truck: #${t.unit_number}`, field: f.label, date: f.date });
        }
      });
      // Check active plate expiry
      const plate = await dbGet("SELECT * FROM truck_plates WHERE truck_id = ? AND status = 'active'", [t.id]);
      if (plate && plate.expiry && plate.expiry !== 'N/A' && plate.expiry >= todayStr && plate.expiry <= targetDateStr) {
        expiries.push({ entity: `Truck Plate: ${plate.plate_number} (#${t.unit_number})`, field: 'Plate Expiry', date: plate.expiry });
      }
    }

    // Check trailers expiries
    const trailers = await dbAll("SELECT * FROM trailers WHERE carrier_id = ? AND status = 'active'", [carrierId]);
    trailers.forEach(tr => {
      const fields = [
        { label: 'Annual Safety', date: tr.annual_safety_expiry },
        { label: 'PMVI Due', date: tr.pmvi_next_date }
      ];
      fields.forEach(f => {
        if (f.date && f.date !== 'N/A' && f.date >= todayStr && f.date <= targetDateStr) {
          expiries.push({ entity: `Trailer: #${tr.unit_number}`, field: f.label, date: f.date });
        }
      });
    });

    res.render('portal/compliance', {
      page: 'portal-compliance',
      pageTitle: 'Compliance Control Room',
      profile: profile || {},
      ifta: ifta || { quarter: currentQ, due_date: '', status: 'PENDING' },
      kyu: kyu || { quarter: currentQ, due_date: '', status: 'PENDING' },
      nyhut: nyhut || { period: currentQ, due_date: '', status: 'PENDING' },
      expiries: expiries,
      success: req.query.success === 'true'
    });
  } catch (err) {
    console.error('Failed to load compliance overview:', err);
    res.status(500).send('Internal Server Error: ' + err.message);
  }
});

/**
 * GET /portal/profile - View Carrier Profile
 */
router.get('/profile', async (req, res) => {
  const carrierId = req.session.carrierId;
  try {
    let profile = await dbGet("SELECT * FROM carrier_profiles WHERE carrier_id = ?", [carrierId]);
    if (!profile) {
      // Create empty profile
      await dbRun("INSERT INTO carrier_profiles (carrier_id) VALUES (?)", [carrierId]);
      profile = await dbGet("SELECT * FROM carrier_profiles WHERE carrier_id = ?", [carrierId]);
    }
    
    // Load border transponders for D-TOPS automatically (JOIN query)
    const dtopsTransponders = await dbAll(`
      SELECT t.unit_number as truck_unit, bt.*
      FROM border_transponders bt
      JOIN trucks t ON bt.truck_id = t.id
      WHERE t.carrier_id = ?
    `, [carrierId]);

    res.render('portal/profile', {
      page: 'portal-profile',
      pageTitle: 'My Carrier Profile',
      profile: profile,
      dtopsTransponders: dtopsTransponders,
      success: req.query.success === 'true',
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).send(err.message);
  }
});

/**
 * POST /portal/profile/edit - Save Carrier Profile
 */
router.post('/profile/edit', async (req, res) => {
  const carrierId = req.session.carrierId;
  const data = req.body;

  try {
    // Process JSON array inputs
    const yard_addresses = JSON.stringify(Array.isArray(data.yard_addresses) ? data.yard_addresses : (data.yard_addresses ? [data.yard_addresses] : []));
    const tolls_other = JSON.stringify(Array.isArray(data.tolls_other_name) ? data.tolls_other_name.map((name, i) => ({
      name: name,
      account: Array.isArray(data.tolls_other_account) ? data.tolls_other_account[i] : data.tolls_other_account
    })).filter(item => item.name) : []);

    const border_other = JSON.stringify(Array.isArray(data.border_other_name) ? data.border_other_name.map((name, i) => ({
      name: name,
      account: Array.isArray(data.border_other_account) ? data.border_other_account[i] : data.border_other_account
    })).filter(item => item.name) : []);

    const irp_weight_groups = JSON.stringify(Array.isArray(data.irp_weight_groups) ? data.irp_weight_groups : (data.irp_weight_groups ? [data.irp_weight_groups] : []));

    await dbRun(`
      UPDATE carrier_profiles SET
        legal_name = ?, dba_name = ?, main_address = ?, yard_addresses = ?,
        primary_email = ?, secondary_email = ?, billing_email = ?,
        primary_phone = ?, secondary_phone = ?, primary_contact_name = ?, billing_contact_name = ?,
        federal_business_number = ?, ein_fein = ?, usdot = ?, mc_number = ?,
        carrier_code = ?, carrier_code_expiry = ?, scac = ?, scac_expiry = ?,
        cvor = ?, cvor_expiry = ?, cdn_bond = ?, cdn_bond_expiry = ?, usd_bond = ?, usd_bond_expiry = ?,
        ucr_year = ?,
        ctpat_approved = ?, ctpat_number = ?, fast_approved = ?,
        csa_approved = ?, csa_number = ?, pip_approved = ?, smartway_approved = ?,
        ifta_number = ?, ifta_expiry = ?, kyu_number = ?,
        ny_hut_account = ?, nm_permit = ?, oregon_permit = ?,
        irp_account = ?, irp_fleet_number = ?, irp_weight_groups = ?,
        tolls_ezpass = ?, tolls_apass = ?, tolls_hwy407 = ?, tolls_other = ?,
        border_ambassador_account = ?, border_bluewater_account = ?, border_other = ?,
        dtops_account = ?, updated_at = CURRENT_TIMESTAMP
      WHERE carrier_id = ?
    `, [
      data.legal_name, data.dba_name, data.main_address, yard_addresses,
      data.primary_email, data.secondary_email, data.billing_email,
      data.primary_phone, data.secondary_phone, data.primary_contact_name, data.billing_contact_name,
      data.federal_business_number, data.ein_fein, data.usdot, data.mc_number,
      data.carrier_code, data.carrier_code_expiry, data.scac, data.scac_expiry,
      data.cvor, data.cvor_expiry, data.cdn_bond, data.cdn_bond_expiry, data.usd_bond, data.usd_bond_expiry,
      data.ucr_year,
      data.ctpat_approved === '1' ? 1 : 0, data.ctpat_number, data.fast_approved === '1' ? 1 : 0,
      data.csa_approved === '1' ? 1 : 0, data.csa_number, data.pip_approved === '1' ? 1 : 0, data.smartway_approved === '1' ? 1 : 0,
      data.ifta_number, data.ifta_expiry, data.kyu_number,
      data.ny_hut_account, data.nm_permit, data.oregon_permit,
      data.irp_account, data.irp_fleet_number, irp_weight_groups,
      data.tolls_ezpass, data.tolls_apass, data.tolls_hwy407, tolls_other,
      data.border_ambassador_account, data.border_bluewater_account, border_other,
      data.dtops_account,
      carrierId
    ]);

    // Also update core carriers table baseline fields
    await dbRun("UPDATE carriers SET company_name = ?, email = ?, phone = ?, usdot = ?, mc_number = ? WHERE id = ?", [
      data.legal_name || data.dba_name, data.primary_email, data.primary_phone, data.usdot, data.mc_number, carrierId
    ]);

    res.redirect('/portal/profile?success=true');
  } catch (err) {
    console.error('Failed to update carrier profile:', err);
    res.redirect(`/portal/profile?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /portal/compliance/ifta - IFTA Filing Tracker
 */
router.get('/compliance/ifta', async (req, res) => {
  const carrierId = req.session.carrierId;
  try {
    const profile = await dbGet("SELECT ifta_number, ifta_expiry FROM carrier_profiles WHERE carrier_id = ?", [carrierId]);
    const filings = await dbAll("SELECT * FROM ifta_filings WHERE carrier_id = ? ORDER BY year DESC, quarter DESC", [carrierId]);
    res.render('portal/compliance/ifta', {
      page: 'portal-ifta',
      pageTitle: 'IFTA Fuel Tax Filing Tracker',
      profile: profile || {},
      filings: filings,
      success: req.query.success === 'true'
    });
  } catch (err) {
    console.error('Error fetching IFTA filings:', err);
    res.status(500).send(err.message);
  }
});

/**
 * POST /portal/compliance/ifta/update - Update IFTA Status
 */
router.post('/compliance/ifta/update', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { filing_id, status, filed_date, notes } = req.body;
  try {
    await dbRun(`
      UPDATE ifta_filings
      SET status = ?, filed_date = ?, notes = ?
      WHERE id = ? AND carrier_id = ?
    `, [status, filed_date || null, notes || null, filing_id, carrierId]);
    res.redirect('/portal/compliance/ifta?success=true');
  } catch (err) {
    console.error('Failed to update IFTA filing:', err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /portal/compliance/kyu - KYU Filing Tracker
 */
router.get('/compliance/kyu', async (req, res) => {
  const carrierId = req.session.carrierId;
  try {
    const profile = await dbGet("SELECT kyu_number FROM carrier_profiles WHERE carrier_id = ?", [carrierId]);
    const filings = await dbAll("SELECT * FROM kyu_filings WHERE carrier_id = ? ORDER BY year DESC, quarter DESC", [carrierId]);
    res.render('portal/compliance/kyu', {
      page: 'portal-kyu',
      pageTitle: 'KYU (Kentucky Weight Distance) Filing Tracker',
      profile: profile || {},
      filings: filings,
      success: req.query.success === 'true'
    });
  } catch (err) {
    console.error('Error fetching KYU filings:', err);
    res.status(500).send(err.message);
  }
});

/**
 * POST /portal/compliance/kyu/update - Update KYU Status
 */
router.post('/compliance/kyu/update', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { filing_id, status, filed_date, notes } = req.body;
  try {
    await dbRun(`
      UPDATE kyu_filings
      SET status = ?, filed_date = ?, notes = ?
      WHERE id = ? AND carrier_id = ?
    `, [status, filed_date || null, notes || null, filing_id, carrierId]);
    res.redirect('/portal/compliance/kyu?success=true');
  } catch (err) {
    console.error('Failed to update KYU filing:', err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /portal/compliance/nyhut - NY-HUT Filing Tracker
 */
router.get('/compliance/nyhut', async (req, res) => {
  const carrierId = req.session.carrierId;
  try {
    const profile = await dbGet("SELECT ny_hut_account FROM carrier_profiles WHERE carrier_id = ?", [carrierId]);
    const filings = await dbAll("SELECT * FROM nyhut_filings WHERE carrier_id = ? ORDER BY year DESC, period DESC", [carrierId]);
    res.render('portal/compliance/nyhut', {
      page: 'portal-nyhut',
      pageTitle: 'NY-HUT (New York Highway Use Tax) Tracker',
      profile: profile || {},
      filings: filings,
      success: req.query.success === 'true'
    });
  } catch (err) {
    console.error('Error fetching NYHUT filings:', err);
    res.status(500).send(err.message);
  }
});

/**
 * POST /portal/compliance/nyhut/update - Update NYHUT Filing
 */
router.post('/compliance/nyhut/update', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { filing_id, status, tag_number, filed_date, notes } = req.body;
  try {
    await dbRun(`
      UPDATE nyhut_filings
      SET status = ?, tag_number = ?, filed_date = ?, notes = ?
      WHERE id = ? AND carrier_id = ?
    `, [status, tag_number || null, filed_date || null, notes || null, filing_id, carrierId]);
    res.redirect('/portal/compliance/nyhut?success=true');
  } catch (err) {
    console.error('Failed to update NYHUT filing:', err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /portal/drivers - Drivers List
 */
router.get('/drivers', async (req, res) => {
  const carrierId = req.session.carrierId;
  try {
    const drivers = await dbAll("SELECT * FROM drivers WHERE carrier_id = ? AND status = 'active' ORDER BY last_name ASC, first_name ASC", [carrierId]);
    res.render('portal/drivers/index', {
      page: 'portal-drivers',
      pageTitle: 'Active Driver Roster',
      drivers: drivers
    });
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /portal/drivers/new - Add Driver Form
 */
router.get('/drivers/new', async (req, res) => {
  const carrierId = req.session.carrierId;
  try {
    const trucks = await dbAll("SELECT * FROM trucks WHERE carrier_id = ? AND status = 'active'", [carrierId]);
    res.render('portal/drivers/new', {
      page: 'portal-drivers',
      pageTitle: 'Onboard New Driver',
      trucks: trucks,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching trucks for driver assignment:', err);
    res.status(500).send(err.message);
  }
});

/**
 * POST /portal/drivers/new - Save New Driver
 */
router.post('/drivers/new', async (req, res) => {
  const carrierId = req.session.carrierId;
  const data = req.body;

  try {
    // Process JSON field for contractor details if needed
    const contractor_info = JSON.stringify({
      company_name: data.contractor_company_name || '',
      hst_number: data.contractor_hst || ''
    });

    await dbRun(`
      INSERT INTO drivers (
        carrier_id, first_name, middle_name, last_name, can_phone, usa_phone, primary_phone, email,
        dl_number, dl_state, dl_expiry, driver_type, citizenship, payment_type, contractor_company_name, contractor_info,
        wcb_number, wcb_expiry, sin_number, passport_number, passport_expiry, fast_card_number, fast_card_expiry,
        cdrp_number, cdrp_expiry, visa_number, visa_expiry, medical_due_date, assigned_truck_id, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, 'active'
      )
    `, [
      carrierId, data.first_name, data.middle_name, data.last_name, data.can_phone, data.usa_phone, data.primary_phone || 'CAN', data.email,
      data.dl_number, data.dl_state, data.dl_expiry, data.driver_type, data.citizenship, data.payment_type, data.contractor_company_name, contractor_info,
      data.wcb_number, data.wcb_expiry, data.sin_number, data.passport_number, data.passport_expiry, data.fast_card_number, data.fast_card_expiry,
      data.cdrp_number, data.cdrp_expiry, data.visa_number, data.visa_expiry, data.medical_due_date, data.assigned_truck_id ? parseInt(data.assigned_truck_id, 10) : null
    ]);

    res.redirect('/portal/drivers');
  } catch (err) {
    console.error('Failed to create driver:', err);
    res.redirect(`/portal/drivers/new?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /portal/drivers/:id - View Driver Profile
 */
router.get('/drivers/:id', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  try {
    const driver = await dbGet("SELECT * FROM drivers WHERE id = ? AND carrier_id = ?", [id, carrierId]);
    if (!driver) {
      return res.status(404).send('Driver not found.');
    }
    
    // Get assigned truck details if present
    let truck = null;
    if (driver.assigned_truck_id) {
      truck = await dbGet("SELECT * FROM trucks WHERE id = ?", [driver.assigned_truck_id]);
    }

    res.render('portal/drivers/view', {
      page: 'portal-drivers',
      pageTitle: `Driver Profile: ${driver.first_name} ${driver.last_name}`,
      driver: driver,
      truck: truck
    });
  } catch (err) {
    console.error('Error viewing driver:', err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /portal/drivers/:id/edit - Edit Driver
 */
router.get('/drivers/:id/edit', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  try {
    const driver = await dbGet("SELECT * FROM drivers WHERE id = ? AND carrier_id = ?", [id, carrierId]);
    if (!driver) {
      return res.status(404).send('Driver not found.');
    }
    const trucks = await dbAll("SELECT * FROM trucks WHERE carrier_id = ? AND status = 'active'", [carrierId]);
    
    // Parse contractor info JSON if it exists
    let contractorInfo = { company_name: '', hst_number: '' };
    try {
      if (driver.contractor_info) {
        contractorInfo = JSON.parse(driver.contractor_info);
      }
    } catch (e) {}

    res.render('portal/drivers/edit', {
      page: 'portal-drivers',
      pageTitle: `Edit Profile: ${driver.first_name} ${driver.last_name}`,
      driver: driver,
      trucks: trucks,
      contractorInfo: contractorInfo,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching driver edit form:', err);
    res.status(500).send(err.message);
  }
});

/**
 * POST /portal/drivers/:id/edit - Save Driver Edits
 */
router.post('/drivers/:id/edit', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  const data = req.body;

  try {
    const contractor_info = JSON.stringify({
      company_name: data.contractor_company_name || '',
      hst_number: data.contractor_hst || ''
    });

    await dbRun(`
      UPDATE drivers SET
        first_name = ?, middle_name = ?, last_name = ?, can_phone = ?, usa_phone = ?, primary_phone = ?, email = ?,
        dl_number = ?, dl_state = ?, dl_expiry = ?, driver_type = ?, citizenship = ?, payment_type = ?,
        contractor_company_name = ?, contractor_info = ?,
        wcb_number = ?, wcb_expiry = ?, sin_number = ?, passport_number = ?, passport_expiry = ?,
        fast_card_number = ?, fast_card_expiry = ?, cdrp_number = ?, cdrp_expiry = ?,
        visa_number = ?, visa_expiry = ?, medical_due_date = ?,
        assigned_truck_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND carrier_id = ?
    `, [
      data.first_name, data.middle_name, data.last_name, data.can_phone, data.usa_phone, data.primary_phone || 'CAN', data.email,
      data.dl_number, data.dl_state, data.dl_expiry, data.driver_type, data.citizenship, data.payment_type,
      data.contractor_company_name, contractor_info,
      data.wcb_number, data.wcb_expiry, data.sin_number, data.passport_number, data.passport_expiry,
      data.fast_card_number, data.fast_card_expiry, data.cdrp_number, data.cdrp_expiry,
      data.visa_number, data.visa_expiry, data.medical_due_date,
      data.assigned_truck_id ? parseInt(data.assigned_truck_id, 10) : null,
      id, carrierId
    ]);

    res.redirect(`/portal/drivers/${id}`);
  } catch (err) {
    console.error('Failed to update driver:', err);
    res.redirect(`/portal/drivers/${id}/edit?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * POST /portal/drivers/:id/delete - Soft Delete Driver
 */
router.post('/portal/drivers/:id/delete', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  try {
    await dbRun("UPDATE drivers SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND carrier_id = ?", [id, carrierId]);
    res.redirect('/portal/drivers');
  } catch (err) {
    console.error('Error soft deleting driver:', err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /portal/trucks - Trucks Fleet List
 */
router.get('/trucks', async (req, res) => {
  const carrierId = req.session.carrierId;
  try {
    const trucks = await dbAll("SELECT * FROM trucks WHERE carrier_id = ? AND status = 'active' ORDER BY unit_number ASC", [carrierId]);
    
    // Attach active plates for listing view
    for (const t of trucks) {
      const activePlate = await dbGet("SELECT plate_number FROM truck_plates WHERE truck_id = ? AND status = 'active' LIMIT 1", [t.id]);
      t.activePlateNumber = activePlate ? activePlate.plate_number : 'NO PLATE';
    }

    res.render('portal/trucks/index', {
      page: 'portal-trucks',
      pageTitle: 'Truck Fleet Manager',
      trucks: trucks
    });
  } catch (err) {
    console.error('Error fetching trucks:', err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /portal/trucks/new - Add Truck Form
 */
router.get('/trucks/new', (req, res) => {
  res.render('portal/trucks/new', {
    page: 'portal-trucks',
    pageTitle: 'Register New Fleet Truck',
    error: req.query.error || null
  });
});

/**
 * POST /portal/trucks/new - Save New Truck
 */
router.post('/trucks/new', async (req, res) => {
  const carrierId = req.session.carrierId;
  const data = req.body;

  try {
    // 1. Compute PMVI next date
    const pmvi_next_date = calculatePmviNext(data.pmvi_last_date, data.pmvi_frequency);
    
    // 2. Compute Oil Change next date (default = last + 3 months)
    const oil_change_next = calculateOilChangeNext(data.oil_change_last);

    // 3. Serialize JSON values
    const tolls_other = JSON.stringify(Array.isArray(data.tolls_other_name) ? data.tolls_other_name.map((name, i) => ({
      name: name,
      number: Array.isArray(data.tolls_other_number) ? data.tolls_other_number[i] : data.tolls_other_number
    })).filter(item => item.name) : []);

    const dtops_transponders = JSON.stringify(Array.isArray(data.dtops_transponder_num) ? data.dtops_transponder_num.map((num, i) => ({
      number: num,
      status: Array.isArray(data.dtops_transponder_status) ? data.dtops_transponder_status[i] : data.dtops_transponder_status
    })).filter(item => item.number) : []);

    const ambassador_transponders = JSON.stringify(Array.isArray(data.ambassador_tag_num) ? data.ambassador_tag_num.map((num, i) => ({
      number: num,
      status: Array.isArray(data.ambassador_tag_status) ? data.ambassador_tag_status[i] : data.ambassador_tag_status
    })).filter(item => item.number) : []);

    const bluewater_transponders = JSON.stringify(Array.isArray(data.bluewater_tag_num) ? data.bluewater_tag_num.map((num, i) => ({
      number: num,
      status: Array.isArray(data.bluewater_tag_status) ? data.bluewater_tag_status[i] : data.bluewater_tag_status
    })).filter(item => item.number) : []);

    const other_toll_transponders = JSON.stringify(Array.isArray(data.other_transponder_name) ? data.other_transponder_name.map((name, i) => ({
      name: name,
      number: Array.isArray(data.other_transponder_num) ? data.other_transponder_num[i] : data.other_transponder_num,
      status: Array.isArray(data.other_transponder_status) ? data.other_transponder_status[i] : data.other_transponder_status
    })).filter(item => item.name) : []);

    const result = await dbRun(`
      INSERT INTO trucks (
        carrier_id, unit_number, vin, make, model, year, gps_tracker, fuel_card_number,
        tolls_ezpass, tolls_hwy407, tolls_other, pmvi_last_date, pmvi_next_date, pmvi_frequency,
        annual_safety_expiry, oil_change_last, oil_change_next, dtops_transponders,
        ambassador_transponders, bluewater_transponders, other_toll_transponders, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, 'active'
      )
    `, [
      carrierId, data.unit_number, data.vin, data.make, data.model, data.year ? parseInt(data.year, 10) : null, data.gps_tracker, data.fuel_card_number,
      data.tolls_ezpass, data.tolls_hwy407, tolls_other, data.pmvi_last_date, pmvi_next_date, data.pmvi_frequency || 'annually',
      data.annual_safety_expiry, data.oil_change_last, oil_change_next, dtops_transponders,
      ambassador_transponders, bluewater_transponders, other_toll_transponders
    ]);

    const truckId = result.lastID;

    // 4. Save Plate if provided
    if (data.plate_number) {
      await dbRun(`
        INSERT INTO truck_plates (truck_id, plate_number, plate_group, weight_group, expiry, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `, [truckId, data.plate_number, data.plate_group, data.weight_group, data.plate_expiry]);
    }

    // 5. Add border transponders to their respective tables for carrier-profile joins
    // Ambassador
    if (Array.isArray(data.ambassador_tag_num)) {
      for (let i = 0; i < data.ambassador_tag_num.length; i++) {
        const num = data.ambassador_tag_num[i];
        if (num) {
          await dbRun(`
            INSERT INTO border_transponders (truck_id, bridge_name, unit_number, vin, plate_number, transponder_number, expiry, status)
            VALUES (?, 'Ambassador', ?, ?, ?, ?, ?, ?)
          `, [truckId, data.unit_number, data.vin, data.plate_number, num, data.ambassador_expiry, data.ambassador_tag_status[i] || 'active']);
        }
      }
    } else if (data.ambassador_tag_num) {
      await dbRun(`
        INSERT INTO border_transponders (truck_id, bridge_name, unit_number, vin, plate_number, transponder_number, expiry, status)
        VALUES (?, 'Ambassador', ?, ?, ?, ?, ?, ?)
      `, [truckId, data.unit_number, data.vin, data.plate_number, data.ambassador_tag_num, data.ambassador_expiry, data.ambassador_tag_status || 'active']);
    }

    // Blue Water
    if (Array.isArray(data.bluewater_tag_num)) {
      for (let i = 0; i < data.bluewater_tag_num.length; i++) {
        const num = data.bluewater_tag_num[i];
        if (num) {
          await dbRun(`
            INSERT INTO border_transponders (truck_id, bridge_name, unit_number, vin, plate_number, transponder_number, expiry, status)
            VALUES (?, 'Blue Water', ?, ?, ?, ?, ?, ?)
          `, [truckId, data.unit_number, data.vin, data.plate_number, num, data.bluewater_expiry, data.bluewater_tag_status[i] || 'active']);
        }
      }
    } else if (data.bluewater_tag_num) {
      await dbRun(`
        INSERT INTO border_transponders (truck_id, bridge_name, unit_number, vin, plate_number, transponder_number, expiry, status)
        VALUES (?, 'Blue Water', ?, ?, ?, ?, ?, ?)
      `, [truckId, data.unit_number, data.vin, data.plate_number, data.bluewater_tag_num, data.bluewater_expiry, data.bluewater_tag_status || 'active']);
    }

    res.redirect('/portal/trucks');
  } catch (err) {
    console.error('Failed to create truck:', err);
    res.redirect(`/portal/trucks/new?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /portal/trucks/:id - View Truck Details & Plates History
 */
router.get('/trucks/:id', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  try {
    const truck = await dbGet("SELECT * FROM trucks WHERE id = ? AND carrier_id = ?", [id, carrierId]);
    if (!truck) {
      return res.status(404).send('Truck not found.');
    }

    // Get active plate and plates history
    const plates = await dbAll("SELECT * FROM truck_plates WHERE truck_id = ? ORDER BY id DESC", [id]);
    const activePlate = plates.find(p => p.status === 'active');
    
    // Parse JSON transponders
    let tollsOther = [], dtops = [], ambassador = [], bluewater = [], otherTolls = [];
    try { if (truck.tolls_other) tollsOther = JSON.parse(truck.tolls_other); } catch (e) {}
    try { if (truck.dtops_transponders) dtops = JSON.parse(truck.dtops_transponders); } catch (e) {}
    try { if (truck.ambassador_transponders) ambassador = JSON.parse(truck.ambassador_transponders); } catch (e) {}
    try { if (truck.bluewater_transponders) bluewater = JSON.parse(truck.bluewater_transponders); } catch (e) {}
    try { if (truck.other_toll_transponders) otherTolls = JSON.parse(truck.other_toll_transponders); } catch (e) {}

    res.render('portal/trucks/view', {
      page: 'portal-trucks',
      pageTitle: `Truck Details: Unit ${truck.unit_number}`,
      truck: truck,
      activePlate: activePlate,
      platesHistory: plates,
      tollsOther, dtops, ambassador, bluewater, otherTolls
    });
  } catch (err) {
    console.error('Error fetching truck details:', err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /portal/trucks/:id/edit - Edit Truck
 */
router.get('/portal/trucks/:id/edit', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  try {
    const truck = await dbGet("SELECT * FROM trucks WHERE id = ? AND carrier_id = ?", [id, carrierId]);
    if (!truck) {
      return res.status(404).send('Truck not found.');
    }

    // Get plates
    const plates = await dbAll("SELECT * FROM truck_plates WHERE truck_id = ? ORDER BY id DESC", [id]);
    const activePlate = plates.find(p => p.status === 'active');

    let tollsOther = [], dtops = [], ambassador = [], bluewater = [], otherTolls = [];
    try { if (truck.tolls_other) tollsOther = JSON.parse(truck.tolls_other); } catch (e) {}
    try { if (truck.dtops_transponders) dtops = JSON.parse(truck.dtops_transponders); } catch (e) {}
    try { if (truck.ambassador_transponders) ambassador = JSON.parse(truck.ambassador_transponders); } catch (e) {}
    try { if (truck.bluewater_transponders) bluewater = JSON.parse(truck.bluewater_transponders); } catch (e) {}
    try { if (truck.other_toll_transponders) otherTolls = JSON.parse(truck.other_toll_transponders); } catch (e) {}

    res.render('portal/trucks/edit', {
      page: 'portal-trucks',
      pageTitle: `Edit Truck: Unit ${truck.unit_number}`,
      truck: truck,
      activePlate: activePlate || { plate_number: '', plate_group: '', weight_group: '', expiry: '' },
      tollsOther, dtops, ambassador, bluewater, otherTolls,
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching edit truck form:', err);
    res.status(500).send(err.message);
  }
});

/**
 * POST /portal/trucks/:id/edit - Save Truck Edits
 */
router.post('/portal/trucks/:id/edit', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  const data = req.body;

  try {
    const pmvi_next_date = calculatePmviNext(data.pmvi_last_date, data.pmvi_frequency);
    const oil_change_next = calculateOilChangeNext(data.oil_change_last);

    const tolls_other = JSON.stringify(Array.isArray(data.tolls_other_name) ? data.tolls_other_name.map((name, i) => ({
      name: name,
      number: Array.isArray(data.tolls_other_number) ? data.tolls_other_number[i] : data.tolls_other_number
    })).filter(item => item.name) : []);

    const dtops_transponders = JSON.stringify(Array.isArray(data.dtops_transponder_num) ? data.dtops_transponder_num.map((num, i) => ({
      number: num,
      status: Array.isArray(data.dtops_transponder_status) ? data.dtops_transponder_status[i] : data.dtops_transponder_status
    })).filter(item => item.number) : []);

    const ambassador_transponders = JSON.stringify(Array.isArray(data.ambassador_tag_num) ? data.ambassador_tag_num.map((num, i) => ({
      number: num,
      status: Array.isArray(data.ambassador_tag_status) ? data.ambassador_tag_status[i] : data.ambassador_tag_status
    })).filter(item => item.number) : []);

    const bluewater_transponders = JSON.stringify(Array.isArray(data.bluewater_tag_num) ? data.bluewater_tag_num.map((num, i) => ({
      number: num,
      status: Array.isArray(data.bluewater_tag_status) ? data.bluewater_tag_status[i] : data.bluewater_tag_status
    })).filter(item => item.number) : []);

    const other_toll_transponders = JSON.stringify(Array.isArray(data.other_transponder_name) ? data.other_transponder_name.map((name, i) => ({
      name: name,
      number: Array.isArray(data.other_transponder_num) ? data.other_transponder_num[i] : data.other_transponder_num,
      status: Array.isArray(data.other_transponder_status) ? data.other_transponder_status[i] : data.other_transponder_status
    })).filter(item => item.name) : []);

    await dbRun(`
      UPDATE trucks SET
        unit_number = ?, vin = ?, make = ?, model = ?, year = ?, gps_tracker = ?, fuel_card_number = ?,
        tolls_ezpass = ?, tolls_hwy407 = ?, tolls_other = ?, pmvi_last_date = ?, pmvi_next_date = ?, pmvi_frequency = ?,
        annual_safety_expiry = ?, oil_change_last = ?, oil_change_next = ?, dtops_transponders = ?,
        ambassador_transponders = ?, bluewater_transponders = ?, other_toll_transponders = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND carrier_id = ?
    `, [
      data.unit_number, data.vin, data.make, data.model, data.year ? parseInt(data.year, 10) : null, data.gps_tracker, data.fuel_card_number,
      data.tolls_ezpass, data.tolls_hwy407, tolls_other, data.pmvi_last_date, pmvi_next_date, data.pmvi_frequency || 'annually',
      data.annual_safety_expiry, data.oil_change_last, oil_change_next, dtops_transponders,
      ambassador_transponders, bluewater_transponders, other_toll_transponders,
      id, carrierId
    ]);

    // Handle Active Plate update/add
    if (data.plate_number) {
      // Check if active plate matches
      const currentActive = await dbGet("SELECT * FROM truck_plates WHERE truck_id = ? AND status = 'active'", [id]);
      
      if (!currentActive || currentActive.plate_number !== data.plate_number) {
        // Mark all others lost/returned
        await dbRun("UPDATE truck_plates SET status = 'returned' WHERE truck_id = ?", [id]);
        
        // Insert new active plate
        await dbRun(`
          INSERT INTO truck_plates (truck_id, plate_number, plate_group, weight_group, expiry, status)
          VALUES (?, ?, ?, ?, ?, 'active')
        `, [id, data.plate_number, data.plate_group, data.weight_group, data.plate_expiry]);
      } else {
        // Just update existing active plate details
        await dbRun(`
          UPDATE truck_plates SET
            plate_group = ?, weight_group = ?, expiry = ?
          WHERE id = ?
        `, [data.plate_group, data.weight_group, data.plate_expiry, currentActive.id]);
      }
    }

    // Refresh border transponders table
    await dbRun("DELETE FROM border_transponders WHERE truck_id = ?", [id]);

    // Re-insert Ambassador tags
    if (Array.isArray(data.ambassador_tag_num)) {
      for (let i = 0; i < data.ambassador_tag_num.length; i++) {
        const num = data.ambassador_tag_num[i];
        if (num) {
          await dbRun(`
            INSERT INTO border_transponders (truck_id, bridge_name, unit_number, vin, plate_number, transponder_number, expiry, status)
            VALUES (?, 'Ambassador', ?, ?, ?, ?, ?, ?)
          `, [id, data.unit_number, data.vin, data.plate_number, num, data.ambassador_expiry, data.ambassador_tag_status[i] || 'active']);
        }
      }
    }

    // Re-insert Blue Water tags
    if (Array.isArray(data.bluewater_tag_num)) {
      for (let i = 0; i < data.bluewater_tag_num.length; i++) {
        const num = data.bluewater_tag_num[i];
        if (num) {
          await dbRun(`
            INSERT INTO border_transponders (truck_id, bridge_name, unit_number, vin, plate_number, transponder_number, expiry, status)
            VALUES (?, 'Blue Water', ?, ?, ?, ?, ?, ?)
          `, [id, data.unit_number, data.vin, data.plate_number, num, data.bluewater_expiry, data.bluewater_tag_status[i] || 'active']);
        }
      }
    }

    res.redirect(`/portal/trucks/${id}`);
  } catch (err) {
    console.error('Failed to edit truck:', err);
    res.redirect(`/portal/trucks/${id}/edit?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /portal/trucks/:id/maintenance - Maintenance Log
 */
router.get('/trucks/:id/maintenance', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  try {
    const truck = await dbGet("SELECT * FROM trucks WHERE id = ? AND carrier_id = ?", [id, carrierId]);
    if (!truck) {
      return res.status(404).send('Truck not found.');
    }

    const records = await dbAll("SELECT * FROM truck_maintenance WHERE truck_id = ? ORDER BY repair_date DESC", [id]);
    
    // Group records by month (YYYY-MM)
    const grouped = {};
    records.forEach(r => {
      let month = r.month;
      if (!month && r.repair_date) {
        month = r.repair_date.substring(0, 7); // extract YYYY-MM
      }
      if (!month) month = 'Unknown';
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(r);
    });

    res.render('portal/trucks/maintenance', {
      page: 'portal-trucks',
      pageTitle: `Maintenance Logs: Unit ${truck.unit_number}`,
      truck: truck,
      grouped: grouped,
      records: records,
      success: req.query.success === 'true',
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching maintenance records:', err);
    res.status(500).send(err.message);
  }
});

/**
 * POST /portal/trucks/:id/maintenance/add - Add Maintenance Record
 */
router.post('/trucks/:id/maintenance/add', upload.array('docs'), async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  const data = req.body;

  try {
    const repair_types = JSON.stringify(Array.isArray(data.repair_types) ? data.repair_types : (data.repair_types ? [data.repair_types] : []));
    const month = data.repair_date ? data.repair_date.substring(0, 7) : new Date().toISOString().substring(0, 7);

    const has_no_history = data.has_no_history === '1' ? 1 : 0;
    const no_history_note = data.no_history_note || '';

    const result = await dbRun(`
      INSERT INTO truck_maintenance (
        truck_id, carrier_id, shop_name, country, city, province_state,
        repair_types, repair_date, amount, currency, notes, month, has_no_history, no_history_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, carrierId, data.shop_name, data.country, data.city, data.province_state,
      repair_types, data.repair_date, data.amount ? parseFloat(data.amount) : null, data.currency || 'CAD',
      data.notes, month, has_no_history, no_history_note
    ]);

    const recordId = result.lastID;

    // Save uploaded files to compliance_documents
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const relativePath = `/uploads/compliance/${carrierId}/truck/${id}/${file.filename}`;
        await dbRun(`
          INSERT INTO compliance_documents (carrier_id, entity_type, entity_id, doc_category, doc_label, file_path)
          VALUES (?, 'truck', ?, 'Maintenance Bills', ?, ?)
        `, [carrierId, id, file.originalname, relativePath]);
      }
    }

    res.redirect(`/portal/trucks/${id}/maintenance?success=true`);
  } catch (err) {
    console.error('Failed to add maintenance record:', err);
    res.redirect(`/portal/trucks/${id}/maintenance?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * POST /portal/trucks/:id/plates/add - Add New Plate
 */
router.post('/trucks/:id/plates/add', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  const { plate_number, plate_group, weight_group, expiry } = req.body;

  try {
    // 1. Mark all existing plates for this truck as returned/inactive
    await dbRun("UPDATE truck_plates SET status = 'returned' WHERE truck_id = ?", [id]);

    // 2. Insert new plate as active
    await dbRun(`
      INSERT INTO truck_plates (truck_id, plate_number, plate_group, weight_group, expiry, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `, [id, plate_number, plate_group, weight_group, expiry]);

    res.redirect(`/portal/trucks/${id}?success=true`);
  } catch (err) {
    console.error('Failed to add plate:', err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /portal/trailers - Trailers Fleet List
 */
router.get('/trailers', async (req, res) => {
  const carrierId = req.session.carrierId;
  try {
    const trailers = await dbAll("SELECT * FROM trailers WHERE carrier_id = ? AND status = 'active' ORDER BY unit_number ASC", [carrierId]);
    
    // Attach active plates
    for (const tr of trailers) {
      const activePlate = await dbGet("SELECT plate_number FROM trailer_plates WHERE trailer_id = ? AND status = 'active' LIMIT 1", [tr.id]);
      tr.activePlateNumber = activePlate ? activePlate.plate_number : 'NO PLATE';
    }

    res.render('portal/trailers/index', {
      page: 'portal-trailers',
      pageTitle: 'Trailer Fleet Manager',
      trailers: trailers
    });
  } catch (err) {
    console.error('Error fetching trailers:', err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /portal/trailers/new - Add Trailer Form
 */
router.get('/trailers/new', (req, res) => {
  res.render('portal/trailers/new', {
    page: 'portal-trailers',
    pageTitle: 'Register New Fleet Trailer',
    error: req.query.error || null
  });
});

/**
 * POST /portal/trailers/new - Save New Trailer
 */
router.post('/trailers/new', async (req, res) => {
  const carrierId = req.session.carrierId;
  const data = req.body;

  try {
    const pmvi_next_date = calculatePmviNext(data.pmvi_last_date, data.pmvi_frequency);

    const result = await dbRun(`
      INSERT INTO trailers (
        carrier_id, unit_number, vin, make, model, year, registration_state, gps_tracker,
        pmvi_last_date, pmvi_next_date, pmvi_frequency, annual_safety_expiry, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `, [
      carrierId, data.unit_number, data.vin, data.make, data.model, data.year ? parseInt(data.year, 10) : null,
      data.registration_state, data.gps_tracker, data.pmvi_last_date, pmvi_next_date,
      data.pmvi_frequency || 'annually', data.annual_safety_expiry
    ]);

    const trailerId = result.lastID;

    // Save plate if provided
    if (data.plate_number) {
      await dbRun(`
        INSERT INTO trailer_plates (trailer_id, plate_number, status)
        VALUES (?, ?, 'active')
      `, [trailerId, data.plate_number]);
    }

    res.redirect('/portal/trailers');
  } catch (err) {
    console.error('Failed to create trailer:', err);
    res.redirect(`/portal/trailers/new?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /portal/trailers/:id - View Trailer Profile
 */
router.get('/trailers/:id', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  try {
    const trailer = await dbGet("SELECT * FROM trailers WHERE id = ? AND carrier_id = ?", [id, carrierId]);
    if (!trailer) {
      return res.status(404).send('Trailer not found.');
    }

    const plates = await dbAll("SELECT * FROM trailer_plates WHERE trailer_id = ? ORDER BY id DESC", [id]);
    const activePlate = plates.find(p => p.status === 'active');

    res.render('portal/trailers/view', {
      page: 'portal-trailers',
      pageTitle: `Trailer Details: Unit ${trailer.unit_number}`,
      trailer: trailer,
      activePlate: activePlate,
      platesHistory: plates
    });
  } catch (err) {
    console.error('Error fetching trailer details:', err);
    res.status(500).send(err.message);
  }
});

/**
 * GET /portal/trailers/:id/edit - Edit Trailer
 */
router.get('/portal/trailers/:id/edit', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  try {
    const trailer = await dbGet("SELECT * FROM trailers WHERE id = ? AND carrier_id = ?", [id, carrierId]);
    if (!trailer) {
      return res.status(404).send('Trailer not found.');
    }

    const plates = await dbAll("SELECT * FROM trailer_plates WHERE trailer_id = ? ORDER BY id DESC", [id]);
    const activePlate = plates.find(p => p.status === 'active');

    res.render('portal/trailers/edit', {
      page: 'portal-trailers',
      pageTitle: `Edit Trailer: Unit ${trailer.unit_number}`,
      trailer: trailer,
      activePlate: activePlate || { plate_number: '' },
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error fetching trailer edit form:', err);
    res.status(500).send(err.message);
  }
});

/**
 * POST /portal/trailers/:id/edit - Save Trailer Edits
 */
router.post('/portal/trailers/:id/edit', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  const data = req.body;

  try {
    const pmvi_next_date = calculatePmviNext(data.pmvi_last_date, data.pmvi_frequency);

    await dbRun(`
      UPDATE trailers SET
        unit_number = ?, vin = ?, make = ?, model = ?, year = ?, registration_state = ?, gps_tracker = ?,
        pmvi_last_date = ?, pmvi_next_date = ?, pmvi_frequency = ?, annual_safety_expiry = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND carrier_id = ?
    `, [
      data.unit_number, data.vin, data.make, data.model, data.year ? parseInt(data.year, 10) : null,
      data.registration_state, data.gps_tracker, data.pmvi_last_date, pmvi_next_date,
      data.pmvi_frequency || 'annually', data.annual_safety_expiry,
      id, carrierId
    ]);

    // Handle Active Plate update
    if (data.plate_number) {
      const currentActive = await dbGet("SELECT * FROM trailer_plates WHERE trailer_id = ? AND status = 'active'", [id]);
      if (!currentActive || currentActive.plate_number !== data.plate_number) {
        await dbRun("UPDATE trailer_plates SET status = 'returned' WHERE trailer_id = ?", [id]);
        await dbRun(`
          INSERT INTO trailer_plates (trailer_id, plate_number, status)
          VALUES (?, ?, 'active')
        `, [id, data.plate_number]);
      }
    }

    res.redirect(`/portal/trailers/${id}`);
  } catch (err) {
    console.error('Failed to update trailer:', err);
    res.redirect(`/portal/trailers/${id}/edit?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /portal/documents - Tabbed Document Library
 */
router.get('/documents', async (req, res) => {
  const carrierId = req.session.carrierId;
  try {
    // Fetch all documents for this carrier
    const allDocs = await dbAll("SELECT * FROM compliance_documents WHERE carrier_id = ? ORDER BY uploaded_at DESC", [carrierId]);
    
    // Group documents by entity type
    const grouped = {
      company: allDocs.filter(d => d.entity_type === 'company'),
      truck: allDocs.filter(d => d.entity_type === 'truck'),
      trailer: allDocs.filter(d => d.entity_type === 'trailer'),
      driver: allDocs.filter(d => d.entity_type === 'driver')
    };

    // Load available units/drivers to show upload targets in selectors
    const trucks = await dbAll("SELECT id, unit_number FROM trucks WHERE carrier_id = ? AND status = 'active' ORDER BY unit_number ASC", [carrierId]);
    const trailers = await dbAll("SELECT id, unit_number FROM trailers WHERE carrier_id = ? AND status = 'active' ORDER BY unit_number ASC", [carrierId]);
    const drivers = await dbAll("SELECT id, first_name, last_name FROM drivers WHERE carrier_id = ? AND status = 'active' ORDER BY last_name ASC, first_name ASC", [carrierId]);

    res.render('portal/documents', {
      page: 'portal-documents',
      pageTitle: 'Compliance Document Library',
      grouped: grouped,
      trucks: trucks,
      trailers: trailers,
      drivers: drivers,
      success: req.query.success === 'true',
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error loading documents:', err);
    res.status(500).send(err.message);
  }
});

/**
 * POST /portal/documents/upload - Upload compliance document
 */
router.post('/portal/documents/upload', upload.single('doc_file'), async (req, res) => {
  const carrierId = req.session.carrierId;
  const { entity_type, entity_id, doc_category, doc_label } = req.body;

  if (!req.file) {
    return res.redirect('/portal/documents?error=No+file+selected+for+upload.');
  }

  try {
    const relativePath = `/uploads/compliance/${carrierId}/${entity_type}/${entity_id || 0}/${req.file.filename}`;
    
    await dbRun(`
      INSERT INTO compliance_documents (carrier_id, entity_type, entity_id, doc_category, doc_label, file_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [carrierId, entity_type, entity_id || 0, doc_category, doc_label || null, relativePath]);

    res.redirect('/portal/documents?success=true');
  } catch (err) {
    console.error('Failed to save document record:', err);
    res.redirect(`/portal/documents?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /portal/documents/download/:id - Download document file
 */
router.get('/documents/download/:id', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  try {
    const doc = await dbGet("SELECT * FROM compliance_documents WHERE id = ? AND carrier_id = ?", [id, carrierId]);
    if (!doc || !doc.file_path) {
      return res.status(404).send('Document not found.');
    }

    const absolutePath = path.join(__dirname, '../public', doc.file_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).send('Document file does not exist on server.');
    }

    res.download(absolutePath, doc.doc_label || path.basename(doc.file_path));
  } catch (err) {
    console.error('Error downloading document:', err);
    res.status(500).send(err.message);
  }
});

/**
 * POST /portal/documents/delete/:id - Delete document
 */
router.post('/portal/documents/delete/:id', async (req, res) => {
  const carrierId = req.session.carrierId;
  const { id } = req.params;
  try {
    const doc = await dbGet("SELECT * FROM compliance_documents WHERE id = ? AND carrier_id = ?", [id, carrierId]);
    if (!doc) {
      return res.status(404).send('Document record not found.');
    }

    // Delete file from disk
    const absolutePath = path.join(__dirname, '../public', doc.file_path);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    // Delete record from DB
    await dbRun("DELETE FROM compliance_documents WHERE id = ?", [id]);
    res.redirect('/portal/documents?success=true');
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).send(err.message);
  }
});

module.exports = router;
