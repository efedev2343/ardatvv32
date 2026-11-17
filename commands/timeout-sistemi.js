const emoji = require("../emoji.js");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("croxydb");
const Discord = require("discord.js");

module.exports = {
  name: "timeout-sistemi",
  description: "Timeout sistemini ayarlarsınız!",
  type: 1,
  options: [
    {
      name: "log-kanalı",
      description: "Timeout atıldığında mesaj atılacak kanalı ayarlarsınız!",
      type: 7,
      required: true,
      channel_types: [0]  // Only text channels
    },
    {
      name: "yetkili-rol",
      description: "Timeout atabilecek yetkili rolünü ayarlarsınız!",
      type: 8,
      required: true,
    },
  ],
  
  run: async (client, interaction) => {
    // Yetki kontrolü
    const yetkiEmbed = new Discord.EmbedBuilder()
      .setColor("Red")
      .setDescription(emoji.carpi + "  | Bu komutu kullanabilmek için `Yönetici` yetkisine sahip olmalısınız!");

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ embeds: [yetkiEmbed], ephemeral: true });
    }

    // Kanal ve rol bilgilerini al
    const kanal = interaction.options.getChannel('log-kanalı');
    const rol = interaction.options.getRole('yetkili-rol');

    // Timeout sistemi zaten aktif mi kontrol et
    const timeoutSistemi = db.fetch(`timeoutSistemi_${interaction.guild.id}`);
    const timeoutSistemiDate = db.fetch(`timeoutSistemiDate_${interaction.guild.id}`);

    // Timeout sistemi aktifse, kullanıcıya sistemin aktif olduğu bilgisi verilir
    if (timeoutSistemi && timeoutSistemiDate) {
      const aktifEmbed = new EmbedBuilder()
        .setColor("Yellow")
        .setDescription(`${emoji.kbdWarn}  | Timeout Sistemi zaten aktif! Sistem ${parseInt(timeoutSistemiDate.date / 1000)} tarihinden itibaren açılmış.`);
      return interaction.reply({ embeds: [aktifEmbed], ephemeral: true });
    }

    // Timeout sistemi başarıyla ayarlandığında
    const basariliEmbed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(`${emoji.tik}  | **Timeout Sistemi** başarıyla ayarlandı!\n\n${emoji.kbdNews} **Log Kanalı**: ${kanal}\n${emoji.kbdBot2} **Yetkili Rolü**: ${rol}\n\nŞimdi, \`/timeout\` komutunu kullanarak bu sistemi uygulayabilirsiniz.`);

    // Timeout sistemi verilerini kaydet
    db.set(`timeoutSistemi_${interaction.guild.id}`, { log: kanal.id, yetkili: rol.id });
    db.set(`timeoutSistemiDate_${interaction.guild.id}`, { date: Date.now() });

    // Kullanıcıya başarıyla işlem yapıldığını bildir
    return interaction.reply({ embeds: [basariliEmbed], ephemeral: false }).catch((e) => {
      console.error("Timeout sistemi ayarlama hatası:", e);
      const hataEmbed = new EmbedBuilder()
        .setColor("Red")
        .setDescription(emoji.carpi + "  | Timeout sistemi ayarlanırken bir hata oluştu. Lütfen tekrar deneyin.");
      interaction.reply({ embeds: [hataEmbed], ephemeral: true });
    });
  }
};
