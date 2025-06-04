import asyncio
import unittest
from unittest.mock import AsyncMock, patch, MagicMock

# Adjust import path if necessary, assuming tests are run from the project root
# If running from 'tests' directory, 'from .. import main' might be needed
# or sys.path manipulation. For now, assuming standard root execution.
import main

class TestBotPlaceholderAPI(unittest.IsolatedAsyncioTestCase):

    async def test_fetch_lessons(self):
        result = await main.fetch_lessons()
        self.assertEqual(result, ["Lesson 1: Introduction", "Lesson 2: Advanced Topics", "Lesson 3: Practical Applications"])

    @patch('builtins.print') # Mock print for submit_bug_report
    async def test_submit_bug_report_success(self, mock_print):
        description = "Test bug description"
        result = await main.submit_bug_report(description)
        self.assertTrue(result)
        mock_print.assert_called_with(f"Bug report submitted: {description}")

    async def test_fetch_story_status_from_trello(self):
        author_id = 123
        result = await main.fetch_story_status_from_trello(author_id)
        expected_message = f"Status for author {author_id}: Your story 'The Great Adventure' is currently 'Under Review'."
        self.assertEqual(result, expected_message)


class TestBotCommands(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        # We need to ensure that main.dp is configured for tests.
        # This might require main.py to be structured so that dp can be imported and used.
        # For now, let's assume main.dp is accessible.
        self.dp = main.dp
        self.bot = AsyncMock(spec=main.Bot) # Mock the Bot object

        # Mock the FSMContext for state-dependent handlers
        self.mock_fsm_context = AsyncMock(spec=main.FSMContext)


    async def simulate_message(self, text, command_filter, handler_func, include_state=False):
        message = AsyncMock(spec=main.Message)
        message.text = text
        message.from_user = AsyncMock()
        message.from_user.full_name = "Test User"
        message.from_user.id = 12345

        # Mock message.answer for all handlers
        message.answer = AsyncMock()

        # This method now directly calls the handler_func passed to it,
        # bypassing complex dispatcher introspection.
        if include_state:
            await handler_func(message, self.mock_fsm_context)
        else:
            await handler_func(message)

        return message


    async def test_command_start(self):
        # Pass the specific handler function directly
        message = await self.simulate_message("/start", None, main.command_start_handler)
        message.answer.assert_called_once_with(f"Hello, {main.hbold(message.from_user.full_name)}!")

    async def test_command_help(self):
        message = await self.simulate_message("/help", None, main.command_help_handler)
        message.answer.assert_called_once_with("This is a basic Telegram bot. More features will be added soon!")

    @patch('main.fetch_lessons', new_callable=AsyncMock)
    async def test_command_lessons_success(self, mock_fetch_lessons):
        lessons_data = ["Lesson A", "Lesson B"]
        mock_fetch_lessons.return_value = lessons_data

        message = await self.simulate_message("/lessons", None, main.command_lessons_handler)

        mock_fetch_lessons.assert_called_once()
        expected_response = "Here are the available lessons:\n" + "\n".join(f"- {lesson}" for lesson in lessons_data)
        message.answer.assert_called_once_with(expected_response)

    @patch('main.fetch_lessons', new_callable=AsyncMock)
    async def test_command_lessons_failure(self, mock_fetch_lessons):
        mock_fetch_lessons.return_value = [] # Simulate API failure

        message = await self.simulate_message("/lessons", None, main.command_lessons_handler)

        mock_fetch_lessons.assert_called_once()
        message.answer.assert_called_once_with("Sorry, couldn't fetch lessons at the moment. Please try again later.")

    @patch('main.fetch_story_status_from_trello', new_callable=AsyncMock)
    async def test_command_mystatus_success(self, mock_fetch_status):
        status_message = "Your story is progressing well!"
        mock_fetch_status.return_value = status_message

        message = await self.simulate_message("/mystatus", None, main.command_my_status_handler)

        mock_fetch_status.assert_called_once_with(message.from_user.id)
        message.answer.assert_called_once_with(status_message)

    async def test_command_reportbug_initial(self):
        # Test the initial /reportbug command
        message = await self.simulate_message("/reportbug", None, main.command_report_bug_handler, include_state=True)

        self.mock_fsm_context.set_state.assert_called_once_with(main.Form.description)
        message.answer.assert_called_once_with("Please describe the bug you encountered:")

    @patch('main.submit_bug_report', new_callable=AsyncMock)
    async def test_process_bug_description_success(self, mock_submit_bug_report):
        mock_submit_bug_report.return_value = True
        bug_desc = "The button is blue when it should be red."

        # Simulate being in the Form.description state
        # For this test, we directly call the handler as if the state condition was met
        message = AsyncMock(spec=main.Message)
        message.text = bug_desc
        message.answer = AsyncMock()

        await main.process_bug_description_handler(message, self.mock_fsm_context)

        mock_submit_bug_report.assert_called_once_with(bug_desc)
        self.mock_fsm_context.clear.assert_called_once()
        message.answer.assert_called_once_with("Thank you! Your bug report has been submitted.")

    @patch('main.submit_bug_report', new_callable=AsyncMock)
    async def test_process_bug_description_failure(self, mock_submit_bug_report):
        mock_submit_bug_report.return_value = False # Simulate submission failure
        bug_desc = "Another bug."

        message = AsyncMock(spec=main.Message)
        message.text = bug_desc
        message.answer = AsyncMock()

        await main.process_bug_description_handler(message, self.mock_fsm_context)

        mock_submit_bug_report.assert_called_once_with(bug_desc)
        self.mock_fsm_context.clear.assert_called_once()
        message.answer.assert_called_once_with("Sorry, there was an issue submitting your bug report. Please try again later.")

if __name__ == '__main__':
    # This allows running the tests directly from the tests directory
    # For running from root: python -m unittest tests.test_bot
    unittest.main()
