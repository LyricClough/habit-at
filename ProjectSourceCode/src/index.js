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

// Register helpers
hbs.handlebars.registerHelper('range', function(start, end, options) {
  let result = '';
  for (let i = start; i <= end; i++) {
    result += options.fn(i);
  }
  return result;
});

hbs.handlebars.registerHelper('getHabit', function(calendarData, day, hour) {
  const dayColumn = calendarData[day];
  return dayColumn ? dayColumn[hour] : null;
});

// Setup view engine
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Database setup
const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

db.connect()
  .then(obj => {
    console.log('Database connection successful');
    obj.done();
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/resources', express.static(path.join(__dirname, 'resources')));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

// Routes
app.get('/', (req, res) => res.redirect('/login'));

app.get('/register', (req, res) => {
  res.render('pages/register', { hideNav: true });
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await db.one(`
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING username, email;
    `, [username, email, hash]);
    return res.redirect('/login');
  } catch (error) {
    let message = 'Could not register, try again.';
    if (error.code === '23505') {
      if (error.constraint === 'users_username_key') {
        message = 'Username already exists.';
      } else if (error.constraint === 'users_email_key') {
        message = 'Email already in use.';
      }
    }
    return res.status(400).render('pages/register', {
      hideNav: true,
      message,
      error: true,
    });
  }
});

app.get('/login', (req, res) => {
  res.render('pages/login', { hideNav: true });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).render('pages/login', {
        hideNav: true,
        message: 'Incorrect username or password.',
        error: true
      });
    }
    req.session.user = user;
    req.session.save(() => res.redirect('/dashboard'));
  } catch (error) {
    console.log(error);
    return res.status(400).render('pages/login', {
      hideNav: true,
      message: 'Something went wrong. Try again.',
      error: true
    });
  }
});

// Auth middleware
const auth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};

app.use(auth);

// Dashboard
app.get('/dashboard', (req, res) => {
  res.render('pages/dashboard', { hideNav: false, user: req.session.user });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.log(err);
    res.redirect('/login');
  });
});

// Calendar
// GET calendar
app.get('/calendar', async (req, res) => {
  const userId = req.session.user?.user_id;

  if (!userId) return res.redirect('/login');

  try {
    const habits = await db.any(`
      SELECT h.* FROM habits h
      JOIN users_to_habits uth ON h.habit_id = uth.habit_id
      WHERE uth.user_id = $1
      ORDER BY weekday, time_slot
    `, [userId]);

    const calendarData = Array.from({ length: 24 }, () => Array(7).fill(null));
    habits.forEach(habit => {
      if (calendarData[habit.time_slot]) {
        calendarData[habit.time_slot][habit.weekday] = habit;
      }
    });

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    res.render('pages/calendar', { calendarData, weekdays });
  } catch (err) {
    console.error("Error fetching calendar data: ", err);
    res.status(500).send('Error loading calendar');
  }
});

// POST add-habit
app.post('/add-habit', async (req, res) => {
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
});

// Start server
const PORT = process.env.PORT || 3000;
module.exports = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});