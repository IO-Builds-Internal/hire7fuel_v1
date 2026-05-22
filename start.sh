#!/bin/bash

# ============================================================================
# HIRE7 FUEL - ONE-CLICK INSTALLER & LAUNCHER
# Highly robust shell script to bootstrap, configure, and launch the platform.
# ============================================================================

# Color codes for premium console output
TEAL='\033[0;36m'
MINT='\033[0;32m'
AMBER='\033[0;33m'
RESET='\033[0m'

echo -e "${TEAL}================================================================${RESET}"
echo -e "${MINT}         HIRE7 FUEL - PREMIUM WEBSITE REDESIGN LAUNCHER           ${RESET}"
echo -e "${TEAL}================================================================${RESET}"
echo -e "Starting zero-configuration environment setup..."

# 1. Verify Node.js Environment
if ! command -v node &> /dev/null; then
    echo -e "${AMBER}[!] Error: Node.js is not installed on this system.${RESET}"
    echo "Please install Node.js 20 LTS and try again."
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "Detected Node.js version: ${TEAL}${NODE_VERSION}${RESET}"

# 2. Setup baseline Environment (.env) if missing
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "Generating standard security tokens in ${AMBER}.env${RESET}..."
    RANDOM_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
    
    cat > "$ENV_FILE" << EOF
# ============================================================================
# Hire7 Fuel Environment Configurations
# ============================================================================

# Server Execution Port
PORT=3000

# Administrative Dashboard Access Password
# Use this passcode to log in at http://localhost:3000/admin/login
ADMIN_PASSWORD=admin123

# Secure Cookie Session Token
SESSION_SECRET=${RANDOM_SECRET}

# Supabase Credentials (Uncomment and configure to switch from local storage)
# SUPABASE_URL=your_supabase_api_url_here
# SUPABASE_KEY=your_supabase_anon_key_here
EOF
    echo -e "${MINT}[✓] Baseline environment variables seeded successfully.${RESET}"
else
    echo -e "Existing ${MINT}.env${RESET} file detected. Skipping generation."
fi

# 3. Create public directories
echo "Verifying local assets directories..."
mkdir -p "public/assets"
mkdir -p "public/uploads"
mkdir -p "database"

# 4. Install Node.js package dependencies
echo -e "Installing package dependencies via ${TEAL}npm install${RESET}..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${AMBER}[!] Error: npm install failed. Please check your internet connection.${RESET}"
    exit 1
fi
echo -e "${MINT}[✓] Node.js dependencies installed successfully.${RESET}"

echo -e "${TEAL}================================================================${RESET}"
echo -e "  Site is booting at: ${MINT}http://localhost:3000${RESET}"
echo -e "  Staff Panel login: ${MINT}http://localhost:3000/admin/login${RESET}"
echo -e "  Default Passcode:  ${AMBER}admin123${RESET}"
echo -e "  Database state:    ${TEAL}Local JSON File Fallback (Auto-Active)${RESET}"
echo -e "${TEAL}================================================================${RESET}"

# 5. Boot Express Server
npm start
