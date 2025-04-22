// src/js/controllers/settingsController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.showSettings = (req, res) => {
  res.render('pages/settings', {
    user: req.session.user,
    hideNav: false,
  });
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { username, email, phone } = req.body;
    const user = await db.one('SELECT * FROM users WHERE user_id = $1', [
      userId,
    ]);

    // username
    if (username && username !== user.username) {
      const exists = await db.oneOrNone(
        'SELECT user_id FROM users WHERE username = $1',
        [username]
      );
      if (exists && exists.user_id !== userId) {
        throw new Error('Username already exists.');
      }
      await db.none('UPDATE users SET username = $1 WHERE user_id = $2', [
        username,
        userId,
      ]);
      req.session.user.username = username;
    }

    // email
    if (email && email !== user.email) {
      const exists = await db.oneOrNone(
        'SELECT user_id FROM users WHERE email = $1',
        [email]
      );
      if (exists && exists.user_id !== userId) {
        throw new Error('Email already in use.');
      }
      await db.none('UPDATE users SET email = $1 WHERE user_id = $2', [
        email,
        userId,
      ]);
      req.session.user.email = email;
    }

    // phone
    if (phone) {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length !== 10) {
        throw new Error('Phone number must be exactly 10 digits.');
      }
      await db.none('UPDATE users SET phone = $1 WHERE user_id = $2', [
        cleaned,
        userId,
      ]);
      req.session.user.phone = cleaned;
    }

    res.render('pages/settings', {
      user: req.session.user,
      hideNav: false,
      message: 'Profile updated successfully.',
      success: true,
    });
  } catch (err) {
    res.render('pages/settings', {
      user: req.session.user,
      hideNav: false,
      message: err.message,
      error: true,
    });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { email_notif, phone_notif, show_profile, dark_mode } = req.body;

    await db.none(
      `UPDATE users
          SET email_notif   = $1,
              phone_notif   = $2,
              show_profile  = $3,
              dark_mode     = $4
        WHERE user_id = $5`,
      [
        !!email_notif,
        !!phone_notif,
        !!show_profile,
        !!dark_mode,
        userId,
      ]
    );

    // refresh session user prefs
    Object.assign(req.session.user, {
      email_notif: !!email_notif,
      phone_notif: !!phone_notif,
      show_profile: !!show_profile,
      dark_mode: !!dark_mode,
    });

    res.render('pages/settings', {
      user: req.session.user,
      hideNav: false,
      message: 'Preferences updated successfully.',
      success: true,
    });
  } catch (err) {
    res.render('pages/settings', {
      user: req.session.user,
      hideNav: false,
      message: 'Error updating preferences.',
      error: true,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error('All password fields are required.');
    }
    if (newPassword !== confirmPassword) {
      throw new Error('New passwords do not match.');
    }

    const user = await db.one('SELECT * FROM users WHERE user_id = $1', [
      userId,
    ]);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new Error('Current password is incorrect.');

    const hash = await bcrypt.hash(newPassword, 10);
    await db.none('UPDATE users SET password = $1 WHERE user_id = $2', [
      hash,
      userId,
    ]);

    res.render('pages/settings', {
      user: req.session.user,
      hideNav: false,
      message: 'Password updated successfully.',
      success: true,
    });
  } catch (err) {
    res.render('pages/settings', {
      user: req.session.user,
      hideNav: false,
      message: err.message,
      error: true,
    });
  }
};