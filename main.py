import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher, types
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message
from aiogram.utils.markdown import hbold

# Placeholder token for now
BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# All handlers should be attached to the Router (or Dispatcher)
dp = Dispatcher()


# Global error handler
@dp.errors()
async def handle_global_error(update: types.Update, exception: Exception):
    logging.error(f"Unhandled exception: {exception} in update {update}", exc_info=True)
    if update.message:
        await update.message.answer("Sorry, something went wrong. Please try again later.")
    elif update.callback_query:
        await update.callback_query.message.answer("Sorry, something went wrong. Please try again later.")
    return True


@dp.message(CommandStart())
async def command_start_handler(message: Message) -> None:
    """
    This handler receives messages with `/start` command
    """
    await message.answer(f"Hello, {hbold(message.from_user.full_name)}!")


@dp.message(Command("help"))
async def command_help_handler(message: Message) -> None:
    """
    This handler receives messages with `/help` command
    """
    await message.answer("This is a basic Telegram bot. More features will be added soon!")


async def fetch_lessons() -> list[str]:
    """
    Fetches educational content from the Lions API.
    For now, returns a placeholder list of lessons.
    """
    try:
        # TODO: Add actual API call to Lions website here
        logging.info("Fetching lessons (placeholder).")
        return ["Lesson 1: Introduction", "Lesson 2: Advanced Topics", "Lesson 3: Practical Applications"]
    except Exception as e:
        logging.error(f"Error in fetch_lessons: {e}", exc_info=True)
        return [] # Return empty list or specific error indicator


@dp.message(Command("lessons"))
async def command_lessons_handler(message: Message) -> None:
    """
    This handler receives messages with `/lessons` command
    """
    lessons = await fetch_lessons()
    if lessons:
        response = "Here are the available lessons:\n" + "\n".join(f"- {lesson}" for lesson in lessons)
    else:
        response = "Sorry, couldn't fetch lessons at the moment. Please try again later."
    await message.answer(response)


# Define FSM states
class Form(StatesGroup):
    description = State()


async def submit_bug_report(description: str) -> None:
    """
    Submits the bug report.
    For now, it just prints the description.
    """
    try:
        # TODO: Add actual API call to submit bug report here
        logging.info(f"Submitting bug report (placeholder): {description}")
        # Simulate submission
        print(f"Bug report submitted: {description}")
        return True
    except Exception as e:
        logging.error(f"Error in submit_bug_report: {description} - {e}", exc_info=True)
        return False


@dp.message(Command("reportbug"))
async def command_report_bug_handler(message: Message, state: FSMContext) -> None:
    """
    This handler receives messages with `/reportbug` command
    """
    await state.set_state(Form.description)
    await message.answer("Please describe the bug you encountered:")


@dp.message(Form.description)
async def process_bug_description_handler(message: Message, state: FSMContext) -> None:
    """
    This handler receives the bug description when in Form.description state
    """
    description = message.text
    success = await submit_bug_report(description)
    await state.clear()
    if success:
        await message.answer("Thank you! Your bug report has been submitted.")
    else:
        await message.answer("Sorry, there was an issue submitting your bug report. Please try again later.")


async def fetch_story_status_from_trello(author_id: int) -> str:
    """
    Fetches the story status for a given author from Trello.
    author_id would ideally be the Trello member ID or a way to map
    the Telegram user to a Trello user/card.
    """
    try:
        # TODO: Implement actual Trello API call here (e.g., using py-trello and API credentials)
        logging.info(f"Fetching Trello status for author_id {author_id} (placeholder).")
        # For now, using Telegram user ID as a placeholder for author_id
        return f"Status for author {author_id}: Your story 'The Great Adventure' is currently 'Under Review'."
    except Exception as e:
        logging.error(f"Error in fetch_story_status_from_trello for author_id {author_id}: {e}", exc_info=True)
        return "Sorry, couldn't fetch your story status at the moment. Please try again later."


@dp.message(Command("mystatus"))
async def command_my_status_handler(message: Message) -> None:
    """
    This handler receives messages with `/mystatus` command
    """
    user_id = message.from_user.id
    status = await fetch_story_status_from_trello(user_id)
    await message.answer(status)


async def main() -> None:
    # Initialize Bot instance with a default parse mode which will be passed to all API calls
    bot = Bot(BOT_TOKEN, parse_mode=ParseMode.HTML)
    # And the run events dispatching
    logging.info("Bot starting polling...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    # Logging is already configured at the top
    asyncio.run(main())
