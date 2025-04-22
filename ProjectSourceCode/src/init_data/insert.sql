-- INSERT INTO users (username, email, password)
-- VALUES ($1, $2, $3)
-- RETURNING username, email;

-- Sample users
INSERT INTO users (username, email, password, phone)
VALUES 
  ('testuser', 'test@example.com', '$2a$10$B7kMkf2NQmT5RA3.h44zGuWrD.3U5GCXoUf8XqhKu6L5K1gZwQYd.', '5555555555'),  -- password: password123
  ('johndoe', 'john@example.com', '$2a$10$B7kMkf2NQmT5RA3.h44zGuWrD.3U5GCXoUf8XqhKu6L5K1gZwQYd.', '5551234567'),  -- password: password123
  ('janedoe', 'jane@example.com', '$2a$10$B7kMkf2NQmT5RA3.h44zGuWrD.3U5GCXoUf8XqhKu6L5K1gZwQYd.', '5559876543');  -- password: password123

-- Sample habits with status field
-- Status values: 0=inactive, 1=active, 2=in-progress, 3=complete
INSERT INTO habits (habit_name, description, weekday, time_slot, counter, status)
VALUES 
  ('Morning Run', 'Run for 30 minutes', 1, 8, 5, 1),  -- Monday, 8AM, Active
  ('Read Book', 'Read for 15 minutes', 2, 21, 3, 1),  -- Tuesday, 9PM, Active
  ('Meditate', 'Meditate for 10 minutes', 3, 7, 10, 2),  -- Wednesday, 7AM, In Progress
  ('Study Spanish', 'Practice vocabulary', 4, 18, 2, 1),  -- Thursday, 6PM, Active
  ('Water Plants', 'Water all houseplants', 5, 17, 0, 0),  -- Friday, 5PM, Inactive
  ('Call Parents', 'Weekly call home', 0, 15, 20, 1),  -- Sunday, 3PM, Active
  ('Take Vitamins', 'Daily supplements', 0, 9, 30, 1),  -- Sunday, 9AM, Active
  ('Gym Workout', 'Strength training', 1, 17, 7, 1),  -- Monday, 5PM, Active
  ('Code Practice', 'Work on side project', 2, 20, 15, 2),  -- Tuesday, 8PM, In Progress
  ('Weekly Review', 'Plan for next week', 6, 10, 12, 1),  -- Saturday, 10AM, Active
  ('Morning Yoga', 'Stretch routine', 3, 6, 4, 1),  -- Wednesday, 6AM, Active
  ('Budget Update', 'Track expenses', 4, 21, 6, 1),  -- Thursday, 9PM, Active
  ('Clean Kitchen', 'Deep clean', 5, 19, 0, 0),  -- Friday, 7PM, Inactive
  ('Weekend Hike', 'Outdoor activity', 6, 11, 8, 1),  -- Saturday, 11AM, Active
  ('Journal', 'Daily reflection', 0, 22, 45, 3);  -- Sunday, 10PM, Complete

-- Link habits to first user (testuser)
INSERT INTO users_to_habits (user_id, habit_id)
SELECT 1, habit_id FROM habits WHERE habit_id IN (1, 2, 3, 4, 5, 6, 7);

-- Link habits to second user (johndoe)
INSERT INTO users_to_habits (user_id, habit_id)
SELECT 2, habit_id FROM habits WHERE habit_id IN (8, 9, 10, 11, 12);

-- Link habits to third user (janedoe)
INSERT INTO users_to_habits (user_id, habit_id)
SELECT 3, habit_id FROM habits WHERE habit_id IN (13, 14, 15);

-- Sample history data (for completed habits)
INSERT INTO history (date)
VALUES 
  (CURRENT_DATE - INTERVAL '1 day'),
  (CURRENT_DATE - INTERVAL '2 days'),
  (CURRENT_DATE - INTERVAL '3 days'),
  (CURRENT_DATE - INTERVAL '4 days'),
  (CURRENT_DATE - INTERVAL '5 days');

-- Link habits to history (completed habits)
INSERT INTO habits_to_history (habit_id, history_id)
VALUES 
  (1, 1), -- Morning Run completed 1 day ago
  (2, 1), -- Read Book completed 1 day ago
  (3, 2), -- Meditate completed 2 days ago
  (8, 3), -- Gym Workout completed 3 days ago
  (10, 4), -- Weekly Review completed 4 days ago
  (15, 5); -- Journal completed 5 days ago