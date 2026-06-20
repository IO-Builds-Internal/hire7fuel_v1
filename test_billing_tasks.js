const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('./database/db');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('================================================================');
  console.log('     HIRE7 LOGISTICS - AUTOMATED BILLING & TASKS TESTS          ');
  console.log('================================================================');

  let testCarrierId = null;
  let testTruckIds = [];
  let testTaskId = null;
  let originalCarrierId = null;
  let currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM

  try {
    // 1. Setup mock Carrier in Alberta (5% tax rate)
    const carrierRes = await db.dbRun(`
      INSERT INTO carriers (company_name, email, phone, usdot, mc_number, status)
      VALUES ('Alberta Test Logistics', 'alberta@testlogistics.com', '1-800-555-9999', 'DOT9999999', 'MC999999', 'active')
    `);
    testCarrierId = carrierRes.lastID;

    await db.dbRun(`
      INSERT INTO carrier_profiles (carrier_id, main_address, legal_name)
      VALUES (?, '100 Calgary St, Calgary, AB T2P 1J9', 'Alberta Test Logistics Inc.')
    `, [testCarrierId]);

    console.log(`[✓] Created Alberta Carrier with ID: ${testCarrierId}`);

    // 2. Setup trucks: 2 active, 1 inactive
    const t1 = await db.dbRun(`
      INSERT INTO trucks (carrier_id, unit_number, vin, make, model, year, status)
      VALUES (?, 'AB-01', 'VINAB000000000001', 'Freightliner', 'Cascadia', 2022, 'active')
    `, [testCarrierId]);
    testTruckIds.push(t1.lastID);

    const t2 = await db.dbRun(`
      INSERT INTO trucks (carrier_id, unit_number, vin, make, model, year, status)
      VALUES (?, 'AB-02', 'VINAB000000000002', 'Kenworth', 'T680', 2021, 'active')
    `, [testCarrierId]);
    testTruckIds.push(t2.lastID);

    const t3 = await db.dbRun(`
      INSERT INTO trucks (carrier_id, unit_number, vin, make, model, year, status)
      VALUES (?, 'AB-03', 'VINAB000000000003', 'Volvo', 'VNL', 2020, 'inactive')
    `, [testCarrierId]);
    testTruckIds.push(t3.lastID);

    console.log('[✓] Set up 3 trucks (2 active, 1 inactive).');

    // 3. Setup default task rate for 'Annual Safety Renewal'
    await db.dbRun(`
      INSERT OR REPLACE INTO task_rates (task_type, default_rate, currency, tax_applicable, active, effective_date)
      VALUES ('Annual Safety Renewal', 50.00, 'CAD', 1, 1, '2026-01-01')
    `);

    // 4. Setup a billable task
    const taskRes = await db.dbRun(`
      INSERT INTO tasks (carrier_id, task_type, status, checklist_items, is_billable)
      VALUES (?, 'Annual Safety Renewal', 'Pending', '[]', 1)
    `, [testCarrierId]);
    testTaskId = taskRes.lastID;

    console.log(`[✓] Created billable task: ID ${testTaskId}`);

    // 5. Update default user to reference this test carrier temporarily
    const user = await db.dbGet("SELECT carrier_id FROM api_users WHERE username = 'clientuser126'");
    if (user) {
      originalCarrierId = user.carrier_id;
      await db.dbRun("UPDATE api_users SET carrier_id = ?, user_status = 1, client_active = 1 WHERE username = 'clientuser126'", [testCarrierId]);
      console.log('[✓] Temporarily pointed UAT user clientuser126 to test carrier.');
    } else {
      throw new Error('Default UAT user clientuser126 not found.');
    }
  } catch (err) {
    console.error('[!] Failed to set up DB state for tests:', err.message);
    process.exit(1);
  }

  // Detect if server is running on port 3000
  let serverAlreadyRunning = false;
  let activePort = 3000;

  try {
    await fetch('http://localhost:3000/api/v1/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    serverAlreadyRunning = true;
    console.log('[✓] Active server detected on port 3000. Running tests against live instance.');
  } catch (err) {
    console.log('No active server detected on port 3000. Spawning test server on port 3001...');
  }

  let serverProcess = null;
  const envPath = path.join(__dirname, '.env');
  const envBackupPath = path.join(__dirname, '.env.backup');
  let envBackedUp = false;

  if (!serverAlreadyRunning) {
    activePort = 3001;
    if (fs.existsSync(envPath)) {
      fs.renameSync(envPath, envBackupPath);
      envBackedUp = true;
    }

    const serverScript = path.join(__dirname, 'server.js');
    serverProcess = spawn('node', [serverScript], {
      env: { ...process.env, PORT: 3001, NODE_ENV: 'test' }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data}`);
    });

    await sleep(3000);
  }

  let allPassed = true;
  let sessionCookie = '';

  try {
    // A. Perform Login to obtain portal session
    console.log('\nLogging into Carrier Portal...');
    const loginRes = await fetch(`http://localhost:${activePort}/portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=clientuser126&password=Abcd@1234',
      redirect: 'manual'
    });

    const headers = loginRes.headers;
    const rawCookies = headers.get('set-cookie');
    if (rawCookies) {
      sessionCookie = rawCookies.split(';')[0];
      console.log('[✓] Successfully logged in. Session cookie acquired:', sessionCookie);
    } else {
      throw new Error('Did not receive session cookies in response headers.');
    }

    // B. Complete the Billable Task
    console.log(`\nCompleting task ID ${testTaskId}...`);
    const completeRes = await fetch(`http://localhost:${activePort}/portal/tasks/${testTaskId}/complete`, {
      method: 'POST',
      headers: { 
        'Cookie': sessionCookie,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log(`Task Complete response status: ${completeRes.status}`);
    console.log(`Task Complete response URL: ${completeRes.url}`);
    const bodyText = await completeRes.text();
    console.log(`Task Complete response body snippet: ${bodyText.slice(0, 500)}`);

    if (completeRes.status !== 200 && completeRes.status !== 302) {
      throw new Error(`Task completion endpoint returned status: ${completeRes.status}`);
    }

    // Verify task state in database
    const completedTask = await db.dbGet("SELECT * FROM tasks WHERE id = ?", [testTaskId]);
    if (completedTask.status !== 'Completed') {
      console.log(`[✗] FAIL: Expected task status 'Completed', got '${completedTask.status}'`);
      allPassed = false;
    } else if (completedTask.amount !== 50.00) {
      console.log(`[✗] FAIL: Expected task billing amount 50.00, got ${completedTask.amount}`);
      allPassed = false;
    } else {
      console.log('[✓] Task successfully completed and billing rate ($50.00) assigned from task_rates.');
    }

    // C. Generate Monthly Invoice
    console.log(`\nGenerating monthly invoice for ${currentMonth}...`);
    const generateRes = await fetch(`http://localhost:${activePort}/portal/billing/invoices/generate-monthly`, {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `month=${currentMonth}`
    });

    if (generateRes.status !== 200 && generateRes.status !== 302) {
      throw new Error(`Invoice generation returned status: ${generateRes.status}`);
    }

    // Retrieve generated invoice details
    const invoice = await db.dbGet("SELECT * FROM invoices WHERE carrier_id = ? AND month = ?", [testCarrierId, currentMonth]);
    if (!invoice) {
      console.log('[✗] FAIL: No invoice generated in DB.');
      allPassed = false;
    } else {
      console.log(`[✓] Generated Invoice Number: ${invoice.invoice_number}`);
      
      // ASSERTIONS:
      // Active trucks = 2, rate = $85 => $170
      // Task amount = $50
      // Subtotal before tax = $220.00
      // Tax (Alberta 5%) = $11.00
      // Total amount = $231.00
      
      if (invoice.total_before_tax !== 220.00) {
        console.log(`[✗] FAIL: Expected total_before_tax to be 220.00, got ${invoice.total_before_tax}`);
        allPassed = false;
      } else {
        console.log(`[✓] Subtotal check passed: $${invoice.total_before_tax.toFixed(2)}`);
      }

      if (invoice.tax_amount !== 11.00) {
        console.log(`[✗] FAIL: Expected tax_amount to be 11.00 (5% AB tax), got ${invoice.tax_amount}`);
        allPassed = false;
      } else {
        console.log(`[✓] Tax check passed (Alberta 5%): $${invoice.tax_amount.toFixed(2)}`);
      }

      if (invoice.total_amount !== 231.00) {
        console.log(`[✗] FAIL: Expected total_amount to be 231.00, got ${invoice.total_amount}`);
        allPassed = false;
      } else {
        console.log(`[✓] Total invoice amount check passed: $${invoice.total_amount.toFixed(2)}`);
      }

      // Assert invoice items
      const items = await db.dbAll("SELECT * FROM invoice_items WHERE invoice_id = ?", [invoice.id]);
      if (items.length !== 2) {
        console.log(`[✗] FAIL: Expected 2 invoice items, got ${items.length}`);
        allPassed = false;
      } else {
        const truckFeeItem = items.find(i => i.item_type === 'active_truck_fee');
        const taskItem = items.find(i => i.item_type === 'billable_task');

        if (!truckFeeItem || truckFeeItem.quantity !== 2 || truckFeeItem.rate !== 85.00 || truckFeeItem.amount !== 170.00) {
          console.log('[✗] FAIL: Active truck fee item details mismatch.');
          allPassed = false;
        } else {
          console.log('[✓] Active truck fee item assert passed.');
        }

        if (!taskItem || taskItem.quantity !== 1 || taskItem.rate !== 50.00 || taskItem.amount !== 50.00 || taskItem.description !== 'Annual Safety Renewal') {
          console.log('[✗] FAIL: Completed task item details mismatch.');
          allPassed = false;
        } else {
          console.log('[✓] Completed task item assert passed.');
        }
      }
    }

  } catch (err) {
    console.error('[!] Request failure during tests:', err.message);
    allPassed = false;
  }

  // CLEANUP DB AND RESTORE STATE
  console.log('\nRestoring database state to original configuration...');
  try {
    if (originalCarrierId !== null) {
      await db.dbRun("UPDATE api_users SET carrier_id = ? WHERE username = 'clientuser126'", [originalCarrierId]);
    }
    if (testCarrierId !== null) {
      await db.dbRun("DELETE FROM carrier_profiles WHERE carrier_id = ?", [testCarrierId]);
      await db.dbRun("DELETE FROM carriers WHERE id = ?", [testCarrierId]);
      await db.dbRun("DELETE FROM trucks WHERE carrier_id = ?", [testCarrierId]);
      await db.dbRun("DELETE FROM tasks WHERE carrier_id = ?", [testCarrierId]);
      await db.dbRun("DELETE FROM invoices WHERE carrier_id = ?", [testCarrierId]);
    }
    console.log('[✓] Database cleanup completed.');
  } catch (err) {
    console.error('[!] Database cleanup failed:', err.message);
  }

  // Cleanup test server
  if (serverProcess) {
    console.log('Shutting down test server on port 3001...');
    serverProcess.kill('SIGTERM');
  }

  if (envBackedUp) {
    if (fs.existsSync(envBackupPath)) {
      fs.renameSync(envBackupPath, envPath);
    }
  }

  console.log('================================================================');
  if (allPassed) {
    console.log('       RESULT: BILLING & TASK TESTS PASSED SUCCESSFULLY! [✓]     ');
    process.exit(0);
  } else {
    console.log('       RESULT: SOME BILLING & TASK TESTS FAILED. [✗]             ');
    process.exit(1);
  }
}

runTests();
