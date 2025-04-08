const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.

//idk if we will use these 
//const bcrypt = require('bcryptjs'); //  To hash passwords
//const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
 extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

// Routes

// Main Route
app.get('/', (req, res) => {
  res.send('Hello World!');
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

// Start the server
module.exports = app.listen(3000);