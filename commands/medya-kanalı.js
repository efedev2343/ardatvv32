const emoji = require("../emoji.js");
const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "medya-kanalı",
  description: "Görsel engel sistemini ayarlarsın!",
  type: 1,
  options: [
    {
      name: "kanal",
      description: "Görsel engel kanalını ayarlarsın!",
      type: 7,
      required: true,
      channel_types: [0], // Sadece metin kanalları
    },
  ],
  run: async (client, interaction) => {
    // Yetki kontrolü
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({
        content: emoji.carpi + "  | Kanalları Yönet Yetkin Yok!",
        ephemeral: true,
      });
    }

    const kanal = interaction.options.getChannel("kanal");

    // Kanal metin kanalı mı kontrol et
    if (kanal.type !== 0) {
      return interaction.reply({
        content: emoji.carpi + "  | Lütfen bir metin kanalı seçin!",
        ephemeral: true,
      });
    }

    // Kanalı veritabanına kaydet
    db.set(`görselengel_${interaction.guild.id}`, kanal.id);

    const embed = new EmbedBuilder()
      .setColor("Random")
      .setDescription(`${emoji.tik}  | <#${kanal.id}> kanalında sadece resim ve GIF paylaşımlarına izin verilecek, diğer içerikler silinecek!`);

    interaction.reply({ embeds: [embed] });
  },
};