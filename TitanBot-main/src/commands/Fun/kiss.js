import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://tenor.com/view/mocha-and-milk-gif-734972071031030497"
];

const MESSAGES = [
  (a, b) => `${a} kissed ${b} 💋`,
  (a, b) => `${a} sends a sweet kiss to ${b}! 💋`,
  (a, b) => `${b} received a loving kiss from ${a}!`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('kiss')
    .setDescription('Send someone a kiss').addUserOption((o) => o.setName('user').setDescription('Who?').setRequired(true)),
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
