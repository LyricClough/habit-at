// src/js/services/demoScheduler.js
const schedule = require('node-schedule');
const { sendSMS } = require('./notificationService');

// // Schedule for tomorrow at 9:00 AM local time
// const demo = new Date();
// demo.setDate(demo.getDate() + 1);
// demo.setHours(10, 15, 0, 0);

// schedule.scheduleJob(demo, async () => {
//   console.log(` Demo SMS firing at ${new Date().toLocaleString()}`);
//   const res = await sendSMS('+17204689539',
//     'Habit@ Demo: one free Textbelt SMS per day!');
//   console.log('Demo SMS result:', res);
// });

const demo = new Date();
demo.setMinutes(demo.getMinutes() + 1);    // one minute from now
demo.setSeconds(0, 0);

schedule.scheduleJob(demo, async () => {
  console.log(` Demo SMS firing at ${new Date().toLocaleString()}`);
  const res = await sendSMS('+17204689539',
    'Habit@ Demo: one free Textbelt SMS per day!');
  console.log('Demo SMS result:', res);
});