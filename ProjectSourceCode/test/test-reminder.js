require('dotenv').config();
const db            = require('../src/js/config/db');
const { sendReminder } = require('../src/js/services/notificationService');

(async () => {
  const user = await db.one(
    'SELECT * FROM users WHERE username=$1',
    ['testuser']
  );
  const habit = { habit_name:'Test Habit', description:'Email debug' };
  const reminderData = { notification_method:'email', reminder_id:null };
  const { success, emailResult, error } = 
    await sendReminder({ user, habit, reminderData, type:'habit' });
  console.log(success ? '✅ Sent' : '❌ Failed', emailResult || error);
  process.exit(success ? 0 : 1);
})();
