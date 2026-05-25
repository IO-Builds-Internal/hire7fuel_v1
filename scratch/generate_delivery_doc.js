/**
 * Generate Hire7 Fuel Project Delivery Word Document (.docx)
 * Run: node scratch/generate_delivery_doc.js
 */

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, Header, Footer, PageNumber,
  NumberFormat, UnderlineType, PageBreak
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Colour constants ──────────────────────────────────────────────────────────
const TEAL     = '0D4F4F';
const MINT     = '22C98A';
const AMBER    = 'F5A623';
const WHITE    = 'FFFFFF';
const NEAR_BLK = '0A1C1C';
const GREY_BG  = 'F4F6F6';
const GREY_TXT = '555555';
const BLK      = '1A1A1A';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const bold   = (text, size = 22, color = BLK)  => new TextRun({ text, bold: true,  size, color });
const normal = (text, size = 22, color = BLK)  => new TextRun({ text, bold: false, size, color });
const mint   = (text, size = 22)               => new TextRun({ text, bold: true,  size, color: MINT });

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  children: [new TextRun({ text, bold: true, size: 52, color: WHITE, font: 'Calibri' })],
  shading: { type: ShadingType.SOLID, color: TEAL },
  indent: { left: 200, right: 200 },
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 360, after: 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: MINT } },
  children: [new TextRun({ text, bold: true, size: 36, color: TEAL, font: 'Calibri' })],
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text, bold: true, size: 28, color: TEAL, font: 'Calibri' })],
});

const para = (text, color = BLK, size = 22) => new Paragraph({
  spacing: { before: 80, after: 80 },
  children: [new TextRun({ text, size, color, font: 'Calibri' })],
});

const bullet = (text, level = 0) => new Paragraph({
  bullet: { level },
  spacing: { before: 60, after: 60 },
  children: [new TextRun({ text, size: 22, color: BLK, font: 'Calibri' })],
});

const separator = () => new Paragraph({
  spacing: { before: 200, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
  children: [],
});

const labelValue = (label, value) => new Paragraph({
  spacing: { before: 60, after: 60 },
  children: [
    new TextRun({ text: `${label}: `, bold: true, size: 22, color: TEAL, font: 'Calibri' }),
    new TextRun({ text: value, size: 22, color: BLK, font: 'Calibri' }),
  ],
});

const codeBlock = (lines) => lines.map(line => new Paragraph({
  spacing: { before: 20, after: 20 },
  shading: { type: ShadingType.SOLID, color: NEAR_BLK },
  indent: { left: 300, right: 300 },
  children: [new TextRun({ text: line || ' ', size: 18, color: MINT, font: 'Courier New' })],
}));

// ─── Table builder ──────────────────────────────────────────────────────────────
const buildTable = (headers, rows) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    // Header row
    new TableRow({
      tableHeader: true,
      children: headers.map(h => new TableCell({
        shading: { type: ShadingType.SOLID, color: TEAL },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: WHITE, size: 20, font: 'Calibri' })],
        })],
      })),
    }),
    // Data rows
    ...rows.map((row, ri) => new TableRow({
      children: row.map(cell => new TableCell({
        shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? WHITE : GREY_BG },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: cell, size: 20, color: BLK, font: 'Calibri' })],
        })],
      })),
    })),
  ],
});

// ──────────────────────────────────────────────────────────────────────────────
// BUILD DOCUMENT
// ──────────────────────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22, color: BLK } },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 },
      },
    },

    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'HIRE7 FUEL — Project Delivery Document  |  CONFIDENTIAL', size: 16, color: GREY_TXT, font: 'Calibri' }),
            ],
          }),
        ],
      }),
    },

    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Prepared by IOBuilds Development Team  |  May 2026  |  Page ', size: 16, color: GREY_TXT }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY_TXT }),
              new TextRun({ text: ' of ', size: 16, color: GREY_TXT }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREY_TXT }),
            ],
          }),
        ],
      }),
    },

    children: [

      // ── COVER ────────────────────────────────────────────────────────────────
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200, after: 400 },
        shading: { type: ShadingType.SOLID, color: TEAL },
        children: [new TextRun({ text: 'HIRE7 FUEL', bold: true, size: 80, color: WHITE, font: 'Calibri' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        shading: { type: ShadingType.SOLID, color: TEAL },
        children: [new TextRun({ text: 'Premium Website Redesign', bold: false, size: 40, color: MINT, font: 'Calibri' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 },
        shading: { type: ShadingType.SOLID, color: TEAL },
        children: [new TextRun({ text: 'PROJECT DELIVERY DOCUMENT', bold: true, size: 28, color: WHITE, font: 'Calibri' })],
      }),

      new Paragraph({ spacing: { before: 400, after: 120 }, children: [] }),
      labelValue('Client',          'KSG Group / Hire7 Fuel'),
      labelValue('Delivered by',    'IOBuilds Development Team'),
      labelValue('Version',         '1.0.0 — Final Production Release'),
      labelValue('Delivery Date',   'May 2026'),
      labelValue('Demo URL',        'hire7demo.iobuilds.com'),
      labelValue('Repository',      'github.com/iobuilds/hire7fuel_v1'),

      separator(),

      // ── 1. EXECUTIVE SUMMARY ─────────────────────────────────────────────────
      h2('1. Executive Summary'),
      para('IOBuilds has delivered a fully custom, production-ready premium website redesign for Hire7 Fuel — a carrier-class commercial fuel card and fleet operations platform serving transport carriers across Canada.'),
      para('The platform was built from the ground up using Node.js and Express with a clean, modular architecture. It features a high-end dark-themed glassmorphic design system, a fully integrated content management dashboard for staff, dynamic content driven from a local SQLite database, and a premium interactive mobile app showcase page.'),
      para('All code has been version-controlled in Git with a clean, documented commit history and has been deployed and verified on the client\'s live VPS at hire7demo.iobuilds.com (port 3004).'),

      separator(),

      // ── 2. PROJECT OBJECTIVES ────────────────────────────────────────────────
      h2('2. Project Scope & Objectives'),
      h3('Core Objectives Delivered'),
      buildTable(
        ['#', 'Objective', 'Status'],
        [
          ['1',  'Premium visual redesign with dark glassmorphic aesthetic',        '✅ Complete'],
          ['2',  'Full public website with all product & service pages',             '✅ Complete'],
          ['3',  'Admin content management dashboard with authentication',           '✅ Complete'],
          ['4',  'Job postings management (create, edit, delete)',                   '✅ Complete'],
          ['5',  'Driver testimonials management with toggle visibility',            '✅ Complete'],
          ['6',  'Interactive Mobile App showcase page with live emulator',         '✅ Complete'],
          ['7',  'Fuel Card product page with 3D holographic card effects',         '✅ Complete'],
          ['8',  'Driver job application form with email notifications',             '✅ Complete'],
          ['9',  'Contact form with SMTP integration support',                       '✅ Complete'],
          ['10', 'Full mobile responsiveness across all pages',                      '✅ Complete'],
          ['11', 'SQLite embedded database with zero-config local storage',         '✅ Complete'],
          ['12', 'VPS-ready deployment with PM2 process management',                '✅ Complete'],
        ]
      ),

      separator(),

      // ── 3. TECH STACK ────────────────────────────────────────────────────────
      h2('3. Technology Stack'),
      buildTable(
        ['Layer', 'Technology', 'Purpose'],
        [
          ['Runtime',          'Node.js v20 LTS',     'Server-side JavaScript runtime'],
          ['Framework',        'Express.js v4',        'HTTP server, routing, middleware'],
          ['Templating',       'EJS',                  'Server-side HTML rendering with partials'],
          ['Database',         'SQLite3',              'Embedded file-based database, zero-config'],
          ['Styling',          'Vanilla CSS (5 files)','base / components / emulator / forms / admin'],
          ['Client JS',        'Vanilla JavaScript',   'Animations, emulator, tab switching'],
          ['Auth',             'express-session',      'Admin panel session authentication'],
          ['Email',            'Nodemailer',           'SMTP contact & application notifications'],
          ['File Uploads',     'Multer',               'Admin image & asset uploads'],
          ['Environment',      'dotenv',               'Secrets & config management'],
          ['Process Manager',  'PM2',                  'Production process lifecycle management'],
          ['Reverse Proxy',    'Nginx',                'Public HTTPS traffic forwarding'],
        ]
      ),

      separator(),

      // ── 4. PAGES & ROUTES ────────────────────────────────────────────────────
      h2('4. Website Pages & Routes'),
      buildTable(
        ['Route', 'View File', 'Description'],
        [
          ['/',                       'index.ejs',                   'Public homepage'],
          ['/fuelcard',               'fuelcard.ejs',                'Fuel Card product page'],
          ['/app',                    'app.ejs',                     'Mobile App interactive showcase'],
          ['/careers',                'careers.ejs',                 'Job listings page'],
          ['/apply',                  'apply.ejs',                   'Driver application form'],
          ['/contact',                'contact.ejs',                 'Contact form page'],
          ['/admin/login',            'admin/login.ejs',             'Admin authentication'],
          ['/admin/dashboard',        'admin/dashboard.ejs',         'Admin overview dashboard'],
          ['/admin/jobs',             'admin/jobs.ejs',              'Job postings management'],
          ['/admin/testimonials',     'admin/testimonials.ejs',      'Testimonials management'],
          ['/admin/settings',         'admin/settings.ejs',          'Site-wide settings'],
        ]
      ),

      separator(),

      // ── 5. FEATURE CATALOGUE ─────────────────────────────────────────────────
      h2('5. Feature Catalogue'),

      h3('5.1 Homepage (/)'),
      bullet('Full-viewport dark glassmorphic hero with gradient overlay'),
      bullet('3D Holographic Physical Fuel Card using CSS perspective transforms'),
      bullet('Mini Mobile App Companion Screen stacked behind card in 3D space'),
      bullet('Parallax depth hover effect: card floats forward, screen shifts outward'),
      bullet('Animated CTA buttons with neon mint glow on hover'),
      bullet('Scroll-triggered animated statistics counters'),
      bullet('Dynamic driver testimonials carousel (admin-managed)'),
      bullet('Premium glassmorphic FAQ accordion'),
      bullet('Glassmorphic footer with brand logo, nav links, and contact details'),

      h3('5.2 Fuel Card Page (/fuelcard)'),
      bullet('Dedicated long-form product page for the Hire7 Fuel Card'),
      bullet('3D Stacked Cards Effect: multiple cards layered with CSS 3D transforms'),
      bullet('Carrier eligibility and benefit breakdowns'),
      bullet('IFTA split section'),
      bullet('Multi-tier plan comparison (Blue / Silver / Gold / Platinum)'),

      h3('5.3 Careers Page (/careers)'),
      bullet('Dynamic list of open job positions from admin-managed database'),
      bullet('Each listing shows: role title, location, type, posted date'),
      bullet('"Apply Now" button links directly to the driver application form'),

      h3('5.4 Driver Application Form (/apply)'),
      bullet('Full structured driver application (name, email, phone, CDL, experience)'),
      bullet('Email notification sent to company inbox on form submission'),
      bullet('Success / error feedback states'),

      h3('5.5 Contact Form (/contact)'),
      bullet('General enquiry contact form'),
      bullet('Email notification on submission (SMTP configurable)'),

      new Paragraph({ children: [new PageBreak()] }),

      h3('5.6 Mobile App Showcase Page (/app)'),
      para('A premium interactive landing page showcasing the Hire7 Fuel companion mobile app.'),
      para('Smartphone Emulator Tabs:', TEAL, 24),
      buildTable(
        ['Tab', 'Screen Content'],
        [
          ['⛽ Fuel Telemetry',    'Live CAN-bus sparkline graph, fuel reserve progress bar, draw rate stats'],
          ['📍 GPS Corridor',     'Location-based wholesale fuel stop comparison (Pilot vs Flying J)'],
          ['🚛 Driver Behavior',  'Speed compliance dial, idle time tracking, acceleration event log'],
          ['🏆 Performance',      'Animated SVG radial score gauge showing gamified driver ranking (96/100)'],
          ['🔐 Fraud Protection', '60-second rolling OTP PIN countdown, geofence lock, double-factor verification'],
        ]
      ),
      new Paragraph({ spacing: { before: 120 }, children: [] }),
      para('Live Simulation Features:', TEAL, 24),
      bullet('CAN-bus Sparkline: 5 bars animate left every second with new random draw rate values'),
      bullet('Fuel Reserve Meter: glowing progress bar drains and refills cyclically'),
      bullet('Speed Compliance Dial: slides between 96–100% in real time'),
      bullet('GPS Distance: fluctuates to simulate a truck closing in on a fuel stop'),
      bullet('OTP Countdown: 60-second timer, flashes neon green on rollover, generates new PIN'),
      bullet('Outer Frame Glow: phone frame pulses amber warning in last 5 seconds, flashes neon green on PIN roll'),
      bullet('Auto-Cycling Carousel: topics advance every 8 seconds, manual click restarts timer'),

      separator(),

      // ── 6. ADMIN DASHBOARD ───────────────────────────────────────────────────
      h2('6. Admin Dashboard Guide'),

      h3('Access'),
      labelValue('URL',              'https://yourdomain.com/admin/login'),
      labelValue('Default Password', 'admin123  (change immediately after handover!)'),
      labelValue('Session Duration', '2 hours'),

      new Paragraph({ spacing: { before: 160 }, children: [] }),
      h3('Job Postings (/admin/jobs)'),
      bullet('Create new posting: title, location, type, description, active status'),
      bullet('Edit any existing posting'),
      bullet('Toggle active/inactive — changes immediately hide/show on public Careers page'),
      bullet('Delete a posting permanently'),

      h3('Testimonials (/admin/testimonials)'),
      bullet('Create: driver name, role, star rating, quote'),
      bullet('Toggle visibility — hidden testimonials not shown on public homepage'),
      bullet('Edit and delete existing entries'),

      h3('Site Settings (/admin/settings)'),
      bullet('Brand & Contact: company name, tagline, phone, email, address'),
      bullet('Social & App Links: LinkedIn, Facebook, Instagram, Google Play URL, Apple App Store URL'),
      bullet('Email / SMTP: host, port, credentials, sender, recipient, enable/disable toggle'),

      separator(),

      // ── 7. DATABASE ──────────────────────────────────────────────────────────
      h2('7. Database'),
      para('The project uses SQLite — a lightweight embedded database. No external database server is required.'),
      buildTable(
        ['Item', 'Detail'],
        [
          ['Engine',       'SQLite3 (embedded, file-based)'],
          ['File Location','database/hire7_fuel.sqlite'],
          ['Tables',       'settings, jobs, testimonials, submissions'],
          ['Zero Config',  'Tables and seed data created automatically on first run'],
          ['Backup',       'Copy hire7_fuel.sqlite file to a safe location weekly'],
        ]
      ),
      new Paragraph({ spacing: { before: 160 }, children: [] }),
      para('Weekly Backup Command:', TEAL, 22),
      ...codeBlock(['cp /var/www/hire7fuel/database/hire7_fuel.sqlite ~/backups/hire7_$(date +%Y%m%d).sqlite']),

      separator(),

      // ── 8. DEPLOYMENT ────────────────────────────────────────────────────────
      h2('8. Deployment & Hosting Guide'),

      h3('Server Requirements'),
      buildTable(
        ['Requirement', 'Minimum'],
        [
          ['Node.js',   'v20.0.0 LTS or higher'],
          ['RAM',       '512 MB minimum (1 GB recommended)'],
          ['Storage',   '500 MB minimum'],
          ['OS',        'Ubuntu 20.04+ / Debian / CentOS 7+'],
          ['PM2',       'v5.0+ (for production)'],
          ['Nginx',     'Any recent version'],
        ]
      ),
      new Paragraph({ spacing: { before: 200 }, children: [] }),

      h3('Environment Variables (.env)'),
      para('The .env file must be created manually on the server. It is NOT committed to Git.'),
      ...codeBlock([
        'PORT=3004',
        'ADMIN_PASSWORD=your_strong_password',
        'SESSION_SECRET=a_long_random_hex_string',
        'NODE_ENV=production',
      ]),

      h3('VPS Update Workflow'),
      para('Do NOT use start.sh on a live VPS. Use the following commands:'),
      ...codeBlock([
        'cd /var/www/hire7fuel',
        'git pull origin main',
        'npm install --production',
        'pm2 restart hire7fuel',
        'pm2 logs hire7fuel --lines 20',
      ]),

      h3('PM2 Commands'),
      buildTable(
        ['Command', 'Purpose'],
        [
          ['pm2 start server.js --name hire7fuel', 'First-time start'],
          ['pm2 restart hire7fuel',                'Restart after update'],
          ['pm2 status',                           'View process status'],
          ['pm2 logs hire7fuel',                   'Stream live logs'],
          ['pm2 startup && pm2 save',              'Enable auto-start on VPS reboot'],
        ]
      ),

      separator(),

      // ── 9. POST-LAUNCH CHECKLIST ─────────────────────────────────────────────
      h2('9. Post-Launch Checklist'),

      h3('Security'),
      bullet('☐  Change ADMIN_PASSWORD in .env from admin123 to a strong unique password'),
      bullet('☐  Generate and set a new SESSION_SECRET in .env'),
      bullet('☐  Confirm NODE_ENV=production is set in .env'),
      bullet('☐  Enable HTTPS via Certbot / Let\'s Encrypt on the Nginx config'),

      h3('Content'),
      bullet('☐  Upload the correct brand logo to public/assets/logo.png'),
      bullet('☐  Upload the favicon to public/assets/favicon.ico'),
      bullet('☐  Update company contact details via Admin → Settings'),
      bullet('☐  Set real Google Play Store URL and Apple App Store URL via Admin → Settings'),
      bullet('☐  Add social media links (LinkedIn, Facebook, Instagram) via Admin → Settings'),
      bullet('☐  Review and update all job postings in Admin → Jobs'),
      bullet('☐  Review and curate testimonials in Admin → Testimonials'),

      h3('Email'),
      bullet('☐  Configure SMTP credentials in Admin → Settings → Email/SMTP'),
      bullet('☐  Send a test contact form submission and verify email delivery'),
      bullet('☐  Send a test driver application and verify email delivery'),

      h3('Technical'),
      bullet('☐  Confirm PM2 auto-start: pm2 startup && pm2 save'),
      bullet('☐  Set up weekly SQLite database backups'),
      bullet('☐  Configure SSL certificate: sudo certbot --nginx -d yourdomain.com'),
      bullet('☐  Verify all public pages return HTTP 200'),
      bullet('☐  Test admin login and all CRUD operations on the live server'),

      separator(),

      // ── 10. BRAND DESIGN SYSTEM ──────────────────────────────────────────────
      h2('10. Brand & Design System'),

      h3('Color Palette'),
      buildTable(
        ['Token', 'Hex', 'Usage'],
        [
          ['Primary',            '#0D4F4F', 'Header, hero background, footer background'],
          ['Mid Teal',           '#1A6B6B', 'Section backgrounds, active nav links'],
          ['Accent (Mint Green)','#22C98A', 'CTA buttons, hover states, glows, active indicators'],
          ['Highlight (Amber)',  '#F5A623', 'Callout badges, warning states, hero subheadings'],
          ['Seafoam',            '#3ABFA0', 'Decorative dots, dividers'],
          ['White',             '#FFFFFF',  'Body text on dark backgrounds'],
          ['Near Black',        '#0A1C1C',  'Dark section backgrounds'],
          ['Body Text',         '#333333',  'Body copy on light backgrounds'],
        ]
      ),
      new Paragraph({ spacing: { before: 160 }, children: [] }),

      h3('Typography'),
      bullet('Primary Font: Inter (Google Fonts) — all headings and UI elements'),
      bullet('Body Font: System sans-serif fallback chain for cross-browser compatibility'),

      h3('Design Language'),
      bullet('Dark glassmorphism: semi-transparent frosted panels with backdrop blur'),
      bullet('Neon mint green glows on interactive elements and live indicators'),
      bullet('CSS 3D transforms for physical card depth effects'),
      bullet('Smooth transitions using cubic-bezier(0.4, 0, 0.2, 1) easing'),
      bullet('Micro-animations on hover for cards, buttons, and navigation items'),

      separator(),

      // ── 11. HANDOVER NOTES ───────────────────────────────────────────────────
      h2('11. Support & Handover Notes'),

      h3('What Is Included in This Delivery'),
      bullet('✅  Full source code repository (Git — github.com/iobuilds/hire7fuel_v1)'),
      bullet('✅  Tagged release: v1.0.0'),
      bullet('✅  SQLite database with current seed data'),
      bullet('✅  All public CSS, JS, and image assets'),
      bullet('✅  Admin panel with session authentication'),
      bullet('✅  Deployment guide (deploy_note.md in project root)'),
      bullet('✅  This project delivery document'),

      h3('What the Client Needs to Provide / Configure'),
      bullet('🔑  Change ADMIN_PASSWORD immediately after receiving the project'),
      bullet('🖼️  Final approved brand logo and favicon (replace files in public/assets/)'),
      bullet('📧  SMTP credentials for email notifications'),
      bullet('📱  Real App Store and Google Play Store URLs (configurable in admin)'),
      bullet('🔒  SSL certificate (free via Let\'s Encrypt / Certbot)'),
      bullet('🌐  DNS configuration pointing domain to the VPS IP address'),

      h3('Important Notes'),
      bullet('The start.sh script is for local development ONLY — do not use it on the VPS'),
      bullet('Session cookies require HTTPS in production (NODE_ENV=production) — admin login will not work over plain HTTP in production mode'),
      bullet('Change the default admin password immediately — the default is admin123'),

      separator(),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
        children: [
          new TextRun({ text: 'Document prepared by IOBuilds Development Team', size: 18, color: GREY_TXT, italics: true, font: 'Calibri' }),
          new TextRun({ text: '\nProject: Hire7 Fuel Premium Website Redesign — Version 1.0.0', size: 18, color: GREY_TXT, italics: true, font: 'Calibri', break: 1 }),
          new TextRun({ text: '\nAll rights reserved.', size: 18, color: GREY_TXT, italics: true, font: 'Calibri', break: 1 }),
        ],
      }),
    ],
  }],
});

// ─── Write to file ─────────────────────────────────────────────────────────────
const outputPath = path.join(__dirname, '..', 'HIRE7_FUEL_Project_Delivery_v1.0.0.docx');
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`\n✅  Word document generated successfully!`);
  console.log(`📄  File: ${outputPath}`);
  console.log(`📦  Size: ${(buffer.length / 1024).toFixed(1)} KB\n`);
}).catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
