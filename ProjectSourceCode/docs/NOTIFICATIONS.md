# Habit@ Reminders & Notifications Guide

This document provides an overview of the reminders and notifications feature in Habit@, which allows users to manage how and when they receive updates about their habits.

## Features Overview

1. **Notification Types**
   - Habit Reminders: Custom reminders for individual habits
   - Daily Digest: A daily summary of habits due today
   - Weekly Report: A weekly overview of progress and streaks

2. **Notification Methods**
   - Email (via Mailgun)
   - SMS (via Twilio)
   - Both email and SMS combined

## Setup Instructions

### Prerequisites

1. **Environment Variables**
   - Make sure you have the required environment variables set in your `.env` file:
   
   ```
   # Mailgun Configuration
   EMAIL_FROM="Habit@ <no-reply@habitat.app>"
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=your-mailgun-user
   SMTP_PASS=your-mailgun-password
   
   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=your-twilio-phone-number
   
   # Application URL
   APP_URL=http://localhost:3000
   ```

2. **Database Setup**
   - Make sure your database is up to date with the required tables:
     - `habit_reminders`
     - `reminder_logs`
   - The schema changes are included in the `src/init_data/create.sql` file

### Usage

1. **Global Notification Settings**
   - Navigate to `/notifications` to access the notifications settings page
   - Configure your global preferences:
     - Notification methods (email, SMS)
     - Daily digest preferences
     - Weekly report preferences

2. **Per-Habit Reminders**
   - On the notifications page, scroll down to the per-habit reminders section
   - For each habit, you can:
     - Set a reminder time
     - Choose which days of the week to receive the reminder
     - Select the notification method (email, SMS, or both)
     - Enable or disable the reminder

## Technical Details

### Components

1. **Database Tables**
   - `habit_reminders`: Stores user preferences for habit-specific reminders
   - `reminder_logs`: Logs sent notifications to prevent duplicates

2. **Services**
   - `notificationService.js`: Handles sending emails and SMS
   - `schedulerService.js`: Manages scheduled jobs for sending notifications

3. **Scheduler**
   - Uses `node-cron` to schedule notifications at appropriate times
   - Automatically initializes when the server starts

### Email Template Example

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #4F46E5;">Habit Reminder</h1>
  <p>Hello [Username],</p>
  <p>This is a reminder to complete your habit:</p>
  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <h2 style="margin-top: 0; color: #4F46E5;">[Habit Name]</h2>
    <p>[Habit Description]</p>
  </div>
  <p>Keeping up with your habits helps build a better you!</p>
  <a href="[App URL]/habits" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Habit@</a>
</div>
```

## Troubleshooting

1. **Notifications Not Sending**
   - Check that you have valid Mailgun/Twilio credentials
   - Ensure the user has valid email/phone in their profile
   - Check the server logs for any error messages
   - Verify that the scheduler is running properly

2. **SMS Issues**
   - Make sure the user's phone number is in the correct format (10 digits)
   - Check Twilio logs for delivery issues

3. **Email Issues**
   - Verify that the Mailgun domain is active and properly set up
   - Check spam folders if emails are not being received

## Future Enhancements

1. **Additional Notification Types**
   - Achievement notifications
   - Streak milestone alerts
   - Friend activity updates

2. **Enhanced Customization**
   - More granular scheduling options
   - Custom message templates
   - Different notification frequencies (e.g., bi-weekly, monthly) 