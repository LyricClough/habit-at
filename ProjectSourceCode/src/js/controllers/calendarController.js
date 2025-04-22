// src/js/controllers/calendarController.js
const db = require('../config/db');

exports.calendar = async (req, res) => {
    const userId = req.session.user?.user_id;
    if (!userId) return res.redirect('/login');
  
    try {
      const habits = await db.any(`
        SELECT h.* FROM habits h
        JOIN users_to_habits uth ON h.habit_id = uth.habit_id
        WHERE uth.user_id = $1
        ORDER BY weekday, time_slot
      `, [userId]);
  
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
      // Group habits by weekday index (0 = Sunday, 6 = Saturday)
      const habitsByDay = Array.from({ length: 7 }, () => []);
  
      habits.forEach(habit => {
        if (habit.weekday >= 0 && habit.weekday <= 6) {
          habitsByDay[habit.weekday].push(habit);
        }
      });
  
      res.render('pages/calendar', { weekdays, habitsByDay });
    } catch (err) {
      console.error("Error fetching calendar data: ", err);
      res.status(500).send('Error loading calendar');
    }
};
  
// POST add-habit
exports.addHabit = async (req, res) => {
    const { habitName, habitDescription, habitWeekday, habitTime } = req.body;
    const userId = req.session.user?.user_id;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const newHabit = await db.one(`
        INSERT INTO habits (habit_name, description, weekday, time_slot)
        VALUES ($1, $2, $3, $4)
        RETURNING habit_id
        `, [habitName, habitDescription, habitWeekday, habitTime]);

        await db.none(`
        INSERT INTO users_to_habits (user_id, habit_id)
        VALUES ($1, $2)
        `, [userId, newHabit.habit_id]);

        res.json({ message: 'Habit added successfully!' });
    } catch (error) {
        console.error('Error adding habit:', error);
        res.status(500).json({ message: 'Error adding habit' });
    }
};

// POST /edit-habit
exports.editHabit = async (req, res) => {
    const { habitId, habitName, habitDescription, habitWeekday, habitTime } = req.body;
    const userId = req.session.user?.user_id;
  
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  
    try {
      // Make sure the user owns this habit
      const owned = await db.oneOrNone(
        `SELECT * FROM users_to_habits WHERE user_id = $1 AND habit_id = $2`,
        [userId, habitId]
      );
      if (!owned) return res.status(403).json({ message: 'Forbidden' });
  
      await db.none(`
        UPDATE habits
        SET habit_name = $1,
            description = $2,
            weekday = $3,
            time_slot = $4
        WHERE habit_id = $5
      `, [habitName, habitDescription, habitWeekday, habitTime, habitId]);
  
      res.json({ message: 'Habit updated successfully!' });
    } catch (err) {
      console.error('Error editing habit:', err);
      res.status(500).json({ message: 'Error updating habit' });
    }
};

// DELETE /delete-habit/:id
exports.deleteHabit = async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user?.user_id;
  
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  
    try {
      const owned = await db.oneOrNone(
        `SELECT * FROM users_to_habits WHERE user_id = $1 AND habit_id = $2`,
        [userId, id]
      );
      if (!owned) return res.status(403).json({ message: 'Forbidden' });
  
      await db.tx(async t => {
        await t.none(`DELETE FROM users_to_habits WHERE habit_id = $1`, [id]);
        await t.none(`DELETE FROM habits WHERE habit_id = $1`, [id]);
      });
  
      res.json({ message: 'Habit deleted successfully!' });
    } catch (err) {
      console.error('Error deleting habit:', err);
      res.status(500).json({ message: 'Error deleting habit' });
    }
};
  