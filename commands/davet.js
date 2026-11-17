const emoji = require("../emoji.js");
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const config = require("../config.json");
const guvenliURL = (v) => (typeof v === "string" && /^https?:\/\/[^\s]+$/i.test(v.trim()) ? v.trim() : null);

module.exports = {
  name: "davet",
  description: "Botu sunucuna davet et ve destek al!",
  type: 1,
  options: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferReply();

      // bot-id boşsa botun kendi ID'sini kullan (geçersiz davet linki olmasın)
      const botId = String(config["bot-id"] || client.user.id || "").trim();
      const botAdi = String(config["bot-adi"] || client.user.username || "Bot").trim();
      const botDavetURL = guvenliURL(config["bot-davet"]) ||
        `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(botId)}&permissions=8&integration_type=0&scope=bot%20applications.commands`;
      const destekURL = guvenliURL(config["desteksunucu"]);
      const bannerURL = guvenliURL(config["bot-banner"]) ||
        "https://cdn.discordapp.com/embed/avatars/0.png";

      // Butonları tek tek oluştur; biri çökerse diğerleri yine eklenir
      const buttonLar = [];
      const linkEkle = (label, url, emo) => {
        if (!url) return;
        try {
          buttonLar.push(
            new ButtonBuilder()
              .setLabel(label)
              .setStyle(ButtonStyle.Link)
              .setURL(url)
              .setEmoji(emo)
          );
        } catch (err) {
          console.warn(`[davet] Buton eklenemedi (${label}):`, err.message);
        }
      };

      linkEkle(`${botAdi.toLocaleUpperCase("tr-TR")} BOTU DAVET`, botDavetURL, emoji.kbdDavet);
      linkEkle("Yardım Al!", destekURL, emoji.kbdCalisma);

      const row = new ActionRowBuilder().addComponents(buttonLar);

      const embed = new EmbedBuilder()
        .setAuthor({ name: `Merhaba! Ben ${botAdi}!`, iconURL: client.user.displayAvatarURL() })
        .setTitle(emoji.kbdOyun + " Yeni Bir Başlangıç İçin Hazır Mısın?")
        .setDescription(
          "Hadi botumu sunucuna ekleyerek herkesin hayatını kolaylaştır! " +
          "Ayrıca, **destek sunucuma** katılarak her zaman yardımcı olabileceğim!\n\n" +
          "**" + emoji.kbdDiscordLink + " Botu davet et:** 'Başla' butonuna tıklayarak hemen!\n" +
          "**" + emoji.kbdTac + " Yardım Al:** Sıkıntı yaşarsan, **Destek Sunucumuzu** ziyaret et."
        )
        .setImage(bannerURL)
        .setColor("#F1C40F")
        .setTimestamp()
        .setFooter({
          text: `Komutu kullanan: ${interaction.user.tag || interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL()
        });

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error("Davet komutunda hata:", err);
      const detay = String(err?.message || err).slice(0, 180);
      const mesaj = "Bir hata oluştu! Lütfen tekrar deneyin.\n`" + detay.replace(/`/g, "") + "`";
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: mesaj, ephemeral: true }).catch(() => {});
        } else if (interaction.isRepliable()) {
          await interaction.reply({ content: mesaj, ephemeral: true }).catch(() => {});
        }
      } catch { /* sessizce geç */ }
    }
  }
};
