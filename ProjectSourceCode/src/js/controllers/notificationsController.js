const db = require('../config/db');
const schedulerService = require('../services/schedulerService');

/**
 * Show the notifications settings page
 */
exports.showNotificationsSettings = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    
    // Get user notification preferences
    const user = await db.one('SELECT * FROM users WHERE user_id = $1', [userId]);
    
    // Get the user's habits for per-habit reminder settings
    const habits = await db.any(`
      SELECT h.*, uh.user_id 
      FROM habits h
      JOIN users_to_habits uh ON h.habit_id = uh.habit_id
      WHERE uh.user_id = $1
      ORDER BY h.habit_name ASC
    `, [userId]);
    
    // Get existing reminders for the user's habits
    const reminders = await db.any(`
      SELECT * FROM habit_reminders
      WHERE user_id = $1
    `, [userId]);
    
    // Match reminders to habits
    const habitsWithReminders = habits.map(habit => {
      const habitReminder = reminders.find(r => r.habit_id === habit.habit_id);
      return {
        ...habit,
        hasReminder: !!habitReminder,
        reminder: habitReminder
      };
    });
    
    res.render('pages/notifications', {
      user: req.session.user,
      hideNav: false,
      preferences: user,
      habits: habitsWithReminders,
      // Format time for display in form
      digestTime: user.digest_time ? 
        new Date(`2000-01-01T${user.digest_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
        '08:00',
      // For weekly report day select
      reportDay: user.report_day || 0,
      dayNames: [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday'
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

/**
 * Update global notification preferences
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const {
      daily_digest,
      weekly_report,
      digest_time,
      report_day,
      email_notif,
      phone_notif
    } = req.body;
    
    // Convert time input (HH:MM) to DB format
    let formattedDigestTime = null;
    if (digest_time) {
      // Convert time input (which could be 12hr format) to 24hr format for PostgreSQL
      const [hours, minutes] = digest_time.split(':');
      formattedDigestTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
    }
    
    // Update user preferences
    await db.none(`
      UPDATE users
      SET email_notif = $1,
          phone_notif = $2,
          daily_digest = $3,
          weekly_report = $4,
          digest_time = $5,
          report_day = $6
      WHERE user_id = $7
    `, [
      !!email_notif,
      !!phone_notif,
      !!daily_digest,
      !!weekly_report,
      formattedDigestTime,
      report_day || 0,
      userId
    ]);
    
    // Update session data
    req.session.user.email_notif = !!email_notif;
    req.session.user.phone_notif = !!phone_notif;
    
    res.redirect('/notifications?success=Preferences updated successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/notifications?error=Failed to update preferences');
  }
};

/**
 * Create or update a habit reminder
 */
// src/js/controllers/notificationsController.js

exports.updateHabitReminder = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { 
      habit_id, 
      reminder_time,   // comes in as "HH:MM" or "HH:MM:SS"
      days_of_week,    // string or array of strings
      notification_method,
      enabled
    } = req.body;
    
    // 1) Normalize reminder_time to "HH:MM:SS"
    let formattedTime;
    // if format is "14:25"
    if (/^\d{1,2}:\d{2}$/.test(reminder_time)) {
      const [hh, mm] = reminder_time.split(':');
      formattedTime = `${hh.padStart(2,'0')}:${mm}:00`;
    }
    // if format is already "14:25:00"
    else if (/^\d{1,2}:\d{2}:\d{2}$/.test(reminder_time)) {
      formattedTime = reminder_time;
    }
    // fallback: take first 8 characters
    else {
      formattedTime = reminder_time.slice(0, 8);
    }
    
    // 2) Check if a reminder exists for this user & habit
    const existingReminder = await db.oneOrNone(
      `SELECT * 
         FROM habit_reminders 
        WHERE habit_id = $1 
          AND user_id  = $2`,
      [habit_id, userId]
    );
    
    // 3) Normalize days_of_week into comma-separated string
    const daysArray  = Array.isArray(days_of_week) ? days_of_week : [days_of_week];
    const daysString = daysArray.join(',');
    
    if (existingReminder) {
      // 4a) Update the existing reminder
      await db.none(
        `UPDATE habit_reminders
            SET reminder_time       = $1,
                days_of_week        = $2,
                notification_method = $3,
                enabled             = $4
          WHERE reminder_id = $5`,
        [
          formattedTime,
          daysString,
          notification_method,
          !!enabled,
          existingReminder.reminder_id
        ]
      );
      
      // 5a) Refresh its scheduled job
      await schedulerService.updateReminderSchedule(existingReminder.reminder_id);
    }
    else {
      // 4b) Insert a new reminder
      const { reminder_id } = await db.one(
        `INSERT INTO habit_reminders
           (habit_id, user_id, reminder_time, days_of_week, notification_method, enabled)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING reminder_id`,
        [
          habit_id,
          userId,
          formattedTime,
          daysString,
          notification_method,
          !!enabled
        ]
      );
      
      // 5b) Fetch the full reminder record for scheduling
      const reminder = await db.one(
        `SELECT hr.*, h.habit_name, h.description, u.email, u.phone, u.username
           FROM habit_reminders hr
           JOIN habits  h ON hr.habit_id = h.habit_id
           JOIN users   u ON hr.user_id  = u.user_id
          WHERE hr.reminder_id = $1`,
        [reminder_id]
      );
      
      // 6b) Schedule the new reminder job
      await schedulerService.addReminderSchedule(reminder);
    }
    
    // 7) Redirect back with success
    res.redirect('/notifications?success=Reminder updated successfully');
  } 
  catch (err) {
    console.error('Failed to update habit reminder:', err);
    res.redirect('/notifications?error=Failed to update reminder');
  }
};


/**
 * Delete a habit reminder
 */
exports.deleteHabitReminder = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { habit_id } = req.body;
    
    // Get the reminder ID before deletion
    const reminder = await db.oneOrNone(
      'SELECT reminder_id FROM habit_reminders WHERE habit_id = $1 AND user_id = $2',
      [habit_id, userId]
    );
    
    if (reminder) {
      // Delete the reminder
      await db.none(
        'DELETE FROM habit_reminders WHERE reminder_id = $1',
        [reminder.reminder_id]
      );
      
      // Remove the scheduled job
      schedulerService.removeReminderSchedule(reminder.reminder_id);
    }
    
    res.redirect('/notifications?success=Reminder deleted successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/notifications?error=Failed to delete reminder');
  }
};

/**
 * Toggle a habit reminder enabled/disabled status
 */
exports.toggleReminderStatus = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { reminder_id, enabled } = req.body;
    
    // Update the reminder
    await db.none(
      'UPDATE habit_reminders SET enabled = $1 WHERE reminder_id = $2 AND user_id = $3',
      [!!enabled, reminder_id, userId]
    );
    
    // Update the schedule
    if (enabled) {
      await schedulerService.updateReminderSchedule(reminder_id);
    } else {
      schedulerService.removeReminderSchedule(reminder_id);
    }
    
    res.redirect('/notifications?success=Reminder updated successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/notifications?error=Failed to update reminder');
  }
}; 