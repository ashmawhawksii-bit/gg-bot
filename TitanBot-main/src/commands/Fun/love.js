import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://tenor.com/view/%EB%AA%A8%EC%B0%8C%EB%83%A5-gif-3199198135359664573"
];

const MESSAGES = [
  (a, b) => `${a} loved ${b} ❤️`,
  (a, b) => `${a} sends love to ${b}! ❤️`,
  (a, b) => `${b} is showered with love by ${a}!`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('love')
    .setDescription('Send love to someone').addUserOption((o) => o.setName('user').setDescription('Who?').setRequired(true)),
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
