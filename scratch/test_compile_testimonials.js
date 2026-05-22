/**
 * Hire7 Fuel - EJS View Compilation Syntax Validator for Testimonials, Admin and Public Views
 */
const ejs = require('ejs');
const path = require('path');

const mockConfig = {
  brand: { name: 'Hire7 Fuel', tagline: 'Power Your Fleet to the Next Level', logo: '/images/logo.png' },
  contact: { phone: '(905) 965-0308', email: 'support@hire7fuel.com', address: '2575 Steeles Ave E, Unit 1, Brampton, ON' },
  social: { linkedin: 'https://linkedin.com', facebook: 'https://facebook.com', instagram: 'https://instagram.com' },
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

const mockTestimonials = [
  {
    id: 'testi-1',
    author: 'Marcus Howell',
    role: 'Director of Logistics, Howell Transport',
    quote: 'Implementing the Hire7 Fuel Card completely resolved our card abuse issues. The geofencing tool blocked two out-of-bounds fills in our first month alone.',
    stars: 5,
    active: 1
  },
  {
    id: 'testi-2',
    author: 'Sandeep Dhillon',
    role: 'Operations Manager, GTA Freightways',
    quote: 'We scaled our fleet from 5 to 25 trucks without adding a single administrative hire. The automated IFTA tax logs export.',
    stars: 5,
    active: 1
  }
];

const mockJobs = [
  {
    id: 'job-1',
    title: 'Fleet Coordinator',
    department: 'Dispatch Operations',
    location: 'Brampton, ON',
    description: 'Dispatch trucks',
    requirements: 'Experience',
    type: 'Full-time',
    active: true
  }
];

const templatesToTest = [
  // Public Views
  { name: 'index.ejs', path: '../views/index.ejs', data: { page: 'home', success: false, testimonials: mockTestimonials, config: mockConfig } },
  { name: 'apply.ejs', path: '../views/apply.ejs', data: { page: 'apply', success: false, config: mockConfig } },
  { name: 'careers.ejs', path: '../views/careers.ejs', data: { page: 'careers', success: false, jobs: mockJobs, config: mockConfig } },
  { name: 'contact.ejs', path: '../views/contact.ejs', data: { page: 'contact', success: false, config: mockConfig } },
  { name: 'fuelcard.ejs', path: '../views/fuelcard.ejs', data: { page: 'fuelcard', config: mockConfig } },
  
  // Admin Views
  { name: 'admin/testimonials.ejs', path: '../views/admin/testimonials.ejs', data: { config: mockConfig, testimonials: mockTestimonials, success: null, error: null } },
  { name: 'admin/testimonials_edit.ejs', path: '../views/admin/testimonials_edit.ejs', data: { config: mockConfig, testimonial: mockTestimonials[0], error: null } },
  { name: 'admin/settings.ejs', path: '../views/admin/settings.ejs', data: { config: mockConfig, success: null, error: null, tab: 'identity' } },
  { name: 'admin/dashboard.ejs', path: '../views/admin/dashboard.ejs', data: { config: mockConfig, stats: mockStats, submissions: mockSubmissions } },
  { name: 'admin/jobs.ejs', path: '../views/admin/jobs.ejs', data: { config: mockConfig, jobs: mockJobs, success: null, error: null } },
  { name: 'admin/jobs_edit.ejs', path: '../views/admin/jobs_edit.ejs', data: { config: mockConfig, job: mockJobs[0], error: null } }
];

console.log('=== STARTING EJS COMPILATION INTEGRITY AUDIT ===\n');

let passCount = 0;
let failCount = 0;

async function runAudit() {
  for (const t of templatesToTest) {
    const fullPath = path.join(__dirname, t.path);
    console.log(`Auditing: ${t.name}`);
    try {
      await new Promise((resolve, reject) => {
        ejs.renderFile(fullPath, t.data, (err, str) => {
          if (err) reject(err);
          else resolve(str);
        });
      });
      console.log(`[✓] SUCCESS: ${t.name} compiles perfectly!\n`);
      passCount++;
    } catch (err) {
      console.error(`[✗] FAILED: ${t.name} has template syntax errors!`);
      console.error(err);
      console.error('\n');
      failCount++;
    }
  }

  console.log('=== AUDIT RESULTS ===');
  console.log(`Total Passed: ${passCount}`);
  console.log(`Total Failed: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('\n[✓] ALL 11 EJS TEMPLATES COMPILED SUCCESSFULLY WITH 0 PARSING ERRORS!');
    process.exit(0);
  }
}

runAudit();
