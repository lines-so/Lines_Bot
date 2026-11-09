CREATE TABLE waitlist (
    telegram_user_id INTEGER PRIMARY KEY,
    reason TEXT,
    registered_at TEXT,
    registration_update_id INTEGER
);
