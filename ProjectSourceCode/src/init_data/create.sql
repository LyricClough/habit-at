CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL
);

CREATE TABLE habits (
  user_habit_id SERIAL PRIMARY KEY,
  habit_name VARCHAR(100) NOT NULL,
  description TEXT,
  weekday INT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  time_slot INT NOT NULL CHECK (time_slot >= 0 AND time_slot < 24)
);

CREATE TABLE users_to_habits (
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  user_habit_id INT REFERENCES habits(user_habit_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, user_habit_id)
);
