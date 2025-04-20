const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');

// Create Handlebars instance
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
});

//Handlebars helper functions
hbs.handlebars.registerHelper("greaterThanZero", function (value) {
  return value > 0;
});

hbs.handlebars.registerHelper("ifZero", function (value) {
  return value == 0;
});

hbs.handlebars.registerHelper("printTime", function (value) {
  if (value > 11) {
    value = value - 11;
    return value + " pm";
  }
  else {
    return value + " am"
  }

  return value == 0;
});

const dbConfig = {
  host: 'db', 
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

// Test DB connection
db.connect()
  .then(obj => {
    console.log('Database connection successful');
    obj.done();
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// Register Handlebars as the view engine
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse JSON and form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

// Redirect root to /login
app.get('/', (req, res) => {
  return res.redirect('/login');
});

// Render the registration page (with nav hidden)
app.get('/register', (req, res) => {
  res.render('pages/register', { hideNav: true });
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const insertQuery = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING username, email;
    `;
    await db.one(insertQuery, [username, email, hash]);
    return res.redirect('/login'); // Success: redirect with implicit 302
  } catch (error) {
    console.log(error);
    // Check for duplicate key error (unique constraint violation)
    if (error.code === '23505') {
      let message = 'Duplicate entry. Please check your details.';
      if (error.constraint === 'users_username_key') {
        message = 'Username already exists. Please choose a different one.';
      } else if (error.constraint === 'users_email_key') {
        message = 'An account with this email already exists.';
      }
      return res.status(400).render('pages/register', {
        hideNav: true,
        message,
        error: true,
      });
    }
    return res.status(400).render('pages/register', {
      hideNav: true,
      message: 'Could not register, try again.',
      error: true,
    });
  }
});


// Render the login page (with nav hidden)
app.get('/login', (req, res) => {
  res.render('pages/login', { hideNav: true });
});
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt for username:", username);
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);
    console.log("User found:", user);
    if (!user) {
      const errorResponse = { message: 'Incorrect username or password.' };
      // If running tests, return JSON; otherwise render view.
      if (process.env.NODE_ENV === 'test') {
        return res.status(400).json(errorResponse);
      }
      return res.status(400).render('pages/login', {
        hideNav: true,
        ...errorResponse,
        error: true
      });
    }
    const match = await bcrypt.compare(password, user.password);
    console.log("Password match:", match);
    if (!match) {
      const errorResponse = { message: 'Incorrect username or password.' };
      if (process.env.NODE_ENV === 'test') {
        return res.status(400).json(errorResponse);
      }
      return res.status(400).render('pages/login', {
        hideNav: true,
        ...errorResponse,
        error: true
      });
    }
    req.session.user = user;
    req.session.save(() => {
      return res.redirect('/dashboard');
    });
  } catch (error) {
    console.log(error);
    const errorResponse = { message: 'Something went wrong. Try again.' };
    if (process.env.NODE_ENV === 'test') {
      return res.status(400).json(errorResponse);
    }
    return res.status(400).render('pages/login', {
      hideNav: true,
      ...errorResponse,
      error: true
    });
  }
});


// Middleware to protect routes
const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

app.use(auth);

// Dashboard route – ensure you have a corresponding view at views/pages/dashboard.hbs
app.get('/dashboard', async (req, res) => {

  try {
    //get user id
    const userId = req.session.user?.user_id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    //Get number of friends
    const friendQuery = 'SELECT count(*) FROM friends WHERE Sender = $1 AND Mutual = TRUE';
    let friendCount = await db.any(friendQuery, [userId]);
    friendCount = friendCount.length;
    friendCount--;

    //Get number of friend requests
    const friendRequestsQuery = 'SELECT count(*) FROM friends WHERE Receiver = $1 AND Mutual = FALSE';
    let friendRequests = await db.any(friendRequestsQuery, [userId]);
    friendRequests = friendRequests.length;
    friendRequests--;

    /***HABITS***/

    //Query all habits for a given user, for use in statistics
    const allHabitsQ = `
      SELECT h.habit_id, h.habit_name, h.description, h.weekday, h.time_slot
      FROM habits h
      JOIN users_to_habits uh ON h.habit_id = uh.habit_id
      WHERE uh.user_id = $1
    `;
    const allHabits = await db.any(allHabitsQ, [userId]);

    // Query to get all habits for the user, for today only
    const habitsQuery = `
      WITH 
        allHabits AS (
          SELECT h.habit_id, h.habit_name, h.description, h.weekday, h.time_slot, h.counter
          FROM habits h
          JOIN users_to_habits uh ON h.habit_id = uh.habit_id
          WHERE uh.user_id = $1
        )
      SELECT *
      FROM allHabits
      WHERE weekday = $2
    `;
    const d = new Date();
    const dayOfWeek = d.getDay();
    const habits = await db.any(habitsQuery, [userId, dayOfWeek]);

    // Completed habits today
    const today = new Date().toISOString().split('T')[0]; // format YYYY-MM-DD
    const completedQuery = `
      SELECT h.habit_id, h.habit_name, h.description, h.weekday, h.time_slot, h.counter
      FROM habits_to_history hth
      JOIN history hi ON hth.history_id = hi.history_id
      JOIN habits h ON h.habit_id = hth.habit_id
      JOIN users_to_habits uh ON uh.habit_id = h.habit_id
      WHERE hi.date = $1 AND uh.user_id = $2
    `;
    const completedHabits = await db.any(completedQuery, [today, userId]);

    // Incomplete habits today
    const incompleteQuery = `
      SELECT h.habit_id, h.habit_name, h.description, h.weekday, h.time_slot, h.counter
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
    `;
    const incompleteHabits = await db.any(incompleteQuery, [userId, dayOfWeek, today]);

    //Generate percentage of completed habits for the day
    const completionPerc = (((completedHabits.length) / (habits.length)) * 100) | 0;
    const numCompleted = completedHabits.length;

    //Check if there are habits and send all the data to the page
    if (!habits.length) {
      console.log("No habits!");
      res.render('pages/dashboard', { hideNav: false, user: req.session.user, allHabits, friendCount, friendRequests});
    }
    else {
      res.render('pages/dashboard', { hideNav: false, user: req.session.user, habits, allHabits, completedHabits, numCompleted, incompleteHabits, completionPerc, friendCount, friendRequests});
    };
  }
  catch (err) {
    console.log(err);
  }

});

//Set habit completed
app.post('/completedHabit', async (req, res) => {
  try {
    const habitId = req.body.habitId;

    //Add 1 to counter
    const habitsQ = `UPDATE habits SET counter=(counter+1) WHERE habit_id = $1`;
    const habit = await db.any(habitsQ, [habitId]);

    //Make new history
    const historyQ = await db.one(`INSERT INTO history (date) VALUES (CURRENT_DATE) RETURNING history_id`);

    //Link history to habit
    await db.any(`INSERT INTO habits_to_history (habit_id, history_id) VALUES ($1, $2)`, [habitId, historyQ.history_id]);

    res.redirect("/dashboard");
  }
  catch (err) {
    console.log(err);
  }
});

//remove habit completed
app.post('/decrementHabit', async (req, res) => {
  try {
    const habitId = req.body.habitId;

    //Add 1 to counter
    const habitsQ = `UPDATE habits SET counter=(counter-1) WHERE habit_id = $1`;
    const habit = await db.any(habitsQ, [habitId]);

    const historyId = `
          SELECT history_id 
          FROM habits_to_history 
          WHERE habit_id = $1
    `;

    const history_id = await db.one(historyId, [habitId]);
    console.log(history_id.history_id);

    //Make new history
    await db.any(`DELETE FROM history WHERE history_id = $1`, [history_id.history_id]);

    //Link history to habit
    await db.any(`DELETE FROM habits_to_history WHERE history_id = $1`, [history_id.history_id]);

    res.redirect("/dashboard");
  }
  catch (err) {
    console.log(err);
  }
});

// Logout route: destroy session and redirect to /login
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.log(err);
    return res.redirect('/login');
  });
});

// Start the server on port 3000 (or change the host port mapping in your docker-compose file if needed)
const PORT = process.env.PORT || 3000;
module.exports = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});