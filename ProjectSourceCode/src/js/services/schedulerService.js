const cron = require('node-cron');
const db = require('../config/db');
const notificationService = require('./notificationService');

// Store active cron jobs for management
const activeJobs = {};

/**
 * Initialize reminder schedules for the application
 */
async function initializeScheduler() {
  console.log('Initializing reminder scheduler...');
  
  // Schedule system jobs
  scheduleDailyDigests();
  scheduleWeeklyReports();
  
  // Schedule all active habit reminders
  const reminders = await db.any(`
    SELECT hr.*, h.habit_name, h.description, u.email, u.phone, u.user_id, u.username
    FROM habit_reminders hr
    JOIN habits h ON hr.habit_id = h.habit_id
    JOIN users u ON hr.user_id = u.user_id
    WHERE hr.enabled = true
  `);
  
  reminders.forEach(reminder => {
    scheduleHabitReminder(reminder);
  });
  
  console.log(`Initialized ${Object.keys(activeJobs).length} reminder jobs`);
}

/**
 * Schedule daily digest emails for all users who have them enabled
 */
function scheduleDailyDigests() {
  // Run every hour to check for digests that should be sent
  activeJobs['daily-digest-check'] = cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Find users who should receive digests at this hour
      const users = await db.any(`
        SELECT * FROM users 
        WHERE daily_digest = true 
        AND extract(hour from digest_time) = $1
      `, [currentHour]);
      
      console.log(`Sending daily digests to ${users.length} users`);
      
      // For each user, check if we've already sent a digest today
      for (const user of users) {
        const alreadySent = await db.oneOrNone(`
          SELECT * FROM reminder_logs
          WHERE user_id = $1 
          AND notification_type = 'digest'
          AND sent_at >= $2::date
          AND sent_at < ($2::date + '1 day'::interval)
        `, [user.user_id, now.toISOString().split('T')[0]]);
        
        if (!alreadySent) {
          // Get today's habits for the digest content
          const habitCount = await db.one(`
            SELECT COUNT(*) FROM habits h
            JOIN users_to_habits uh ON h.habit_id = uh.habit_id
            WHERE uh.user_id = $1 AND h.weekday = $2
          `, [user.user_id, now.getDay()]);
          
          // Send the digest
          const method = user.phone_notif && user.email_notif ? 'both' : 
                         user.phone_notif ? 'sms' : 'email';
          
          await notificationService.sendReminder({
            user,
            habit: { habit_count: habitCount.count },
            reminderData: { notification_method: method },
            type: 'digest'
          });
        }
      }
    } catch (error) {
      console.error('Error sending daily digests:', error);
    }
  });
}

/**
 * Schedule weekly reports for all users who have them enabled
 */
function scheduleWeeklyReports() {
  // Run at 8am every day to check for weekly reports
  activeJobs['weekly-report-check'] = cron.schedule('0 8 * * *', async () => {
    try {
      const now = new Date();
      const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Find users who should receive weekly reports on this day of the week
      const users = await db.any(`
        SELECT * FROM users 
        WHERE weekly_report = true 
        AND report_day = $1
      `, [currentDayOfWeek]);
      
      console.log(`Sending weekly reports to ${users.length} users`);
      
      // For each user, send the weekly report
      for (const user of users) {
        // Make sure we haven't already sent a report today
        const alreadySent = await db.oneOrNone(`
          SELECT * FROM reminder_logs
          WHERE user_id = $1 
          AND notification_type = 'report'
          AND sent_at >= $2::date
          AND sent_at < ($2::date + '1 day'::interval)
        `, [user.user_id, now.toISOString().split('T')[0]]);
        
        if (!alreadySent) {
          // Get user stats for the report content
          const stats = await db.oneOrNone(`
            SELECT * FROM streaks
            WHERE user_id = $1
          `, [user.user_id]);
          
          // Send the report
          const method = user.phone_notif && user.email_notif ? 'both' : 
                         user.phone_notif ? 'sms' : 'email';
          
          await notificationService.sendReminder({
            user,
            habit: { streak: stats?.current_streak || 0 },
            reminderData: { notification_method: method },
            type: 'report'
          });
        }
      }
    } catch (error) {
      console.error('Error sending weekly reports:', error);
    }
  });
}

/**
 * Schedule a specific habit reminder
 * @param {Object} reminder - The reminder object from the database
 */
function scheduleHabitReminder(reminder) {
  try {
    const { reminder_id, reminder_time, days_of_week } = reminder;
    const jobKey = `habit-reminder-${reminder_id}`;
    
    // Clean up any existing job for this reminder
    if (activeJobs[jobKey]) {
      activeJobs[jobKey].stop();
      delete activeJobs[jobKey];
    }
    
    // Parse days of week from the database string (comma-separated list)
    const days = days_of_week.split(',').map(day => parseInt(day.trim()));
    
    // Parse time from the database
    const [hours, minutes] = reminder_time.split(':').map(Number);
    
    // Create cron pattern: minutes hours * * dayOfWeek
    // dayOfWeek is 0-6 (Sun-Sat)
    const cronDays = days.join(',');
    const cronPattern = `${minutes} ${hours} * * ${cronDays}`;
    
    // Create the cron job
    activeJobs[jobKey] = cron.schedule(cronPattern, async () => {
      try {
        // Check if this reminder is still enabled
        const active = await db.oneOrNone(`
          SELECT enabled FROM habit_reminders WHERE reminder_id = $1
        `, [reminder_id]);
        
        if (!active || !active.enabled) {
          // Reminder has been disabled, clean up
          activeJobs[jobKey].stop();
          delete activeJobs[jobKey];
          return;
        }
        
        // Get fresh data for the reminder
        const reminderData = await db.oneOrNone(`
          SELECT hr.*, h.habit_name, h.description, u.email, u.phone, u.user_id, u.username
          FROM habit_reminders hr
          JOIN habits h ON hr.habit_id = h.habit_id
          JOIN users u ON hr.user_id = u.user_id
          WHERE hr.reminder_id = $1
        `, [reminder_id]);
        
        if (reminderData) {
          // Send the reminder
          await notificationService.sendReminder({
            user: {
              email: reminderData.email,
              phone: reminderData.phone,
              user_id: reminderData.user_id,
              username: reminderData.username
            },
            habit: {
              habit_id: reminderData.habit_id,
              habit_name: reminderData.habit_name,
              description: reminderData.description
            },
            reminderData,
            type: 'habit',
            timezone: process.env.TZ  // 'America/Denver'
          });
        }
        
      } catch (error) {
        console.error(`Error executing reminder job ${jobKey}:`, error);
      }
    });
    
    console.log(`Scheduled reminder ${reminder_id} with pattern: ${cronPattern}`);
  } catch (error) {
    console.error(`Error scheduling reminder ${reminder.reminder_id}:`, error);
  }
}

/**
 * Add a new reminder schedule
 * @param {Object} reminder - The reminder object to schedule
 */
async function addReminderSchedule(reminder) {
  // Schedule the new reminder
  scheduleHabitReminder(reminder);
}

/**
 * Update an existing reminder schedule
 * @param {number} reminderId - The ID of the reminder to update
 */
async function updateReminderSchedule(reminderId) {
  try {
    // Get the updated reminder data
    const reminder = await db.oneOrNone(`
      SELECT hr.*, h.habit_name, h.description, u.email, u.phone, u.user_id, u.username
      FROM habit_reminders hr
      JOIN habits h ON hr.habit_id = h.habit_id
      JOIN users u ON hr.user_id = u.user_id
      WHERE hr.reminder_id = $1
    `, [reminderId]);
    
    if (reminder) {
      // Re-schedule with the new settings
      scheduleHabitReminder(reminder);
    } else {
      // Reminder no longer exists, clean up any existing job
      const jobKey = `habit-reminder-${reminderId}`;
      if (activeJobs[jobKey]) {
        activeJobs[jobKey].stop();
        delete activeJobs[jobKey];
      }
    }
  } catch (error) {
    console.error(`Error updating reminder schedule ${reminderId}:`, error);
  }
}

/**
 * Remove a reminder schedule
 * @param {number} reminderId - The ID of the reminder to remove
 */
function removeReminderSchedule(reminderId) {
  const jobKey = `habit-reminder-${reminderId}`;
  if (activeJobs[jobKey]) {
    activeJobs[jobKey].stop();
    delete activeJobs[jobKey];
    console.log(`Removed schedule for reminder ${reminderId}`);
  }
}

/**
 * Stop all scheduler jobs
 */
function stopAllJobs() {
  Object.keys(activeJobs).forEach(key => {
    activeJobs[key].stop();
    delete activeJobs[key];
  });
  console.log('All scheduler jobs stopped');
}

module.exports = {
  initializeScheduler,
  addReminderSchedule,
  updateReminderSchedule,
  removeReminderSchedule,
  stopAllJobs
}; 