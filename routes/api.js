const express = require('express');
const router = express.Router();
const db = require('../database/db');

/**
 * POST /api/v1/authorize
 * Main authentication gateway for the KSG Fuel platform.
 * Verifies system user credentials and Google reCAPTCHA v2/v3 token.
 */
router.post('/authorize', async (req, res) => {
  const { username, password, recaptchaToken } = req.body;

  // 1. Schema Validation (400 Bad Request if missing fields)
  if (!username || !password || !recaptchaToken) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Payload missing required variables. Ensure username, password, and recaptchaToken are provided.'
    });
  }

  // 2. Google reCAPTCHA Verification
  let recaptchaValid = false;

  // Security: Allow a configurable test bypass token, but ONLY outside of production.
  // Set RECAPTCHA_TEST_TOKEN in your .env for UAT/integration testing.
  // This code path is completely blocked when NODE_ENV === 'production'.
  const isProduction = process.env.NODE_ENV === 'production';
  const testBypassToken = process.env.RECAPTCHA_TEST_TOKEN;
  if (!isProduction && testBypassToken && recaptchaToken === testBypassToken) {
    recaptchaValid = true;
  } else {
    try {
      const verifyUrl = process.env.RECAPTCHA_VERIFY_URL || 'https://www.google.com/recaptcha/api/siteverify';
      const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFzsIMzOkihI2';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: recaptchaToken
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Google verify server responded with status: ${response.status}`);
      }

      const data = await response.json();
      recaptchaValid = !!data.success;
    } catch (err) {
      console.error('reCAPTCHA siteverify downstream failure:', err);
      // HTTP 500 error on Google verification server timeout/failures
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Google Verification Server Timeout'
      });
    }
  }

  if (!recaptchaValid) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Password or reCAPTCHA Validation Fail'
    });
  }

  // 3. Database Credentials Verification
  try {
    const user = await db.dbGet("SELECT * FROM api_users WHERE username = ?", [username]);

    if (!user || !db.verifyPassword(password, user.password)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Password or reCAPTCHA Validation Fail'
      });
    }

    // 4. Account Suspended Check (403 Forbidden)
    // userStatus and clientActive must both be truthy (e.g. 1 in SQLite)
    const isUserActive = Boolean(user.user_status);
    const isClientActive = Boolean(user.client_active);

    if (!isUserActive || !isClientActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Profile Account Suspended State'
      });
    }

    // 5. Success Response Creation matching response field dictionary
    const successResponse = {
      userName: user.username,
      emailId: user.email_id,
      password: null, // Always null per password isolation guidelines
      address: user.address || null,
      apiToken: user.api_token || null,
      role: user.role,
      updatedAt: user.updated_at ? new Date(user.updated_at).toISOString() : new Date().toISOString(),
      clientID: user.client_id,
      userStatus: isUserActive,
      phoneNo: user.phone_no,
      name: user.name,
      resetToken: user.reset_token || null,
      resetTokenExpiry: user.reset_token_expiry || null,
      currency: user.currency || null,
      brokerID: user.broker_id || null,
      clientActive: isClientActive
    };

    return res.status(200).json(successResponse);

  } catch (err) {
    console.error('Database query failed in authorization:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An internal error occurred during profile compilation.'
    });
  }
});

module.exports = router;
