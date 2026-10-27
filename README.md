# ZenithArc Studio

AI-powered Discord server-management bot for the ZenithArc Studio community. **Music commands are intentionally excluded**; Resonance remains the separate music bot.

## Features in this starter
- Slash-command framework with permission checks
- Moderation: `/warn`, `/timeout`, `/kick`, `/ban`, `/purge`
- Community tools: `/serverinfo`, `/report`, `/bug`
- Optional AI assistant using an OpenAI-compatible API endpoint
- SQLite storage for warnings and submissions
- Console logging for member joins/leaves and moderation actions

## Requirements
- Node.js 20+
- A Discord application/bot and its token
- Optional API key for your chosen AI provider

## Local setup
1. Clone this repository.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your values.
4. Invite the bot with the `bot` and `applications.commands` scopes. Grant only the permissions needed for enabled features.
5. Register slash commands: `npm run deploy-commands`
6. Start: `npm start`

## Environment variables
See `.env.example`. Never commit a real `.env` file, bot token, or AI API key. Set secrets in the host's environment-variable panel instead.

## Hosting notes
Use the Node.js runtime on your chosen host (Silly, if its current service supports persistent Node.js processes). Configure the start command as `npm start` and the build/install command as `npm install`. A writable persistent disk is recommended for `data/zenitharc.sqlite`; otherwise SQLite data may be lost when the host replaces the container.

## AI
Set `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` for an OpenAI-compatible provider. AI is optional; other commands work without it. Free-tier quotas and model availability depend on the provider.

## Security
- Keep `.env` private.
- Restrict bot permissions and configure Discord role hierarchy correctly.
- Test moderation commands in a private test server before enabling them in a production server.
- This is an initial foundation; ticket panels, advanced anti-raid controls, dashboard, and configurable automod are future modules.
