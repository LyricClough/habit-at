// src/js/controllers/dashboardController.js
const db = require('../config/db');

exports.dashboard = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const today = new Date().toISOString().slice(0, 10);
    const dayOfWeek = new Date().getDay();

    // friends count
    const friends = await db.any(
      'SELECT * FROM friends WHERE sender = $1 AND mutual = TRUE',
      [userId]
    );
    const friendCount = friends.length;

    // friend requests
    const requests = await db.any(
      'SELECT * FROM friends WHERE receiver = $1 AND mutual = FALSE',
      [userId]
    );
    const friendRequests = requests.length;

    // all habits
    const allHabits = await db.any(
      `SELECT h.* 
         FROM habits h
         JOIN users_to_habits uh ON h.habit_id = uh.habit_id
        WHERE uh.user_id = $1`,
      [userId]
    );

    // today's habits
    const habits = await db.any(
      `WITH allHabits AS (
         SELECT h.*, h.counter
           FROM habits h
           JOIN users_to_habits uh ON h.habit_id = uh.habit_id
          WHERE uh.user_id = $1
       )
       SELECT * FROM allHabits WHERE weekday = $2`,
      [userId, dayOfWeek]
    );

    // completed today
    const completedHabits = await db.any(
      `SELECT h.*, hth.history_id
         FROM habits_to_history hth
         JOIN history hi   ON hth.history_id = hi.history_id
         JOIN habits h     ON h.habit_id   = hth.habit_id
         JOIN users_to_habits uh ON uh.habit_id = h.habit_id
        WHERE hi.date = $1 AND uh.user_id = $2`,
      [today, userId]
    );

    // incomplete today
    const incompleteHabits = await db.any(
      `SELECT h.*
         FROM habits h
         JOIN users_to_habits uh ON h.habit_id = uh.habit_id
        WHERE uh.user_id = $1
          AND h.weekday = $2
          AND h.habit_id NOT IN (
            SELECT hth.habit_id
              FROM habits_to_history hth
              JOIN history hi ON hth.history_id = hi.history_id
             WHERE hi.date = $3
          )`,
      [userId, dayOfWeek, today]
    );

    const completionPerc = habits.length
      ? Math.floor((completedHabits.length / habits.length) * 100)
      : 0;

    // Get current streak and longest streak (for statistics preview)
    const { currentStreak, longestStreak } = await calculateStreak(userId);

    // Get weekly completion rates (for statistics preview)
    const weeklyData = await calculateWeeklyData(userId);

    // Get total habit completions
    const totalCompletions = await db.one(
      `SELECT COUNT(*) as total
       FROM habits_to_history hth
       JOIN habits h ON hth.habit_id = h.habit_id
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1`,
      [userId]
    );

    // Get upcoming reminders for the dashboard
    const upcomingReminders = await db.any(`
      SELECT hr.reminder_id, hr.reminder_time, h.habit_name, h.habit_id 
      FROM habit_reminders hr
      JOIN habits h ON hr.habit_id = h.habit_id
      WHERE hr.user_id = $1 AND hr.enabled = true
      ORDER BY hr.reminder_time ASC
      LIMIT 5
    `, [userId]);

    // Format reminder times for display
    const formattedReminders = upcomingReminders.map(reminder => {
      // Convert 24-hour time to AM/PM format
      const [hours, minutes] = reminder.reminder_time.split(':');
      const hour = parseInt(hours, 10);
      const period = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      
      return {
        ...reminder,
        formatted_time: `${formattedHour}:${minutes} ${period}`
      };
    });

    res.render('pages/dashboard', {
      hideNav: false,
      user: req.session.user,
      allHabits,
      habits,
      completedHabits,
      incompleteHabits,
      completionPerc,
      friendCount,
      friendRequests,
      streak: currentStreak,
      longestStreak,
      weeklyData: weeklyData,
      totalCompletions: totalCompletions.total,
      reminders: formattedReminders
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.completeHabit = async (req, res) => {
  try {
    const { habitId } = req.body;
    await db.none(
      'UPDATE habits SET counter = counter + 1 WHERE habit_id = $1',
      [habitId]
    );
    const { history_id } = await db.one(
      `INSERT INTO history (date) VALUES (CURRENT_DATE)
       RETURNING history_id`
    );
    await db.none(
      `INSERT INTO habits_to_history (habit_id, history_id)
         VALUES ($1, $2)`,
      [habitId, history_id]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

exports.decrementHabit = async (req, res) => {
  try {
    const { habitId } = req.body;
    await db.none(
      'UPDATE habits SET counter = counter - 1 WHERE habit_id = $1',
      [habitId]
    );
    const { history_id } = await db.one(
      `SELECT history_id
         FROM habits_to_history
        WHERE habit_id = $1
        ORDER BY history_id DESC
        LIMIT 1`,
      [habitId]
    );
    await db.none('DELETE FROM habits_to_history WHERE history_id = $1', [
      history_id,
    ]);
    await db.none('DELETE FROM history WHERE history_id = $1', [history_id]);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

/**
 * Calculate current and longest streak of habit completions
 */
async function calculateStreak(userId) {
  try {
    // Get all dates with completed habits
    const dates = await db.any(
      `SELECT DISTINCT hi.date
       FROM history hi
       JOIN habits_to_history hth ON hi.history_id = hth.history_id
       JOIN habits h ON hth.habit_id = h.habit_id
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1
       ORDER BY hi.date DESC`,
      [userId]
    );

    if (dates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if there's a completion for today
    const hasCompletionToday = dates.some(d => {
      const date = new Date(d.date);
      return date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
    });
    
    // Start checking from today or yesterday depending on if there's a completion today
    let checkDate = hasCompletionToday ? today : yesterday;
    
    for (let i = 0; i < dates.length; i++) {
      const date = new Date(dates[i].date);
      date.setHours(0, 0, 0, 0);
      
      const diff = Math.round((checkDate - date) / (1000 * 60 * 60 * 24));
      
      if (diff <= currentStreak) {
        // Already counted this date
        continue;
      } else if (diff === currentStreak + 1) {
        // Consecutive day
        currentStreak++;
        checkDate = date;
      } else {
        // Streak broken
        break;
      }
    }
    
    // Calculate longest streak
    let longestStreak = 0;
    let currentLongest = 0;
    
    for (let i = 0; i < dates.length - 1; i++) {
      const currentDate = new Date(dates[i].date);
      const nextDate = new Date(dates[i + 1].date);
      
      const diff = Math.round((currentDate - nextDate) / (1000 * 60 * 60 * 24));
      
      if (diff === 1) {
        // Consecutive day
        currentLongest++;
      } else {
        // Reset streak count
        longestStreak = Math.max(longestStreak, currentLongest);
        currentLongest = 0;
      }
    }
    
    longestStreak = Math.max(longestStreak, currentLongest) + 1; // +1 to count the first day
    
    return {
      currentStreak: hasCompletionToday ? currentStreak : currentStreak > 0 ? currentStreak : 0,
      longestStreak
    };
  } catch (err) {
    console.error('Error calculating streak:', err);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

/**
 * Calculate weekly completion data by day of week
 */
async function calculateWeeklyData(userId) {
  try {
    const weekDays = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
    const result = [];
    
    for (const day of weekDays) {
      // Get total scheduled habits for this weekday
      const scheduled = await db.any(
        `SELECT COUNT(*) as total
         FROM habits h
         JOIN users_to_habits uh ON h.habit_id = uh.habit_id
         WHERE uh.user_id = $1 AND h.weekday = $2`,
        [userId, day]
      );
      
      // Get total completions by day of week
      const completed = await db.any(
        `SELECT COUNT(*) as total
         FROM habits_to_history hth
         JOIN history hi ON hth.history_id = hi.history_id
         JOIN habits h ON hth.habit_id = h.habit_id
         JOIN users_to_habits uh ON h.habit_id = uh.habit_id
         WHERE uh.user_id = $1 AND h.weekday = $2 AND hi.date >= NOW() - INTERVAL '90 days'`,
        [userId, day]
      );
      
      // Calculate completion rate
      let rate = 0;
      if (scheduled[0].total > 0) {
        // Approximate rate based on last 90 days (about 13 of each weekday)
        rate = Math.round((completed[0].total / (scheduled[0].total * 13)) * 100);
        rate = Math.min(rate, 100); // Cap at 100%
      }
      
      result.push(rate);
    }
    
    return result;
  } catch (err) {
    console.error('Error calculating weekly data:', err);
    return [0, 0, 0, 0, 0, 0, 0];
  }
}
