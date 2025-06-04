# Lions & Trello Assistant Bot

## Description

This Telegram bot is designed to integrate with the "Lions" platform (a hypothetical educational content provider) and Trello. It allows users to fetch educational lessons, submit bug reports for the Lions platform, and check the status of their stories/tasks from a Trello board.

## Features

*   **Fetch Educational Lessons**: Users can get a list of available lessons using the `/lessons` command.
*   **Report Bugs/Issues**: A form-based system using `/reportbug` allows users to describe and submit issues they encounter.
*   **Check Story Status**: Users can check the status of their assigned stories or tasks from Trello using the `/mystatus` command.
*   **Basic Commands**: Includes standard `/start` (welcome message) and `/help` (bot information) commands.

## Setup and Installation

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Python Version**:
    Python 3.8 or higher is recommended.

3.  **Create a Virtual Environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

4.  **Install Dependencies**:
    Install the required packages using the `requirements.txt` file:
    ```bash
    pip install -r requirements.txt
    ```

## Configuration

The bot requires several API tokens and configuration details to function correctly. It's highly recommended to store these secrets in environment variables or a `.env` file (using a library like `python-dotenv`).

The following placeholders in `main.py` (or a dedicated config file) would need to be replaced with actual values:

*   **Telegram Bot Token**:
    *   Obtained from BotFather on Telegram.
    *   `BOT_TOKEN = "YOUR_BOT_TOKEN_HERE"` in `main.py` needs to be set.
    *   Recommended: `BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")`

*   **Lions API Details**:
    *   The functions `fetch_lessons()` and `submit_bug_report()` in `main.py` have TODO comments where actual API calls to the Lions platform should be implemented.
    *   This might include a base URL, authentication tokens, etc.
    *   Example: `LIONS_API_URL = os.environ.get("LIONS_API_URL")`, `LIONS_API_TOKEN = os.environ.get("LIONS_API_TOKEN")`

*   **Trello API Details**:
    *   The function `fetch_story_status_from_trello()` in `main.py` has a TODO comment for Trello API integration.
    *   This requires:
        *   Trello API Key
        *   Trello API Token (user-generated)
        *   Trello Board ID (the ID of the board where stories are tracked)
        *   Potentially Trello List IDs (if statuses are determined by lists) or Member IDs.
    *   Example: `TRELLO_API_KEY = os.environ.get("TRELLO_API_KEY")`, `TRELLO_API_TOKEN = os.environ.get("TRELLO_API_TOKEN")`, `TRELLO_BOARD_ID = os.environ.get("TRELLO_BOARD_ID")`

To load these from environment variables, you would typically add `import os` at the top of `main.py` and use `os.environ.get("VARIABLE_NAME")`.

## Running the Bot

Once the dependencies are installed and configuration is set up (even with placeholders for now for basic structure testing):

```bash
python main.py
```
The bot will start polling for updates. You will see a log message like "Bot starting polling...".

## Running Tests

The project includes a suite of unit and integration-style tests. To run them:

```bash
python -m unittest tests.test_bot
# or for more general discovery if more test files are added:
python -m unittest discover tests
```

## Project Structure

```
.
├── main.py           # Main application file for the Telegram bot
├── tests/            # Directory containing test files
│   └── test_bot.py   # Tests for the bot's functionality
├── README.md         # This file: project overview and instructions
└── requirements.txt  # Python package dependencies
```
