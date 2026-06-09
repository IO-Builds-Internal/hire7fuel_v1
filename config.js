/**
 * Hire7 Fuel Central Configuration System
 * Single Source of Truth for Branding, Color Palette, and Contact Information.
 * These act as the baseline values. When dynamic administration changes are made in the
 * /admin panel, those settings will overwrite these values dynamically.
 */
module.exports = {
  brand: {
    name: 'Hire7 Fuel',
    tagline: 'Powering Success with Every Drop',
    logo: '/assets/logo.png',
    favicon: '/assets/favicon.ico'
  },
  colors: {
    primary: '#0D4F4F',      // Header, hero bg, footer bg
    midTeal: '#1A6B6B',      // Section backgrounds, nav active
    accent: '#14a077',       // CTA buttons, hover states, active links (Teal green)
    highlight: '#F5A623',    // Callouts, badges, hero subheading accents
    seafoam: '#3ABFA0',      // Decorative dots, dividers
    white: '#FFFFFF',        // Body text on dark bg
    nearBlack: '#0A1C1C',    // Dark sections
    bodyText: '#333333'      // Body copy on light bg
  },
  contact: {
    phone: '(905) 965-0308',
    email: 'support@hire7fuel.com',
    address: '2575 Steeles Ave E, Unit 1, Brampton, ON' // Single canonical address
  },
  social: {
    linkedin: '',   // Empty by default (hidden in footer per spec)
    facebook: '',   // Empty by default
    instagram: ''   // Empty by default
  },
  app: {
    playstore: 'https://play.google.com/store',
    appstore: 'https://apps.apple.com'
  },
  smtp: {
    host: 'smtp.mailtrap.io',
    port: '2525',
    user: '',
    pass: '',
    from: 'notifications@hire7fuel.com',
    to: 'alerts@hire7fuel.com',
    enabled: 'false'
  }
};
