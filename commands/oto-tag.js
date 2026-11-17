const emoji = require("../emoji.js");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "oto-tag",
  description: "Sunucuya giren üyelere otomatik tag verir.",
  type: 1,
  options: [
    {
      name: "tag",
      description: "Lütfen bir tag girin (örnek: [TAG] veya kullanıcı adı formatı).",
      type: 3,
      required: true,
    },
  ],
  run: async (client, interaction) => {
    
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return interaction.reply({
        content: emoji.carpi + "  | İsimleri Yönet yetkiniz yok!",
        ephemeral: true,
      });
    }

    
    const tag = interaction.options.getString("tag");

  
    db.set(`ototag_${interaction.guild.id}`, tag);

    
    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("Oto-Tag Sistemi Başarıyla Ayarlandı!")
      .setDescription(`${emoji.tik}  | Sunucuya yeni katılan üyelere başarıyla "${tag}" tag'ı verilecek!`)
      .setFooter({
        text: "Yeni katılan üyeler, bu tag ile etiketlenecektir.",
      });

    interaction.reply({ embeds: [embed] });
  },
};
