// src/js/config/db.js
const pgp = require('pg-promise')();

const db = pgp({
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

db.connect()
  .then(c => { console.log('DB ok'); c.done(); })
  .catch(e => console.error('DB ERR', e));

module.exports = db;
