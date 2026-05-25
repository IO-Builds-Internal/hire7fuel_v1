# 🚀 HIRE7 FUEL — DEPLOYMENT & OPERATIONS GUIDE

> **Version:** 1.0.0 (Production Release)
> **Prepared by:** IOBuilds Development Team
> **Last Updated:** May 2026

---

## ✅ Prerequisites

Ensure your VPS / server has the following installed **before** deploying:

| Requirement | Minimum Version | Check Command |
|---|---|---|
| Node.js | v20.0.0 LTS+ | `node -v` |
| npm | v9.0.0+ | `npm -v` |
| Git | Any recent version | `git --version` |
| PM2 (recommended) | v5.0.0+ | `pm2 -v` |

Install PM2 globally if not yet installed:
```bash
npm install -g pm2
```

---

## 📦 First-Time Deployment (Fresh Server)

### Step 1 — Clone the Repository
```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git /var/www/hire7fuel
cd /var/www/hire7fuel
```

### Step 2 — Configure Environment Variables
```bash
cp .env.example .env   # If .env.example exists, or create manually
nano .env
```

Fill in the following keys in `.env`:
```env
# Server Port (must match Nginx proxy_pass port)
PORT=3004

# Admin Panel Password (change from default immediately!)
ADMIN_PASSWORD=your_secure_password_here

# Session Secret (generate with: node -e "require('crypto').randomBytes(32).toString('hex')")
SESSION_SECRET=your_random_hex_secret_here

# Node Environment
NODE_ENV=production
```

### Step 3 — Install Dependencies
```bash
npm install --production
```

### Step 4 — Start With PM2 (Recommended for Production)
```bash
pm2 start server.js --name hire7fuel
pm2 save
pm2 startup
```

The server will now auto-restart on crash and survive VPS reboots.

---

## 🔄 Updating the Site After a Git Pull (VPS Workflow)

> **⚠️ IMPORTANT:** Do NOT use `start.sh` for updates on a live server. `start.sh` is a one-click local developer launcher only. Use the steps below for VPS updates.

### The Correct VPS Update Workflow:

```bash
# 1. Navigate to the project directory
cd /var/www/hire7fuel

# 2. Pull the latest changes from the repository
git pull origin main

# 3. Install any new dependencies (safe to run even if unchanged)
npm install --production

# 4. Gracefully restart the running server (zero config change needed)
pm2 restart hire7fuel

# 5. Verify the server is running correctly
pm2 status
pm2 logs hire7fuel --lines 30
```

> 💡 **Why PM2 restart and not start.sh?**
> `start.sh` calls `npm start` which boots a new process in the foreground. On a running VPS, this conflicts with the already-running process. PM2 manages the process lifecycle cleanly, gracefully killing and respawning with updated code.

---

## 🌐 Nginx Reverse Proxy Configuration

The site runs on Node.js internally. Nginx should forward public traffic to it.

Port mapping:
- **Port 3004** → `hire7demo.iobuilds.com` (Demo/staging instance)
- **Port 3000** → Local development default

Example Nginx server block (`/etc/nginx/sites-available/hire7fuel`):
```nginx
server {
    listen 80;
    server_name hire7demo.iobuilds.com;

    location / {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

After editing:
```bash
sudo nginx -t            # Test config for syntax errors
sudo systemctl reload nginx
```

---

## 🗄️ Database

This project uses **SQLite** as its embedded database — no external database server required.

| Item | Detail |
|---|---|
| **Engine** | SQLite3 (embedded, file-based) |
| **File Location** | `database/hire7_fuel.sqlite` |
| **Tables** | `jobs`, `testimonials`, `settings` |
| **Zero Config** | Starts automatically, no setup needed |

### SQLite Backup (Recommended Weekly)
```bash
cp /var/www/hire7fuel/database/hire7_fuel.sqlite ~/backups/hire7fuel_$(date +%Y%m%d).sqlite
```

---

## 🔐 Admin Panel Access

| Item | Value |
|---|---|
| URL | `http://yourdomain.com/admin/login` |
| Default Password | `admin123` (**Change immediately after handover!**) |
| Password Config | Edit `ADMIN_PASSWORD` in `.env`, then restart |

### What Admins Can Manage:
- ✅ Job postings (create / edit / delete)
- ✅ Driver testimonials (create / edit / delete / toggle visibility)
- ✅ Company settings (brand name, phone, email, address)
- ✅ Social media links (LinkedIn, Facebook, Instagram)
- ✅ App Store & Google Play download URLs
- ✅ SMTP email notification configuration

---

## 📁 Project File Structure

```
hire7fuel/
├── server.js               # Express app entry point
├── config.js               # Baseline brand/contact/color config
├── start.sh                # One-click LOCAL developer launcher only
├── .env                    # Environment secrets (NOT committed to git)
├── .gitignore              # Git exclusions (node_modules, .env, uploads)
├── database/
│   ├── db.js               # SQLite database access layer
│   └── hire7_fuel.sqlite   # SQLite database file (backed up regularly)
├── routes/
│   ├── public.js           # All public-facing page routes
│   └── admin.js            # All protected admin panel routes
├── views/
│   ├── index.ejs           # Homepage
│   ├── fuelcard.ejs        # Fuel Card product page
│   ├── app.ejs             # Mobile App showcase page
│   ├── careers.ejs         # Careers / Job listings page
│   ├── apply.ejs           # Driver job application form
│   ├── contact.ejs         # Contact form page
│   ├── partials/           # Shared header/footer/nav partials
│   └── admin/              # Admin dashboard views
├── public/
│   ├── css/                # Stylesheets (base, components, admin, emulator)
│   ├── js/                 # Client-side JavaScript (main.js)
│   └── assets/             # Logos, images, favicon
```

---

## 🧪 Health Check Commands

```bash
# Check if site is responding
curl -I http://localhost:3004

# Check PM2 process status
pm2 status

# Stream live logs
pm2 logs hire7fuel

# Check Node.js version
node -v

# Check if port is listening
lsof -i :3004
```

---

## ⚠️ Common Issues & Fixes

| Issue | Cause | Fix |
|---|---|---|
| `start.sh` doesn't update site | It boots a new foreground process, conflicts with PM2 | Use `git pull && pm2 restart hire7fuel` |
| `EADDRINUSE: address already in use` | Port already occupied by another process | `lsof -ti:3004 | xargs kill -9` then restart |
| Admin session keeps logging out | `SESSION_SECRET` not set or changed after deploy | Set a consistent `SESSION_SECRET` in `.env` |
| Images/logos not showing | `/public/assets/` folder missing files | Copy assets manually or run `mkdir -p public/assets public/uploads` |
| Site shows 500 error | Usually a missing `.env` key | Check `pm2 logs hire7fuel` for the specific error |
| SQLite database lost | Database not backed up before server wipe | Restore from backup `.sqlite` file |

---

## 📞 Support & Handover

For technical support during the handover period, contact the development team at IOBuilds.

> **Note:** Change the admin password (`ADMIN_PASSWORD` in `.env`) immediately after receiving the project. All source code is version-controlled in Git and can be audited at any time.
