// test-email.js
require('dotenv').config();          // load .env first!
const nodemailer = require('nodemailer');

// **LOG YOUR ENV VARS**
console.log('SMTP HOST:', process.env.SMTP_HOST);
console.log('SMTP PORT:', process.env.SMTP_PORT);
console.log('SMTP USER:', process.env.SMTP_USER);
// (don't log SMTP_PASS in public code, but you can log its length)
console.log('SMTP_PASS length:', process.env.SMTP_PASS?.length);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error('🛑 Verify failed:', err);
  } else {
    console.log('✅ SMTP connection is ready');
  }
  // exit early so we don’t try to send mail yet
  process.exit(err ? 1 : 0);
});

