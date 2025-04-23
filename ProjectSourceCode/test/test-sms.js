// test-send-sms.js
require('dotenv').config();
const { sendSMS } = require('../src/js/services/notificationService');

sendSMS('+18889047358', 'Habit@ Test SMS — if you get this, Twilio is working!')
    .then(() => {
        console.log('✅ Test SMS sent');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Failed to send test SMS:', err);
        process.exit(1);
    });
