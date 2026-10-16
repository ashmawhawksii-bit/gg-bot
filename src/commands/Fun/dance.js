import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://tenor.com/view/johnny-english-johnny-english-movie-johnnyenglish-johnnyenglishmovie-rowan-gif-15226828216304945656"
];

const MESSAGES = [
  (a, b) => `${a} is dancing with ${b} 💃`,
  (a, b) => `${a} and ${b} start a dance party! 💃🕺`,
  (a, b) => `${b} joins ${a} for an epic dance-off!`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('dance')
    .setDescription('Dance with someone').addUserOption((o) => o.setName('user').setDescription('Who?').setRequired(true)),
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
