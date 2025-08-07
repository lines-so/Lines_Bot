from dataclasses import dataclass
import os


@dataclass
class Config:
    bot_token: str
    webapp_url: str


def load_config() -> Config:
    """Load configuration from environment variables."""
    token = os.environ.get("BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN environment variable is required")
    webapp_url = os.environ.get("WEBAPP_URL", "https://example.com")
    return Config(bot_token=token, webapp_url=webapp_url)
