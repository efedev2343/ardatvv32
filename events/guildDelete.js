const emoji = require("../emoji.js");
const { 
  Events, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require("discord.js");
const config = require("../config.json");

module.exports = {
  name: Events.GuildDelete,

  run: async (client, guild) => {
    const kanal = config["log"];

    const owner = await client.users.fetch(guild.ownerId).catch(() => null);

    // === 1. Log Kanalına Mesaj ===
    const embed = new EmbedBuilder()
      .setDescription(`Bir Sunucudan Atıldım!
Sunucu İsmi: ${guild.name}
Sunucu Kimliği: ${guild.id} 
Kurucu: ${owner ? owner.tag : "Bilinmiyor"}
Kurucu Kimliği: ${guild.ownerId}
Üye Sayısı: ${guild.memberCount}
Sunucu Sayısı: ${client.guilds.cache.size}`)
      .setColor("Red");

    const channel = client.channels.cache.get(kanal);
    if (channel) {
      channel.send({ embeds: [embed] }).catch(error =>
        console.error("Mesaj gönderirken bir hata oluştu:", error)
      );
    } else {
      console.error(`Belirtilen kanal bulunamadı: ${kanal}`);
    }

    // === 2. Sunucu Sahibine DM ===
    if (owner) {
      const dmEmbed = new EmbedBuilder()
        .setTitle(`${emoji.kbdOyun} ${client.user.username} Sunucudan Atıldı`)
        .setDescription(`Selam, beni **${guild.name}** adlı sunucudan çıkardın ya da attınız. Eğer yanlışlıkla olduysa tekrar ekleyebilirsin.\n\nDestek istersen aşağıdan ulaşabilirsin.\n\n> Bu mesajı sadece sen alıyorsun çünkü sunucu sahibisin.`)
        .setImage(client.user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setColor("#2B2D31");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(emoji.kbdOyun + " Destek Sunucusu")
          .setStyle(ButtonStyle.Link)
          .setURL(config["desteksunucu"])
      );

      await owner.send({ embeds: [dmEmbed], components: [row] }).catch(err => {
        console.warn(`[${client.user.username}] DM gönderilemedi: ${owner.tag}`);
      });
    }
  }
};
