import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot send a message (staff only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('message').setDescription('What should the bot say?'))
    .addAttachmentOption((o) => o.setName('file').setDescription('Optional image/file to send')),
  category: 'Fun',

  async execute(interaction) {
    const message = interaction.options.getString('message');
    const file = interaction.options.getAttachment('file');

    if (!message && !file) {
      return interaction.reply({ content: 'Nothing to say or upload.', flags: MessageFlags.Ephemeral });
    }
    if (file && file.size > 8 * 1024 * 1024) {
      return interaction.reply({ content: 'That file is too large (limit 8 MB).', flags: MessageFlags.Ephemeral });
    }

    await interaction.channel.send({
      content: message ?? undefined,
      files: file ? [file.url] : undefined,
      allowedMentions: { parse: ['users'] },
    });
    await interaction.reply({ content: '✅ Sent.', flags: MessageFlags.Ephemeral });
  },
};
