// // src/services/notifications.js

// // Load environment variables (DB credentials, etc.)
// require('dotenv').config();

// const pgp = require('pg-promise')();
// const db = pgp({
//   host: process.env.DB_HOST || 'db',                // Docker service name or localhost
//   port: 5432,                                        // Default Postgres port
//   database: process.env.POSTGRES_DB,                 // from .env
//   user: process.env.POSTGRES_USER,                   // from .env
//   password: process.env.POSTGRES_PASSWORD,           // from .env
// });

// // const { sendMail } = require('./services/mailer.js');             // your SMTP helper

// /**
//  * Send notifications (email and/or SMS) to a single user.
//  * @param {Object} user  Full user row from the database.
//  */
// async function notifyUser(user) {
//   // 1. Fetch the user's habits for today
//   const habits = await db.any(
//     `SELECT h.habit_name
//        FROM habits h
//        JOIN users_to_habits uh ON h.habit_id = uh.habit_id
//       WHERE uh.user_id = $1`,
//     [user.user_id]
//   );

//   // 2. Send email if the user opted in
//   if (user.email_notif) {
//     const html = `
//       <h1>Habit@ Daily Summary</h1>
//       <p>Hi ${user.username},</p>
//       <p>You have <strong>${habits.length}</strong> habit(s) today:</p>
//       <ul>
//         ${habits.map(h => `<li>${h.habit_name}</li>`).join('')}
//       </ul>
//       <p>Keep up the great work!</p>
//     `;

//     await sendMail({
//       to: user.email,
//       subject: 'Your Habit@ Daily Summary',
//       html,
//     });
//   }

// //   // 3. Send SMS if the user opted in and has a phone number
// //   if (user.phone_notif && user.phone) {
// //     const body = `Hi ${user.username}! You have ${habits.length} habit(s) to complete today.`;
// //     await sendSMS({ to: user.phone, body });
// //   }
// }

// /**
//  * Run a batch job sending notifications to all users
//  * whose notification hour matches the current hour.
//  */
// async function runBatch() {
//   const now = new Date();
//   const currentHour = now.getHours();

//   // Fetch users scheduled for this hour and who still have email or SMS enabled
//   const users = await db.any(
//     `SELECT * FROM users
//       WHERE notif_hour = $1
//         AND (email_notif = TRUE OR phone_notif = TRUE)`,
//     [currentHour]
//   );

//   for (const user of users) {
//     try {
//       await notifyUser(user);
//       console.log(`🔔 Notified user ${user.user_id}`);
//     } catch (err) {
//       console.error(`⚠️  Failed to notify user ${user.user_id}:`, err);
//     }
//   }
// }

// module.exports = {
//   notifyUser,
//   runBatch,
// };