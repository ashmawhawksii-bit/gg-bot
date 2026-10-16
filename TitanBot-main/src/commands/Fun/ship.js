import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const QUOTES = [
  'Love is composed of a single soul inhabiting two bodies.',
  'The heart has its reasons which reason knows nothing of.',
  'Love recognizes no barriers. It jumps hurdles, leaps fences, penetrates walls.',
];

function describe(score) {
  if (score === 100) return ['💖', "It's PERFECT! A match made in heaven!", 0xff1493];
  if (score >= 90) return ['💞', 'Absolutely destined souls!', 0xff1493];
  if (score >= 70) return ['💗', 'Something special is brewing...', 0xff69b4];
  if (score >= 50) return ['💓', "There's a spark worth igniting.", 0xdb7093];
  if (score >= 30) return ['💔', "The flame flickers, but it's not too bright...", 0xb0c4de];
  return ['🚨', 'Not quite a match, perhaps best as friends.', 0xa9a9a9];
}

function loveBar(score) {
  const filled = Math.round(score / 10);
  return '🟥'.repeat(filled) + '⬜'.repeat(10 - filled);
}

export default {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Calculate love compatibility between two users')
    .addUserOption((o) => o.setName('user1').setDescription('First person').setRequired(true))
    .addUserOption((o) => o.setName('user2').setDescription('Second person (defaults to you)')),
  category: 'Fun',

  async execute(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2') ?? interaction.user;

    let score = Math.floor(Math.random() * 101);
    if (user1.username.length === user2.username.length) {
      score = Math.min(100, score + 10 + Math.floor(Math.random() * 11));
    }

    const [emoji, comment, color] = describe(score);
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} Compatibility Result`)
      .setDescription(
        `**${user1.displayName}** ${score > 50 ? '❤️' : '💔'} **${user2.displayName}**\n\n` +
          `${loveBar(score)}  **${score}%**\n\n*${comment}*\n\n_${quote}_`,
      )
      .setColor(color)
      .setThumbnail(user1.displayAvatarURL())
      .setImage(user2.displayAvatarURL({ size: 256 }))
      .setFooter({
        text: `Requested by ${interaction.user.displayName}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    await interaction.reply({ embeds: [embed] });
  },
};
