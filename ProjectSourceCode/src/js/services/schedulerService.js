// src/js/services/schedulerService.js
const cron = require('node-cron');
const db   = require('../config/db');
const notificationService = require('./notificationService');

// store active cron jobs by key
const activeJobs = {};

/**
 * Initialize everything on server boot
 */
async function initializeScheduler() {
  console.log('Initializing reminder scheduler...');
  
  // 1) Habit reminders
  const reminders = await db.any(`
    SELECT hr.*, h.habit_name, h.description, u.email, u.phone, u.user_id, u.username
      FROM habit_reminders hr
      JOIN habits h ON hr.habit_id = h.habit_id
      JOIN users u  ON hr.user_id   = u.user_id
     WHERE hr.enabled = TRUE
  `);
  reminders.forEach(scheduleHabitReminder);
  
  // 2) Daily digests
  const digestUsers = await db.any(`
    SELECT user_id, email, phone, username, digest_time
      FROM users
     WHERE daily_digest = TRUE
  `);
  digestUsers.forEach(addDailyDigestSchedule);
  
  // 3) Weekly reports
  const reportUsers = await db.any(`
    SELECT user_id, email, phone, username, report_day
      FROM users
     WHERE weekly_report = TRUE
  `);
  reportUsers.forEach(addWeeklyReportSchedule);
  
  console.log(`Initialized ${Object.keys(activeJobs).length} scheduled jobs`);
}

/**
 * Habit reminder (unchanged)
 */
function scheduleHabitReminder(reminder) {
  const { reminder_id, reminder_time, days_of_week } = reminder;
  const key   = `habit-${reminder_id}`;
  if (activeJobs[key]) {
    activeJobs[key].stop();
    delete activeJobs[key];
  }
  
  // parse days & time
  const days  = days_of_week.split(',').map(d => d.trim()).join(',');
  const [hh, mm] = reminder_time.split(':').map(Number);
  const expr = `${mm} ${hh} * * ${days}`;
  
  activeJobs[key] = cron.schedule(expr, async () => {
    console.log(`🔔 [${new Date().toLocaleString()}] Firing habit reminder ${reminder_id}`);
    // re-fetch & guard
    const r = await db.oneOrNone(
      `SELECT enabled FROM habit_reminders WHERE reminder_id = $1`, [reminder_id]
    );
    if (r?.enabled) {
      const fresh = await db.one(`
        SELECT hr.*, h.habit_name, h.description, u.email, u.phone, u.user_id, u.username
          FROM habit_reminders hr
          JOIN habits h ON hr.habit_id = h.habit_id
          JOIN users u  ON hr.user_id   = u.user_id
         WHERE hr.reminder_id = $1
      `, [reminder_id]);
      await notificationService.sendReminder({
        user: {
          email:   fresh.email,
          phone:   fresh.phone,
          user_id: fresh.user_id,
          username:fresh.username
        },
        habit: {
          habit_id:   fresh.habit_id,
          habit_name: fresh.habit_name,
          description:fresh.description
        },
        reminderData: fresh,
        type: 'habit'
      });
    }
  }, { timezone: process.env.TZ });
  
  console.log(`Scheduled habit reminder ${reminder_id}: ${expr}`);
}

/**
 * Helpers for habit reminders (create/update/delete)
 */
async function addReminderSchedule(reminder) {
  scheduleHabitReminder(reminder);
}
async function updateReminderSchedule(reminderId) {
  const reminder = await db.oneOrNone(`
    SELECT hr.*, h.habit_name, h.description, u.email, u.phone, u.user_id, u.username
      FROM habit_reminders hr
      JOIN habits h ON hr.habit_id = h.habit_id
      JOIN users u  ON hr.user_id   = u.user_id
     WHERE hr.reminder_id = $1
  `, [reminderId]);
  if (reminder) scheduleHabitReminder(reminder);
  else removeReminderSchedule(reminderId);
}
function removeReminderSchedule(reminderId) {
  const key = `habit-${reminderId}`;
  if (activeJobs[key]) {
    activeJobs[key].stop();
    delete activeJobs[key];
    console.log(`Removed habit reminder ${reminderId}`);
  }
}

/**
 * Daily digest scheduling
 */
function addDailyDigestSchedule(user) {
  const { user_id, digest_time, email, phone, username } = user;
  const key = `digest-${user_id}`;
  if (activeJobs[key]) {
    activeJobs[key].stop();
    delete activeJobs[key];
  }
  const [hh, mm] = digest_time.split(':').map(Number);
  const expr = `${mm} ${hh} * * *`;  // every day at HH:MM
  
  activeJobs[key] = cron.schedule(expr, async () => {
    console.log(`🗒️ [${new Date().toLocaleString()}] Sending daily digest to user ${user_id}`);
    await notificationService.sendReminder({
      user:    { user_id, email, phone, username },
      habit:   null,
      reminderData: null,
      type:    'digest'
    });
  }, { timezone: process.env.TZ });
  
  console.log(`Scheduled daily digest for user ${user_id}: ${expr}`);
}
function removeDailyDigestSchedule(userId) {
  const key = `digest-${userId}`;
  if (activeJobs[key]) {
    activeJobs[key].stop();
    delete activeJobs[key];
    console.log(`Removed daily digest for user ${userId}`);
  }
}

/**
 * Weekly report scheduling
 */
function addWeeklyReportSchedule(user) {
  const { user_id, report_day, email, phone, username } = user;
  const key = `report-${user_id}`;
  if (activeJobs[key]) {
    activeJobs[key].stop();
    delete activeJobs[key];
  }
  // schedule at 08:00 on report_day
  const expr = `0 8 * * ${report_day}`;
  
  activeJobs[key] = cron.schedule(expr, async () => {
    console.log(`📊 [${new Date().toLocaleString()}] Sending weekly report to user ${user_id}`);
    await notificationService.sendReminder({
      user:    { user_id, email, phone, username },
      habit:   null,
      reminderData: null,
      type:    'report'
    });
  }, { timezone: process.env.TZ });
  
  console.log(`Scheduled weekly report for user ${user_id}: ${expr}`);
}
function removeWeeklyReportSchedule(userId) {
  const key = `report-${userId}`;
  if (activeJobs[key]) {
    activeJobs[key].stop();
    delete activeJobs[key];
    console.log(`Removed weekly report for user ${userId}`);
  }
}

/**
 * Shut everything down (for tests, etc.)
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
  addDailyDigestSchedule,
  removeDailyDigestSchedule,
  addWeeklyReportSchedule,
  removeWeeklyReportSchedule,
  stopAllJobs
};
