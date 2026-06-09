// lib/mailer.js — OTP email sender

const nodemailer = require('nodemailer');

async function sendOTPEmail(email, code, type) {
  // Always print to terminal — useful for local testing
  console.log(`\n📧  OTP for ${email} [${type}]: ${code}\n`);

  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASS || '';

  // Skip sending if Gmail credentials are not configured yet
  if (!user || !pass || user.includes('your_gmail') || pass.includes('your_16_char')) {
    console.log('   ⚠  Gmail not configured — code shown above. Add EMAIL_USER + EMAIL_PASS to .env to send real emails.\n');
    return;
  }

  const isReset = type === 'reset';
  const subject = isReset ? 'Reset your PetVerse password' : 'Your PetVerse verification code';
  const action  = isReset ? 'reset your password' : 'verify your email';

  const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  try {
    await mailer.sendMail({
      from:    `"PetVerse 🐾" <${user}>`,
      to:      email,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:16px;">
          <h2 style="color:#7C3AED;margin-bottom:4px;">🐾 PetVerse</h2>
          <p style="color:#444;">Here is your code to <strong>${action}</strong>:</p>
          <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#7C3AED;text-align:center;padding:28px;background:white;border-radius:12px;margin:24px 0;">
            ${code}
          </div>
          <p style="color:#888;font-size:13px;">⏱ This code expires in 10 minutes.</p>
          <p style="color:#888;font-size:13px;">If you didn't request this, just ignore this email.</p>
        </div>
      `
    });
    console.log(`   ✅ Email sent to ${email}\n`);
  } catch (err) {
    console.log(`   ❌ Gmail send failed: ${err.message}`);
    console.log('   Use the code shown above from the terminal.\n');
    throw new Error('Failed to send email. Check your EMAIL_USER and EMAIL_PASS in .env.');
  }
}

module.exports = { sendOTPEmail };
