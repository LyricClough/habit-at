// src/js/config/db.js
const pgp = require('pg-promise')();

// Use DATABASE_URL if provided (e.g., Render internal/external URL), otherwise fall back to individual env vars
const connection = process.env.DATABASE_URL
  ? process.env.DATABASE_URL
  : {
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    };

const db = pgp(connection);

// Test connection
db.connect()
  .then(c => {
    console.log('DB ok');
    c.done();
  })
  .catch(e => console.error('DB ERR', e));

module.exports = db;
