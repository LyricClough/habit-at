-- Sample users with plain text password for easy testing
-- The password for all test users is 'password123'
INSERT INTO users (username,email,password,phone) VALUES
  ('testuser','habitat044@gmail.com',
   '$2a$10$N9qo8uLOickgx2ZMRZo5i.e7pAt4EvsC1iBJ7ennZ/3o5O8kX9iTy','5555555555'),
  ('johndoe','john@example.com',
   '$2a$10$N9qo8uLOickgx2ZMRZo5i.e7pAt4EvsC1iBJ7ennZ/3o5O8kX9iTy','5551234567'),
  ('janedoe','jane@example.com',
   '$2a$10$N9qo8uLOickgx2ZMRZo5i.e7pAt4EvsC1iBJ7ennZ/3o5O8kX9iTy','5559876543');
-- Sample friend relationships
INSERT INTO friends (sender, receiver, mutual)
VALUES
  (1, 2, TRUE),  -- testuser and johndoe are friends
  (2, 1, TRUE),  -- reciprocal friendship
  (1, 3, TRUE),  -- testuser and janedoe are friends
  (3, 1, TRUE),  -- reciprocal friendship
  (2, 3, FALSE); -- johndoe sent request to janedoe (not mutual yet)
  -- ON CONFLICT ON CONSTRAINT "idx_friends_pair" DO NOTHING;

-- Sample habit categories
INSERT INTO habit_categories (category_name, color, icon)
VALUES
  ('Health', '#4ADE80', 'heart'), -- Green
  ('Productivity', '#3B82F6', 'laptop'), -- Blue
  ('Learning', '#8B5CF6', 'book'), -- Purple
  ('Fitness', '#EF4444', 'dumbbell'), -- Red
  ('Mindfulness', '#EC4899', 'brain'); -- Pink

-- Sample habits with status field and categories
-- Status values: 0=inactive, 1=active, 2=in-progress, 3=complete
INSERT INTO habits (habit_name, description, weekday, time_slot, counter, status, category_id)
VALUES 
  ('Morning Run', 'Run for 30 minutes', 1, 8, 5, 1, 4),  -- Monday, 8AM, Active, Fitness
  ('Read Book', 'Read for 15 minutes', 2, 21, 3, 1, 3),  -- Tuesday, 9PM, Active, Learning
  ('Meditate', 'Meditate for 10 minutes', 3, 7, 10, 2, 5),  -- Wednesday, 7AM, In Progress, Mindfulness
  ('Study Spanish', 'Practice vocabulary', 4, 18, 2, 1, 3),  -- Thursday, 6PM, Active, Learning
  ('Water Plants', 'Water all houseplants', 5, 17, 0, 0, NULL),  -- Friday, 5PM, Inactive, No category
  ('Call Parents', 'Weekly call home', 0, 15, 20, 1, 5),  -- Sunday, 3PM, Active, Mindfulness
  ('Take Vitamins', 'Daily supplements', 0, 9, 30, 1, 1),  -- Sunday, 9AM, Active, Health
  ('Gym Workout', 'Strength training', 1, 17, 7, 1, 4),  -- Monday, 5PM, Active, Fitness
  ('Code Practice', 'Work on side project', 2, 20, 15, 2, 2),  -- Tuesday, 8PM, In Progress, Productivity
  ('Weekly Review', 'Plan for next week', 6, 10, 12, 1, 2),  -- Saturday, 10AM, Active, Productivity
  ('Morning Yoga', 'Stretch routine', 3, 6, 4, 1, 4),  -- Wednesday, 6AM, Active, Fitness
  ('Budget Update', 'Track expenses', 4, 21, 6, 1, 2),  -- Thursday, 9PM, Active, Productivity
  ('Clean Kitchen', 'Deep clean', 5, 19, 0, 0, 2),  -- Friday, 7PM, Inactive, Productivity
  ('Weekend Hike', 'Outdoor activity', 6, 11, 8, 1, 4),  -- Saturday, 11AM, Active, Fitness
  ('Journal', 'Daily reflection', 0, 22, 45, 3, 5);  -- Sunday, 10PM, Complete, Mindfulness

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
  (CURRENT_DATE),
  (CURRENT_DATE - INTERVAL '1 day'),
  (CURRENT_DATE - INTERVAL '2 days'),
  (CURRENT_DATE - INTERVAL '3 days'),
  (CURRENT_DATE - INTERVAL '4 days'),
  (CURRENT_DATE - INTERVAL '5 days'),
  (CURRENT_DATE - INTERVAL '6 days'),
  (CURRENT_DATE - INTERVAL '7 days'),
  (CURRENT_DATE - INTERVAL '8 days'),
  (CURRENT_DATE - INTERVAL '9 days'),
  (CURRENT_DATE - INTERVAL '10 days');

-- Link habits to history (completed habits) - more comprehensive history for better statistics
INSERT INTO habits_to_history (habit_id, history_id)
VALUES 
  (1, 1), -- Morning Run completed today
  (2, 1), -- Read Book completed today
  (3, 1), -- Meditate completed today
  (7, 1), -- Take Vitamins completed today
  (1, 2), -- Morning Run completed 1 day ago
  (2, 2), -- Read Book completed 1 day ago
  (3, 2), -- Meditate completed 1 day ago
  (7, 2), -- Take Vitamins completed 1 day ago
  (1, 3), -- Morning Run completed 2 days ago
  (3, 3), -- Meditate completed 2 days ago
  (7, 3), -- Take Vitamins completed 2 days ago
  (1, 4), -- Morning Run completed 3 days ago
  (7, 4), -- Take Vitamins completed 3 days ago
  (1, 5), -- Morning Run completed 4 days ago
  (7, 5), -- Take Vitamins completed 4 days ago
  (8, 6), -- Gym Workout completed 5 days ago
  (10, 7), -- Weekly Review completed 6 days ago
  (11, 8), -- Morning Yoga completed 7 days ago
  (14, 9), -- Weekend Hike completed 8 days ago
  (15, 10); -- Journal completed 9 days ago

-- Sample streak data for each user
INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date)
VALUES
  (1, 4, 7, CURRENT_DATE), -- testuser has a current streak of 4 days, longest was 7
  (2, 0, 3, CURRENT_DATE - INTERVAL '2 days'), -- johndoe broke streak 2 days ago, longest was 3
  (3, 9, 9, CURRENT_DATE); -- janedoe has an ongoing 9-day streak

-- Sample user statistics snapshots
INSERT INTO user_statistics (user_id, date, completion_rate, total_completions, active_habits)
VALUES
  -- Last 3 days of stats for testuser
  (1, CURRENT_DATE, 57, 13, 7),
  (1, CURRENT_DATE - INTERVAL '1 day', 56, 12, 7),
  (1, CURRENT_DATE - INTERVAL '2 days', 54, 10, 6),
  
  -- Last 3 days of stats for johndoe
  (2, CURRENT_DATE, 0, 0, 5),
  (2, CURRENT_DATE - INTERVAL '1 day', 0, 0, 5),
  (2, CURRENT_DATE - INTERVAL '2 days', 10, 1, 5),
  
  -- Last 3 days of stats for janedoe
  (3, CURRENT_DATE, 66, 2, 3),
  (3, CURRENT_DATE - INTERVAL '1 day', 66, 2, 3),
  (3, CURRENT_DATE - INTERVAL '2 days', 66, 2, 3);

-- Sample habit trend data for key habits
INSERT INTO habit_trends (habit_id, user_id, date, completion_rate, consistency_score)
VALUES
  -- Morning Run trends for testuser
  (1, 1, CURRENT_DATE, 80, 85),
  (1, 1, CURRENT_DATE - INTERVAL '7 days', 70, 75),
  (1, 1, CURRENT_DATE - INTERVAL '14 days', 60, 65),
  
  -- Take Vitamins trends for testuser
  (7, 1, CURRENT_DATE, 95, 90),
  (7, 1, CURRENT_DATE - INTERVAL '7 days', 90, 85),
  (7, 1, CURRENT_DATE - INTERVAL '14 days', 85, 80),
  
  -- Gym Workout trends for johndoe
  (8, 2, CURRENT_DATE, 65, 60),
  (8, 2, CURRENT_DATE - INTERVAL '7 days', 70, 65),
  (8, 2, CURRENT_DATE - INTERVAL '14 days', 75, 70),
  
  -- Journal trends for janedoe
  (15, 3, CURRENT_DATE, 90, 95),
  (15, 3, CURRENT_DATE - INTERVAL '7 days', 85, 90),
  (15, 3, CURRENT_DATE - INTERVAL '14 days', 80, 85);