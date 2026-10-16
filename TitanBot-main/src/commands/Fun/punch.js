import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://tenor.com/view/markiplier-markiplier-punch-markipler-funny-funny-punch-gif-23594121"
];

const MESSAGES = [
  (a, b) => `${a} punched ${b} 👊`,
  (a, b) => `${b} got a knockout punch from ${a}! 🥊`,
  (a, b) => `${a} delivers a super punch to ${b}!`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('punch')
    .setDescription('Punch someone').addUserOption((o) => o.setName('user').setDescription('Who?').setRequired(true)),
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
