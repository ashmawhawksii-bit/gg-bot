import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const QUESTIONS = [
  { question: 'What is the capital of France?', answer: 'paris' },
  { question: 'Which planet is known as the Red Planet?', answer: 'mars' },
  { question: 'What is the largest ocean on Earth?', answer: 'pacific' },
  { question: 'How many continents are there?', answer: '7' },
  { question: 'What gas do plants absorb from the air?', answer: 'carbon dioxide' },
  { question: 'Who wrote "Romeo and Juliet"?', answer: 'shakespeare' },
  { question: 'What is the chemical symbol for water?', answer: 'h2o' },
  { question: 'What is the largest mammal in the world?', answer: 'blue whale' },
  { question: 'What is the capital of Japan?', answer: 'tokyo' },
  { question: 'How many sides does a hexagon have?', answer: '6' },
  { question: 'What is the hardest natural substance?', answer: 'diamond' },
  { question: 'What is the capital of Bangladesh?', answer: 'dhaka' },
  { question: 'Which planet is closest to the Sun?', answer: 'mercury' },
  { question: 'What is the boiling point of water in Celsius?', answer: '100' },
  { question: 'What language is mostly spoken in Brazil?', answer: 'portuguese' },
];

const active = new Set();

export default {
  data: new SlashCommandBuilder().setName('trivia').setDescription('Answer a random trivia question'),
  category: 'Fun',

  async execute(interaction) {
    const channel = interaction.channel;
    if (active.has(channel.id)) {
      return interaction.reply({ content: 'A trivia question is already active in this channel!', ephemeral: true });
    }

    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    active.add(channel.id);

    const embed = new EmbedBuilder()
      .setTitle('🧠 Trivia Time!')
      .setDescription(q.question)
      .setColor(0xf1c40f)
      .setFooter({ text: 'Type your answer in chat! (30 seconds)' });
    await interaction.reply({ embeds: [embed] });

    const collector = channel.createMessageCollector({
      filter: (m) => !m.author.bot,
      time: 30_000,
    });

    let solved = false;
    collector.on('collect', async (m) => {
      if (m.content.toLowerCase().trim() === q.answer) {
        solved = true;
        collector.stop('solved');
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('🎉 Correct!')
              .setDescription(`${m.author} got it right!\nThe answer was: **${q.answer}**`)
              .setColor(0x2ecc71),
          ],
        });
      }
    });

    collector.on('end', async () => {
      active.delete(channel.id);
      if (!solved) {
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("⏰ Time's up!")
              .setDescription(`Nobody got it. The answer was: **${q.answer}**`)
              .setColor(0xc0392b),
          ],
        });
      }
    });
  },
};
