// src/js/controllers/authController.js
const bcrypt = require('bcryptjs');
const db = require('../config/db');

exports.showRegister = (req, res) => {
  res.render('pages/register', { hideNav: true });
};

exports.register = async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const insertQ = `
      INSERT INTO users (username, email, password, phone)
      VALUES ($1, $2, $3, $4)
      RETURNING username, email;
    `;
    await db.one(insertQ, [username, email, hash, phone]);

    return res.redirect('/login');
  } catch (error) {
    console.error(error);
    let message = 'Could not register, try again.';
    if (error.code === '23505') {
      if (error.constraint === 'users_username_key') {
        message = 'Username already exists. Please choose a different one.';
      } else if (error.constraint === 'users_email_key') {
        message = 'An account with this email already exists.';
      }
    }
    return res
      .status(400)
      .render('pages/register', { hideNav: true, message, error: true });
  }
};

exports.showLogin = (req, res) => {
  res.render('pages/login', { layout: 'main', hideNav: true });
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.oneOrNone(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (!user) {
      throw new Error('Incorrect username or password.');
    }
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      throw new Error('Incorrect username or password.');
    }

    req.session.user = user;
    req.session.save(() => res.redirect('/dashboard'));
  } catch (err) {
    const message =
      err.message === 'Incorrect username or password.'
        ? err.message
        : 'Something went wrong. Try again.';
    res
      .status(400)
      .render('pages/login', { hideNav: true, message, error: true });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};
