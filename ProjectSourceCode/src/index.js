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

// Render the login page without the nav bar
app.get('/login', (req, res) => {
  res.render('pages/login', { hideNav: true });
});

// Render the registration page without the nav bar
app.get('/register', (req, res) => {
  res.render('pages/register', { hideNav: true });
});

// module.exports = app.listen(3000);

// Start the server on port 3000
module.exports = app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});



