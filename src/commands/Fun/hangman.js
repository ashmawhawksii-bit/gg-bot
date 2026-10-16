import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} from 'discord.js';

const WORDS = [
  { word: 'javascript', hint: 'A popular programming language' },
  { word: 'discord', hint: 'Where you are chatting right now' },
  { word: 'elephant', hint: 'Largest land animal' },
  { word: 'galaxy', hint: 'Billions of stars together' },
  { word: 'bangladesh', hint: 'A country in South Asia' },
  { word: 'keyboard', hint: 'You type on it' },
  { word: 'volcano', hint: 'A mountain that can erupt' },
  { word: 'butterfly', hint: 'Insect with colorful wings' },
  { word: 'rainbow', hint: 'Appears after rain' },
  { word: 'pyramid', hint: 'Ancient Egyptian structure' },
  { word: 'chocolate', hint: 'A sweet treat' },
  { word: 'telescope', hint: 'Used to look at stars' },
];

const STAGES = [
  '  +---+\n  |   |\n      |\n      |\n      |\n=======',
  '  +---+\n  |   |\n  O   |\n      |\n      |\n=======',
  '  +---+\n  |   |\n  O   |\n  |   |\n      |\n=======',
  '  +---+\n  |   |\n  O   |\n /|   |\n      |\n=======',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n=======',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n=======',
  '  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n=======',
];
const MAX_WRONG = 6;

function buildEmbed(game, footer, state = 'playing') {
  const display = [...game.word].map((c) => (game.guessed.has(c) ? c.toUpperCase() : '_')).join(' ');
  const embed = new EmbedBuilder()
    .setTitle(state === 'won' ? '🎉 You Won!' : state === 'lost' ? '💀 You Lost!' : '🎯 Hangman')
    .setColor(state === 'won' ? 0x2ecc71 : state === 'lost' ? 0xe74c3c : 0x9b59b6)
    .addFields(
      { name: 'Word', value: `\`${display}\``, inline: false },
      { name: 'Attempts Left', value: String(MAX_WRONG - game.wrong), inline: true },
      { name: 'Guessed', value: [...game.guessed].join(', ').toUpperCase() || 'None', inline: true },
      { name: 'Hint', value: game.hint, inline: false },
      { name: 'Visual', value: '```' + STAGES[game.wrong] + '```', inline: false },
    );
  if (footer) embed.setFooter({ text: footer });
  return embed;
}

function buildRows(game) {
  const groups = [
    { id: 'hangman_a', range: ['a', 'm'], placeholder: 'Letters A - M' },
    { id: 'hangman_n', range: ['n', 'z'], placeholder: 'Letters N - Z' },
  ];
  const rows = [];
  for (const g of groups) {
    const options = [];
    for (let c = g.range[0].charCodeAt(0); c <= g.range[1].charCodeAt(0); c++) {
      const letter = String.fromCharCode(c);
      if (!game.guessed.has(letter)) options.push({ label: letter.toUpperCase(), value: letter });
    }
    if (options.length) {
      rows.push(
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId(g.id).setPlaceholder(g.placeholder).addOptions(options),
        ),
      );
    }
  }
  return rows;
}

export default {
  data: new SlashCommandBuilder().setName('hangman').setDescription('Play a game of Hangman'),
  category: 'Fun',

  async execute(interaction) {
    const pick = WORDS[Math.floor(Math.random() * WORDS.length)];
    const game = { word: pick.word, hint: pick.hint, guessed: new Set(), wrong: 0 };

    const message = await interaction.reply({
      embeds: [buildEmbed(game, 'Pick a letter from the menus below')],
      components: buildRows(game),
      fetchReply: true,
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
    });

    collector.on('collect', async (i) => {
      const letter = i.values[0];
      if (game.guessed.has(letter)) {
        return i.reply({ content: 'That letter was already guessed.', ephemeral: true });
      }
      game.guessed.add(letter);
      const correct = game.word.includes(letter);
      if (!correct) game.wrong += 1;

      const won = [...game.word].every((c) => game.guessed.has(c));
      const lost = game.wrong >= MAX_WRONG;
      const footer = `${i.user.username} guessed '${letter.toUpperCase()}' (${correct ? 'correct' : 'wrong'})`;

      if (won || lost) {
        collector.stop('finished');
        return i.update({
          embeds: [buildEmbed(game, `The word was: ${game.word.toUpperCase()}`, won ? 'won' : 'lost')],
          components: [],
        });
      }
      return i.update({ embeds: [buildEmbed(game, footer)], components: buildRows(game) });
    });

    collector.on('end', async (_c, reason) => {
      if (reason === 'time') {
        await interaction
          .editReply({ content: '⏰ Game timed out!', components: [] })
          .catch(() => {});
      }
    });
  },
};
