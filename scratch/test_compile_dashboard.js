/**
 * Hire7 Fuel - EJS View Compilation Syntax Validator (Dashboard)
 */
const ejs = require('ejs');
const path = require('path');

const mockConfig = {
  brand: { name: 'Hire7 Fuel', tagline: 'Tagline', logo: '/assets/logo.png' },
  contact: { phone: '(905) 965-0308', email: 'support@hire7fuel.com', address: 'Brampton, ON' },
  social: { linkedin: '', facebook: '', instagram: '' },
  smtp: { enabled: 'false', to: 'alerts@hire7fuel.com', host: 'smtp.mailtrap.io', port: '2525', user: '', pass: '', from: 'notifications@hire7fuel.com' }
};

const mockStats = {
  totalSubmissions: 2,
  contactCount: 1,
  fuelcardCount: 1,
  careerCount: 0,
  activeJobs: 3
};

const mockSubmissions = [
  {
    id: 'test-id-1',
    type: 'contact',
    payload: { name: 'Dhanushka kumara', email: 'dhanushka.fiver.lk@gmail.com', phone: '0778367497', company: 'io builds', message: 'test inquiry' },
    created_at: new Date().toISOString()
  }
];

const viewPath = path.join(__dirname, '../views/admin/dashboard.ejs');

console.log('=== STARTING DASHBOARD TEMPLATE SYNTAX COMPILE AUDIT ===');
console.log(`Auditing file: ${viewPath}`);

ejs.renderFile(viewPath, { config: mockConfig, stats: mockStats, submissions: mockSubmissions }, (err, str) => {
  if (err) {
    console.error('[✗] EJS COMPILATION FAILED: Dashboard template syntax error detected!');
    console.error(err);
    process.exit(1);
  } else {
    console.log('[✓] EJS COMPILATION SUCCESSFUL: Dashboard template rendered beautifully with 0 parsing errors!');
    process.exit(0);
  }
});
