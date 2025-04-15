CREATE TABLE users (
  user_id SERIAL PRIMARY KEY NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  phone VARCHAR(10),
  email_notif BOOLEAN DEFAULT TRUE,
  phone_notif BOOLEAN DEFAULT FALSE,
  show_profile BOOLEAN DEFAULT FALSE,
  dark_mode BOOLEAN DEFAULT FALSE
);

CREATE TABLE habits (
  habit_id SERIAL PRIMARY KEY NOT NULL,
  habit_name VARCHAR(20) NOT NULL,
  Description VARCHAR(200),
  weekday INT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  time_slot INT NOT NULL CHECK (time_slot >= 0 AND time_slot < 24),
  counter INT DEFAULT 0
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

CREATE TABLE friends (
 	Sender INT NOT NULL,
 	Receiver INT NOT NULL,
 	Mutual BOOLEAN DEFAULT FALSE,
 	FOREIGN KEY (sender) REFERENCES users (user_id) ON DELETE CASCADE,
  FOREIGN KEY (receiver) REFERENCES users (user_id) ON DELETE CASCADE
);
