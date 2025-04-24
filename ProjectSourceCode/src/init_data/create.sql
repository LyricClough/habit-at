/* =========================
   insert.sql  —  full schema
   ========================= */

/* ---------- USERS ---------- */
CREATE TABLE users (
  user_id        SERIAL PRIMARY KEY,
  username       VARCHAR(100) NOT NULL UNIQUE,
  email          VARCHAR(100) NOT NULL UNIQUE,
  password       VARCHAR(100) NOT NULL,
  phone          VARCHAR(10),
  email_notif    BOOLEAN DEFAULT TRUE,
  phone_notif    BOOLEAN DEFAULT FALSE,
  dark_mode      BOOLEAN DEFAULT FALSE,
  daily_digest   BOOLEAN DEFAULT FALSE,
  weekly_report  BOOLEAN DEFAULT FALSE,
  digest_time    TIME    DEFAULT '08:00:00',
  report_day     INT     DEFAULT 0,
  show_profile   BOOLEAN DEFAULT TRUE
);

/* ---------- FRIENDS ---------- */
CREATE TABLE friends (
  friendship_id  SERIAL PRIMARY KEY,
  sender         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  receiver       INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  mutual         BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- /* Prevent duplicate friend-pairs (A,B) / (B,A)            */
-- CREATE UNIQUE INDEX idx_friends_pair
--   ON friends (LEAST(sender,receiver), GREATEST(sender,receiver));

/* ---------- HABIT CATEGORIES ---------- */
CREATE TABLE habit_categories (
  category_id   SERIAL PRIMARY KEY,
  category_name VARCHAR(50) NOT NULL,
  color         VARCHAR(20) NOT NULL DEFAULT '#4F46E5',
  icon          VARCHAR(50)
);

/* ---------- HABITS ---------- */
CREATE TABLE habits (
  habit_id      SERIAL PRIMARY KEY,
  habit_name    VARCHAR(60) NOT NULL,               -- ⬆ wider than 20
  description   VARCHAR(200),
  weekday       INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  time_slot     INT CHECK (time_slot BETWEEN 0 AND 23),
  counter       INT DEFAULT 0,
  status        INT DEFAULT 1 CHECK (status BETWEEN 0 AND 3),
  is_pinned     BOOLEAN DEFAULT FALSE,              -- ⬅ new flag
  category_id   INT REFERENCES habit_categories(category_id) ON DELETE SET NULL
);

/* ---------- USER ↔ HABIT ---------- */
CREATE TABLE users_to_habits (
  user_id  INT NOT NULL REFERENCES users(user_id)  ON DELETE CASCADE,
  habit_id INT NOT NULL REFERENCES habits(habit_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, habit_id)                  -- ❱ unique pair
);

/* ---------- HISTORY (one row per calendar date) ---------- */
CREATE TABLE history (
  history_id SERIAL PRIMARY KEY,
  date       DATE NOT NULL UNIQUE                   -- ❱ ON CONFLICT works
);

/* ---------- HABIT COMPLETIONS ---------- */
CREATE TABLE habits_to_history (
  habit_id   INT  NOT NULL REFERENCES habits(habit_id)   ON DELETE CASCADE,
  history_id INT  NOT NULL REFERENCES history(history_id)ON DELETE CASCADE,
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (habit_id, history_id)               -- ❱ ON CONFLICT (habit_id,history_id)
);

/* ---------- STREAKS ---------- */
CREATE TABLE streaks (
  streak_id          SERIAL PRIMARY KEY,
  user_id            INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  current_streak     INT DEFAULT 0,
  longest_streak     INT DEFAULT 0,
  last_activity_date DATE
);

/* ---------- USER STATISTICS ---------- */
CREATE TABLE user_statistics (
  stat_id            SERIAL PRIMARY KEY,
  user_id            INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  date               DATE NOT NULL,
  completion_rate    INT  DEFAULT 0,
  total_completions  INT  DEFAULT 0,
  active_habits      INT  DEFAULT 0
);

/* ---------- HABIT TRENDS ---------- */
CREATE TABLE habit_trends (
  trend_id          SERIAL PRIMARY KEY,
  habit_id          INT NOT NULL REFERENCES habits(habit_id) ON DELETE CASCADE,
  user_id           INT NOT NULL REFERENCES users(user_id)  ON DELETE CASCADE,
  date              DATE NOT NULL,
  completion_rate   INT DEFAULT 0,
  consistency_score INT DEFAULT 0
);

/* ---------- HABIT REMINDERS ---------- */
CREATE TABLE habit_reminders (
  reminder_id         SERIAL PRIMARY KEY,
  habit_id            INT NOT NULL REFERENCES habits(habit_id) ON DELETE CASCADE,
  user_id             INT NOT NULL REFERENCES users(user_id)  ON DELETE CASCADE,
  reminder_time       TIME NOT NULL,
  days_of_week        VARCHAR(20) DEFAULT '0,1,2,3,4,5,6',
  notification_method VARCHAR(10) DEFAULT 'email',
  enabled             BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* ---------- REMINDER LOGS ---------- */
CREATE TABLE reminder_logs (
  log_id            SERIAL PRIMARY KEY,
  reminder_id       INT REFERENCES habit_reminders(reminder_id) ON DELETE SET NULL,
  user_id           INT NOT NULL REFERENCES users(user_id)      ON DELETE CASCADE,
  habit_id          INT REFERENCES habits(habit_id)             ON DELETE SET NULL,
  notification_type VARCHAR(20) NOT NULL,
  sent_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivery_method   VARCHAR(10) NOT NULL,
  status            VARCHAR(10) DEFAULT 'sent'
);

/* ---------- INDEXES FOR SPEED ---------- */
CREATE INDEX idx_habits_category     ON habits(category_id);
CREATE INDEX idx_user_habits         ON users_to_habits(user_id, habit_id);
CREATE INDEX idx_habit_history       ON habits_to_history(habit_id, history_id);
CREATE INDEX idx_user_stats_date     ON user_statistics(user_id, date);
CREATE INDEX idx_friends_sender      ON friends(sender);
CREATE INDEX idx_friends_receiver    ON friends(receiver);
CREATE INDEX idx_habit_reminders_user  ON habit_reminders(user_id);
CREATE INDEX idx_habit_reminders_habit ON habit_reminders(habit_id);
CREATE INDEX idx_reminder_logs_date  ON reminder_logs(sent_at);
CREATE INDEX idx_reminder_logs_user  ON reminder_logs(user_id);
