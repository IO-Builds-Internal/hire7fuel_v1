/**
 * Hire7 Fuel - EJS View Compilation Syntax Validator
 */
const ejs = require('ejs');
const path = require('path');

const mockConfig = {
  brand: { name: 'Hire7 Fuel', tagline: 'Tagline', logo: '/assets/logo.png' },
  contact: { phone: '(905) 965-0308', email: 'support@hire7fuel.com', address: 'Brampton, ON' },
  social: { linkedin: '', facebook: '', instagram: '' },
  smtp: { enabled: 'false', to: 'alerts@hire7fuel.com', host: 'smtp.mailtrap.io', port: '2525', user: '', pass: '', from: 'notifications@hire7fuel.com' }
};

const viewPath = path.join(__dirname, '../views/admin/settings.ejs');

console.log('=== STARTING TEMPLATE SYNTAX COMPILE AUDIT ===');
console.log(`Auditing file: ${viewPath}`);

ejs.renderFile(viewPath, { config: mockConfig, success: true, error: null }, (err, str) => {
  if (err) {
    console.error('[✗] EJS COMPILATION FAILED: Template syntax error detected!');
    console.error(err);
    process.exit(1);
  } else {
    console.log('[✓] EJS COMPILATION SUCCESSFUL: Template rendered beautifully with 0 parsing errors!');
    process.exit(0);
  }
});
