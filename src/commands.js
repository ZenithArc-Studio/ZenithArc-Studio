const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');
const db = require('./db');
const { askAI } = require('./ai');

const commands = [
  new SlashCommandBuilder().setName('ask').setDescription('Ask the ZenithArc Studio AI assistant')
    .addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true).setMaxLength(1500)),
  new SlashCommandBuilder().setName('warn').setDescription('Warn a member and save the warning')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('member').setDescription('Member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the warning').setRequired(true).setMaxLength(500)),
  new SlashCommandBuilder().setName('warnings').setDescription('View recent warnings for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('member').setDescription('Member to inspect').setRequired(true)),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('member').setDescription('Member to timeout').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes (1-10080)').setRequired(true).setMinValue(1).setMaxValue(10080))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(500)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('member').setDescription('Member to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(500)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('member').setDescription('Member to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(500)),
  new SlashCommandBuilder().setName('purge').setDescription('Delete recent messages in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (2-100)').setRequired(true).setMinValue(2).setMaxValue(100)),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Show server information'),
  new SlashCommandBuilder().setName('report').setDescription('Submit a server/member report')
    .addStringOption(o => o.setName('details').setDescription('What should staff review?').setRequired(true).setMaxLength(1500)),
  new SlashCommandBuilder().setName('bug').setDescription('Report a bot or server bug')
    .addStringOption(o => o.setName('details').setDescription('Steps and expected behaviour').setRequired(true).setMaxLength(1500))
].map(c => c.toJSON());

async function handleCommand(interaction) {
  const { commandName } = interaction;
  if (commandName === 'ask') {
    await interaction.deferReply();
    try {
      const answer = await askAI(interaction.options.getString('question', true));
      return interaction.editReply({ content: answer.slice(0, 1900) });
    } catch (error) {
      console.error('[AI]', error.message);
      return interaction.editReply({ content: `AI unavailable: ${error.message.slice(0, 500)}` });
    }
  }

  if (!interaction.inGuild()) {
    return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
  }

  if (commandName === 'warn') {
    const user = interaction.options.getUser('member', true);
    const reason = interaction.options.getString('reason', true);
    db.addWarning.run(interaction.guildId, user.id, interaction.user.id, reason);
    console.log(`[MOD] ${interaction.user.tag} warned ${user.tag} in ${interaction.guild.name}: ${reason}`);
    return interaction.reply({ content: `⚠️ ${user} has been warned. Reason: **${reason}**`, ephemeral: true });
  }

  if (commandName === 'warnings') {
    const user = interaction.options.getUser('member', true);
    const rows = db.getWarnings.all(interaction.guildId, user.id);
    if (!rows.length) return interaction.reply({ content: `No saved warnings for ${user}.`, ephemeral: true });
    const embed = new EmbedBuilder().setTitle(`Recent warnings: ${user.tag}`).setColor(0x8b7cff)
      .setDescription(rows.map(w => `**#${w.id}** — ${w.reason}\nModerator: <@${w.moderator_id}> • ${w.created_at} UTC`).join('\n\n').slice(0, 4000));
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (['timeout', 'kick', 'ban'].includes(commandName)) {
    const user = interaction.options.getUser('member', true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'That member is not in this server.', ephemeral: true });
    if (user.id === interaction.user.id) return interaction.reply({ content: 'You cannot use this command on yourself.', ephemeral: true });
    if (user.id === interaction.client.user.id) return interaction.reply({ content: 'I cannot moderate myself.', ephemeral: true });
    const reason = interaction.options.getString('reason') || `Action by ${interaction.user.tag}`;
    try {
      if (commandName === 'timeout') {
        const minutes = interaction.options.getInteger('minutes', true);
        await member.timeout(minutes * 60 * 1000, reason);
        await interaction.reply({ content: `⏱️ Timed out ${user} for ${minutes} minute(s). Reason: ${reason}`, ephemeral: true });
      } else if (commandName === 'kick') {
        await member.kick(reason);
        await interaction.reply({ content: `👢 Kicked ${user}. Reason: ${reason}`, ephemeral: true });
      } else {
        await interaction.guild.members.ban(user.id, { reason });
        await interaction.reply({ content: `🔨 Banned ${user}. Reason: ${reason}`, ephemeral: true });
      }
      console.log(`[MOD] ${commandName} by ${interaction.user.tag} on ${user.tag} in ${interaction.guild.name}: ${reason}`);
    } catch (error) {
      console.error('[MODERATION]', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Action failed. Check my permissions and role hierarchy.', ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: 'Action failed. Check my permissions and role hierarchy.', ephemeral: true });
      }
    }
    return;
  }

  if (commandName === 'purge') {
    const amount = interaction.options.getInteger('amount', true);
    if (!interaction.channel?.bulkDelete) return interaction.reply({ content: 'This channel does not support bulk deletion.', ephemeral: true });
    const deleted = await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `🧹 Deleted ${deleted.size} recent message(s). Messages older than 14 days cannot be bulk-deleted.`, ephemeral: true });
  }

  if (commandName === 'serverinfo') {
    const g = interaction.guild;
    const embed = new EmbedBuilder().setTitle(g.name).setColor(0x8b7cff)
      .setThumbnail(g.iconURL({ size: 256 }))
      .addFields(
        { name: 'Members', value: String(g.memberCount), inline: true },
        { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'Owner', value: `<@${g.ownerId}>`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'report' || commandName === 'bug') {
    const kind = commandName;
    const details = interaction.options.getString('details', true);
    db.addSubmission.run(interaction.guildId, interaction.user.id, kind, details);
    const channelId = kind === 'report' ? process.env.REPORT_CHANNEL_ID : process.env.BUG_CHANNEL_ID;
    if (channelId) {
      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (channel?.isTextBased()) {
        await channel.send({
          embeds: [new EmbedBuilder().setTitle(kind === 'report' ? 'New Member Report' : 'New Bug Report')
            .setColor(kind === 'report' ? 0xe6a23c : 0x8b7cff)
            .setDescription(details.slice(0, 4000))
            .addFields({ name: 'Submitted by', value: `${interaction.user.tag} (${interaction.user.id})` })
            .setTimestamp()]
        }).catch(error => console.error('[SUBMISSION CHANNEL]', error.message));
      }
    }
    return interaction.reply({ content: `Your ${kind} has been recorded. Thank you.`, ephemeral: true });
  }
}

module.exports = { commands, handleCommand };
