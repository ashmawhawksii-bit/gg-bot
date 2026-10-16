import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';

const SYMBOLS = ['❌', '⭕'];
const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function buildRows(board, disabled, winCombo) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const pos = r * 3 + c;
      const mark = board[pos];
      const style = winCombo?.includes(pos)
        ? ButtonStyle.Primary
        : mark === null
          ? ButtonStyle.Secondary
          : mark === 0
            ? ButtonStyle.Danger
            : ButtonStyle.Success;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt_${pos}`)
          .setLabel(mark === null ? String(pos + 1) : SYMBOLS[mark])
          .setStyle(style)
          .setDisabled(disabled || mark !== null),
      );
    }
    rows.push(row);
  }
  return rows;
}

function buildEmbed(players, turn, moves, result) {
  const embed = new EmbedBuilder().setTitle('⭕ Tic-Tac-Toe');
  if (result === 'win') {
    embed.setColor(0xf1c40f).setDescription(`🏆 Winner: <@${players[turn].id}> (${SYMBOLS[turn]})\nMoves: ${moves}`);
  } else if (result === 'draw') {
    embed.setColor(0xe67e22).setDescription(`🤝 It's a draw!\nMoves: ${moves}`);
  } else {
    embed
      .setColor(0x5865f2)
      .setDescription(
        `<@${players[0].id}> (${SYMBOLS[0]}) vs <@${players[1].id}> (${SYMBOLS[1]})\n` +
          `🎯 Turn: <@${players[turn].id}> (${SYMBOLS[turn]})\nMoves: ${moves}/9`,
      );
  }
  return embed;
}

export default {
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Challenge someone to Tic-Tac-Toe')
    .addUserOption((o) => o.setName('opponent').setDescription('Who do you want to play against?').setRequired(true)),
  category: 'Fun',

  async execute(interaction) {
    const opponent = interaction.options.getUser('opponent');
    if (opponent.bot) {
      return interaction.reply({ content: '❌ You cannot play against a bot.', ephemeral: true });
    }
    if (opponent.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot play against yourself.', ephemeral: true });
    }

    const players = [interaction.user, opponent];
    const board = Array(9).fill(null);
    let turn = 0;
    let moves = 0;

    const message = await interaction.reply({
      content: `🎮 <@${opponent.id}>, you have been challenged by <@${interaction.user.id}>!`,
      embeds: [buildEmbed(players, turn, moves)],
      components: buildRows(board, false),
      fetchReply: true,
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000,
    });

    collector.on('collect', async (i) => {
      if (!players.some((p) => p.id === i.user.id)) {
        return i.reply({ content: '❌ You are not in this game.', ephemeral: true });
      }
      if (i.user.id !== players[turn].id) {
        return i.reply({ content: `⚠️ It's <@${players[turn].id}>'s turn.`, ephemeral: true });
      }

      const pos = Number(i.customId.split('_')[1]);
      if (board[pos] !== null) {
        return i.reply({ content: '❌ That cell is taken.', ephemeral: true });
      }

      board[pos] = turn;
      moves += 1;

      const winCombo = WIN_COMBOS.find((combo) => combo.every((p) => board[p] === turn));
      if (winCombo) {
        collector.stop('finished');
        return i.update({
          content: '',
          embeds: [buildEmbed(players, turn, moves, 'win')],
          components: buildRows(board, true, winCombo),
        });
      }
      if (moves >= 9) {
        collector.stop('finished');
        return i.update({
          content: '',
          embeds: [buildEmbed(players, turn, moves, 'draw')],
          components: buildRows(board, true),
        });
      }

      turn = 1 - turn;
      return i.update({
        content: '',
        embeds: [buildEmbed(players, turn, moves)],
        components: buildRows(board, false),
      });
    });

    collector.on('end', async (_c, reason) => {
      if (reason === 'time') {
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('⏰ Game Timed Out')
          .setDescription(`The game between <@${players[0].id}> and <@${players[1].id}> timed out.`);
        await interaction
          .editReply({ content: '', embeds: [embed], components: buildRows(board, true) })
          .catch(() => {});
      }
    });
  },
};
