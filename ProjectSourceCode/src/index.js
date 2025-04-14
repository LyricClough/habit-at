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

// Start the server on port 3000 (or change the host port mapping in your docker-compose file if needed)
const PORT = process.env.PORT || 3000;
module.exports = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app.listen(3000);

//function to retreive the friends list from the database

app.get('/friends', (req, res) => {
  var userId = req.session.userInfo.userId;
  var query = 'SELECT friends.sender, friends.receiver FROM friends WHERE (sender = $1 OR receiver = $1) AND mutual = true';
  var pendingREquest = 'SELECT friends.sender FROM friends WHERE reciever = $1 AND mutual = false';
  db.any(query, [userId])
    .then(friends => {
      db.any(pendingREquest, [userId])
        .then(pending => {
          friends.forEach(friend => {
            friend.mutual = true;
          });
          return friends;
        })
        .then(friends => {
          res.render('pages/friends', { friends }, {pending});
        });
      res.render('pages/friends', friends);
    })
    .catch(error => {
      console.error('Error fetching friends:', error);
      res.status(500).json({status: 'error', message: 'Error fetching friends'});
    });
});

app.post('/friends', (req, res) => {
  const { friendId } = req.body;
  const userId = req.session.userInfo.userId;
  const query = `
    INSERT INTO friends (sender, receiver, mutual)
    VALUES ($1, $2, false)
    RETURNING sender, receiver;
  `;
  db.one(query, [userId, friendId])
    .then(friend => {
      res.status(200).json({status: 'success', message: 'Friend Request sent', friend});
    })
    .catch(error => {
      console.error('Error adding friend:', error);
      res.status(500).json({status: 'error', message: 'Error adding friend'});
    });
});

app.post('/accept-friend', (req, res) => {
  const { friendId } = req.body;
  const userId = req.session.userInfo.userId;
  const query = `
    UPDATE friends
    SET mutual = true
    WHERE sender = $1 AND receiver = $2;
  `;
  db.none(query, [friendId, userId])
    .then(() => {
      res.status(200).json({status: 'success', message: 'Friend request accepted'});
    })
    .catch(error => {
      console.error('Error accepting friend request:', error);
      res.status(500).json({status: 'error', message: 'Error accepting friend request'});
    });
});