CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(10),
    email_notif BOOLEAN DEFAULT TRUE,
    phone_notif BOOLEAN DEFAULT FALSE,
    show_profile BOOLEAN DEFAULT FALSE,
    dark_mode BOOLEAN DEFAULT FALSE
);