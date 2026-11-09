from dataclasses import dataclass
import os
from dotenv import load_dotenv


@dataclass
class Config:
    bot_token: str
    waitlist_db_path: str


def load_config() -> Config:
    """Load configuration from environment variables."""
    load_dotenv()
    token = os.environ.get("BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN environment variable is required")
    waitlist_db_path = os.environ.get("WAITLIST_DB_PATH", "db.sqlite3")
    return Config(bot_token=token, waitlist_db_path=waitlist_db_path)
