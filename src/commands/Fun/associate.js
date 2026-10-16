import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('associate')
    .setDescription('Find related and rhyming words')
    .addStringOption((o) => o.setName('word').setDescription('Word to look up').setRequired(true)),
  category: 'Fun',

  async execute(interaction) {
    const word = interaction.options.getString('word');
    await interaction.deferReply();

    try {
      const base = 'https://api.datamuse.com/words';
      const [similarRes, rhymeRes] = await Promise.all([
        fetch(`${base}?ml=${encodeURIComponent(word)}&max=8`),
        fetch(`${base}?rel_rhy=${encodeURIComponent(word)}&max=5`),
      ]);
      if (!similarRes.ok) return interaction.editReply('❌ Could not reach the word service.');

      const similar = (await similarRes.json()).map((x) => x.word);
      const rhymes = rhymeRes.ok ? (await rhymeRes.json()).map((x) => x.word) : [];

      if (!similar.length) return interaction.editReply(`No related words found for **${word}**.`);

      const embed = new EmbedBuilder()
        .setTitle(`🔗 Words related to '${word}'`)
        .setDescription(`**Similar meaning:** ${similar.join(', ')}`)
        .setColor(0x3498db)
        .setFooter({ text: 'Powered by Datamuse' });
      if (rhymes.length) embed.addFields({ name: '🎵 Rhymes', value: rhymes.join(', ') });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('associate command error:', err);
      await interaction.editReply('❌ Something went wrong while fetching words.');
    }
  },
};
