const emoji = require("../emoji.js");
const { EmbedBuilder } = require("discord.js");
const config = require("../config.json");
const moment = require("moment");
require("moment-duration-format");

module.exports = {
  name: "istatistik",
  description: "Botun gelişmiş istatistiklerini gösterir",
  type: 1,
  options: [],

  run: async (client, interaction) => {
    const uptime = moment
      .duration(client.uptime)
      .format("D [gün], H [saat], m [dakika], s [saniye]");

    // Kullanıcı sayısını hesapla
    let totalUsers = 0;
    client.guilds.cache.forEach((guild) => {
      totalUsers += guild.memberCount || 0;
    });

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(emoji.kbdNews + " Bot İstatistikleri")
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        {
          name: emoji.kbdSaat + " Çalışma Süresi",
          value: uptime,
          inline: true
        },
        {
          name: emoji.kbdNews + " Bellek Kullanımı",
          value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
          inline: true
        },
        {
          name: emoji.kbdUser + " Toplam Kullanıcı",
          value: totalUsers.toLocaleString(),
          inline: true
        },
        {
          name: emoji.kbdDiscordLink + " Sunucu Sayısı",
          value: client.guilds.cache.size.toLocaleString(),
          inline: true
        },
        {
          name: emoji.kbdZil + " Kanal Sayısı",
          value: client.channels.cache.size.toLocaleString(),
          inline: true
        },
        {
          name: emoji.kbdZil + " Ping",
          value: `${client.ws.ping} ms`,
          inline: true
        },
        {
          name: emoji.kbdCalisma + " Sistem Bilgileri",
          value: `**OS:** ${process.platform} ${process.arch}\n**Node.js:** ${process.version}\n**Discord.js:** v${require("discord.js").version}`,
          inline: false
        },
        {
          name: emoji.kbdTac + " Bot Sahibi",
          value: `<@${config["sahip"]}>`,
          inline: false
        }
      )
      .setFooter({
        text: emoji.kbdOyun + ` Hazırlayan: ${config["sahip-adi"]} ` + emoji.kbdOyun,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
