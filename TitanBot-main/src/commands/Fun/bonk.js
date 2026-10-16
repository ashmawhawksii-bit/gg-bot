import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://tenor.com/view/bonk-doge-gif-24837098"
];

const MESSAGES = [
  (a, b) => `${a} bonked ${b} for questionable behavior! 🔨`,
  (a, b) => `${a} delivers a mighty BONK to ${b}! 🚨`,
  (a, b) => `${b} got bonked by ${a}! Time to reflect!`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('bonk')
    .setDescription('Bonk someone').addUserOption((o) => o.setName('user').setDescription('Who?').setRequired(true)),
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
