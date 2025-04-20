// src/services/mailer.js

// 1. Load Nodemailer, the core library for sending SMTP e‑mails in Node.
const nodemailer = require('nodemailer');

// 2. Create a reusable “transporter” object using SMTP settings from environment variables.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,                // Mail server hostname (e.g. smtp.mailgun.org)
  port: Number(process.env.SMTP_PORT),        // Mail server port (e.g. 587 or 465)
  secure: Number(process.env.SMTP_PORT) === 465, // true if using SSL (port 465), false otherwise
  auth: {
    user: process.env.SMTP_USER,              // SMTP username (e.g. postmaster@…)
    pass: process.env.SMTP_PASS,              // SMTP password/API key
  },
});

// 3. sendMail: a small helper that wraps transporter.sendMail.
//    Accepts an options object { to, subject, html } and injects the global "from".
async function sendMail(opts) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM, // Verified sender address ("Habit@ <no‑reply@habitat.app>")
    ...opts,                      // Merge in: to (recipient), subject, html/text body, etc.
  });
}

// 4. Export the helper so other parts of your app can `const { sendMail } = require(...)`.
module.exports = { sendMail };
