// index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

const viewEngine = require('./js/config/viewEngine');
const setLocals  = require('./js/middleware/setLocals');

// route modules
const authRoutes      = require('./js/routes/authRoutes');
const dashboardRoutes = require('./js/routes/dashboardRoutes');
const settingsRoutes  = require('./js/routes/settingsRoutes');
const habitsRoutes    = require('./js/routes/habitsRoutes');
const statisticsRoutes = require('./js/routes/statisticsRoutes');
const friendsRoutes   = require('./js/routes/friendsRoutes');

const app = express();

// static & parsers
app.use(express.static(path.join(__dirname,'..','public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// templating
viewEngine(app);

// locals & routes
app.use(setLocals);
app.use(authRoutes);
app.use(dashboardRoutes);
app.use(settingsRoutes);
app.use(habitsRoutes);
app.use(statisticsRoutes);
app.use('/friends', friendsRoutes);

// catch‑all redirect
app.get('/', (req, res) => res.redirect('/login'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

