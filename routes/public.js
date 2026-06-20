const express = require('express');
const router = express.Router();
const db = require('../database/db');

/**
 * Middleware to load active settings dynamically
 * Allows admin configurations to propagate instantly.
 */
async function loadDynamicSettings(req, res, next) {
  try {
    res.locals.config = await db.getSettings();
  } catch (err) {
    console.error('Error loading settings middleware:', err);
    res.locals.config = require('../config');
  }
  next();
}

router.use(loadDynamicSettings);

/**
 * GET / - Home Page
 */
router.get('/', async (req, res) => {
  try {
    const testimonials = await db.getTestimonials(true);
    res.render('index', { 
      page: 'home', 
      success: req.query.success === 'true',
      testimonials: testimonials
    });
  } catch (err) {
    console.error('Failed to load testimonials for home page:', err);
    res.render('index', { 
      page: 'home', 
      success: req.query.success === 'true',
      testimonials: []
    });
  }
});

/**
 * GET /fuelcard - Fuel Card Information
 */
router.get('/fuelcard', (req, res) => {
  res.render('fuelcard', { 
    page: 'fuelcard' 
  });
});

/**
 * GET /app - Interactive Mobile Companion App Showcase
 */
router.get('/app', (req, res) => {
  res.render('app', { 
    page: 'app' 
  });
});

/**
 * GET /apply - Fuel Card Application Portal
 */
router.get('/apply', (req, res) => {
  res.render('apply', { 
    page: 'apply', 
    success: req.query.success === 'true' 
  });
});

/**
 * GET /careers - Company Culture and Active Openings
 */
router.get('/careers', async (req, res) => {
  try {
    const activeJobs = await db.getJobs(true); // Fetch only active positions
    res.render('careers', { 
      page: 'careers', 
      jobs: activeJobs,
      success: req.query.success === 'true' 
    });
  } catch (err) {
    console.error('Failed to load active careers page:', err);
    res.render('careers', { 
      page: 'careers', 
      jobs: [], 
      success: req.query.success === 'true' 
    });
  }
});

/**
 * GET /contact - Contact Details and Maps
 */
router.get('/contact', (req, res) => {
  res.render('contact', { 
    page: 'contact', 
    success: req.query.success === 'true' 
  });
});

/**
 * POST /submit-inquiry - Universal Inline Contact Form POST
 */
router.post('/submit-inquiry', async (req, res) => {
  const { name, company, phone, email, message } = req.body;
  
  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).send('Please fill in all mandatory fields.');
  }

  try {
    await db.saveSubmission('contact', { name, company, phone, email, message });
    // Security: only redirect to same-origin referer paths (no open redirect)
    const referer = req.headers.referer || '';
    let redirectBase = '/contact';
    try {
      const refUrl = new URL(referer);
      // Only use referer if it points to the same host
      if (refUrl.hostname === req.hostname) {
        redirectBase = refUrl.pathname;
      }
    } catch (e) { /* invalid URL, use default */ }
    res.redirect(`${redirectBase}?success=true#contact-form`);
  } catch (err) {
    console.error('Error saving contact inquiry:', err);
    res.status(500).send('Server Error: Failed to process inquiry. Please try again.');
  }
});

/**
 * POST /submit-application - Apply Portal Form POST
 */
router.post('/submit-application', async (req, res) => {
  const { name, company, phone, email, message, consent } = req.body;

  if (!name || !company || !phone || !email) {
    return res.status(400).send('Please provide your name, company, phone number, and email.');
  }

  try {
    await db.saveSubmission('fuelcard', { 
      name, 
      company, 
      phone, 
      email, 
      message: message || '',
      marketing_consent: consent === 'on' ? 'Agreed' : 'Not Agreed'
    });
    res.redirect('/apply?success=true#apply-form');
  } catch (err) {
    console.error('Error saving application submission:', err);
    res.status(500).send('Server Error: Failed to process application.');
  }
});

/**
 * POST /submit-career - Career Portal Application POST
 */
router.post('/submit-career', async (req, res) => {
  const { name, email, phone, referral, message } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).send('Name, Email, and Phone number are required.');
  }

  try {
    await db.saveSubmission('career', {
      name,
      email,
      phone,
      source_referral: referral || 'Not specified',
      cover_letter: message || ''
    });
    res.redirect('/careers?success=true#career-form');
  } catch (err) {
    console.error('Error saving career submission:', err);
    res.status(500).send('Server Error: Failed to submit interest.');
  }
});

/**
 * GET /public/ref-check/:id - Public Reference Check Form
 */
router.get('/public/ref-check/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const driver = await db.dbGet("SELECT * FROM drivers WHERE id = ?", [id]);
    if (!driver) {
      return res.status(404).send('Driver reference check not found.');
    }

    let driverInfo = {};
    let recipientInfo = {};
    try { if (driver.ref_check_driver_info) driverInfo = JSON.parse(driver.ref_check_driver_info); } catch (e) {}
    try { if (driver.ref_check_recipient_info) recipientInfo = JSON.parse(driver.ref_check_recipient_info); } catch (e) {}

    res.render('portal/drivers/ref_check', {
      page: 'ref-check-form',
      pageTitle: 'Employment Reference Verification',
      driver: driver,
      driverInfo: driverInfo,
      recipientInfo: recipientInfo,
      layout: false,
      success: req.query.success === 'true',
      error: req.query.error || null
    });
  } catch (err) {
    console.error('Error loading public reference check form:', err);
    res.status(500).send('An error occurred loading this page. Please try again.');
  }
});

/**
 * POST /public/ref-check/:id/submit - Submit Public Reference Check Form
 */
router.post('/public/ref-check/:id/submit', async (req, res) => {
  const { id } = req.params;
  const { ref_relation, ref_performance, ref_rehire, ref_comments } = req.body;

  try {
    const driver = await db.dbGet("SELECT * FROM drivers WHERE id = ?", [id]);
    if (!driver) {
      return res.status(404).send('Driver reference check not found.');
    }

    let recipientInfo = {};
    try { if (driver.ref_check_recipient_info) recipientInfo = JSON.parse(driver.ref_check_recipient_info); } catch (e) {}

    // Store responses inside recipientInfo
    recipientInfo.responses = {
      relationship: ref_relation,
      performance_rating: ref_performance,
      eligible_for_rehire: ref_rehire,
      comments: ref_comments,
      submitted_at: new Date().toISOString()
    };

    const recipientInfoStr = JSON.stringify(recipientInfo);

    // Create a mock PDF report in public/uploads/ref-checks/
    const uploadDir = path.join(__dirname, '../public/uploads/ref-checks');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const pdfPath = `/uploads/ref-checks/ref-${id}.pdf`;
    const absolutePdfPath = path.join(__dirname, '../public', pdfPath);

    // Generate a simple, styled text file labeled as PDF representing the reference check document
    const reportText = `================================================================
          HIRE7 LOGISTICS - EMPLOYMENT REFERENCE CHECK REPORT
================================================================
Driver Name:       ${driver.first_name} ${driver.last_name}
Reference Contact:  ${recipientInfo.name || 'N/A'} (${recipientInfo.email || 'N/A'})
Submitted Date:    ${new Date().toLocaleString()}
Status:            COMPLETED
----------------------------------------------------------------
VERIFICATION QUESTIONS & ANSWERS:
1. Professional Relationship / Job Role:
   ${ref_relation || 'No response'}

2. Overall Performance Rating (1-5 Stars):
   ${ref_performance || 'N/A'} Stars

3. Would you recommend rehiring this driver?
   ${ref_rehire || 'N/A'}

4. Additional Comments / Professional Feedback:
   ${ref_comments || 'No comments provided'}
----------------------------------------------------------------
Report Generated Automatically by Hire7 Shield AI™ System.
================================================================
`;
    fs.writeFileSync(absolutePdfPath, reportText);

    // Update driver state
    await db.dbRun(`
      UPDATE drivers SET
        ref_check_recipient_info = ?,
        ref_check_status = 'Completed',
        ref_check_pdf_path = ?
      WHERE id = ?
    `, [recipientInfoStr, pdfPath, id]);

    res.redirect(`/public/ref-check/${id}?success=true`);
  } catch (err) {
    console.error('Failed to submit reference check response:', err);
    res.redirect(`/public/ref-check/${id}?error=${encodeURIComponent(err.message)}`);
  }
});

module.exports = router;
