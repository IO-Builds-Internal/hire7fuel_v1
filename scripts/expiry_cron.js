const nodemailer = require('nodemailer');
const db = require('../database/db');

const { dbRun, dbGet, dbAll } = db;

/**
 * Send warning email helper
 */
async function sendExpiryEmail(smtpSettings, companyName, entityName, fieldLabel, expiryDate, daysLeft) {
  if (smtpSettings.enabled !== 'true') {
    console.log(`[Email Simulation] SMTP disabled. Warning: ${fieldLabel} for ${entityName} (${companyName}) expires in ${daysLeft} days (${expiryDate}).`);
    return true;
  }

  const transporter = nodemailer.createTransport({
    host: smtpSettings.host,
    port: parseInt(smtpSettings.port, 10),
    secure: parseInt(smtpSettings.port, 10) === 465,
    auth: smtpSettings.user && smtpSettings.pass ? {
      user: smtpSettings.user,
      pass: smtpSettings.pass
    } : undefined,
    timeout: 8000
  });

  const subject = `⚠️ HIRE7 FUEL — ${fieldLabel} for ${entityName} expires in ${daysLeft} days`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #14a077; border-radius: 8px; padding: 2rem; color: #2d3748; background-color: #ffffff;">
      <h2 style="color: #14a077; border-bottom: 1px solid rgba(20, 160, 119, 0.2); padding-bottom: 0.5rem; margin-top: 0;">HIRE7 FUEL — Safety Compliance Warning</h2>
      <p>This is an automated safety alert regarding your fleet compliance documents.</p>
      
      <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 1.25rem; margin: 1.5rem 0; color: #92400E;">
        <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">Upcoming Expiry Notification:</h4>
        <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.95rem; line-height: 1.6;">
          <li><strong>Carrier:</strong> ${companyName}</li>
          <li><strong>Entity:</strong> ${entityName}</li>
          <li><strong>Document/Field:</strong> ${fieldLabel}</li>
          <li><strong>Expiration Date:</strong> ${expiryDate}</li>
          <li><strong>Time Remaining:</strong> <strong style="font-size: 1.05rem;">${daysLeft} days</strong></li>
        </ul>
      </div>

      <p>Please log in to the HIRE7 FUEL Carrier Portal to update this document and ensure your fleet operations remain active and compliant.</p>
      <a href="${process.env.APP_URL || 'http://localhost:3000'}/portal/compliance" style="display: inline-block; background-color: #14a077; color: #ffffff; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 4px; font-weight: bold; margin: 1rem 0;">Go to Carrier Portal</a>
      
      <p style="font-size: 0.8rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 1.5rem;">
        This email was sent automatically. Expiry scanner timestamp: ${new Date().toLocaleString()}
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: smtpSettings.from,
      to: smtpSettings.to, // Alerts are sent to the central admin/safety inbox
      subject: subject,
      html: html
    });
    console.log(`[SMTP Email Sent] Successfully notified about ${fieldLabel} for ${entityName}`);
    return true;
  } catch (err) {
    console.error(`[SMTP Email Failed] Error dispatching alert for ${fieldLabel} on ${entityName}:`, err.message);
    return false;
  }
}

/**
 * Main Run Loop for Compliance Scan
 */
async function run() {
  console.log('[Expiry scan started]');
  const settings = await db.getSettings();
  const smtp = settings.smtp;

  const today = new Date();
  today.setHours(0,0,0,0);

  // Helper to process a specific expiry field
  async function processExpiry(carrierId, companyName, entityType, entityId, entityName, fieldLabel, expiryDate) {
    if (!expiryDate || expiryDate.toUpperCase() === 'N/A') return;
    
    const expDate = new Date(expiryDate + 'T00:00:00');
    if (isNaN(expDate.getTime())) return;

    const diff = expDate - today;
    const daysLeft = Math.ceil(diff / 86400000);

    // We only send alerts for 30, 14, and 7 days left
    if (daysLeft !== 30 && daysLeft !== 14 && daysLeft !== 7) return;

    // Check if reminder was already sent
    let reminder = await dbGet(`
      SELECT * FROM expiry_reminders
      WHERE carrier_id = ? AND entity_type = ? AND entity_id = ? AND field_label = ? AND expiry_date = ?
    `, [carrierId, entityType, entityId, fieldLabel, expiryDate]);

    if (!reminder) {
      await dbRun(`
        INSERT INTO expiry_reminders (carrier_id, entity_type, entity_id, field_label, expiry_date)
        VALUES (?, ?, ?, ?, ?)
      `, [carrierId, entityType, entityId, fieldLabel, expiryDate]);
      
      reminder = await dbGet(`
        SELECT * FROM expiry_reminders
        WHERE carrier_id = ? AND entity_type = ? AND entity_id = ? AND field_label = ? AND expiry_date = ?
      `, [carrierId, entityType, entityId, fieldLabel, expiryDate]);
    }

    let shouldSend = false;
    let updateField = '';

    if (daysLeft === 30 && !reminder.reminder_sent_30) {
      shouldSend = true;
      updateField = 'reminder_sent_30';
    } else if (daysLeft === 14 && !reminder.reminder_sent_14) {
      shouldSend = true;
      updateField = 'reminder_sent_14';
    } else if (daysLeft === 7 && !reminder.reminder_sent_7) {
      shouldSend = true;
      updateField = 'reminder_sent_7';
    }

    if (shouldSend) {
      const sent = await sendExpiryEmail(smtp, companyName, entityName, fieldLabel, expiryDate, daysLeft);
      if (sent) {
        await dbRun(`
          UPDATE expiry_reminders
          SET ${updateField} = 1, last_sent_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [reminder.id]);
      }
    }
  }

  // 1. Scan Carrier Profiles
  const profiles = await dbAll(`
    SELECT cp.*, c.company_name
    FROM carrier_profiles cp
    JOIN carriers c ON cp.carrier_id = c.id
    WHERE c.status = 'active'
  `);

  for (const p of profiles) {
    const fields = [
      { label: 'CVOR Certificate', value: p.cvor_expiry },
      { label: 'Carrier Code', value: p.carrier_code_expiry },
      { label: 'SCAC Code', value: p.scac_expiry },
      { label: 'Canadian Bond', value: p.cdn_bond_expiry },
      { label: 'US Bond', value: p.usd_bond_expiry },
      { label: 'IFTA License', value: p.ifta_expiry }
    ];
    for (const f of fields) {
      await processExpiry(p.carrier_id, p.company_name, 'company', p.id, 'Company Profile', f.label, f.value);
    }
  }

  // 2. Scan Drivers
  const drivers = await dbAll(`
    SELECT d.*, c.company_name
    FROM drivers d
    JOIN carriers c ON d.carrier_id = c.id
    WHERE d.status = 'active' AND c.status = 'active'
  `);

  for (const d of drivers) {
    const name = `${d.first_name} ${d.last_name}`;
    const fields = [
      { label: 'Driver License', value: d.dl_expiry },
      { label: 'WCB Registration', value: d.wcb_expiry },
      { label: 'Passport Copy', value: d.passport_expiry },
      { label: 'FAST Card copy', value: d.fast_card_expiry },
      { label: 'CDRP Copy', value: d.cdrp_expiry },
      { label: 'Work Visa Copy', value: d.visa_expiry },
      { label: 'Medical Certificate Review', value: d.medical_due_date }
    ];
    for (const f of fields) {
      await processExpiry(d.carrier_id, d.company_name, 'driver', d.id, `Driver: ${name}`, f.label, f.value);
    }
  }

  // 3. Scan Trucks
  const trucks = await dbAll(`
    SELECT t.*, c.company_name
    FROM trucks t
    JOIN carriers c ON t.carrier_id = c.id
    WHERE t.status = 'active' AND c.status = 'active'
  `);

  for (const t of trucks) {
    const label = `Truck #${t.unit_number}`;
    const fields = [
      { label: 'Annual Safety Certificate', value: t.annual_safety_expiry },
      { label: 'PMVI Inspection Due', value: t.pmvi_next_date },
      { label: 'Oil Change Service Due', value: t.oil_change_next }
    ];
    for (const f of fields) {
      await processExpiry(t.carrier_id, t.company_name, 'truck', t.id, label, f.label, f.value);
    }

    // Active Plate
    const plate = await dbGet("SELECT * FROM truck_plates WHERE truck_id = ? AND status = 'active'", [t.id]);
    if (plate) {
      await processExpiry(t.carrier_id, t.company_name, 'truck_plate', plate.id, `Truck Plate: ${plate.plate_number} (Unit #${t.unit_number})`, 'Plate Registration Expiry', plate.expiry);
    }
  }

  // 4. Scan Trailers
  const trailers = await dbAll(`
    SELECT tr.*, c.company_name
    FROM trailers tr
    JOIN carriers c ON tr.carrier_id = c.id
    WHERE tr.status = 'active' AND c.status = 'active'
  `);

  for (const tr of trailers) {
    const label = `Trailer #${tr.unit_number}`;
    const fields = [
      { label: 'Annual Safety Certificate', value: tr.annual_safety_expiry },
      { label: 'PMVI Inspection Due', value: tr.pmvi_next_date }
    ];
    for (const f of fields) {
      await processExpiry(tr.carrier_id, tr.company_name, 'trailer', tr.id, label, f.label, f.value);
    }
  }

  console.log('[Expiry scan completed]');
}

module.exports = { run };
