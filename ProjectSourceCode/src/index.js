// src/index.js
require('dotenv').config();

const express       = require('express');
const path          = require('path');
const session       = require('express-session');
const bodyParser    = require('body-parser');
const MemoryStore   = session.MemoryStore;      // ❗ dev-only, swap for Redis/PG in prod

// view / middleware helpers
const viewEngine = require('./js/config/viewEngine');
const setLocals  = require('./js/middleware/setLocals');

// route modules
const authRoutes       = require('./js/routes/authRoutes');
const dashboardRoutes  = require('./js/routes/dashboardRoutes');
const settingsRoutes   = require('./js/routes/settingsRoutes');
const habitsRoutes     = require('./js/routes/habitsRoutes');
const statisticsRoutes = require('./js/routes/statisticsRoutes');
const friendsRoutes    = require('./js/routes/friendsRoutes');
const notificationRoutes = require('./js/routes/notificationsRoutes');
// const apiRoutes       = require('./js/routes/apiRoutes');

// services
const schedulerService = require('./js/services/schedulerService');

const app    = express();
const isProd = process.env.NODE_ENV === 'production';

/* ----------  static & parsers  ---------- */
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/* ----------  sessions  ---------- */
// behind Render's HTTPS proxy we *do* want secure cookies,
// but locally we need them to work over plain http://localhost
if (isProd) app.set('trust proxy', 1);   // trust X-Forwarded-Proto

app.use(session({
  name: 'sid',                           // cookie name (was "connect.sid")
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: isProd,                         // only trust proxy headers in prod
  store: new MemoryStore(),              // swap out for a real store in prod
  cookie: {
    secure:   isProd,                    // HTTPS only in prod, http OK locally
    sameSite: isProd ? 'none' : 'lax',   // 'none' requires secure=true
    httpOnly: true,
    maxAge:   24 * 60 * 60 * 1000        // 24 h
  }
}));

/* ----------  templating & locals  ---------- */
viewEngine(app);
app.use(setLocals);                      // makes req.session.user available to views

/* ----------  routes  ---------- */
app.use(authRoutes);
app.use(dashboardRoutes);
app.use(settingsRoutes);
app.use(habitsRoutes);
app.use(statisticsRoutes);
app.use('/friends', friendsRoutes);
app.use(notificationRoutes);

// default route – send users to login
app.get('/', (_req, res) => res.redirect('/login'));

/* ----------  start server  ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Listening on ${PORT} (${isProd ? 'prod' : 'dev'})`);
  
  // Initialize the scheduler for reminders
  await schedulerService.initializeScheduler();
});
