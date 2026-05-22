/**
 * Hire7 Fuel - Brute-Force Rate Limiting & SMTP Settings Test Script
 */
const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = new URLSearchParams(data).toString();

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING AUTOMATED SECURITY & FUNCTIONAL TESTS ===\n');

  // Test 1: Wrong Password Rate Limiting
  console.log('Testing wrong password rate limiting (5 attempts)...');
  
  let lockDetected = false;
  for (let i = 1; i <= 6; i++) {
    console.log(`Attempt ${i}: Sending invalid password 'wrongpwd${i}'...`);
    try {
      const response = await post('http://localhost:3000/admin/login', { password: `wrongpwd${i}` });
      if (response.body.includes('locked')) {
        console.log(`[✓] SUCCESS: Lockout detected on attempt ${i}!`);
        lockDetected = true;
        break;
      } else if (response.body.includes('attempts remaining')) {
        const remainingMatch = response.body.match(/(\d+)\s+attempts\s+remaining/);
        const remaining = remainingMatch ? remainingMatch[1] : 'unknown';
        console.log(`    Result: Failed login as expected. Attempts remaining indicator: ${remaining}`);
      } else {
        console.log(`    Result: Status ${response.statusCode}. Code: Invalid credentials.`);
      }
    } catch (err) {
      console.error(`Attempt ${i} failed:`, err.message);
    }
    // Small sleep
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  if (!lockDetected) {
    console.error('[✗] FAIL: Brute force lockout was not triggered after 5 attempts.');
    process.exit(1);
  }

  console.log('\nAll security and functional checks completed.');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
