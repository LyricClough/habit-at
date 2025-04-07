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

// Database configuration (if running in Docker, 'db' resolves to the db container)
const dbConfig = {
  host: 'db', // If testing locally outside Docker, change to 'localhost'
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
    return res.redirect('/login');
  } catch (error) {
    console.log(error);
    // Check for duplicate key error (unique constraint violation)
    if (error.code === '23505') {
      return res.render('pages/register', {
        hideNav: true,
        message: 'Username already exists. Please choose a different one.',
        error: true,
      });
    }
    return res.render('pages/register', {
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

// Handle login form submission (users log in using their username)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) {
      return res.render('pages/login', {
        hideNav: true,
        message: 'Incorrect username or password.',
        error: true,
      });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render('pages/login', {
        hideNav: true,
        message: 'Incorrect username or password.',
        error: true,
      });
    }
    req.session.user = user;
    req.session.save(() => {
      return res.redirect('/dashboard');
    });
  } catch (error) {
    console.log(error);
    return res.render('pages/login', {
      hideNav: true,
      message: 'Something went wrong. Try again.',
      error: true,
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

// Start the server on port 3000 (or change the host port mapping in your docker-compose file if needed)
const PORT = process.env.PORT || 3000;
module.exports = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


