const emoji = require("../emoji.js");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const axios = require("axios");
const db = require("croxydb");

module.exports = {
  name: "deprem",
  description: "Son depremler hakkında bilgi alırsınız veya deprem bildirim kanalını ayarlarsınız.",
  type: 1,
  options: [
    {
      name: "kanal-ayarla",
      description: "Deprem bildirimlerinin gönderileceği kanalı ayarlar.",
      type: 7, // CHANNEL
      required: false,
    }
  ],
  run: async (client, interaction) => {
    try {
      const kanal = interaction.options.getChannel("kanal-ayarla");

      if (kanal) {
        db.set(`depremKanal_${interaction.guild.id}`, kanal.id);
        return interaction.reply(`${emoji.tik} | Deprem bildirim kanalı <#${kanal.id}> olarak ayarlandı.`);
      }

      await interaction.deferReply();
      const response = await axios.get("https://api.orhanaydogdu.com.tr/deprem/lives", {
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      let earthquakes = response.data.result || response.data || [];
      earthquakes = earthquakes.map(eq => ({
        yer: eq.location || 'Bilinmiyor',
        buyukluk: eq.mag || eq.magnitude || '?',
        derinlik: eq.depth || '?',
        tarih: eq.date ? eq.date.split(' ')[0] : '',
        saat: eq.time || (eq.date ? eq.date.split(' ')[1] : '') || ''
      }));

      if (!earthquakes || earthquakes.length === 0) {
        return interaction.editReply(emoji.carpi + "  | Son depremler hakkında bilgi bulunamadı.");
      }

      const displayCount = 10;
      let currentPage = 0;
      const totalPages = Math.ceil(earthquakes.length / displayCount);

      const createEmbed = (page) => {
        const start = page * displayCount;
        const end = start + displayCount;
        const earthquakesPage = earthquakes.slice(start, end);

        const embedDescription = earthquakesPage
          .map((eq, index) =>
            `#${start + index + 1} - **Yer:** ${eq.yer || 'Bilinmiyor'}
${emoji.kbdNews} **Büyüklük:** ${eq.buyukluk}
${emoji.kbdCalisma} **Derinlik:** ${eq.derinlik} km
${emoji.kbdSaat} **Zaman:** ${eq.tarih} - ${eq.saat}`
          )
          .join("\n\n");

        return new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle("Son Depremler")
          .setDescription(embedDescription)
          .setFooter({ text: `Sayfa ${page + 1} / ${totalPages}` });
      };

      const embed = createEmbed(currentPage);
      const message = await interaction.editReply({ embeds: [embed], fetchReply: true });

      if (totalPages > 1) {
        await message.react(emoji.kbdDiscordLink);
        await message.react(emoji.kbdDiscordLink);

        const filter = (reaction, user) =>
          [emoji.kbdDiscordLink, emoji.kbdDiscordLink].includes(reaction.emoji.name) && !user.bot;

        const collector = message.createReactionCollector({ filter, time: 60000 });

        collector.on("collect", async (reaction, user) => {
          if (reaction.emoji.name === emoji.kbdDiscordLink && currentPage > 0) currentPage--;
          if (reaction.emoji.name === emoji.kbdDiscordLink && currentPage < totalPages - 1) currentPage++;

          const newEmbed = createEmbed(currentPage);
          await message.edit({ embeds: [newEmbed] });

          if (
            message.guild &&
            message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)
          ) {
            await reaction.users.remove(user.id).catch(() => {});
          }
        });

        collector.on("end", () => {
          if (
            message.guild &&
            message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)
          ) {
            message.reactions.removeAll().catch(() => {});
          }
        });
      }
    } catch (error) {
      console.error("Deprem verisi çekilirken hata oluştu:", error.message);
      // Etkileşim süresi dolmuş olabilir; güvenli bir şekilde cevap vermeye çalış
      try {
        if (interaction.replied || interaction.deferred) {
          return interaction.editReply(emoji.carpi + "  | Deprem bilgileri alınırken bir hata oluştu.");
        }
        return interaction.reply(emoji.carpi + "  | Deprem bilgileri alınırken bir hata oluştu.");
      } catch (err) {
        console.error("Deprem hata yanıtı gönderilemedi (etkileşim süresi dolmuş olabilir):", err.message);
      }
    }
  },
};
