const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment configurations from .env (override: true ensures .env always wins over system env vars)
dotenv.config({ override: true });

// Load central config fallback
const baseConfig = require('./config');

const app = express();

// Trust reverse proxy headers (required for HTTPS sessions on hosted platforms)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Ensure public upload directories exist out-of-the-box
const uploadDir = path.join(__dirname, 'public/uploads');
const assetsDir = path.join(__dirname, 'public/assets');
[uploadDir, assetsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Express Middleware Setup
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serving static assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS Templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configure session parameters for staff authentication
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'hire7_fuel_fleet_secret_key',
  resave: false,
  saveUninitialized: false,
  proxy: true, // Required when behind a reverse proxy (Nginx, Cloudflare)
  cookie: {
    maxAge: 1000 * 60 * 60 * 2, // 2-hour session duration
    secure: isProduction,        // true on HTTPS hosted environments
    sameSite: isProduction ? 'lax' : false
  }
}));

/**
 * Session Gatekeeper Middleware for Carrier Portal
 */
function requireAuth(req, res, next) {
  if (req.session && (req.session.isAdmin || req.session.isAuthenticated)) {
    return next();
  }
  res.redirect('/admin/login');
}

/**
 * Route Mountings
 */
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const portalRoutes = require('./routes/portal');

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);
app.use('/portal', requireAuth, portalRoutes);

/**
 * Daily Safety & Compliance Expiry Reminder Cron Task
 */
const expiryCron = require('./scripts/expiry_cron');
// Run 5 seconds after server startup
setTimeout(() => {
  console.log('Automated Expiry Checker: Initiating boot-up scan...');
  expiryCron.run().catch(err => console.error('Boot-up compliance scan failed:', err));
}, 5000);
// Schedule scan to execute every 24 hours
setInterval(() => {
  console.log('Automated Expiry Checker: Initiating daily compliance scan...');
  expiryCron.run().catch(err => console.error('Daily compliance scan failed:', err));
}, 1000 * 60 * 60 * 24);


/**
 * 404 Route Fallback
 */
app.use((req, res, next) => {
  res.status(404).render('contact', {
    config: baseConfig,
    page: 'contact',
    success: false,
    error: '404: The page you are looking for does not exist.'
  });
});

/**
 * Global Error Boundary
 */
app.use((err, req, res, next) => {
  console.error('Fatal Server Exception Encountered:', err.stack);
  res.status(500).send('Fatal Server Exception. Access Denied or Server misconfigured.');
});

/**
 * Server Startup Hook
 */
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` Hire7 Fuel Website Redesign Server online at http://localhost:${PORT}`);
  console.log(` Session authentication initialized securely.`);
  console.log(` Running in Node.js ${process.version} LTS environment.`);
  console.log(`================================================================`);
});
