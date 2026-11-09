import asyncio
import logging

from aiogram import Bot, Dispatcher, F, Router
from aiogram.enums import ChatType
from aiogram.filters import CommandStart
from aiogram.types import Message

from .config import load_config
from .waitlist import Waitlist

router = Router()
router.message.filter(F.chat.type == ChatType.PRIVATE)

PROMPT = "به ایده بان خوش آمدید! لطفا در یک خط بنویسید که می خواهید از ربات برای چه کاری استفاده کنید."
CONFIRMATION = "شما به لیست انتظار ما اضافه شدید. به زودی دسترسی شما باز می شود و به شما اطلاع می دهیم."
ALREADY_REGISTERED = "شما قبلا به لیست انتظار ایده بان اضافه شده اید. وقتی دسترسی شما باز شود، همین جا به شما اطلاع می دهیم."


@router.message(CommandStart())
async def start(message: Message, waitlist: Waitlist) -> None:
    pending = waitlist.start(message.from_user.id)
    await message.answer(PROMPT if pending else ALREADY_REGISTERED)


@router.message()
async def receive_reason(message: Message, waitlist: Waitlist) -> None:
    if message.from_user is None:
        return
    reason = (message.text or "").strip()
    if not reason or len(reason.splitlines()) != 1 or reason.startswith("/"):
        await message.answer("برای ثبت نام، /start را بزنید و پاسخ خود را در یک خط متنی بفرستید.")
        return

    if waitlist.register(message.from_user.id, reason):
        await message.answer(CONFIRMATION)
    else:
        await message.answer("برای بررسی وضعیت ثبت نام یا شروع، /start را بزنید.")


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    config = load_config()
    waitlist = Waitlist(config.waitlist_db_path)
    bot = Bot(token=config.bot_token)
    dispatcher = Dispatcher(waitlist=waitlist)
    dispatcher.include_router(router)
    await dispatcher.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
