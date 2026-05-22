# Hire7 Fuel Website Redesign & Command Panel

This is the complete, high-performance Node.js website redesign for **Hire7 Fuel (hire7fuel.com)**.

The platform is designed to be highly organized and modular. It features a modern, accessible interface with a premium color palette (deep teals, seafoams, mint accents, and high-visibility amber callouts) and smooth CSS3 interactive micro-animations. It comes built-in with a **secure Administrative Portal (`/admin`)** allowing real-time edits to branding, contact data (e.g. phone, address), job postings, and dynamic form submissions.

---

## Key Features

1. **Modular MVC Architecture**: Fully organized into clean, isolated controller routers (`routes/public.js`, `routes/admin.js`), database layers, and front-end views, ensuring that no file grows too large or hard to maintain.
2. **Dual-Layer Database Interface (`database/db.js`)**:
   - **Out-of-the-Box Local Fallback**: Zero configurations required! The system automatically detects if Supabase credentials are missing and uses a local JSON file database (`database/local_db.json`). All `/admin` functions, custom settings edits, and form submissions operate instantly offline.
   - **Seamless Supabase Switch**: Provide your Supabase credentials in `.env`, and the application automatically and transparently switches to your cloud database instance.
3. **Dynamic Rebranding**: Centralized branding configuration (`config.js`) acts as the baseline and reliable single source of truth.
4. **Full Administrative Suite (`/admin`)**:
   - **Identity & Brand customizer**: Instantly update your phone number, Brampton office address, brand tagline, and social media handles globally.
   - **Logo Upload Manager**: Multer file upload integration to upload new brand logos (`logo.png`/`logo.svg`), propagating immediately across headers, footers, and dashboards.
   - **Dynamic Job Openings CRUD**: Create, activate/deactivate, and delete open roles. The public Careers page automatically updates (displaying the job posts or showing a beautiful "No Current Openings" fallback card).
   - **Submission Manager**: Review all incoming fleet card requests, general inquiries, and talent applications in a central command screen.

---

## Project Structure

```
Hire7-Fuel/
├── package.json            # Node.js project manifest & scripts
├── config.js               # Central brand baseline values (Single Source of Truth)
├── server.js               # Express application entry point & bootstrap configurations
├── start.sh                # Executable one-click setup and launcher script
├── README.md               # Developer manual & operations guide
├── STYLE_GUIDE.md          # Visual specs (Colors, Typography, UI Components)
├── database/
│   ├── db.js               # Dual-layer data adapter (Supabase <-> Local JSON fallback)
│   ├── migration.sql       # PostgreSQL DDL table setup script for Supabase
│   └── local_db.json       # Generated offline database (created automatically on launch)
├── routes/
│   ├── public.js           # Public views controller (Home, Fuel Card, Apply, Careers, Contact)
│   └── admin.js            # Administrative panel gatekeeper, CRUD, and settings router
├── public/
│   ├── css/
│   │   └── styles.css      # Core stylesheet with CSS custom variable definitions
│   ├── js/
│   │   └── main.js         # Interactive triggers: FAQs, program tabs, form validations
│   ├── uploads/            # Admin custom uploaded brand assets directory
│   └── assets/
│       └── logo.png        # Active high-fidelity brand logo asset
└── views/
    ├── index.ejs           # Home page view with dynamic forms and testimonials
    ├── fuelcard.ejs        # Fuel card switcher details and FAQ accordions
    ├── apply.ejs           # Accessible enrollment application portal
    ├── careers.ejs         #动态 Careers board, company culture values, and talent forms
    ├── contact.ejs         # Contact coordinates panel, single address and Google Maps
    ├── admin/
    │   ├── login.ejs       # Secured glassmorphism administrative authenticator
    │   ├── dashboard.ejs   # Admin Command Center & Statistics display
    │   ├── settings.ejs    # Site settings customizer & logo upload form
    │   └── jobs.ejs        # Dynamic Careers listings crud panel
    └── partials/
        ├── header.ejs      # Unified navigation bar with active highlighters
        └── footer.ejs      # Dynamic copyright, social handles, and contact coordinates
```

---

## Installation & Running

You can boot the entire website redesign in a single command. 

### Instant Setup (One-Click)
Open your terminal inside the project directory and execute:
```bash
chmod +x start.sh
./start.sh
```

The script will automatically:
1. Verify Node.js is installed.
2. Generate your `.env` configuration file containing a random secure session secret and default admin credentials.
3. Verify and build missing asset subdirectories.
4. Install all NPM package dependencies (`express`, `ejs`, `@supabase/supabase-js`, `multer`, etc.).
5. Boot up the server.

Once running:
- **Public Redesign Portal**: [http://localhost:3000](http://localhost:3000)
- **Administrative Suite**: [http://localhost:3000/admin](http://localhost:3000/admin) (or `/admin/login`)
- **Default Staff Passcode**: `admin123`

---

## Dynamic Supabase Migration

When you are ready to move from the local JSON database fallback to your self-hosted or cloud Supabase instance, follow these simple steps:

### 1. Initialize Tables
Log into your Supabase Dashboard, open the **SQL Editor**, paste the contents of `database/migration.sql`, and click **Run**. This bootstraps the settings, jobs, and submissions tables and seeds them with initial brand data.

### 2. Configure Environment Variables
Open the `.env` file generated in the project root, uncomment the Supabase variables, and insert your unique URL and Anon API key:

```env
# Supabase cloud credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-api-key...
```

### 3. Restart Application
Save the `.env` file and restart the server (`./start.sh` or `npm start`). 

The `database/db.js` adapter will immediately detect the keys, establish a connection, and switch over to your Supabase tables. All brand settings updates, job listings, and client form submissions will now load from and save to Supabase!

---

## administrative Suite Usage

### Access Control
Access to `/admin` routes is fully secured via session-based cookies. Sessions automatically invalidate after 2 hours of inactivity. The access password can be changed at any time by updating `ADMIN_PASSWORD` inside the `.env` file.

### Dynamic Branding & Uploads
To alter the corporate identity or contact coordinates:
1. Navigate to `/admin/settings`.
2. Edit company titles, tagline, support lines, or the canonical Brampton office address.
3. Select an image (PNG, JPG, SVG) to replace the logo. Multer handles the file upload, saving it directly to the assets repository.
4. Click **Save Customizations**. The changes reflect globally on all public headers, footers, maps buttons, and emails instantly!

### dynamic Career Postings
To manage open vacancies:
1. Navigate to `/admin/jobs`.
2. Fill out the "Add New Career Posting" form. To enter requirements, type each bullet-point on a separate line (the EJS template parses and displays them dynamically).
3. Click **Create Dynamic Post**. It immediately populates the public job board.
4. **Active Toggle**: Use the custom checkbox slider next to any job in your list. It sends an background AJAX fetch request to toggle the job's active/inactive status immediately. If deactivated, the job will hide from the public Careers board. If all jobs are deactivated, the page automatically renders a fallback talent pool message!
