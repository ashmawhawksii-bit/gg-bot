import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://tenor.com/view/dance-coffin-meme-rip-gif-16909625"
];

const MESSAGES = [
  (a, b) => `${b} has been officially declared RIP by ${a} ⚰️`,
  (a, b) => `${a} pays respects to ${b}. F in chat.`,
  (a, b) => `${b} has left the chat... RIP.`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('rip')
    .setDescription('Declare someone RIP').addUserOption((o) => o.setName('user').setDescription('Who?').setRequired(true)),
  category: 'Fun',

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const b = `<@${target.id}>`;
    const a = `<@${interaction.user.id}>`;

    await interaction.reply({
      content: `${pick(MESSAGES)(a, b)}\n${pick(GIFS)}`,
      allowedMentions: { users: [...new Set([interaction.user.id, target.id])] },
    });
  },
};
