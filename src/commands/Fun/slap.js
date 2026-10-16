import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://tenor.com/view/peach-and-goma-peach-cat-goma-cat-peach-and-goma-cat-peach-cat-slap-gif-3790251090829977055"
];

const MESSAGES = [
  (a, b) => `${a} slapped ${b} 🖐️`,
  (a, b) => `${a} delivers a dramatic slap to ${b}! 🖐️`,
  (a, b) => `${b} got a surprise slap from ${a}!`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('slap')
    .setDescription('Slap someone').addUserOption((o) => o.setName('user').setDescription('Who?').setRequired(true)),
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
