const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("croxydb");
const emoji = require("../emoji.js");

module.exports = {
  name: "bump-kur",
  description: "Bump sistemini bu sunucu için kurar / etkinleştirir.",
  type: 1,
  options: [
    {
      name: "durum",
      description: "Bump sistemini açar veya kapatır",
      type: 3,
      required: true,
      choices: [
        { name: "Aç", value: "acik" },
        { name: "Kapat", value: "kapali" },
      ],
    },
  ],

  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return await interaction.reply({
        content: `${emoji.carpi} | Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!`,
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;
    const durum = interaction.options.getString("durum");

    if (durum === "acik") {
      db.set(`bumpSistemi_${guildId}`, "acik");

      const embed = new EmbedBuilder()
        .setColor("#57F287")
        .setTitle(emoji.tik + " Bump Sistemi Kuruldu")
        .setDescription(
          `Bump sistemi başarıyla **etkinleştirildi**!\n\nArtık \`/bump\` komutu kullanılabilir.\nTanıtım kanalı ayarlamak için \`/bump-kanal-ayarla\` komutunu kullanabilirsiniz.`
        )
        .setTimestamp();

      return await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      db.set(`bumpSistemi_${guildId}`, "kapali");

      const embed = new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle(emoji.kbdKilit + " Bump Sistemi Kapatıldı")
        .setDescription("Bump sistemi devre dışı bırakıldı. `/bump` komutu artık kullanılmayacaktır.")
        .setTimestamp();

      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
