import asyncio
import json
import logging

from aiogram import Bot, Dispatcher, Router, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from .config import load_config
from .lines import LineManager

router = Router()
lines = LineManager()


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    config = load_config()
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Open Lines",
                    web_app=WebAppInfo(url=config.webapp_url),
                )
            ]
        ]
    )
    await message.answer(
        "Welcome to Lines Bot! Use the button below to open the web app.",
        reply_markup=keyboard,
    )


@router.message(F.web_app_data)
async def on_web_app_data(message: Message) -> None:
    """Handle data sent back from Telegram WebApp."""
    try:
        data = json.loads(message.web_app_data.data)
    except Exception:  # pragma: no cover - robust to malformed data
        await message.answer("Received invalid data from web app.")
        return

    action = data.get("action")
    if action == "create_line":
        text = data.get("text", "").strip()
        if not text:
            await message.answer("No text received from web app.")
            return
        lines.add_line(message.from_user.id, text)
        await message.answer(f"Line saved: {text}")
    else:
        await message.answer("Unknown action from web app.")


@router.message(Command("lines"))
async def cmd_lines(message: Message) -> None:
    """List stored lines for the user."""
    user_lines = lines.list_lines(message.from_user.id)
    if not user_lines:
        await message.answer("You have no lines yet. Use the web app to add one.")
        return
    formatted = "\n".join(f"{i+1}. {t}" for i, t in enumerate(user_lines))
    await message.answer(f"Your lines:\n{formatted}")


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    config = load_config()
    bot = Bot(token=config.bot_token)
    dp = Dispatcher()
    dp.include_router(router)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
