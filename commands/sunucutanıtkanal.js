const emoji = require("../emoji.js");
const { Client, PermissionsBitField } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "Bump-kanal-ayarla",
  description: "Sunucuda tanıtım yapılacak kanalı ayarlayın!",
  type: 1,
  options: [
    {
      name: 'kanal',
      description: 'Tanıtım yapılacak kanalı seçin.',
      type: 7, // CHANNEL tipi
      required: true,
    },
  ],

  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: emoji.carpi + "  | Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!", ephemeral: true });
    }

    const channel = interaction.options.getChannel('kanal');
    if (!channel || channel.type !== 0) {
      return interaction.reply({ content: emoji.carpi + "  | Lütfen geçerli bir metin kanalı seçin!", ephemeral: true });
    }

    // Sunucuya özel kanal ID'sini veritabanında kaydediyoruz
    db.set(`tanıtChannel_${interaction.guild.id}`, channel.id);

    interaction.reply({ content: `${emoji.tik}  | Tanıtım kanalı başarıyla **${channel.name}** olarak ayarlandı! Bu kanal bu sunucuda kullanılacak.`, ephemeral: true });
  },
};