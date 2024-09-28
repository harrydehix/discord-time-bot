# Discord Time Bot

This simple bot will join a configurable channel of your server every hour and play a configurable audio. By default it will tell you the time in german. You
can change the audio by overwriting the mp3 files in `/audios`.

## Installation

1. Rename the `.env.sample` file to `.env`.
2. Inside the `.env` file: Replace "blablabla..." with your bot's token.
3. Inside the `.env` file: Configure your channel name (default: main)
4. Install all dependencies via `npm i`
5. Start the bot via `npm start`

NodeJS and NPM need to be installed. Your bot must have enough privileges.
