// lib/mailer.js — email (OTP) sender

const nodemailer = require('nodemailer');

const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOTPEmail(email, code, type) {
  const isReset = type === 'reset';
  const subject = isReset ? 'Reset your PetVerse password' : 'Your PetVerse verification code';
  const action  = isReset ? 'reset your password' : 'verify your email';

  // Always print to terminal so you can test without real email setup
  console.log(`\n📧 OTP for ${email} (${type}): ${code}\n`);

  const user = process.env.EMAIL_USER || '';
  if (!user || user.includes('your_gmail')) return;

  try {
    await mailer.sendMail({
      from: `"PetVerse 🐾" <${user}>`,
      to:   email,
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
    console.log(`   ✅ Email sent to ${email}`);
  } catch (err) {
    console.log(`   ⚠  Email send failed: ${err.message}`);
    console.log('   Use the code above from the terminal instead.\n');
  }
}

module.exports = { sendOTPEmail };
