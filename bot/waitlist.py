import sqlite3
from contextlib import closing


class Waitlist:
    def __init__(self, database_path: str) -> None:
        self.database_path = database_path
        with closing(sqlite3.connect(database_path)) as database:
            database.execute("""
                CREATE TABLE IF NOT EXISTS waitlist (
                    telegram_user_id INTEGER PRIMARY KEY,
                    reason TEXT,
                    registered_at TEXT
                )
            """)

    def start(self, user_id: int) -> bool:
        with closing(sqlite3.connect(self.database_path)) as database, database:
            database.execute("""
                INSERT INTO waitlist (telegram_user_id) VALUES (?)
                ON CONFLICT (telegram_user_id) DO NOTHING
            """, (user_id,))
            reason, = database.execute("""
                SELECT reason FROM waitlist WHERE telegram_user_id = ?
            """, (user_id,)).fetchone()
            return reason is None

    def register(self, user_id: int, reason: str) -> bool:
        with closing(sqlite3.connect(self.database_path)) as database, database:
            updated = database.execute("""
                UPDATE waitlist
                SET reason = ?, registered_at = CURRENT_TIMESTAMP
                WHERE telegram_user_id = ? AND reason IS NULL
            """, (reason, user_id))
            return updated.rowcount == 1
