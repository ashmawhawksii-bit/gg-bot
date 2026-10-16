import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('replysay')
    .setDescription('Make the bot reply to a message (staff only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('message_id').setDescription('ID of the message to reply to').setRequired(true))
    .addStringOption((o) => o.setName('message').setDescription('Reply text').setRequired(true)),
  category: 'Fun',

  async execute(interaction) {
    const id = interaction.options.getString('message_id').trim();
    const text = interaction.options.getString('message');

    const target = await interaction.channel.messages.fetch(id).catch(() => null);
    if (!target) {
      return interaction.reply({
        content: 'Message not found in this channel. Copy its ID (Developer Mode → right-click → Copy Message ID).',
        flags: MessageFlags.Ephemeral,
      });
    }

    await target.reply({ content: text, allowedMentions: { parse: ['users'], repliedUser: true } });
    await interaction.reply({ content: '✅ Replied.', flags: MessageFlags.Ephemeral });
  },
};
