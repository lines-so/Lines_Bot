# Lines Bot

Telegram bot built with [aiogram](https://docs.aiogram.dev/) that demonstrates how
to bring a simple **Lines** web application into Telegram using the Web Apps
platform.

## Features

- `/start` command sends a button that opens a Web App.
- Web App allows the user to submit short pieces of text ("lines").
- Data from the Web App is delivered back to the bot and stored in memory.
- `/lines` command lists saved lines for the current user.

## Running the bot

1. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Set the environment variables:

   ```bash
   export BOT_TOKEN="<your bot token>"
   export WEBAPP_URL="https://your-domain.example/webapp/index.html"
   ```

3. Start the bot:

   ```bash
   python -m bot.main
   ```

The `WEBAPP_URL` should point to the location where you host the contents of the
`webapp/` directory.
