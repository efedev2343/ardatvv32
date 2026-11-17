const emoji = require("../emoji.js");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("croxydb");
const Discord = require("discord.js");

module.exports = {
  name: "timeout-sistemi-sıfırla",
  description: "Timeout sistemini sıfırlarsınız!",
  type: 1,
  options: [],

  run: async (client, interaction) => {
    // Kullanıcıya yetki kontrolü yapılır
    const yetkiEmbed = new Discord.EmbedBuilder()
      .setColor("Red")
      .setDescription(emoji.carpi + "  | Bu komutu kullanabilmek için `Yönetici` yetkisine sahip olmalısın!");

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ embeds: [yetkiEmbed], ephemeral: true });
    }

    // Timeout sistemi veritabanında mevcut mu?
    const timeoutAktif = db.get(`timeoutSistemi_${interaction.guild.id}`);

    if (!timeoutAktif) {
      const mevcutDegerEmbed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(emoji.kbdWarn + "  | Timeout sistemi zaten sıfırlanmış!");

      return interaction.reply({ embeds: [mevcutDegerEmbed], ephemeral: true });
    }

    // Timeout sistemini sıfırlama işlemi
    db.delete(`timeoutSistemi_${interaction.guild.id}`);

    const basariliEmbed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(emoji.tik + "  | **Timeout Sistemi** başarıyla sıfırlandı!");

    return interaction.reply({ embeds: [basariliEmbed], ephemeral: false }).catch((e) => {
      console.error("Timeout sıfırlama sırasında bir hata oluştu:", e);
      const hataEmbed = new EmbedBuilder()
        .setColor("Red")
        .setDescription(emoji.carpi + "  | Timeout sistemi sıfırlanırken bir hata oluştu. Lütfen tekrar deneyin.");

      interaction.reply({ embeds: [hataEmbed], ephemeral: true });
    });
  }
};
