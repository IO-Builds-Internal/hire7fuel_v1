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

/**
 * POST /admin/login - Authenticate Access Code
 */
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.render('admin/login', { error: 'Invalid access credentials. Please try again.', layout: false });
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
      page: 'admin-dashboard'
    });
  } catch (err) {
    console.error('Failed to load admin dashboard:', err);
    res.status(500).send('Admin Control Panel: Fatal server error.');
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
      page: 'admin-settings'
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
    social_instagram
  } = req.body;

  const updates = {
    brand_name,
    brand_tagline,
    contact_phone,
    contact_email,
    contact_address,
    social_linkedin: social_linkedin || '',
    social_facebook: social_facebook || '',
    social_instagram: social_instagram || ''
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
      page: 'admin-jobs'
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

module.exports = router;
