const emj = require("../emoji.js");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "emojiler",
  description: "Sunucudaki tüm özel emojileri sayfa sayfa gösterir.",
  type: 1,

  run: async (client, interaction) => {
    const guild = interaction.guild;
    const id = interaction.id;

    try {
      await interaction.deferReply();

      const emojiler = guild.emojis.cache;

      if (emojiler.size === 0) {
        return interaction.editReply({
          content: "Bu sunucuda hiç özel emoji bulunmamaktadır.",
          ephemeral: true
        });
      }

      // Emojileri türlerine göre ayır
      const animasyonluEmojiler = emojiler.filter(e => e.animated);
      const normalEmojiler = emojiler.filter(e => !e.animated);

      const paginateEmojis = (emojiList, title, emojisPerPage = 20) => {
        const pages = [];
        const emojiArray = [...emojiList.values()];
        const totalPages = Math.ceil(emojiArray.length / emojisPerPage);

        for (let currentPage = 0; currentPage < totalPages; currentPage++) {
          const pageEmojis = emojiArray.slice(currentPage * emojisPerPage, (currentPage + 1) * emojisPerPage);

          pages.push(
            new EmbedBuilder()
              .setColor("#3498db")
              .setTitle(`${guild.name} Sunucusu - ${title}`)
              .setDescription(pageEmojis.map(e => `${e} \`${e.name}\``).join(" "))
              .setFooter({
                text: `Sayfa ${currentPage + 1}/${totalPages} • Toplam ${emojiArray.length} emoji`,
                iconURL: guild.iconURL() || undefined
              })
          );
        }
        return pages;
      };

      const allPages = [
        ...paginateEmojis(normalEmojiler, "Statik Emojiler"),
        ...paginateEmojis(animasyonluEmojiler, "Animasyonlu Emojiler")
      ];

      if (allPages.length === 0) {
        return interaction.editReply({ content: "Gösterilecek emoji bulunamadı.", ephemeral: true });
      }

      // Tek sayfa varsa butonsuz gönder
      if (allPages.length === 1) {
        return interaction.editReply({ embeds: [allPages[0]] });
      }

      let currentPage = 0;
      const prevId = `emoji_prev_${id}`;
      const nextId = `emoji_next_${id}`;

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(prevId)
          .setLabel(emj.kbdDiscordLink + " Önceki")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(nextId)
          .setLabel("Sonraki " + emj.kbdDiscordLink)
          .setStyle(ButtonStyle.Primary)
      );

      const message = await interaction.editReply({
        embeds: [allPages[currentPage]],
        components: [buttons]
      });

      const collector = message.createMessageComponentCollector({
        filter: (i) => i.customId === prevId || i.customId === nextId,
        time: 300000
      });

      collector.on("collect", async (i) => {
        try {
          if (i.user.id !== interaction.user.id) {
            await i.reply({
              content: "Bu butonları sadece komutu kullanan kişi kullanabilir.",
              ephemeral: true
            }).catch(() => {});
            return;
          }

          if (i.customId === prevId) currentPage--;
          else if (i.customId === nextId) currentPage++;

          if (currentPage < 0) currentPage = 0;
          if (currentPage > allPages.length - 1) currentPage = allPages.length - 1;

          buttons.components[0].setDisabled(currentPage === 0);
          buttons.components[1].setDisabled(currentPage === allPages.length - 1);

          await i.deferUpdate().catch(() => {});
          await message.edit({
            embeds: [allPages[currentPage]],
            components: [buttons]
          }).catch(() => {});
        } catch (err) {
          if (![10062, 40060].includes(err.code)) {
            console.error("Emojiler buton hatası:", err);
          }
        }
      });

      collector.on("end", () => {
        message.edit({ components: [] }).catch((err) => {
          if (![10062, 40060, 10008].includes(err.code)) {
            console.error("Collector kapatma hatası:", err);
          }
        });
      });
    } catch (err) {
      if (![10062, 40060].includes(err.code)) {
        console.error("Emojiler alınırken bir hata oluştu:", err);
      }
      const mesaj = emj.carpi + "  | Emojiler alınırken bir hata oluştu.";
      const payload = { content: mesaj, ephemeral: true };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => {});
        } else if (interaction.isRepliable()) {
          await interaction.reply(payload).catch(() => {});
        }
      } catch { /* sessizce geç */ }
    }
  }
};
