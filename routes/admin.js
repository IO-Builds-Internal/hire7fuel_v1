const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');

// Configure admin password from environment (default: admin123)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Configure Multer for Admin Brand Logo Uploads
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads');
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique name keeping original extension
    const ext = path.extname(file.originalname);
    cb(null, `logo_custom_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Validate image format
    const filetypes = /jpeg|jpg|png|gif|svg|ico/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only standard images (png, jpg, jpeg, gif, svg, ico) are allowed.'));
  }
});

/**
 * Gatekeeper Middleware
 * Restricts access to authenticated admin sessions.
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
}

/**
 * GET /admin/login - Render Authenticator Panel
 */
router.get('/login', (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: null, layout: false });
});

// Stateful in-memory dictionary to track invalid login attempts per IP
const loginAttempts = {};
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_COOLDOWN = 60 * 1000; // 60 seconds

/**
 * POST /admin/login - Authenticate Access Code
 */
router.post('/login', (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();

  // Check if IP is under active lockout
  if (loginAttempts[ip] && loginAttempts[ip].lockUntil > now) {
    const remainingSeconds = Math.ceil((loginAttempts[ip].lockUntil - now) / 1000);
    return res.render('admin/login', {
      error: `Too many failed password attempts. This IP address is locked for another ${remainingSeconds} seconds.`,
      layout: false
    });
  }

  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    // Reset login attempts on successful login
    if (loginAttempts[ip]) {
      delete loginAttempts[ip];
    }
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    // Track and increment failed attempt
    if (!loginAttempts[ip]) {
      loginAttempts[ip] = { count: 0, lockUntil: 0 };
    }
    loginAttempts[ip].count += 1;

    if (loginAttempts[ip].count >= MAX_LOGIN_ATTEMPTS) {
      loginAttempts[ip].lockUntil = now + LOCKOUT_COOLDOWN;
      loginAttempts[ip].count = 0; // reset attempts for when cooldown expires
      return res.render('admin/login', {
        error: 'Too many failed password attempts. This IP address is locked for the next 60 seconds.',
        layout: false
      });
    } else {
      const attemptsLeft = MAX_LOGIN_ATTEMPTS - loginAttempts[ip].count;
      res.render('admin/login', {
        error: `Invalid access credentials. Please try again. (${attemptsLeft} attempts remaining before temporary lockout)`,
        layout: false
      });
    }
  }
});

/**
 * GET /admin/logout - Invalidate Session
 */
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Apply secure Gatekeeper middleware to all paths below
router.use(requireAdmin);

/**
 * GET /admin - Main Control Panel (Dashboard stats + submissions)
 */
router.get('/', async (req, res) => {
  try {
    const config = await db.getSettings();
    const submissions = await db.getSubmissions();
    const jobs = await db.getJobs();

    // Statistics aggregation
    const stats = {
      totalSubmissions: submissions.length,
      contactCount: submissions.filter(s => s.type === 'contact').length,
      fuelcardCount: submissions.filter(s => s.type === 'fuelcard').length,
      careerCount: submissions.filter(s => s.type === 'career').length,
      activeJobs: jobs.filter(j => j.active).length
    };

    res.render('admin/dashboard', {
      config,
      submissions,
      stats,
      page: 'admin-dashboard',
      pageTitle: 'Admin Dashboard Hub',
      pageDescription: 'Aggregated analytics and operational submission logs.'
    });
  } catch (err) {
    console.error('Failed to load admin dashboard:', err);
    res.status(500).send('Admin Control Panel: Fatal server error.');
  }
});

/**
 * POST /admin/submissions/delete/:id - Delete Dynamic Submission
 */
router.post('/submissions/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const ok = await db.deleteSubmission(id);
    if (ok) {
      res.json({ success: true, message: 'Submission deleted successfully.' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete submission from database.' });
    }
  } catch (err) {
    console.error('Error deleting submission:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /admin/settings - Brand Customizer Form
 */
router.get('/settings', async (req, res) => {
  try {
    const config = await db.getSettings();
    res.render('admin/settings', {
      config,
      success: req.query.success === 'true',
      error: req.query.error || null,
      page: 'admin-settings',
      pageTitle: 'Website Brand Customizer',
      pageDescription: 'Dynamically update coordinates, titles, logos, and SMTP parameters.'
    });
  } catch (err) {
    console.error('Failed to load admin settings:', err);
    res.status(500).send('Dynamic settings loader error.');
  }
});

/**
 * POST /admin/settings - Save Brand / Contact Config overrides
 */
router.post('/settings', upload.single('logo_file'), async (req, res) => {
  const { 
    brand_name, 
    brand_tagline, 
    contact_phone, 
    contact_email, 
    contact_address,
    social_linkedin,
    social_facebook,
    social_instagram,
    app_playstore,
    app_appstore,
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_pass,
    smtp_from,
    smtp_to,
    smtp_enabled,
    program_cash_coming_soon,
    program_cash_redirect,
    program_maint_coming_soon,
    program_maint_redirect
  } = req.body;

  const updates = {
    brand_name,
    brand_tagline,
    contact_phone,
    contact_email,
    contact_address,
    social_linkedin: social_linkedin || '',
    social_facebook: social_facebook || '',
    social_instagram: social_instagram || '',
    app_playstore: app_playstore || '',
    app_appstore: app_appstore || '',
    smtp_host: smtp_host || '',
    smtp_port: smtp_port || '',
    smtp_user: smtp_user || '',
    smtp_pass: smtp_pass || '',
    smtp_from: smtp_from || '',
    smtp_to: smtp_to || '',
    smtp_enabled: smtp_enabled === 'true' ? 'true' : 'false',
    program_cash_coming_soon: program_cash_coming_soon === 'true' ? 'true' : 'false',
    program_cash_redirect: program_cash_redirect || '/contact',
    program_maint_coming_soon: program_maint_coming_soon === 'true' ? 'true' : 'false',
    program_maint_redirect: program_maint_redirect || '/contact'
  };

  // If a custom logo was uploaded, update the URL
  if (req.file) {
    updates.logo_url = `/uploads/${req.file.filename}`;
  }

  try {
    const ok = await db.updateSettings(updates);
    if (ok) {
      res.redirect('/admin/settings?success=true');
    } else {
      res.redirect('/admin/settings?error=Failed+to+save+some+parameters');
    }
  } catch (err) {
    console.error('Error saving admin settings:', err);
    res.redirect(`/admin/settings?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /admin/jobs - Careers Admin CRUD Dashboard
 */
router.get('/jobs', async (req, res) => {
  try {
    const config = await db.getSettings();
    const jobs = await db.getJobs(); // Get all jobs (active + inactive)
    res.render('admin/jobs', {
      config,
      jobs,
      success: req.query.success === 'true',
      error: req.query.error || null,
      page: 'admin-jobs',
      pageTitle: 'Careers & Jobs Administrator',
      pageDescription: 'Create, toggle, or delete dynamic job postings.'
    });
  } catch (err) {
    console.error('Failed to load admin careers panel:', err);
    res.status(500).send('Careers manager loader error.');
  }
});

/**
 * POST /admin/jobs/add - Add New Job Listing
 */
router.post('/jobs/add', async (req, res) => {
  const { title, department, location, type, description, requirements } = req.body;

  if (!title || !department || !location || !description || !requirements) {
    return res.redirect('/admin/jobs?error=Please+fill+in+all+required+fields');
  }

  try {
    const ok = await db.addJob({ title, department, location, type, description, requirements });
    if (ok) {
      res.redirect('/admin/jobs?success=true');
    } else {
      res.redirect('/admin/jobs?error=Failed+to+insert+job+posting');
    }
  } catch (err) {
    console.error('Error adding job listing:', err);
    res.redirect(`/admin/jobs?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * POST /admin/jobs/toggle/:id - Toggle Job Status
 */
router.post('/jobs/toggle/:id', async (req, res) => {
  const { id } = req.params;
  const active = req.body.active === 'true'; // parse checked state

  try {
    const ok = await db.toggleJobStatus(id, active);
    if (ok) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to update job status' });
    }
  } catch (err) {
    console.error('Error toggling job status:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/jobs/delete/:id - Delete Job Listing
 */
router.post('/jobs/delete/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const ok = await db.deleteJob(id);
    if (ok) {
      res.redirect('/admin/jobs?success=true');
    } else {
      res.redirect('/admin/jobs?error=Failed+to+delete+job+listing');
    }
  } catch (err) {
    console.error('Error deleting job listing:', err);
    res.redirect(`/admin/jobs?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /admin/jobs/edit/:id - Render Job Edit Form
 */
router.get('/jobs/edit/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const config = await db.getSettings();
    const job = await db.getJob(id);
    if (!job) {
      return res.redirect('/admin/jobs?error=Job+posting+not+found');
    }
    res.render('admin/jobs_edit', {
      config,
      job,
      success: req.query.success === 'true',
      error: req.query.error || null,
      page: 'admin-jobs',
      pageTitle: 'Edit Job Posting',
      pageDescription: `Modify parameters for job posting: ${job.title}`
    });
  } catch (err) {
    console.error('Failed to load job edit page:', err);
    res.status(500).send('Edit careers manager loader error.');
  }
});

/**
 * POST /admin/jobs/edit/:id - Process Job Listing Updates
 */
router.post('/jobs/edit/:id', async (req, res) => {
  const { id } = req.params;
  const { title, department, location, type, description, requirements } = req.body;

  if (!title || !department || !location || !description || !requirements) {
    return res.redirect(`/admin/jobs/edit/${id}?error=Please+fill+in+all+required+fields`);
  }

  try {
    const ok = await db.updateJob(id, { title, department, location, type, description, requirements });
    if (ok) {
      res.redirect('/admin/jobs?success=true');
    } else {
      res.redirect(`/admin/jobs/edit/${id}?error=Failed+to+update+job+posting`);
    }
  } catch (err) {
    console.error('Error updating job listing:', err);
    res.redirect(`/admin/jobs/edit/${id}?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * POST /admin/settings/test-smtp - Send test email to verify credentials
 */
router.post('/settings/test-smtp', async (req, res) => {
  const nodemailer = require('nodemailer');
  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_to } = req.body;
  
  if (!smtp_host || !smtp_port || !smtp_from || !smtp_to) {
    return res.status(400).json({ success: false, error: 'Missing required configuration fields (Host, Port, From, To).' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port, 10),
      secure: parseInt(smtp_port, 10) === 465, // true for 465, false for other ports
      auth: smtp_user && smtp_pass ? {
        user: smtp_user,
        pass: smtp_pass
      } : undefined,
      timeout: 8000 // 8 seconds timeout
    });

    const mailOptions = {
      from: smtp_from,
      to: smtp_to,
      subject: 'Hire7 Fuel - SMTP Integration Connection Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f1d1d; border: 1px solid #14a077; border-radius: 8px; padding: 2rem; color: #e5ebeb;">
          <h2 style="color: #14a077; border-bottom: 1px solid rgba(20, 160, 119,0.2); padding-bottom: 0.5rem; margin-top: 0;">Hire7 Fuel Outgoing Mailer</h2>
          <p>This is an automated <strong>SMTP Connection Test Email</strong> dispatched from your administrator website customizer dashboard settings page.</p>
          <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 1.25rem; margin: 1.5rem 0;">
            <h4 style="margin: 0 0 0.75rem 0; color: #fff;">Connection Verification Log:</h4>
            <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.9rem; line-height: 1.6; color: #a3c2c2;">
              <li><strong>SMTP Host:</strong> ${smtp_host}</li>
              <li><strong>Active Port:</strong> ${smtp_port}</li>
              <li><strong>Authentication User:</strong> ${smtp_user || '(None)'}</li>
              <li><strong>Sender Identity ("From"):</strong> ${smtp_from}</li>
              <li><strong>Recipient Identity ("To"):</strong> ${smtp_to}</li>
            </ul>
          </div>
          <p style="color: #14a077; font-weight: bold; margin: 1rem 0;">[✓] Connection established and verification succeeded!</p>
          <p style="font-size: 0.85rem; color: #6B7280; margin-bottom: 0;">Connection verification timestamp: ${new Date().toLocaleString()}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'SMTP Test Email dispatched successfully! Check your inbox.' });
  } catch (err) {
    console.error('SMTP connection test failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /admin/testimonials - Testimonials Admin Console
 */
router.get('/testimonials', requireAdmin, async (req, res) => {
  try {
    const testimonials = await db.getTestimonials();
    const settings = await db.getSettings();
    res.render('admin/testimonials', {
      config: settings,
      testimonials: testimonials,
      success: req.query.success === 'true',
      error: req.query.error || null,
      page: 'admin-testimonials',
      pageTitle: 'Carrier Testimonial Administrator',
      pageDescription: 'Manage the social proof testimonials and carrier quotes visible on the homepage.'
    });
  } catch (err) {
    console.error('Error fetching testimonials in admin:', err);
    res.redirect('/admin?error=Failed+to+load+testimonials');
  }
});

/**
 * POST /admin/testimonials/add - Create New Testimonial
 */
router.post('/testimonials/add', requireAdmin, async (req, res) => {
  try {
    const { author, role, quote, stars } = req.body;
    if (!author || !role || !quote || !stars) {
      return res.redirect('/admin/testimonials?error=Please+fill+in+all+required+fields');
    }

    const result = await db.addTestimonial({ author, role, quote, stars });
    if (result) {
      res.redirect('/admin/testimonials?success=true');
    } else {
      res.redirect('/admin/testimonials?error=Failed+to+create+testimonial');
    }
  } catch (err) {
    console.error('Error adding testimonial in admin:', err);
    res.redirect(`/admin/testimonials?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * POST /admin/testimonials/toggle/:id - Toggle Testimonial Active Status
 */
router.post('/testimonials/toggle/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const success = await db.toggleTestimonialStatus(id, active);
    res.json({ success });
  } catch (err) {
    console.error('Error toggling testimonial active status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /admin/testimonials/delete/:id - Delete Testimonial
 */
router.post('/testimonials/delete/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await db.deleteTestimonial(id);
    if (success) {
      res.redirect('/admin/testimonials?success=true');
    } else {
      res.redirect('/admin/testimonials?error=Failed+to+delete+testimonial');
    }
  } catch (err) {
    console.error('Error deleting testimonial:', err);
    res.redirect(`/admin/testimonials?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /admin/testimonials/edit/:id - Render Testimonial Edit Panel
 */
router.get('/testimonials/edit/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await db.getTestimonial(id);
    if (!testimonial) {
      return res.redirect('/admin/testimonials?error=Testimonial+not+found');
    }
    const settings = await db.getSettings();
    res.render('admin/testimonials_edit', {
      config: settings,
      testimonial: testimonial,
      error: req.query.error || null,
      page: 'admin-testimonials',
      pageTitle: 'Edit Carrier Testimonial',
      pageDescription: `Modify dynamic testimonial attributes for "${testimonial.author}".`
    });
  } catch (err) {
    console.error('Error fetching testimonial edit page:', err);
    res.redirect('/admin/testimonials?error=Failed+to+fetch+testimonial');
  }
});

/**
 * POST /admin/testimonials/edit/:id - Update Testimonial
 */
router.post('/testimonials/edit/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { author, role, quote, stars } = req.body;
    if (!author || !role || !quote || !stars) {
      return res.redirect(`/admin/testimonials/edit/${id}?error=Please+fill+in+all+required+fields`);
    }

    const success = await db.updateTestimonial(id, { author, role, quote, stars });
    if (success) {
      res.redirect('/admin/testimonials?success=true');
    } else {
      res.redirect(`/admin/testimonials/edit/${id}?error=Failed+to+update+testimonial`);
    }
  } catch (err) {
    console.error('Error updating testimonial:', err);
    res.redirect(`/admin/testimonials/edit/${id}?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /admin/compliance - Global compliance oversight page
 */
router.get('/compliance', async (req, res) => {
  try {
    const config = await db.getSettings();
    const carriers = await db.dbAll("SELECT * FROM carriers WHERE status = 'active'");
    
    const expiries = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    const sixtyDaysLater = new Date();
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);

    for (const c of carriers) {
      // Profile expiries
      const profile = await db.dbGet("SELECT * FROM carrier_profiles WHERE carrier_id = ?", [c.id]);
      if (profile) {
        const pExps = [
          { label: 'CVOR Expiry', date: profile.cvor_expiry },
          { label: 'Carrier Code Expiry', date: profile.carrier_code_expiry },
          { label: 'SCAC Expiry', date: profile.scac_expiry },
          { label: 'Canadian Bond Expiry', date: profile.cdn_bond_expiry },
          { label: 'US Bond Expiry', date: profile.usd_bond_expiry },
          { label: 'IFTA Expiry', date: profile.ifta_expiry }
        ];
        pExps.forEach(e => {
          if (e.date && e.date.toUpperCase() !== 'N/A') {
            const expDate = new Date(e.date + 'T00:00:00');
            const diff = expDate - today;
            const days = Math.ceil(diff / 86400000);
            if (days <= 60) {
              expiries.push({ carrier: c.company_name, entity: 'Company Profile', field: e.label, date: e.date, daysLeft: days });
            }
          }
        });
      }

      // Drivers expiries
      const drivers = await db.dbAll("SELECT * FROM drivers WHERE carrier_id = ? AND status = 'active'", [c.id]);
      drivers.forEach(d => {
        const dExps = [
          { label: 'DL Expiry', date: d.dl_expiry },
          { label: 'WCB Expiry', date: d.wcb_expiry },
          { label: 'Passport Expiry', date: d.passport_expiry },
          { label: 'FAST Card Expiry', date: d.fast_card_expiry },
          { label: 'CDRP Card Expiry', date: d.cdrp_expiry },
          { label: 'Visa Expiry', date: d.visa_expiry },
          { label: 'Medical Review', date: d.medical_due_date }
        ];
        dExps.forEach(e => {
          if (e.date && e.date.toUpperCase() !== 'N/A') {
            const expDate = new Date(e.date + 'T00:00:00');
            const diff = expDate - today;
            const days = Math.ceil(diff / 86400000);
            if (days <= 60) {
              expiries.push({ carrier: c.company_name, entity: `Driver: ${d.first_name} ${d.last_name}`, field: e.label, date: e.date, daysLeft: days });
            }
          }
        });
      });

      // Trucks expiries
      const trucks = await db.dbAll("SELECT * FROM trucks WHERE carrier_id = ? AND status = 'active'", [c.id]);
      for (const t of trucks) {
        const tExps = [
          { label: 'Annual Safety Expiry', date: t.annual_safety_expiry },
          { label: 'PMVI Due', date: t.pmvi_next_date },
          { label: 'Oil Change Due', date: t.oil_change_next }
        ];
        tExps.forEach(e => {
          if (e.date && e.date.toUpperCase() !== 'N/A') {
            const expDate = new Date(e.date + 'T00:00:00');
            const diff = expDate - today;
            const days = Math.ceil(diff / 86400000);
            if (days <= 60) {
              expiries.push({ carrier: c.company_name, entity: `Truck Unit: #${t.unit_number}`, field: e.label, date: e.date, daysLeft: days });
            }
          }
        });
        
        // Active truck plate
        const plate = await db.dbGet("SELECT * FROM truck_plates WHERE truck_id = ? AND status = 'active'", [t.id]);
        if (plate && plate.expiry && plate.expiry.toUpperCase() !== 'N/A') {
          const expDate = new Date(plate.expiry + 'T00:00:00');
          const diff = expDate - today;
          const days = Math.ceil(diff / 86400000);
          if (days <= 60) {
            expiries.push({ carrier: c.company_name, entity: `Truck Plate: ${plate.plate_number} (#${t.unit_number})`, field: 'Plate Expiry', date: plate.expiry, daysLeft: days });
          }
        }
      }

      // Trailers expiries
      const trailers = await db.dbAll("SELECT * FROM trailers WHERE carrier_id = ? AND status = 'active'", [c.id]);
      trailers.forEach(tr => {
        const trExps = [
          { label: 'Annual Safety Expiry', date: tr.annual_safety_expiry },
          { label: 'PMVI Due', date: tr.pmvi_next_date }
        ];
        trExps.forEach(e => {
          if (e.date && e.date.toUpperCase() !== 'N/A') {
            const expDate = new Date(e.date + 'T00:00:00');
            const diff = expDate - today;
            const days = Math.ceil(diff / 86400000);
            if (days <= 60) {
              expiries.push({ carrier: c.company_name, entity: `Trailer Unit: #${tr.unit_number}`, field: e.label, date: e.date, daysLeft: days });
            }
          }
        });
      });
    }

    // Sort by daysLeft ascending (expired and closest first)
    expiries.sort((x, y) => x.daysLeft - y.daysLeft);

    res.render('admin/compliance', {
      config,
      expiries,
      page: 'admin-compliance',
      pageTitle: 'Safety Compliance Oversight',
      pageDescription: 'Global tracking of upcoming and past-due driver, fleet, and corporate expiries.'
    });
  } catch (err) {
    console.error('Failed to load global compliance overview:', err);
    res.status(500).send('Fatal server error loading compliance overview.');
  }
});

/**
 * GET /admin/compliance/expiry/csv - Export expiries to CSV
 */
router.get('/compliance/expiry/csv', async (req, res) => {
  try {
    const carriers = await db.dbAll("SELECT * FROM carriers WHERE status = 'active'");
    
    const expiries = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    for (const c of carriers) {
      // Profile expiries
      const profile = await db.dbGet("SELECT * FROM carrier_profiles WHERE carrier_id = ?", [c.id]);
      if (profile) {
        const pExps = [
          { label: 'CVOR Expiry', date: profile.cvor_expiry },
          { label: 'Carrier Code Expiry', date: profile.carrier_code_expiry },
          { label: 'SCAC Expiry', date: profile.scac_expiry },
          { label: 'Canadian Bond Expiry', date: profile.cdn_bond_expiry },
          { label: 'US Bond Expiry', date: profile.usd_bond_expiry },
          { label: 'IFTA Expiry', date: profile.ifta_expiry }
        ];
        pExps.forEach(e => {
          if (e.date && e.date.toUpperCase() !== 'N/A') {
            const expDate = new Date(e.date + 'T00:00:00');
            const diff = expDate - today;
            const days = Math.ceil(diff / 86400000);
            if (days <= 60) {
              expiries.push({ carrier: c.company_name, entity: 'Company Profile', field: e.label, date: e.date, daysLeft: days });
            }
          }
        });
      }

      // Drivers expiries
      const drivers = await db.dbAll("SELECT * FROM drivers WHERE carrier_id = ? AND status = 'active'", [c.id]);
      drivers.forEach(d => {
        const dExps = [
          { label: 'DL Expiry', date: d.dl_expiry },
          { label: 'WCB Expiry', date: d.wcb_expiry },
          { label: 'Passport Expiry', date: d.passport_expiry },
          { label: 'FAST Card Expiry', date: d.fast_card_expiry },
          { label: 'CDRP Card Expiry', date: d.cdrp_expiry },
          { label: 'Visa Expiry', date: d.visa_expiry },
          { label: 'Medical Review', date: d.medical_due_date }
        ];
        dExps.forEach(e => {
          if (e.date && e.date.toUpperCase() !== 'N/A') {
            const expDate = new Date(e.date + 'T00:00:00');
            const diff = expDate - today;
            const days = Math.ceil(diff / 86400000);
            if (days <= 60) {
              expiries.push({ carrier: c.company_name, entity: `Driver: ${d.first_name} ${d.last_name}`, field: e.label, date: e.date, daysLeft: days });
            }
          }
        });
      });

      // Trucks expiries
      const trucks = await db.dbAll("SELECT * FROM trucks WHERE carrier_id = ? AND status = 'active'", [c.id]);
      for (const t of trucks) {
        const tExps = [
          { label: 'Annual Safety Expiry', date: t.annual_safety_expiry },
          { label: 'PMVI Due', date: t.pmvi_next_date },
          { label: 'Oil Change Due', date: t.oil_change_next }
        ];
        tExps.forEach(e => {
          if (e.date && e.date.toUpperCase() !== 'N/A') {
            const expDate = new Date(e.date + 'T00:00:00');
            const diff = expDate - today;
            const days = Math.ceil(diff / 86400000);
            if (days <= 60) {
              expiries.push({ carrier: c.company_name, entity: `Truck Unit: #${t.unit_number}`, field: e.label, date: e.date, daysLeft: days });
            }
          }
        });
        const plate = await db.dbGet("SELECT * FROM truck_plates WHERE truck_id = ? AND status = 'active'", [t.id]);
        if (plate && plate.expiry && plate.expiry.toUpperCase() !== 'N/A') {
          const expDate = new Date(plate.expiry + 'T00:00:00');
          const diff = expDate - today;
          const days = Math.ceil(diff / 86400000);
          if (days <= 60) {
            expiries.push({ carrier: c.company_name, entity: `Truck Plate: ${plate.plate_number} (#${t.unit_number})`, field: 'Plate Expiry', date: plate.expiry, daysLeft: days });
          }
        }
      }

      // Trailers expiries
      const trailers = await db.dbAll("SELECT * FROM trailers WHERE carrier_id = ? AND status = 'active'", [c.id]);
      trailers.forEach(tr => {
        const trExps = [
          { label: 'Annual Safety Expiry', date: tr.annual_safety_expiry },
          { label: 'PMVI Due', date: tr.pmvi_next_date }
        ];
        trExps.forEach(e => {
          if (e.date && e.date.toUpperCase() !== 'N/A') {
            const expDate = new Date(e.date + 'T00:00:00');
            const diff = expDate - today;
            const days = Math.ceil(diff / 86400000);
            if (days <= 60) {
              expiries.push({ carrier: c.company_name, entity: `Trailer Unit: #${tr.unit_number}`, field: e.label, date: e.date, daysLeft: days });
            }
          }
        });
      });
    }

    expiries.sort((x, y) => x.daysLeft - y.daysLeft);

    let csvContent = 'Carrier,Entity,Document/Field,Expiry Date,Days Left\n';
    expiries.forEach(e => {
      const carrier = `"${e.carrier.replace(/"/g, '""')}"`;
      const entity = `"${e.entity.replace(/"/g, '""')}"`;
      const field = `"${e.field.replace(/"/g, '""')}"`;
      csvContent += `${carrier},${entity},${field},${e.date},${e.daysLeft}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=safety_expiries_report.csv');
    res.send(csvContent);
  } catch (err) {
    console.error('Failed to generate CSV export:', err);
    res.status(500).send('Failed to generate CSV report.');
  }
});

/**
 * GET /admin/drivers - Unified drivers list across all carriers
 */
router.get('/drivers', async (req, res) => {
  try {
    const config = await db.getSettings();
    const drivers = await db.dbAll(`
      SELECT d.*, c.company_name as carrier_name
      FROM drivers d
      JOIN carriers c ON d.carrier_id = c.id
      WHERE d.status = 'active'
      ORDER BY c.company_name ASC, d.last_name ASC
    `);

    res.render('admin/drivers', {
      config,
      drivers,
      page: 'admin-drivers',
      pageTitle: 'Unified Drivers Roster',
      pageDescription: 'Global view of all drivers onboarded across active carriers.'
    });
  } catch (err) {
    console.error('Failed to load global drivers list:', err);
    res.status(500).send('Fatal server error loading drivers list.');
  }
});

/**
 * GET /admin/fleet - Unified fleet overview across all carriers
 */
router.get('/fleet', async (req, res) => {
  try {
    const config = await db.getSettings();
    const trucks = await db.dbAll(`
      SELECT t.*, c.company_name as carrier_name
      FROM trucks t
      JOIN carriers c ON t.carrier_id = c.id
      WHERE t.status = 'active'
      ORDER BY c.company_name ASC, t.unit_number ASC
    `);
    
    const trailers = await db.dbAll(`
      SELECT tr.*, c.company_name as carrier_name
      FROM trailers tr
      JOIN carriers c ON tr.carrier_id = c.id
      WHERE tr.status = 'active'
      ORDER BY c.company_name ASC, tr.unit_number ASC
    `);

    res.render('admin/fleet', {
      config,
      trucks,
      trailers,
      page: 'admin-fleet',
      pageTitle: 'Unified Fleet Roster',
      pageDescription: 'Global tracking of active carrier trucks, trailers, plates, and transponders.'
    });
  } catch (err) {
    console.error('Failed to load global fleet oversight:', err);
    res.status(500).send('Fatal server error loading fleet oversight.');
  }
});

module.exports = router;
