// src/js/config/db.js
const pgp = require('pg-promise')();

/**
 * We treat “Render” and “local‐docker” as two environments:
 *  – On Render we always have process.env.DATABASE_URL
 *  – Locally we connect to the docker-compose service `db`
 *
 * Render’s Postgres instances require SSL, but the local service does not.
 */
const isRender = !!process.env.DATABASE_URL;

const connection = isRender
  ? {
      // Render gives us a full connection string; pg-promise expects
      // `connectionString`
      connectionString: process.env.DATABASE_URL,
      // Render certs are self-signed → don’t verify the CA
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.POSTGRES_HOST || 'db', // service name in docker-compose
      port: Number(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB     || 'habit_at',
      user:     process.env.POSTGRES_USER   || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      ssl: false,                           // **no SSL locally**
    };

const db = pgp(connection);

// quick connectivity check
db.connect()
  .then(c => { console.log('DB ok'); c.done(); })
  .catch(err => console.error('DB ERR', err));

module.exports = db;
