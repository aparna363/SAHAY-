const nodemailer = require('nodemailer');

// Official Admin Email
const ADMIN_EMAIL = process.env.EMAIL_USER || 'sahayapp26@gmail.com';
const ADMIN_PASS = process.env.EMAIL_PASS || '';

// Create Nodemailer Transporter
const createTransporter = () => {
  if (ADMIN_PASS && ADMIN_PASS.trim()) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: ADMIN_EMAIL,
        pass: ADMIN_PASS.trim(),
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return null;
};

/**
 * Send Welcome Email to newly appointed District Collector with login credentials
 */
async function sendCollectorCredentialsEmail({ recipientEmail, recipientName, district, password }) {
  const portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const mailSubject = `[SAHAY Disaster Management Portal] Official Appointment as District Collector (${district})`;

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
      
      <!-- Header Banner -->
      <div style="background-color: #0f172a; padding: 24px; border-radius: 12px; text-align: center;">
        <h1 style="color: #10b981; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">SAHAY KERALA</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Official State Disaster Preparedness & Emergency Portal</p>
      </div>

      <!-- Content Body -->
      <div style="padding: 24px 16px; color: #1e293b;">
        <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Official Appointment Notification</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Dear <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          You have been officially appointed as the <strong>District Collector & Magistrate</strong> for <strong>${district} District</strong> on the SAHAY Emergency Platform.
        </p>

        <!-- Credentials Card -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #166534; font-size: 15px; margin: 0 0 12px 0;">🔑 Your Official Access Credentials:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #475569; width: 140px;"><strong>Official Email:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: bold;">${recipientEmail}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #475569;"><strong>Temporary Password:</strong></td>
              <td style="padding: 6px 0; color: #059669; font-family: monospace; font-weight: bold; font-size: 16px;">${password}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #475569;"><strong>Official Role:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">District Collector (${district})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #475569;"><strong>Sent From:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">${ADMIN_EMAIL}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          Please sign in to the SAHAY Official Portal using the link below:
        </p>

        <!-- Button -->
        <div style="text-align: center; margin: 25px 0;">
          <a href="${portalUrl}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Sign In to SAHAY Official Portal →
          </a>
        </div>

        <p style="font-size: 12px; color: #ef4444; margin-top: 20px;">
          ⚠️ <strong>Security Notice:</strong> Please change your temporary password immediately upon your first successful login.
        </p>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0;">Sent by Platform System Administrator (${ADMIN_EMAIL})</p>
        <p style="margin: 4px 0 0 0;">SAHAY State Disaster Management Authority &bull; Government of Kerala</p>
      </div>
    </div>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    console.log(`\n=======================================================`);
    console.log(`✉️ [APPOINTMENT EMAIL DISPATCH]`);
    console.log(`From: SAHAY Platform Admin <${ADMIN_EMAIL}>`);
    console.log(`To: ${recipientEmail}`);
    console.log(`Subject: ${mailSubject}`);
    console.log(`Recipient: ${recipientName} (${district})`);
    console.log(`Login Password: ${password}`);
    console.log(`=======================================================\n`);
    return { sent: true, mode: 'logged', message: 'Credentials logged to system console.' };
  }

  const textBody = `
SAHAY KERALA - Official Appointment Notification

Dear ${recipientName},

You have been officially appointed as District Collector & Magistrate for ${district} District on the SAHAY Emergency Platform.

Your Access Credentials:
- Official Email: ${recipientEmail}
- Temporary Password: ${password}
- Official Role: District Collector (${district})
- Sent From: ${ADMIN_EMAIL}

Sign in to the SAHAY Portal: ${portalUrl}

Security Notice: Please change your temporary password immediately upon your first successful login.

SAHAY State Disaster Management Authority • Government of Kerala
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"SAHAY Platform Admin" <${ADMIN_EMAIL}>`,
      to: recipientEmail,
      subject: mailSubject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`✅ Appointment email sent to ${recipientEmail} from ${ADMIN_EMAIL}: ${info.messageId}`);
    return { sent: true, mode: 'smtp', messageId: info.messageId };
  } catch (err) {
    console.error(`⚠️ Failed to send email via SMTP to ${recipientEmail}:`, err.message);
    return { sent: false, mode: 'failed', error: err.message };
  }
}

/**
 * Send Password Reset Link Email to User via Nodemailer
 */
async function sendPasswordResetEmail({ recipientEmail, recipientName, resetLink }) {
  const mailSubject = `[SAHAY Disaster Management Portal] Password Reset Request`;

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
      <!-- Header Banner -->
      <div style="background-color: #0f172a; padding: 24px; border-radius: 12px; text-align: center;">
        <h1 style="color: #10b981; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">SAHAY KERALA</h1>
        <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Emergency Response & Relief Portal</p>
      </div>

      <!-- Content Body -->
      <div style="padding: 24px 16px; color: #1e293b;">
        <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Password Reset Request</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Hello <strong>${recipientName || 'Valued User'}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          We received a request to reset your password for your SAHAY Emergency Portal account associated with <strong>${recipientEmail}</strong>.
        </p>

        <!-- Button -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
            Reset My Password →
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          If the button above does not work, copy and paste this link into your web browser:
        </p>
        <p style="font-size: 12px; color: #059669; word-break: break-all; font-family: monospace; background-color: #f0fdf4; padding: 10px; border-radius: 8px; border: 1px solid #bbf7d0;">
          ${resetLink}
        </p>

        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
          If you did not request a password reset, you can safely ignore this email. Your account password will remain unchanged.
        </p>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0;">SAHAY Disaster Management Authority &bull; Government of Kerala</p>
      </div>
    </div>
  `;

  const textBody = `
SAHAY KERALA - Password Reset Request

Hello ${recipientName || 'Valued User'},

We received a request to reset your password for your SAHAY Emergency Portal account.

Click the link below to reset your password:
${resetLink}

If you did not request a password reset, please ignore this message.
  `.trim();

  const transporter = createTransporter();

  if (!transporter) {
    console.log(`✉️ [SIMULATED RESET EMAIL] To: ${recipientEmail} | Link: ${resetLink}`);
    return { sent: false, mode: 'logged', message: 'No SMTP password configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"SAHAY Emergency Portal" <${ADMIN_EMAIL}>`,
      to: recipientEmail,
      subject: mailSubject,
      text: textBody,
      html: htmlBody,
    });
    console.log(`✅ Password reset email sent to ${recipientEmail} from ${ADMIN_EMAIL}: ${info.messageId}`);
    return { sent: true, mode: 'smtp', messageId: info.messageId };
  } catch (err) {
    console.error(`⚠️ Failed to send password reset email via SMTP to ${recipientEmail}:`, err.message);
    return { sent: false, mode: 'failed', error: err.message };
  }
}

module.exports = {
  sendCollectorCredentialsEmail,
  sendPasswordResetEmail,
  ADMIN_EMAIL,
};
