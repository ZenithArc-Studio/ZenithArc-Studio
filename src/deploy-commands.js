require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { commands } = require('./commands');

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
(async () => {
  try {
    const route = DISCORD_GUILD_ID
      ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID)
      : Routes.applicationCommands(DISCORD_CLIENT_ID);
    await rest.put(route, { body: commands });
    console.log(`Registered ${commands.length} slash commands ${DISCORD_GUILD_ID ? 'to test guild' : 'globally'}.`);
  } catch (error) {
    console.error('Command registration failed:', error);
    process.exitCode = 1;
  }
})();
