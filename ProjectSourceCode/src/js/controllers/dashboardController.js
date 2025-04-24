// src/js/controllers/dashboardController.js
const db = require('../config/db');

/* ====================================================================== */
/*  MAIN DASHBOARD ROUTE                                                  */
/* ====================================================================== */
exports.dashboard = async (req, res) => {
  try {
    /* -------------------------------------------------- */
    /* 1.  Basic context                                  */
    /* -------------------------------------------------- */
    const userId = req.session.user.user_id;
    const todayISO = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
    const weekdayNum = new Date().getDay();                    // 0-

    /* -------------------------------------------------- */
    /* 2.  Social widgets                                 */
    /* -------------------------------------------------- */
    const friends = await db.any(
      'SELECT * FROM friends WHERE sender = $1 AND mutual = TRUE',
      [userId]
    );
    const friendRequests = await db.any(
      'SELECT * FROM friends WHERE receiver = $1 AND mutual = FALSE',
      [userId]
    );

    /* -------------------------------------------------- */
    /* 3.  Habit queries                                  */
    /* -------------------------------------------------- */

    /* “Active Habits” card — every habit the user owns   */
    const allHabits = await db.any(`
      SELECT h.*
      FROM habits h
      JOIN users_to_habits uh ON h.habit_id = uh.habit_id
      WHERE uh.user_id = $1
    `, [userId]);

    // ─────────────────── TODAY’S HABITS ────────────────────

    // completed TODAY
    const completedToday = (await db.any(`
  SELECT h.*, hth.history_id
  FROM habits_to_history hth
  JOIN history        hi ON hth.history_id = hi.history_id
  JOIN habits         h  ON h.habit_id     = hth.habit_id
  JOIN users_to_habits uh ON uh.habit_id   = h.habit_id
  WHERE uh.user_id = $1
    AND hi.date    = $2
`, [userId, todayISO]))
      .map(row => ({ ...row, doneToday: true }));   // ← parentheses added

    // incomplete TODAY
    const incompleteToday = (await db.any(`
  SELECT h.*
  FROM habits h
  JOIN users_to_habits uh ON h.habit_id = uh.habit_id
  WHERE uh.user_id = $1
    AND h.weekday = $2
    AND h.habit_id NOT IN (
      SELECT hth.habit_id
      FROM habits_to_history hth
      JOIN history hi ON hth.history_id = hi.history_id
      WHERE hi.date = $3
    )
`, [userId, weekdayNum, todayISO]))
      .map(row => ({ ...row, doneToday: false }));

    // unified list
    const todayHabits = [...incompleteToday, ...completedToday];


    const completionPerc = todayHabits.length
      ? Math.floor((completedToday.length / todayHabits.length) * 100)
      : 0;

    /* -------------------------------------------------- */
    /* 4.  Streak + weekly widgets                        */
    /* -------------------------------------------------- */
    const { currentStreak, longestStreak } = await calculateStreak(userId);
    const weeklyData = await calculateWeeklyData(userId);

    const { total: totalCompletions } = await db.one(`
      SELECT COUNT(*) AS total
      FROM habits_to_history hth
      JOIN habits         h  ON hth.habit_id = h.habit_id
      JOIN users_to_habits uh ON h.habit_id  = uh.habit_id
      WHERE uh.user_id = $1
    `, [userId]);

    /* -------------------------------------------------- */
    /* 5.  Upcoming reminders                             */
    /* -------------------------------------------------- */
    const upcomingReminders = await db.any(`
      SELECT hr.reminder_id, hr.reminder_time,
             h.habit_name, h.habit_id
      FROM habit_reminders hr
      JOIN habits h ON hr.habit_id = h.habit_id
      WHERE hr.user_id = $1
        AND hr.enabled = TRUE
      ORDER BY hr.reminder_time ASC
      LIMIT 5
    `, [userId]);

    const reminders = upcomingReminders.map(r => {
      const [hh, mm] = r.reminder_time.split(':');
      const hr = +hh;
      const period = hr >= 12 ? 'PM' : 'AM';
      const displayHr = hr % 12 || 12;
      return { ...r, formatted_time: `${displayHr}:${mm} ${period}` };
    });

    /* -------------------------------------------------- */
    /* 6.  Render                                         */
    /* -------------------------------------------------- */
    res.render('pages/dashboard', {
      hideNav: false,
      user: req.session.user,

      /* cards & lists */
      allHabits,
      todayHabits,
      completionPerc,

      /* social */
      friendCount: friends.length,
      friendRequests: friendRequests.length,

      /* streak & graphs */
      streak: currentStreak,
      longestStreak,
      weeklyData,
      completedHabits: completedToday.length,
      // totalCompletions,
      // totalIncomplete,
      reminders
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

/* ====================================================================== */
/*  COMPLETE & DECREMENT ACTIONS                                          */
/* ====================================================================== */
exports.completeHabit = async (req, res) => {
  try {
    const { habitId } = req.body;

    /* increment counter on the habit */
    await db.none(
      'UPDATE habits SET counter = counter + 1 WHERE habit_id = $1',
      [habitId]
    );

    /* create / reuse today’s history row */
    const { history_id } = await db.one(`
      INSERT INTO history (date)
      VALUES (CURRENT_DATE)
      ON CONFLICT (date) DO UPDATE SET date = EXCLUDED.date
      RETURNING history_id
    `);

    /* bind habit to history */
    await db.none(`
      INSERT INTO habits_to_history (habit_id, history_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [habitId, history_id]);

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};

exports.decrementHabit = async (req, res) => {
  try {
    const { habitId } = req.body;

    /* decrement counter (minimum 0) */
    await db.none(`
      UPDATE habits
      SET counter = GREATEST(counter - 1, 0)
      WHERE habit_id = $1
    `, [habitId]);

    /* remove the most recent completion for this habit (today) */
    const { history_id } = await db.one(`
      SELECT history_id
      FROM habits_to_history
      JOIN history USING (history_id)
      WHERE habit_id = $1 AND date = CURRENT_DATE
      LIMIT 1
    `, [habitId]);

    await db.none('DELETE FROM habits_to_history WHERE habit_id = $1 AND history_id = $2',
      [habitId, history_id]);

    /* if no other habits are linked to this history row, delete it */
    await db.none(`
      DELETE FROM history h
      WHERE h.history_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM habits_to_history WHERE history_id = h.history_id
        )
    `, [history_id]);

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
};


/* ====================================================================== */
/*  STREAK CALCULATION                                                    */
/* ====================================================================== */
async function calculateStreak(userId) {
  try {
    /* all distinct completion dates (descending) */
    const dates = await db.any(`
      SELECT DISTINCT hi.date
      FROM history hi
      JOIN habits_to_history hth ON hi.history_id = hth.history_id
      JOIN habits h             ON hth.habit_id  = h.habit_id
      JOIN users_to_habits uh   ON h.habit_id    = uh.habit_id
      WHERE uh.user_id = $1
      ORDER BY hi.date DESC
    `, [userId]);

    if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

    /* ---------- current streak ---------- */
    let currentStreak = 0;
    let checkDate = new Date();   // start today
    checkDate.setHours(0, 0, 0, 0);

    for (const d of dates) {
      const date = new Date(d.date);
      date.setHours(0, 0, 0, 0);

      const diff = Math.round((checkDate - date) / 86400000); // day diff

      if (diff === 0 || diff === 1) {
        currentStreak += 1;
        checkDate = date;             // move back one day
      } else {
        break;                        // gap found
      }
    }

    /* ---------- longest streak ---------- */
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 0; i < dates.length - 1; i++) {
      const a = new Date(dates[i].date);
      const b = new Date(dates[i + 1].date);
      const diff = Math.round((a - b) / 86400000);

      if (diff === 1) {
        tempStreak += 1;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { currentStreak, longestStreak };
  } catch (err) {
    console.error('Error calculating streak:', err);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

/* ====================================================================== */
/*  WEEKLY COMPLETION DATA (7-element array [%])                          */
/* ====================================================================== */
async function calculateWeeklyData(userId) {
  try {
    const weekDays = [0, 1, 2, 3, 4, 5, 6];     // Sun-Sat
    const result = [];

    for (const day of weekDays) {
      /* scheduled for this weekday */
      const scheduled = await db.one(`
        SELECT COUNT(*) AS total
        FROM habits h
        JOIN users_to_habits uh ON h.habit_id = uh.habit_id
        WHERE uh.user_id = $1 AND h.weekday = $2
      `, [userId, day]);

      /* completions in the last 90 days on this weekday */
      const completed = await db.one(`
        SELECT COUNT(*) AS total
        FROM habits_to_history hth
        JOIN history hi          ON hth.history_id = hi.history_id
        JOIN habits  h           ON hth.habit_id   = h.habit_id
        JOIN users_to_habits uh  ON h.habit_id     = uh.habit_id
        WHERE uh.user_id = $1
          AND h.weekday  = $2
          AND hi.date   >= NOW() - INTERVAL '90 days'
      `, [userId, day]);

      /* estimate completion rate */
      let rate = 0;
      if (+scheduled.total > 0) {
        rate = Math.round((completed.total / (scheduled.total * 13)) * 100);
        rate = Math.min(rate, 100);
      }
      result.push(rate);
    }
    return result;
  } catch (err) {
    console.error('Error calculating weekly data:', err);
    return [0, 0, 0, 0, 0, 0, 0];
  }
}
