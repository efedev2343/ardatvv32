const emoji = require("../emoji.js");
const {
  Client,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");
const config = require("../config.json");

module.exports = {
  name: "say",
  description: "Sunucuda toplam üye, bot ve sahte üye sayısını gösterir.",
  type: 1,
  options: [],

  run: async (client, interaction) => {
    await interaction.guild.members.fetch();

    const totalMembers = interaction.guild.memberCount;
    const realMembers = interaction.guild.members.cache.filter(m => !m.user.bot).size;
    const botCount = interaction.guild.members.cache.filter(m => m.user.bot).size;
    const fakeMembers = interaction.guild.members.cache.filter(m => Date.now() - m.user.createdAt < 15 * 24 * 60 * 60 * 1000).size;
    const adminMembers = interaction.guild.members.cache.filter(m => m.permissions.has(PermissionsBitField.Flags.Administrator)).size;

    const guildIcon = interaction.guild.iconURL({ dynamic: true }) || "https://i.hizliresim.com/n5271mq.jpg";

    const embed = new EmbedBuilder()
      .setColor("#00bfff")
      .setAuthor({
        name: `${interaction.guild.name} • Sunucu İstatistikleri`,
        iconURL: guildIcon
      })
      .setThumbnail(guildIcon)
      .setDescription(
        `> ${emoji.kbdUser} **Toplam Üye Sayısı**: \`${totalMembers}\`\n` +
        `> ${emoji.kbdUser} **Gerçek Kullanıcılar**: \`${realMembers}\`\n` +
        `> ${emoji.kbdBot2} **Botlar**: \`${botCount}\`\n` +
        `> ${emoji.admin}**Yönetici Yetkisi Olanlar**: \`${adminMembers}\`\n\n` +
        `${emoji.kbdNews} **Sahte Üye Sayısı**: \`${fakeMembers}\`\n` +
        `${emoji.kbdNews} *Sahte üyeler: Son 15 gün içinde açılmış hesaplar olarak değerlendirilir.*`
      )
      .setFooter({
        text: `${interaction.user.tag} tarafından istendi • ${config["bot-adi"]}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};
