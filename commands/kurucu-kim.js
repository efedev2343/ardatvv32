const emoji = require("../emoji.js");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "kurucu-kim",
  description: "Sunucu kurucusunu gör!",
  type: 1,
  options: [],

  run: async (client, interaction) => {
    try {
      const owner = await interaction.guild.fetchOwner();

      const embed = new EmbedBuilder()
        .setTitle(emoji.kbdTac + " Sunucu Kurucusu")
        .setDescription(`Sunucu sahibi: <@${owner.id}> (${owner.user.tag})`)
        .setColor("Gold");

      await interaction.reply({
        embeds: [embed],
        ephemeral: false,
      });

    } catch (err) {
      console.error("Kurucu komutunda hata:", err);
      await interaction.reply({
        content: emoji.carpi + " Bir hata oluştu. Lütfen tekrar deneyin.",
        ephemeral: true,
      });
    }
  },

  registerInteractionHandler: () => {
    // Menü kullanılmadığı için bu fonksiyona gerek yok
  },
};
