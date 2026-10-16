import { SlashCommandBuilder } from 'discord.js';

const GIFS = [
  "https://tenor.com/view/stab-knife-kifluggs-kill-murder-gif-24765587"
];

const MESSAGES = [
  (a, b) => `${a} eliminated ${b} 🔪`,
  (a, b) => `${b} was eliminated by ${a}! 💀`,
  (a, b) => `${a} has sent ${b} to the shadow realm!`
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default {
  data: new SlashCommandBuilder()
    .setName('kill')
    .setDescription('Playfully eliminate someone').addUserOption((o) => o.setName('user').setDescription('Who?').setRequired(true)),
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
