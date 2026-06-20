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
  if (req.path === '/register' || req.path === '/register/' || req.path === '/login' || req.path === '/login/') {
    return next();
  }
  if (req.session && (req.session.isAdmin || req.session.isAuthenticated)) {
    return next();
  }
  res.redirect('/portal/login');
}

/**
 * Route Mountings
 */
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const portalRoutes = require('./routes/portal');
const apiRoutes = require('./routes/api');

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);
app.use('/portal', requireAuth, portalRoutes);
app.use('/api/v1', apiRoutes);

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

app.use((err, req, res, next) => {
  console.error('Fatal Server Exception Encountered:', err.stack);
  
  // Detect SQLite database or file system access / permission issues
  const errStr = (err.message || '') + (err.stack || '');
  const isDbOrAccessError = 
    errStr.includes('SQLITE') ||
    errStr.includes('sqlite') ||
    errStr.includes('EACCES') ||
    errStr.includes('permission') ||
    errStr.includes('Troubleshooting') ||
    errStr.includes('no such table: carriers'); // missing database tables indicating bootstrap failure
  
  if (isDbOrAccessError) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Database Access Exception | Hire7 Fuel</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #0d1117;
            color: #c9d1d9;
            margin: 0;
            padding: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 90vh;
          }
          .container {
            max-width: 650px;
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 12px;
            padding: 2.5rem;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          }
          .error-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: #f85149;
            margin-bottom: 1.5rem;
          }
          .error-header svg {
            flex-shrink: 0;
            width: 28px;
            height: 28px;
          }
          h1 {
            font-size: 1.5rem;
            margin: 0;
            font-weight: 600;
          }
          p {
            line-height: 1.6;
            color: #8b949e;
            margin-bottom: 1.5rem;
          }
          .error-details {
            background: #0d1117;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 1rem;
            font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
            font-size: 0.85rem;
            color: #ff7b72;
            overflow-x: auto;
            margin-bottom: 2rem;
          }
          .solution-box {
            background: rgba(56, 139, 253, 0.1);
            border: 1px solid rgba(56, 139, 253, 0.4);
            border-radius: 8px;
            padding: 1.5rem;
          }
          .solution-box h3 {
            margin-top: 0;
            color: #58a6ff;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          pre {
            background: #0d1117;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            color: #79c0ff;
            font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
            font-size: 0.9rem;
            overflow-x: auto;
            margin: 1rem 0;
            border: 1px solid #21262d;
          }
          ol {
            margin: 0;
            padding-left: 1.25rem;
            color: #c9d1d9;
          }
          li {
            margin-bottom: 0.75rem;
            line-height: 1.5;
          }
          .hint {
            font-size: 0.8rem;
            color: #8b949e;
            margin-top: 0.5rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-header">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 11-2 0 1 1 0 012 0zm-.25 3a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0V8z"></path>
            </svg>
            <h1>Database Connection / Access Exception</h1>
          </div>
          
          <p>The application encountered an issue accessing the SQLite local database file. This usually happens when the deployment environment prevents the server from creating or writing to the database file.</p>
          
          <div class="error-details">
            Error Details: ${err.message || 'SQLite Database initialization failed.'}
          </div>

          <div class="solution-box">
            <h3>🔧 How to Resolve on Your VPS Server:</h3>
            <ol>
              <li>
                <strong>Apply Write Permissions:</strong> SSH into your server, go to your project folder (e.g., <code>/var/www/hire7fuel</code>), and grant read/write access to the database folder:
                <pre>sudo chmod -R 777 database</pre>
              </li>
              <li>
                <strong>Ownership:</strong> Ensure the database directory is owned by the user running the Node.js/PM2 application:
                <pre>sudo chown -R $USER:$USER database</pre>
              </li>
              <li>
                <strong>Restart Server:</strong> Restart the application via PM2 to reload the database client:
                <pre>pm2 restart hire7fuel</pre>
              </li>
            </ol>
          </div>
        </div>
      </body>
      </html>
    `);
    return;
  }

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
