const emoji = require("../emoji.js");
const {
  Client,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ChannelType,
} = require("discord.js");
const moment = require("moment");
moment.locale("tr");
const config = require("../config.json");

module.exports = {
  name: "sunucu-bilgi",
  description: "Sunucu hakkında detaylı bilgileri gösterir.",
  type: 1,
  options: [],

  run: async (client, interaction) => {
    try {
      // Defer reply to handle longer processing
      await interaction.deferReply();

      // Fetch guild data
      const { guild } = interaction;
      await guild.members.fetch().catch(() => {}); // Silent catch for partial fetches

      // Channel type mapping
      const kanalTipleri = {
        kategori: ChannelType.GuildCategory,
        yazı: ChannelType.GuildText,
        ses: ChannelType.GuildVoice,
        altbaşlık: ChannelType.GuildForum,
      };

      // Calculate channel counts
      const kanalSayısı = Object.entries(kanalTipleri).reduce(
        (acc, [key, type]) => {
          acc[key] = guild.channels.cache.filter((c) => c.type === type).size;
          return acc;
        },
        {}
      );

      // Fetch owner and handle potential errors
      const sahip = await guild.fetchOwner().catch(() => null);
      const sahipBilgi = sahip ? `${sahip.user.tag} (${sahip.user.id})` : "Bilinmiyor";

      // Region mapping with broader support
      const bölgeler = {
        "tr": emoji.kbdDiscordLink + " Türkiye",
        "en-US": emoji.kbdDiscordLink + " Amerika",
        "en-GB": emoji.kbdDiscordLink + " Birleşik Krallık",
        "de": emoji.kbdDiscordLink + " Almanya",
        "fr": emoji.kbdDiscordLink + " Fransa",
        "ja": emoji.kbdDiscordLink + " Japonya",
      };
      const ülke = bölgeler[guild.preferredLocale] || guild.preferredLocale;

      // Verification level mapping
      const doğrulamaSeviyeleri = {
        0: "Yok",
        1: "Düşük",
        2: "Orta",
        3: "Yüksek",
        4: "Çok Yüksek",
      };
      const doğrulama = doğrulamaSeviyeleri[guild.verificationLevel] || "Bilinmiyor";

      // Member counts
      const memberCount = guild.memberCount;
      const botCount = guild.members.cache.filter((m) => m.user.bot).size;
      const humanCount = memberCount - botCount;

      // Emoji handling with limit and formatting
      const emojis = guild.emojis.cache.map((e) => e.toString()).slice(0, 25);
      const emojiBilgi = emojis.length ? emojis.join(" ") : "*Sunucuda emoji bulunmuyor.*";

      // Role handling with better sorting and limit
      const roller = guild.roles.cache
        .filter((r) => r.name !== "@everyone")
        .sort((a, b) => b.position - a.position)
        .map((r) => r.toString())
        .slice(0, 15);
      const rolBilgi = roller.length ? roller.join(" ") : "*Yönetilebilir rol bulunmuyor.*";

      // Boost status
      const boostSeviyesi = guild.premiumTier;
      const boostSayısı = guild.premiumSubscriptionCount;

      // Ban count
      const banSayısı = (await guild.bans.fetch().catch(() => ({ size: 0 }))).size;

      // Helper function to create embeds
      const createEmbed = (title, color, fields, thumbnail, footerText) =>
        new EmbedBuilder()
          .setColor(color)
          .setTitle(title)
          .setThumbnail(thumbnail || guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
          .addFields(fields)
          .setFooter({ text: footerText, iconURL: guild.iconURL({ dynamic: true }) })
          .setTimestamp();

      // Embed definitions
      const embedler = {
        genel: createEmbed(
          emoji.kbdNews + " Sunucu Genel Bilgileri",
          "#9b59b6",
          [
            { name: emoji.kbdApi + " Sunucu Adı", value: guild.name || "Bilinmiyor", inline: true },
            { name: emoji.kbdApi + " Sunucu ID", value: guild.id, inline: true },
            { name: emoji.kbdTac + " Sahip", value: sahipBilgi, inline: true },
            { name: emoji.kbdWebsite + " Bölge", value: ülke, inline: true },
            { name: emoji.kbdCalisma + " Kuruluş", value: moment(guild.createdAt).format("LLL"), inline: true },
            { name: emoji.admin + "Doğrulama", value: doğrulama, inline: true },
            { name: emoji.kbdUser + " Üye Sayısı", value: `${memberCount} (İnsan: ${humanCount}, Bot: ${botCount})`, inline: true },
            { name: emoji.kbdOyun + " Boost Seviyesi", value: `Seviye ${boostSeviyesi} (${boostSayısı} boost)`, inline: true },
            { name: emoji.carpi + " Yasaklama Sayısı", value: `${banSayısı}`, inline: true },
          ],
          guild.iconURL({ dynamic: true }),
          "Sunucu Bilgi Paneli"
        ),

        kanallar: createEmbed(
          emoji.kbdNews + " Kanal Bilgileri",
          "#3498db",
          [
            {
              name: emoji.kbdApi + " Kanal Sayısı",
              value: [
                `Toplam: \`${guild.channels.cache.size}\``,
                `> ${emoji.kbdNews} Kategori: \`${kanalSayısı.kategori || 0}\``,
                `> ${emoji.kbdNews} Yazı: \`${kanalSayısı.yazı || 0}\``,
                `> ${emoji.kbdZil} Ses: \`${kanalSayısı.ses || 0}\``,
                `> ${emoji.kbdNews} Forum: \`${kanalSayısı.altbaşlık || 0}\``,
              ].join("\n"),
            },
          ],
          guild.iconURL({ dynamic: true }),
          "Kanal Bilgileri"
        ),

        emojiler: createEmbed(
          emoji.kbdOyun + " Emoji Bilgileri",
          "#2ecc71",
          [
            { name: emoji.kbdNews + " Toplam Emoji", value: `${guild.emojis.cache.size}`, inline: true },
            { name: emoji.kbdOyun + " Animasyonlu", value: `${guild.emojis.cache.filter((e) => e.animated).size}`, inline: true },
            { name: emoji.kbdNews + " Normal", value: `${guild.emojis.cache.filter((e) => !e.animated).size}`, inline: true },
            { name: emoji.kbdNews + " Emojiler", value: emojiBilgi },
          ],
          guild.iconURL({ dynamic: true }),
          "Sunucu Emojileri"
        ),

        roller: createEmbed(
          emoji.kbdOyun + " Rol Bilgileri",
          "#f39c12",
          [
            { name: emoji.kbdNews + " Toplam Rol", value: `${guild.roles.cache.size}`, inline: true },
            { name: emoji.kbdNews + " İlk 15 Rol", value: rolBilgi },
          ],
          guild.iconURL({ dynamic: true }),
          "Sunucu Rolleri"
        ),
      };

      // Select menu with enhanced styling
      const menu = new StringSelectMenuBuilder()
        .setCustomId("sunucuBilgiMenu")
        .setPlaceholder(emoji.kbdCalisma + " Bilgi Kategorisi Seçin")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          { label: "Genel Bilgiler", value: "genel", emoji: emoji.kbdNews, description: "Sunucunun temel bilgileri" },
          { label: "Kanallar", value: "kanallar", emoji: emoji.kbdNews, description: "Kanal istatistikleri" },
          { label: "Emojiler", value: "emojiler", emoji: emoji.kbdOyun, description: "Sunucu emojileri" },
          { label: "Roller", value: "roller", emoji: emoji.kbdOyun, description: "Sunucu rolleri" }
        );

      const row = new ActionRowBuilder().addComponents(menu);

      // Send initial reply
      const response = await interaction.editReply({
        embeds: [embedler.genel],
        components: [row],
        fetchReply: true,
      });

      // Collector for menu interactions
      const filter = (i) => i.user.id === interaction.user.id;
      const collector = response.createMessageComponentCollector({
        filter,
        time: 120000, // Extended timeout to 2 minutes
      });

      collector.on("collect", async (i) => {
        try {
          const secilen = i.values[0];
          await i.update({ embeds: [embedler[secilen]], components: [row] });
        } catch (error) {
          console.error("Menu interaction error:", error);
          await i.reply({ content: "Bir hata oluştu, lütfen tekrar deneyin.", ephemeral: true });
        }
      });

      collector.on("end", async () => {
        try {
          // Disable menu after timeout
          const disabledMenu = new StringSelectMenuBuilder(menu)
            .setDisabled(true)
            .setPlaceholder(emoji.kbdCalisma + " Süre doldu, tekrar çalıştırın");
          const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
          await interaction.editReply({ components: [disabledRow] });
        } catch (error) {
          console.error("Collector end error:", error);
        }
      });

    } catch (error) {
      console.error("Command execution error:", error);
      await interaction.editReply({
        content: "Bir hata oluştu, lütfen daha sonra tekrar deneyin.",
        ephemeral: true,
      });
    }
  },
};