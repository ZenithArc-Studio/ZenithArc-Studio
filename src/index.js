require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { handleCommand } = require('./commands');

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN. Copy .env.example to .env and configure it.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once(Events.ClientReady, readyClient => {
  console.log(`[READY] ${readyClient.user.tag} is online as ZenithArc Studio.`);
  console.log('[INFO] Music features are intentionally excluded; use Resonance for music.');
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await handleCommand(interaction);
  } catch (error) {
    console.error(`[COMMAND ERROR] /${interaction.commandName}`, error);
    const payload = { content: 'Something went wrong while running that command.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.on(Events.GuildMemberAdd, member => {
  console.log(`[MEMBER JOIN] ${member.user.tag} (${member.id}) joined ${member.guild.name}`);
});
client.on(Events.GuildMemberRemove, member => {
  console.log(`[MEMBER LEAVE] ${member.user?.tag || member.id} left ${member.guild.name}`);
});

client.on(Events.Error, error => console.error('[DISCORD CLIENT]', error));
process.on('unhandledRejection', error => console.error('[UNHANDLED REJECTION]', error));

client.login(process.env.DISCORD_TOKEN);
