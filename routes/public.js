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
    // Redirect back to referring page or contact page with success parameter
    const redirectTo = req.headers.referer ? `${req.headers.referer.split('?')[0]}?success=true#contact-form` : '/contact?success=true#contact-form';
    res.redirect(redirectTo);
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

module.exports = router;
