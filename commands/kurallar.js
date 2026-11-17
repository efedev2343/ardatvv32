const emoji = require("../emoji.js");
const { Client, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "kurallar",
  description: "Sunucunun kurallarını gösterir.",
  type: 1,

  run: async (client, interaction) => {
    // "Sunucuyu Yönet" yetkisi kontrolü
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({
        content: "Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısınız.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor("#3498db")
      .setTitle(emoji.kbdNews + " Sunucu Kuralları")
      .setDescription(`
**1. Saygılı Olun:** Tüm üyeler birbirine saygı göstermeli ve hoşgörülü olmalıdır.  
**2. Hakaret Yasaktır:** Hakaret etmek veya küfürlü dil kullanmak yasaktır.  
**3. Spam Yapma:** Mesajları tekrarlamak, gereksiz yere spam yapmak yasaktır.  
**4. Reklam Yasaktır:** Başka sunuculara veya ürünlere reklam yapmak yasaktır.  
**5. Bot Komutları:** Bot komutlarını sadece ilgili kanallarda kullanınız.  
**6. NSFW İçerik:** Yetişkin içeriği paylaşmak yasaktır.  
**7. Moderatörlerin Kararlarına Uyun:** Moderatörlerin uyarılarına ve kararlarına uymak zorunludur.
      `)
      .setFooter({ text: "Kurallar, sunucu sağlığı için önemlidir." });

    interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
