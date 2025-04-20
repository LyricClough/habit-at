// src/js/controllers/dashboardController.js
const db = require('../config/db');

exports.dashboard = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const today = new Date().toISOString().slice(0, 10);
    const dayOfWeek = new Date().getDay();

    // friends count
    const friends = await db.any(
      'SELECT * FROM friends WHERE Sender = $1 AND Mutual = TRUE',
      [userId]
    );
    const friendCount = friends.length;

    // friend requests
    const requests = await db.any(
      'SELECT * FROM friends WHERE Receiver = $1 AND Mutual = FALSE',
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
