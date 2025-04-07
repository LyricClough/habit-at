// // require('../env');
// const express = require('express'); // To build an application server or API
// const app = express();
// const handlebars = require('express-handlebars');
// const Handlebars = require('handlebars');
// const path = require('path');
// const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
// const bodyParser = require('body-parser');
// const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.

// const bcrypt = require('bcryptjs'); //  To hash passwords

// // create `ExpressHandlebars` instance and configure the layouts and partials dir.
// const hbs = handlebars.create({
//  extname: 'hbs',
//   layoutsDir: __dirname + '/views/layouts',
//   partialsDir: __dirname + '/views/partials',
// });

// // database configuration
// const dbConfig = {
//   host: 'db', // the database server
//   port: 5432, // the database port
//   database: process.env.POSTGRES_DB, // the database name
//   user: process.env.POSTGRES_USER, // the user account to connect with
//   password: process.env.POSTGRES_PASSWORD, // the password of the user account
// };

// const db = pgp(dbConfig)

// // Test DB connection
// db.connect()
//   .then(obj => {
//     console.log('Database connection successful');
//     obj.done();
//   })
//   .catch(error => {
//     console.log('ERROR:', error.message || error);
//   });


// // Register `hbs` as our view engine using its bound `engine()` function.
// app.engine('hbs', hbs.engine);
// app.set('view engine', 'hbs');
// app.set('views', path.join(__dirname, 'views'));


// //Middleware to parse form data and JSON
// app.use(bodyParser.json());
// app.use(
//   bodyParser.urlencoded({
//     extended: true,
//   })
// );

// // Session Configuration
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     saveUninitialized: false,
//     resave: false,
//   })
// );


// app.get('/', (req, res) => {
//   return res.redirect('/login');
// });


// // Render the registration page
// app.get('/register', (req, res) => {
//   res.render('pages/register', { hideNav: true });
// });

// // Handle registration form submission
// app.post('/register', async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     const hash = await bcrypt.hash(password, 10);

//     const insertQuery = `
//       INSERT INTO users (username, password)
//       VALUES ($1, $2)
//       RETURNING username;
//     `;

//     await db.one(insertQuery, [username, hash]);

//     return res.redirect('/login');
//   } catch (error) {
//     console.log(error);
//     return res.render('pages/register', {
//       layout: 'auth',
//       message: 'Could not register, Try a Different Username',
//       error: true,
//     });
//   }
// });

// // Render the login page 
// app.get('/login', (req, res) => {
//   res.render('pages/login', { hideNav: true });
// });


// app.post('/login', async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     const user = await db.oneOrNone(
//       'SELECT * FROM users WHERE username = $1',
//       [username]
//     );

//     if (!user) {
//       return res.render('pages/login', {
//         layout: 'auth',
//         message: 'Incorrect username or password.',
//         error: true,
//       });
//     }

//     const match = await bcrypt.compare(password, user.password);
//     if (!match) {
//       return res.render('pages/login', {
//         layout: 'auth',
//         message: 'Incorrect username or password.',
//         error: true,
//       });
//     }


//   } catch (error) {
//     console.log(error);
//     return res.render('pages/login', {
//       layout: 'auth',
//       message: 'Something went wrong. Try again.',
//       error: true,
//     });
//   }
// });


// // Middleware to protect routes
// const auth = (req, res, next) => {
//   if (!req.session.user) {
//     return res.redirect('/login');
//   }
//   next();
// };

// app.use(auth);

// // Start the server on port 3000
// module.exports = app.listen(3000, () => {
//   console.log('Server is running on http://localhost:3000');
// });

// require('../env');
const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object.
const bcrypt = require('bcryptjs'); // To hash passwords

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

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse form data and JSON
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.get('/', (req, res) => {
  return res.redirect('/login');
});

// Render the registration page
app.get('/register', (req, res) => {
  res.render('pages/register', { hideNav: true });
});

// Handle registration form submission
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const insertQuery = `
      INSERT INTO users (username, password)
      VALUES ($1, $2)
      RETURNING username;
    `;
    await db.one(insertQuery, [username, hash]);
    return res.redirect('/login');
  } catch (error) {
    console.log(error);
    return res.render('pages/register', {
      hideNav: true,
      message: 'Could not register, Try a Different Username',
      error: true,
    });
  }
});

// Render the login page 
app.get('/login', (req, res) => {
  res.render('pages/login', { hideNav: true });
});

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
      return res.redirect('/discover');
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

// Start the server on port 3000
module.exports = app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});



