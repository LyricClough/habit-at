// index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const MemoryStore = session.MemoryStore; // Add this line before your session middleware

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

// index.js, at top, right after creating `app`
app.set('trust proxy', 1);


// static & parsers
app.use(express.static(path.join(__dirname,'..','public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// // session
// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false
// }));

// session with explicit MemoryStore

app.use(session({
  name: 'sid',                  // optional: avoid default name clashes
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,                  // trust X-Forwarded-Proto for secure cookies
  store: new MemoryStore(),     // or a production store like connect-redis
  cookie: {
    secure: true,               // only over HTTPS
    httpOnly: true,             // not accessible via JS
    sameSite: 'none',           // allow cross-site (modern Chrome requires None+Secure)
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
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

