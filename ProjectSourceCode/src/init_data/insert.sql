-- INSERT INTO users (username, email, password)
-- VALUES ($1, $2, $3)
-- RETURNING username, email;

-- CREATE VIEW new_habit AS (
--     INSERT INTO habits (habit_name, Description, weekday, time_slot, counter) VALUES ('testhabit', 'do something', 2, 5, 0) RETURNING habit_id
-- );

-- INSERT INTO users_to_habits (user_id, habit_id) VALUES (1, new_habit);

WITH new_habit AS (
    INSERT INTO habits (habit_name, description, weekday, time_slot, counter) 
    VALUES ('testhabit', 'do something', 2, 5, 0) 
    RETURNING habit_id
)
INSERT INTO users_to_habits (user_id, habit_id) 
SELECT 1, habit_id FROM new_habit;