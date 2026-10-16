import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://tenor.com/view/yeet-trash-seal-dr-dolittle-dolittle-gif-15298225"
];

const MESSAGES = [
  (a, b) => `${a} yeeted ${b} into the void! 🕳️`,
  (a, b) => `${b} was YEETED by ${a}! 🚀`,
  (a, b) => `${a} launches ${b} with a powerful YEET!`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('yeet')
    .setDescription('Yeet someone into the void').addUserOption((o) => o.setName('user').setDescription('Who?').setRequired(true)),
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
