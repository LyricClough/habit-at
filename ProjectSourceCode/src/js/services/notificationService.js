const nodemailer = require('nodemailer');
const twilio = require('twilio');
const db = require('../config/db');

// Initialize Email Transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Initialize Twilio Client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

/**
 * Send an email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content
 * @param {Object} options - Additional options
 * @returns {Promise} - Email send result
 */
async function sendEmail(to, subject, htmlContent, options = {}) {
  try {
    const result = await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: htmlContent,
      ...options
    });
    return { success: true, result };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

/**
 * Send an SMS notification
 * @param {string} to - Recipient phone number
 * @param {string} message - SMS message
 * @returns {Promise} - SMS send result
 */
async function sendSMS(to, message) {
  if (!twilioClient) {
    console.error('Twilio client not initialized');
    return { success: false, error: 'Twilio client not initialized' };
  }

  try {
    // Add +1 country code if not present (for US numbers)
    const formattedTo = to.startsWith('+') ? to : `+1${to}`;
    
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedTo
    });
    return { success: true, result };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return { success: false, error };
  }
}

/**
 * Log a notification in the database
 * @param {Object} params - Log parameters
 */
async function logNotification(params) {
  try {
    const {
      reminder_id,
      user_id,
      habit_id,
      notification_type,
      delivery_method,
      status
    } = params;

    await db.none(
      `INSERT INTO reminder_logs 
       (reminder_id, user_id, habit_id, notification_type, delivery_method, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reminder_id, user_id, habit_id, notification_type, delivery_method, status || 'sent']
    );
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
}

/**
 * Send a reminder to a user based on their preferred delivery method
 * @param {Object} options - Reminder options
 */
async function sendReminder({ user, habit, reminderData, type }) {
  try {
    const { email, phone, user_id } = user;
    const method = reminderData?.notification_method || 'email';
    let emailResult = { success: false };
    let smsResult = { success: false };

    // Build the message based on notification type
    let subject = '';
    let message = '';
    
    if (type === 'habit') {
      subject = `Habit@ Reminder: ${habit.habit_name}`;
      message = `Don't forget to complete your habit: ${habit.habit_name}\n${habit.description || ''}`;
    } else if (type === 'digest') {
      subject = 'Habit@ Daily Digest';
      message = 'Here is your daily summary of habits. Check the app for details!';
    } else if (type === 'report') {
      subject = 'Habit@ Weekly Report';
      message = 'Your weekly habit report is ready. Check the app for details!';
    }

    // Send based on method preference
    if (method === 'email' || method === 'both') {
      if (email) {
        emailResult = await sendEmail(email, subject, generateHtmlContent(type, user, habit));
      }
    }

    if (method === 'sms' || method === 'both') {
      if (phone) {
        smsResult = await sendSMS(phone, message);
      }
    }

    // Log the notification
    await logNotification({
      reminder_id: reminderData?.reminder_id || null,
      user_id,
      habit_id: habit?.habit_id || null,
      notification_type: type,
      delivery_method: method,
      status: (emailResult.success || smsResult.success) ? 'sent' : 'failed'
    });

    return {
      success: emailResult.success || smsResult.success,
      emailResult,
      smsResult
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error };
  }
}

/**
 * Generate HTML content for email notifications
 * @param {string} type - Notification type
 * @param {Object} user - User object
 * @param {Object} habit - Habit object (optional)
 * @returns {string} - HTML content
 */
function generateHtmlContent(type, user, habit = null) {
  const username = user.username;
  
  if (type === 'habit') {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #4F46E5;">Habit Reminder</h1>
        <p>Hello ${username},</p>
        <p>This is a reminder to complete your habit:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h2 style="margin-top: 0; color: #4F46E5;">${habit.habit_name}</h2>
          ${habit.description ? `<p>${habit.description}</p>` : ''}
        </div>
        <p>Keeping up with your habits helps build a better you!</p>
        <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/habits" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Habit@</a></p>
      </div>
    `;
  }
  
  if (type === 'digest') {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #4F46E5;">Your Daily Habit Digest</h1>
        <p>Hello ${username},</p>
        <p>Here's a summary of your habits for today:</p>
        <p>Check the app to see your habit progress and what you need to complete today.</p>
        <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Dashboard</a></p>
      </div>
    `;
  }
  
  if (type === 'report') {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #4F46E5;">Your Weekly Habit Report</h1>
        <p>Hello ${username},</p>
        <p>Your weekly habit report is ready!</p>
        <p>See how you performed this week, check your streaks, and plan for next week.</p>
        <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/statistics" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Statistics</a></p>
      </div>
    `;
  }
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4F46E5;">Habit@ Notification</h1>
      <p>Hello ${username},</p>
      <p>Check your Habit@ app for updates!</p>
    </div>
  `;
}

module.exports = {
  sendEmail,
  sendSMS,
  sendReminder,
  logNotification
}; 