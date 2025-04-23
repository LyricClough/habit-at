CREATE TABLE users (
  user_id SERIAL PRIMARY KEY NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  phone VARCHAR(10),
  email_notif BOOLEAN DEFAULT TRUE,
  phone_notif BOOLEAN DEFAULT FALSE,
  dark_mode BOOLEAN DEFAULT FALSE,
  daily_digest BOOLEAN DEFAULT FALSE,
  weekly_report BOOLEAN DEFAULT FALSE,
  digest_time TIME DEFAULT '08:00:00',
  report_day INT DEFAULT 0,
  show_profile BOOLEAN DEFAULT TRUE
);

-- Friends relationship table
CREATE TABLE friends (
  friendship_id SERIAL PRIMARY KEY NOT NULL,
  sender INT NOT NULL,
  receiver INT NOT NULL,
  mutual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender) REFERENCES users (user_id) ON DELETE CASCADE,
  FOREIGN KEY (receiver) REFERENCES users (user_id) ON DELETE CASCADE
);

-- Habit categories table for better organization and statistics grouping
CREATE TABLE habit_categories (
  category_id SERIAL PRIMARY KEY NOT NULL,
  category_name VARCHAR(50) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#4F46E5', -- Default indigo color
  icon VARCHAR(50) -- Optional icon name/class
);

CREATE TABLE habits (
  habit_id SERIAL PRIMARY KEY NOT NULL,
  habit_name VARCHAR(20) NOT NULL,
  Description VARCHAR(200),
  weekday INT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  time_slot INT NOT NULL CHECK (time_slot >= 0 AND time_slot < 24),
  counter INT DEFAULT 0,
  status INT DEFAULT 1 CHECK (status >= 0 AND status <= 3),
  category_id INT,
  FOREIGN KEY (category_id) REFERENCES habit_categories (category_id) ON DELETE SET NULL
);

CREATE TABLE users_to_habits (
  user_id INT NOT NULL,
  habit_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
 	FOREIGN KEY (habit_id) REFERENCES habits (habit_id) ON DELETE CASCADE
);

CREATE TABLE history (
  history_id SERIAL PRIMARY KEY NOT NULL,
  date DATE NOT NULL
);

CREATE TABLE habits_to_history (
	habit_id INT NOT NULL,
  history_id INT NOT NULL,
 	FOREIGN KEY (habit_id) REFERENCES habits (habit_id) ON DELETE CASCADE,
  FOREIGN KEY (history_id) REFERENCES history (history_id) ON DELETE CASCADE
);

-- Table to store user streak data
CREATE TABLE streaks (
  streak_id SERIAL PRIMARY KEY NOT NULL,
  user_id INT NOT NULL,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- Table to store user statistics snapshots for tracking progress over time
CREATE TABLE user_statistics (
  stat_id SERIAL PRIMARY KEY NOT NULL,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  completion_rate INT DEFAULT 0, -- Percentage of habits completed
  total_completions INT DEFAULT 0, -- Total habit completions
  active_habits INT DEFAULT 0, -- Number of active habits
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- Table to store tracking data for growth insights
CREATE TABLE habit_trends (
  trend_id SERIAL PRIMARY KEY NOT NULL,
  habit_id INT NOT NULL,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  completion_rate INT DEFAULT 0,
  consistency_score INT DEFAULT 0,
  FOREIGN KEY (habit_id) REFERENCES habits (habit_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- Table to store habit reminders
CREATE TABLE habit_reminders (
  reminder_id SERIAL PRIMARY KEY NOT NULL,
  habit_id INT NOT NULL,
  user_id INT NOT NULL,
  reminder_time TIME NOT NULL,
  days_of_week VARCHAR(20) DEFAULT '0,1,2,3,4,5,6', -- Comma-separated days (0 = Sunday)
  notification_method VARCHAR(10) DEFAULT 'email', -- 'email', 'sms', or 'both'
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (habit_id) REFERENCES habits (habit_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- Table to log sent reminders to avoid duplicates
CREATE TABLE reminder_logs (
  log_id SERIAL PRIMARY KEY NOT NULL,
  reminder_id INT, -- Can be NULL for system notifications like digests
  user_id INT NOT NULL,
  habit_id INT, -- Can be NULL for system notifications
  notification_type VARCHAR(20) NOT NULL, -- 'habit', 'digest', 'report'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivery_method VARCHAR(10) NOT NULL, -- 'email', 'sms', or 'both'
  status VARCHAR(10) DEFAULT 'sent', -- 'sent', 'failed', 'delivered'
  FOREIGN KEY (reminder_id) REFERENCES habit_reminders (reminder_id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  FOREIGN KEY (habit_id) REFERENCES habits (habit_id) ON DELETE SET NULL
);

-- Create indexes for common queries to improve performance
CREATE INDEX idx_habits_category ON habits(category_id);
CREATE INDEX idx_history_date ON history(date);
CREATE INDEX idx_user_habits ON users_to_habits(user_id, habit_id);
CREATE INDEX idx_habit_history ON habits_to_history(habit_id, history_id);
CREATE INDEX idx_user_stats_date ON user_statistics(user_id, date);
CREATE INDEX idx_friends_sender ON friends(sender);
CREATE INDEX idx_friends_receiver ON friends(receiver);
CREATE INDEX idx_habit_reminders_user ON habit_reminders(user_id);
CREATE INDEX idx_habit_reminders_habit ON habit_reminders(habit_id);
CREATE INDEX idx_reminder_logs_date ON reminder_logs(sent_at);
CREATE INDEX idx_reminder_logs_user ON reminder_logs(user_id);

