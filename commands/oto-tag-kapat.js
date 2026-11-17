const emoji = require("../emoji.js");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "oto-tag-kapat",
  description: "Oto-tag sistemini devre dışı bırakır ve ilgili verileri temizler.",
  type: 1,
  options: [],
  run: async (client, interaction) => {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return interaction.reply({
        content: emoji.carpi + "  | İsimleri Yönet yetkiniz yok!",
        ephemeral: true,
      });
    }

   
    const otoTagVerisi = db.fetch(`ototag_${interaction.guild.id}`);

    if (!otoTagVerisi) {
      return interaction.reply({
        content: emoji.kbdWarn + "  | Oto-tag sistemi zaten kapalı veya veriler bulunamadı.",
        ephemeral: true,
      });
    }

 
    db.delete(`ototag_${interaction.guild.id}`);

    
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("Oto-Tag Sistemi Kapatıldı!")
      .setDescription(emoji.tik + "  | Oto-tag başarıyla devre dışı bırakıldı ve ayarlar sıfırlandı.")
      .setFooter({
        text: "Oto-tag sistemini tekrar aktif hale getirebilirsiniz.",
      });

    interaction.reply({ embeds: [embed] });
  },
};
