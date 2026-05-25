# Hire7 Fuel — Premium Website & Fleet Operations Platform

A fully custom, production-ready premium website redesign for **Hire7 Fuel** — a carrier-class commercial fuel card and fleet operations platform serving transport carriers across Canada.

Built with Node.js, Express, and EJS. Features a dark glassmorphic design system, a secure admin content management dashboard, and a premium interactive mobile app showcase page.

---

## ✨ Key Features

- **Dark Glassmorphic Design** — Premium dark teal / mint green aesthetic with CSS3 micro-animations, 3D card transforms, and smooth hover effects
- **Interactive Mobile App Showcase** (`/app`) — Live smartphone emulator with real-time CAN-bus sparklines, SVG gauge rings, OTP countdown, GPS corridor simulator, and auto-cycling carousel
- **3D Holographic Fuel Card** — Hero section features a parallax 3D-rotated physical card stacked with a mini mobile companion screen in CSS perspective space
- **Admin Content Dashboard** — Secure session-authenticated staff panel for managing jobs, testimonials, and site settings
- **SQLite Database** — Zero-config embedded database, starts automatically with no external server required
- **Full Mobile Responsiveness** — All pages optimized for phones, tablets, and desktops
- **SMTP Email Notifications** — Contact form and driver applications trigger email alerts (configurable)

---

## 🗂️ Project Structure

```
hire7fuel/
├── server.js                    # Express app entry point
├── config.js                    # Baseline brand, color & contact config
├── start.sh                     # One-click LOCAL developer launcher
├── deploy_note.md               # VPS deployment & operations guide
├── .env                         # Environment secrets (not committed to git)
├── database/
│   ├── db.js                    # SQLite database access layer
│   └── hire7_fuel.sqlite        # SQLite database file
├── routes/
│   ├── public.js                # All public page route handlers
│   └── admin.js                 # All protected admin route handlers
├── views/
│   ├── index.ejs                # Homepage
│   ├── fuelcard.ejs             # Fuel Card product page
│   ├── app.ejs                  # Mobile App interactive showcase
│   ├── careers.ejs              # Job listings page
│   ├── apply.ejs                # Driver application form
│   ├── contact.ejs              # Contact form
│   ├── partials/
│   │   ├── header.ejs           # Global nav header
│   │   └── footer.ejs           # Global footer
│   └── admin/
│       ├── login.ejs            # Admin login
│       ├── dashboard.ejs        # Admin overview
│       ├── jobs.ejs             # Job postings list
│       ├── jobs_edit.ejs        # Job create/edit form
│       ├── testimonials.ejs     # Testimonials list
│       ├── testimonials_edit.ejs
│       └── settings.ejs         # Site settings (brand, social, SMTP)
└── public/
    ├── css/
    │   ├── base.css             # Design tokens, resets, typography
    │   ├── components.css       # All UI components
    │   ├── emulator.css         # Mobile emulator & 3D card styles
    │   ├── forms.css            # Form styles
    │   └── admin.css            # Admin panel styles
    ├── js/
    │   └── main.js              # Client-side JS (nav, counters, animations)
    └── assets/
        ├── logo.png             # Brand logo
        └── favicon.ico          # Favicon
```

---

## 🚀 Local Development (Quick Start)

```bash
chmod +x start.sh
./start.sh
```

`start.sh` will automatically:
1. Check Node.js is installed (v20+ required)
2. Generate a `.env` file with a secure random session secret if one doesn't exist
3. Create required asset directories
4. Run `npm install`
5. Start the server

Once running:
- **Website:** [http://localhost:3000](http://localhost:3000)
- **Admin Panel:** [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Default Password:** `admin123`

> ⚠️ `start.sh` is for **local development only**. Do not use it to manage a live VPS deployment. See `deploy_note.md` for production instructions.

---

## 🌐 Pages & Routes

| Route | Description |
|---|---|
| `/` | Homepage |
| `/fuelcard` | Fuel Card product page |
| `/app` | Mobile App interactive showcase |
| `/careers` | Job listings |
| `/apply` | Driver application form |
| `/contact` | Contact form |
| `/admin/login` | Admin authentication |
| `/admin/dashboard` | Admin overview |
| `/admin/jobs` | Job postings management |
| `/admin/testimonials` | Testimonials management |
| `/admin/settings` | Site settings |

---

## 🗄️ Database

This project uses **SQLite** — a lightweight, file-based embedded database. No external database server is required.

- **File location:** `database/hire7_fuel.sqlite`
- **Auto-initialized:** Tables and seed data are created automatically on first run
- **Tables:** `settings`, `jobs`, `submissions`, `testimonials`

### Backup
```bash
cp database/hire7_fuel.sqlite ~/backups/hire7_$(date +%Y%m%d).sqlite
```

---

## ⚙️ Environment Variables (`.env`)

The `.env` file is generated automatically by `start.sh` on first run. You can also create it manually:

```env
# Server port
PORT=3000

# Admin panel password
ADMIN_PASSWORD=admin123

# Secure session secret (change this in production!)
SESSION_SECRET=your_random_secret_here

# Node environment
NODE_ENV=development
```

For production, set `NODE_ENV=production` and use a strong `SESSION_SECRET`.

---

## 🔐 Admin Panel

The admin panel at `/admin` is session-authenticated. Sessions expire after 2 hours.

**What you can manage:**
- **Jobs** — Create, edit, toggle active/inactive, and delete job postings. Changes appear instantly on the public Careers page.
- **Testimonials** — Create, edit, toggle visibility, and delete driver testimonials shown on the homepage.
- **Settings** — Update brand name, tagline, phone, email, address, social media links, App Store / Play Store URLs, and SMTP email settings.

---

## 🖥️ VPS Deployment

For full production deployment instructions including Nginx config, PM2 setup, SSL, and the correct update workflow, see **[deploy_note.md](./deploy_note.md)**.

**Quick update command on a live VPS:**
```bash
cd /var/www/hire7fuel
git pull origin main
npm install --production
pm2 restart hire7fuel
```

---

## 🎨 Design System

See **[STYLE_GUIDE.md](./STYLE_GUIDE.md)** for the full color palette, typography, and UI component specifications.

| Token | Hex | Usage |
|---|---|---|
| Primary | `#0D4F4F` | Header, hero, footer |
| Accent (Mint) | `#22C98A` | CTAs, glows, active states |
| Highlight (Amber) | `#F5A623` | Badges, warnings, callouts |
| Near Black | `#0A1C1C` | Dark section backgrounds |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v20 LTS |
| Framework | Express.js v4 |
| Templating | EJS |
| Database | SQLite3 |
| Styling | Vanilla CSS |
| Client JS | Vanilla JavaScript |
| Auth | express-session |
| Email | Nodemailer |
| Uploads | Multer |
| Process Mgr | PM2 (production) |
