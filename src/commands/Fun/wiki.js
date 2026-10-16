import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const HEADERS = { 'User-Agent': 'DiscordBot/1.0 (wiki command)' };
const summaryUrl = (t) =>
  `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}`;

export default {
  data: new SlashCommandBuilder()
    .setName('wiki')
    .setDescription('Get a Wikipedia summary')
    .addStringOption((o) => o.setName('topic').setDescription('What do you want to look up?').setRequired(true)),
  category: 'Fun',

  async execute(interaction) {
    const topic = interaction.options.getString('topic');
    await interaction.deferReply();

    try {
      let res = await fetch(summaryUrl(topic), { headers: HEADERS });

      if (res.status === 404) {
        const search = await fetch(
          `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(topic)}&limit=1`,
          { headers: HEADERS },
        );
        const found = search.ok ? (await search.json()).pages?.[0] : null;
        if (!found) return interaction.editReply(`❌ No Wikipedia article found for **${topic}**.`);
        res = await fetch(summaryUrl(found.title), { headers: HEADERS });
      }

      if (!res.ok) return interaction.editReply('❌ Could not reach Wikipedia right now.');

      const data = await res.json();
      let extract = data.extract || 'No summary available.';
      if (extract.length > 1000) extract = extract.slice(0, 997) + '...';
      const pageUrl = data.content_urls?.desktop?.page;

      const embed = new EmbedBuilder()
        .setTitle(`📚 ${data.title ?? topic}`)
        .setDescription(extract)
        .setColor(0x0066cc)
        .setFooter({ text: 'Wikipedia' });
      if (pageUrl) embed.setURL(pageUrl);
      if (data.thumbnail?.source) embed.setThumbnail(data.thumbnail.source);

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('wiki command error:', err);
      await interaction.editReply('❌ Something went wrong while fetching the summary.');
    }
  },
};
