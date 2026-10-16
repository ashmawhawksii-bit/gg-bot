import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://media.tenor.com/3QvQKQwZpQwAAAAC/facepalm.gif",
  "https://media.tenor.com/6bQKQwZpQwAAAAC/anime-facepalm.gif"
];

const MESSAGES = [
  (a, b) => `${a} just facepalmed. 🤦`,
  (a, b) => `${a} can't believe it... FACEPALM! 🤦`,
  (a, b) => `${a} did a legendary facepalm!`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('facepalm')
    .setDescription('Facepalm'),
  category: 'Fun',

  async execute(interaction) {
    const b = '';
    const target = null;
    const a = `<@${interaction.user.id}>`;

    await interaction.reply({
      content: `${pick(MESSAGES)(a, b)}\n${pick(GIFS)}`,
      allowedMentions: { users: [interaction.user.id] },
    });
  },
};
