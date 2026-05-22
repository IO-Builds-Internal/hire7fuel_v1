/**
 * Hire7 Fuel - SQLite Database Dynamic SMTP Settings Integration Test Script
 */
const db = require('../database/db');

async function testDatabase() {
  console.log('=== STARTING DATABASE INTEGRATION TESTS ===\n');

  console.log('Fetching initial settings...');
  const initialSettings = await db.getSettings();
  console.log('Initial SMTP Config:', JSON.stringify(initialSettings.smtp, null, 2));

  console.log('\nUpdating SMTP settings in database...');
  const updates = {
    smtp_host: 'smtp.testserver.com',
    smtp_port: '587',
    smtp_user: 'testuser',
    smtp_pass: 'testpass123',
    smtp_from: 'test-sender@hire7fuel.com',
    smtp_to: 'test-receiver@hire7fuel.com',
    smtp_enabled: 'true'
  };

  const updateSuccess = await db.updateSettings(updates);
  console.log('Update status:', updateSuccess ? '[✓] SUCCESS' : '[✗] FAILED');

  if (!updateSuccess) {
    console.error('Failed to update SMTP settings.');
    process.exit(1);
  }

  console.log('\nRefetching settings to verify persistence...');
  const updatedSettings = await db.getSettings();
  console.log('Updated SMTP Config:', JSON.stringify(updatedSettings.smtp, null, 2));

  // Assertions
  if (
    updatedSettings.smtp.host === 'smtp.testserver.com' &&
    updatedSettings.smtp.port === '587' &&
    updatedSettings.smtp.user === 'testuser' &&
    updatedSettings.smtp.pass === 'testpass123' &&
    updatedSettings.smtp.from === 'test-sender@hire7fuel.com' &&
    updatedSettings.smtp.to === 'test-receiver@hire7fuel.com' &&
    updatedSettings.smtp.enabled === 'true'
  ) {
    console.log('\n[✓] DATABASE INTEGRATION SUCCESSFUL: All SMTP parameters successfully persisted and parsed!');
  } else {
    console.error('\n[✗] DATABASE INTEGRATION FAILED: Some parameters did not match update payload.');
    process.exit(1);
  }
}

testDatabase().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
