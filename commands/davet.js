const emoji = require("../emoji.js");
const { Client, EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const config = require("../config.json");
const guvenliURL = (v) => (typeof v === "string" && /^https?:\/\/[^\s]+$/i.test(v.trim()) ? v.trim() : null);

module.exports = {
  name: "davet",
  description: "Botu sunucuna davet et ve destek al!",
  type: 1,
  options: [],

  run: async (client, interaction) => {
    try {
      // URL değerlerini kontrol et ve varsayılan değer ata
      const botAdi = (config["bot-adi"] || "Bot").trim();
      const botDavetURL = guvenliURL(config["bot-davet"]) || `https://discord.com/oauth2/authorize?client_id=${config["bot-id"]}&permissions=8&integration_type=0&scope=bot+applications.commands`;
      const destekURL = guvenliURL(config["desteksunucu"]);

      // Butonları oluştur (geçersiz link varsa o buton eklenmez)
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(`${botAdi.toLocaleUpperCase("tr-TR")} BOTU DAVET`)
          .setStyle(5)
          .setURL(botDavetURL)
      );
      if (destekURL) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel(emoji.kbdCalisma + " Yardım Al!")
            .setStyle(5)
            .setURL(destekURL)
        );
      }

      // Embed oluştur
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `Merhaba! Ben ${botAdi}!`,
          iconURL: client.user.displayAvatarURL()
        })
        .setTitle(emoji.kbdOyun + " Yeni Bir Başlangıç İçin Hazır Mısın?")
        .setDescription(
          "Hadi botumu sunucuna ekleyerek herkesin hayatını kolaylaştır! " +
          "Ayrıca, **destek sunucuma** katılarak her zaman yardımcı olabileceğim!\n\n" +
          "**" + emoji.kbdDiscordLink + " Botu davet et:** 'Başla' butonuna tıklayarak hemen!\n" +
          "**" + emoji.kbdTac + " Yardım Al:** Sıkıntı yaşarsan, **Destek Sunucumuzu** ziyaret et."
        )
        .setImage(config["bot-banner"] || "https://cdn.discordapp.com/attachments/1263190896644591626/1264149337496358954/IMG_20240720_121748.jpg")
        .setColor("#F1C40F")
        .setTimestamp()
        .setFooter({
          text: `Komutu kullanan: ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        });

      // Yanıt gönder
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
    } catch (error) {
      console.error("Davet komutunda hata:", error);
      await interaction.reply({ content: "Bir hata oluştu! Lütfen tekrar deneyin.", ephemeral: true });
    }
  }
};
