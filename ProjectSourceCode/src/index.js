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

// Routes

// Main Route
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
app.get('/dashboard', (req, res) => {
  res.render('pages/dashboard', { hideNav: false, user: req.session.user });
});

// Logout route: destroy session and redirect to /login
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.log(err);
    return res.redirect('/login');
  });
});

// Routes for calendar.hbs
app.get('/calendar', async (req, res) => {
  const userId = req.session.userId; // Get user ID from session (if logged in)

  try {
    // Fetch habits from the database
    const habits = await db.any(`
      SELECT * FROM habits 
      JOIN user_contents ON habits.user_habit_id = user_contents.user_habit_id
      WHERE user_contents.user_id = $1
      ORDER BY weekday, time_slot`, [userId]);

    // Organize the habits by weekday and time slot
    const calendarData = Array.from({ length: 7 }, () => Array(24).fill(null));
    habits.forEach(habit => {
      calendarData[habit.weekday][habit.time_slot] = habit;
    });

    // Render the calendar page
    res.render('pages/calendar', { calendarData });
  } catch (err) {
    console.error("Error fetching calendar data: ", err);
    res.status(500).send('Error loading calendar');
  }
});

// POST route to handle adding a new habit
app.post('/add-habit', async (req, res) => {
  const { habitName, habitDescription, habitWeekday, habitTime } = req.body;

  try {
    // Insert habit into the "habits" table
    const newHabit = await db.one(`
      INSERT INTO habits (habit_name, description, weekday, time_slot)
      VALUES ($1, $2, $3, $4)
      RETURNING user_habit_id`, [habitName, habitDescription, habitWeekday, habitTime]);

    // Associate the habit with the logged-in user
    const userId = req.session.userId; // Assuming user ID is stored in the session
    await db.none(`
      INSERT INTO user_contents (user_id, user_habit_id)
      VALUES ($1, $2)`, [userId, newHabit.user_habit_id]);

    // Send success response
    res.json({ message: 'Habit added successfully!' });
  } catch (error) {
    console.error("Error adding habit:", error);
    res.status(500).json({ message: "Error adding habit" });
  }
});

// Start the server on port 3000 (or change the host port mapping in your docker-compose file if needed)
const PORT = process.env.PORT || 3000;
module.exports = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});