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