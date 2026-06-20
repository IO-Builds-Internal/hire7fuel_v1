const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('./database/db');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('================================================================');
  console.log('     KSG FUEL AUTHENTICATION API - AUTOMATED INTEGRATION TESTS  ');
  console.log('================================================================');

  // Ensure UAT test user is active in DB before running
  try {
    await db.dbRun("UPDATE api_users SET user_status = 1, client_active = 1 WHERE username = 'clientuser126'");
    console.log('[✓] Database UAT user state initialized.');
  } catch (err) {
    console.error('[!] Failed to reset database UAT state:', err.message);
  }

  // 1. Detect if server is already running on port 3000
  let serverAlreadyRunning = false;
  let activePort = 3000;

  try {
    const checkRes = await fetch('http://localhost:3000/api/v1/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    // Any HTTP response status (even 400 Bad Request) means the server is listening!
    serverAlreadyRunning = true;
    console.log('[✓] Active server detected on port 3000. Running tests against live instance.');
  } catch (err) {
    console.log('No active server detected on port 3000. Will spawn test server on port 3001...');
  }

  let serverProcess = null;
  const envPath = path.join(__dirname, '.env');
  const envBackupPath = path.join(__dirname, '.env.backup');
  let envBackedUp = false;

  if (!serverAlreadyRunning) {
    activePort = 3001;
    // To prevent dotenv from overriding PORT 3001 with 3000 from the .env file,
    // we temporarily rename the .env file if it exists.
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

    // Wait for test server to start
    await sleep(3000);
  }

  let allPassed = true;

  // Test request execution helper
  const runTestCase = async (name, payload, expectedStatus, validateFn) => {
    console.log(`\nRunning Test: "${name}"...`);
    try {
      const response = await fetch(`http://localhost:${activePort}/api/v1/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.status !== expectedStatus) {
        console.log(`[✗] FAIL: Expected status ${expectedStatus}, received ${response.status}`);
        allPassed = false;
        return;
      }

      const validationErr = validateFn(data);
      if (validationErr) {
        console.log(`[✗] FAIL: Validation failed: ${validationErr}`);
        allPassed = false;
      } else {
        console.log(`[✓] PASS: Received status ${response.status}`);
      }
    } catch (err) {
      console.log(`[✗] FAIL: Request failed with error: ${err.message}`);
      allPassed = false;
    }
  };

  // Run UAT test assertions
  // 1. Success Case
  await runTestCase(
    '1. Valid Credentials and Test reCAPTCHA Token (200 OK)',
    {
      username: 'clientuser126',
      password: 'Abcd@1234',
      recaptchaToken: 'xxxxxxxx_recapchaToken-----'
    },
    200,
    (res) => {
      if (res.userName !== 'clientuser126') return `userName incorrect, got '${res.userName}'`;
      if (res.password !== null) return `password must be null, got '${res.password}'`;
      if (res.userStatus !== true) return `userStatus must be true`;
      if (res.clientActive !== true) return `clientActive must be true`;
      if (res.clientID !== 'clientID_99812') return `clientID incorrect, got '${res.clientID}'`;
      return null;
    }
  );

  // 2. Bad Request Case
  await runTestCase(
    '2. Missing Parameters (400 Bad Request)',
    {
      username: 'clientuser126',
      password: 'Abcd@1234'
    },
    400,
    (res) => {
      if (!res.error || !res.message) return 'Missing error elements';
      return null;
    }
  );

  // 3. Unauthorized Case - Credentials Mismatch
  await runTestCase(
    '3. Invalid Password Credential (401 Unauthorized)',
    {
      username: 'clientuser126',
      password: 'IncorrectPassword',
      recaptchaToken: 'xxxxxxxx_recapchaToken-----'
    },
    401,
    (res) => {
      if (res.error !== 'Unauthorized') return `Expected 'Unauthorized', got '${res.error}'`;
      return null;
    }
  );

  // 4. Unauthorized Case - Invalid reCAPTCHA Token
  await runTestCase(
    '4. Invalid reCAPTCHA Token (401 Unauthorized)',
    {
      username: 'clientuser126',
      password: 'Abcd@1234',
      recaptchaToken: 'invalid_mock_recaptcha_token'
    },
    401,
    (res) => {
      if (res.error !== 'Unauthorized') return `Expected 'Unauthorized', got '${res.error}'`;
      return null;
    }
  );

  // 5. Forbidden Case - Suspended State
  console.log('\nToggling userStatus to 0 (inactive) in DB for suspended account testing...');
  await db.dbRun("UPDATE api_users SET user_status = 0 WHERE username = 'clientuser126'");

  await runTestCase(
    '5. Suspended Account State (403 Forbidden)',
    {
      username: 'clientuser126',
      password: 'Abcd@1234',
      recaptchaToken: 'xxxxxxxx_recapchaToken-----'
    },
    403,
    (res) => {
      if (res.error !== 'Forbidden') return `Expected 'Forbidden', got '${res.error}'`;
      return null;
    }
  );

  // Restore DB UAT state
  try {
    await db.dbRun("UPDATE api_users SET user_status = 1 WHERE username = 'clientuser126'");
  } catch (err) {
    console.error('[!] Failed to restore database state:', err.message);
  }

  // Cleanup child process and environment files
  if (serverProcess) {
    console.log('\nShutting down UAT test server on port 3001...');
    serverProcess.kill('SIGTERM');
  }

  if (envBackedUp) {
    if (fs.existsSync(envBackupPath)) {
      fs.renameSync(envBackupPath, envPath);
    }
  }

  console.log('================================================================');
  if (allPassed) {
    console.log('       RESULT: ALL TESTS PASSED SUCCESSFULLY! [✓]               ');
    process.exit(0);
  } else {
    console.log('       RESULT: SOME TESTS FAILED. CHECK LOGS ABOVE. [✗]         ');
    process.exit(1);
  }
}

runTests();
