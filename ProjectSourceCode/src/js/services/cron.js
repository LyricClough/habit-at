// // src/cron.js
// const cron = require('node-cron');
// const { notifyUser, runBatch } = require('./services/notifications');

// cron.schedule('* * * * *', async () => {
//   try {
//     await runBatch();  
//   } catch (err) {
//     console.error('Error in runBatch:', err);
//   }
// }, {
//   timezone: process.env.TIMEZONE || 'UTC'
// });

// cron.schedule('0 8 * * *', async () => {
//   try {
//     await runBatch('daily');   
//   } catch (err) {
//     console.error('Daily digest failed:', err);
//   }
// }, {
//   timezone: process.env.TIMEZONE || 'UTC'
// });

// cron.schedule('0 9 * * 1', async () => {
//   try {
//     await runBatch('weekly');
//   } catch (err) {
//     console.error('Weekly report failed:', err);
//   }
// }, {
//   timezone: process.env.TIMEZONE || 'UTC'
// });
