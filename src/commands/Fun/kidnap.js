import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://tenor.com/view/kidnap-cat-kidnap-aaaaah-fear-horror-film-gif-21768777"
];

const MESSAGES = [
  (a, b) => `${a} has kidnapped ${b} for 1 hour! 🚐`,
  (a, b) => `${b} was snatched by ${a}! Hide your snacks!`,
  (a, b) => `${a} is taking ${b} on a mysterious adventure!`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('kidnap')
    .setDescription('Kidnap someone (just for fun)').addUserOption((o) => o.setName('user').setDescription('Who?').setRequired(true)),
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
