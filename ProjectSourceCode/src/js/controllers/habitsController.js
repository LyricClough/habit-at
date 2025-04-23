const db = require('../config/db');

exports.getHabitsPage = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const today = new Date().toISOString().slice(0, 10);
    const dayOfWeek = new Date().getDay();

    // Get all habits for the user
    const allHabits = await db.any(
      `SELECT h.* 
       FROM habits h
       JOIN users_to_habits uh ON h.habit_id = uh.habit_id
       WHERE uh.user_id = $1
       ORDER BY h.habit_name ASC`,
      [userId]
    );

    // Get today's habits
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

    // Get completed habits for today
    const completedHabits = await db.any(
      `SELECT h.*, hth.history_id
       FROM habits_to_history hth
       JOIN history hi ON hth.history_id = hi.history_id
       JOIN habits h ON h.habit_id = hth.habit_id
       JOIN users_to_habits uh ON uh.habit_id = h.habit_id
       WHERE hi.date = $1 AND uh.user_id = $2`,
      [today, userId]
    );

    // Get incomplete habits for today
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

    // Calculate completion percentage
    const completionPerc = habits.length
      ? Math.floor((completedHabits.length / habits.length) * 100)
      : 0;

    res.render('pages/habits', {
      hideNav: false,
      user: req.session.user,
      allHabits,
      habits,
      completedHabits,
      incompleteHabits,
      completionPerc,
      dayOfWeek,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.createHabit = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { habitName, description, weekdays, timeSlot, status } = req.body;

    // Map status string to number 
    const statusMap = {
      'inactive': 0,
      'active': 1,
      'in-progress': 2,
      'complete': 3
    };
    
    const statusValue = statusMap[status] || 1; // Default to active if invalid

    // Process weekdays - can be a single day or comma-separated list
    const weekdaysArray = weekdays.split(',').map(day => parseInt(day.trim()));

    // Create a habit for each selected day
    for (const weekday of weekdaysArray) {
      // Insert habit
      const { habit_id } = await db.one(
        `INSERT INTO habits (habit_name, description, weekday, time_slot, counter, status)
         VALUES ($1, $2, $3, $4, 0, $5)
         RETURNING habit_id`,
        [habitName, description, weekday, timeSlot, statusValue]
      );

      // Link habit to user
      await db.none(
        `INSERT INTO users_to_habits (user_id, habit_id)
         VALUES ($1, $2)`,
        [userId, habit_id]
      );
    }

    res.redirect('/habits');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.updateHabit = async (req, res) => {
  try {
    const { habitId, habitName, description, weekdays, timeSlot, status } = req.body;

    // Map status string to number 
    const statusMap = {
      'inactive': 0,
      'active': 1,
      'in-progress': 2,
      'complete': 3
    };
    
    const statusValue = statusMap[status] || 1; // Default to active if invalid

    // Update habit details
    await db.none(
      `UPDATE habits 
       SET habit_name = $1, 
           description = $2, 
           weekday = $3, 
           time_slot = $4,
           status = $5
       WHERE habit_id = $6`,
      [habitName, description, weekdays, timeSlot, statusValue, habitId]
    );

    res.redirect('/habits');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.deleteHabit = async (req, res) => {
  try {
    const { habitId } = req.body;

    // Delete the habit (cascading will handle linked tables)
    await db.none('DELETE FROM habits WHERE habit_id = $1', [habitId]);

    res.redirect('/habits');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.pinToDashboard = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { habitId } = req.body;
    
    // Get the habit data
    const habit = await db.one(
      `SELECT * FROM habits WHERE habit_id = $1`,
      [habitId]
    );
    
    // Create a copy of the habit but with today's weekday
    const todayWeekday = new Date().getDay();
    
    const { habit_id: newHabitId } = await db.one(
      `INSERT INTO habits (
         habit_name,
         description,
         weekday,
         time_slot,
         counter,
         status
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING habit_id`,
      [
        habit.habit_name + ' (Pinned)',
        habit.description,
        todayWeekday,
        habit.time_slot,
        0,
        habit.status
      ]
    );
    
    // Link new habit to user
    await db.none(
      `INSERT INTO users_to_habits (user_id, habit_id)
       VALUES ($1, $2)`,
      [userId, newHabitId]
    );
    
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

/**
 * API: Get habits for a specific date
 */
exports.getHabitsByDate = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const dateStr = req.params.date;
    
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid date format. Use YYYY-MM-DD.' 
      });
    }
    
    // Parse date and get the day of week
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0-6, Sunday-Saturday
    
    // Get habits for this day of week
    const habits = await db.any(`
      SELECT h.*
      FROM habits h
      JOIN users_to_habits uh ON h.habit_id = uh.habit_id
      WHERE uh.user_id = $1 AND h.weekday = $2
      ORDER BY h.time_slot ASC
    `, [userId, dayOfWeek]);
    
    // Get completed habits for this date
    const completedHabits = await db.any(`
      SELECT h.habit_id
      FROM habits_to_history hth
      JOIN history hi ON hth.history_id = hi.history_id
      JOIN habits h ON hth.habit_id = h.habit_id
      JOIN users_to_habits uh ON h.habit_id = uh.habit_id
      WHERE hi.date = $1 AND uh.user_id = $2
    `, [dateStr, userId]);
    
    // Mark habits as completed or not
    const habitsWithCompletionStatus = habits.map(habit => {
      const isCompleted = completedHabits.some(ch => ch.habit_id === habit.habit_id);
      return {
        ...habit,
        is_completed: isCompleted
      };
    });
    
    // Also get reminders for this date if available
    const reminders = await db.any(`
      SELECT hr.*, h.habit_name
      FROM habit_reminders hr
      JOIN habits h ON hr.habit_id = h.habit_id
      WHERE hr.user_id = $1 AND hr.enabled = true
      AND POSITION(CAST(EXTRACT(DOW FROM $2::date) AS TEXT) IN hr.days_of_week) > 0
    `, [userId, dateStr]);
    
    res.json({
      success: true,
      date: dateStr,
      day_of_week: dayOfWeek,
      habits: habitsWithCompletionStatus,
      reminders: reminders
    });
  } catch (err) {
    console.error('Error fetching habits by date:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * API: Get details for a specific habit
 */
exports.getHabitDetails = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const habitId = req.params.habitId;
    
    // Get habit details
    const habit = await db.oneOrNone(`
      SELECT h.*
      FROM habits h
      JOIN users_to_habits uh ON h.habit_id = uh.habit_id
      WHERE uh.user_id = $1 AND h.habit_id = $2
    `, [userId, habitId]);
    
    if (!habit) {
      return res.status(404).json({ 
        success: false, 
        error: 'Habit not found' 
      });
    }
    
    // Get completion statistics
    const completions = await db.oneOrNone(`
      SELECT COUNT(*) as total_completions
      FROM habits_to_history hth
      JOIN history hi ON hth.history_id = hi.history_id
      WHERE hth.habit_id = $1
    `, [habitId]);
    
    // Calculate progress percentage (assuming target is 10 completions)
    const target = 10;
    const progress = Math.min(100, Math.round((habit.counter / target) * 100));
    
    // Add additional data to the habit
    const habitWithDetails = {
      ...habit,
      progress,
      total_completions: completions ? completions.total_completions : 0
    };
    
    res.json({
      success: true,
      habit: habitWithDetails
    });
  } catch (err) {
    console.error('Error fetching habit details:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}; 