import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://tenor.com/view/theoffice-hug-gif-18038984"
];

const MESSAGES = [
  (a, b) => `${a} gave ${b} a big hug! 🤗`,
  (a, b) => `${a} wraps ${b} in a warm hug! 🤗`,
  (a, b) => `${b} is hugged tightly by ${a}!`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Give someone a hug').addUserOption((o) => o.setName('user').setDescription('Who?').setRequired(true)),
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
