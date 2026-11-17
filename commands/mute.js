const emoji = require("../emoji.js");
const {
  EmbedBuilder,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  name: "mute",
  description: "Discord'un timeout sistemi ile kullanıcıyı susturur!",
  type: ApplicationCommandType.ChatInput,
  cooldown: 3,
  default_member_permissions: PermissionFlagsBits.ModerateMembers,
  options: [
    {
      name: "kullanıcı",
      description: "Susturulacak kullanıcı",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "süre",
      description: "Susturma süresi",
      type: ApplicationCommandOptionType.Integer,
      required: true,
      choices: [
        { name: "60 saniye", value: 60 * 1000 },
        { name: "5 dakika", value: 5 * 60 * 1000 },
        { name: "10 dakika", value: 10 * 60 * 1000 },
        { name: "1 saat", value: 60 * 60 * 1000 },
        { name: "1 gün", value: 24 * 60 * 60 * 1000 },
        { name: "1 hafta", value: 7 * 24 * 60 * 60 * 1000 },
      ],
    },
    {
      name: "sebep",
      description: "Susturma sebebi",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Bu komut sadece sunucularda kullanılabilir!",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const user = interaction.options.getUser("kullanıcı");
      const duration = interaction.options.getInteger("süre");
      const reason = interaction.options.getString("sebep") || "Sebep belirtilmedi";

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      
      if (!member) {
        return interaction.editReply({
          content: emoji.kbdWarn + " Bu kullanıcı sunucuda bulunamadı!",
          ephemeral: true,
        });
      }

      if (member.id === interaction.user.id) {
        return interaction.editReply({
          content: emoji.kbdWarn + " Kendinizi susturamazsınız!",
          ephemeral: true,
        });
      }

      if (member.id === client.user.id) {
        return interaction.editReply({
          content: emoji.kbdWarn + " Beni susturamazsınız!",
          ephemeral: true,
        });
      }

      if (member.id === interaction.guild.ownerId) {
        return interaction.editReply({
          content: emoji.kbdWarn + " Sunucu sahibini susturamazsınız!",
          ephemeral: true,
        });
      }

      if (!member.moderatable) {
        return interaction.editReply({
          content: emoji.kbdWarn + " Bu kullanıcıyı susturamam! Ya yetkim yok ya da kullanıcı benden daha yüksek bir role sahip.",
          ephemeral: true,
        });
      }

      if (
        member.roles.highest.position >= interaction.member.roles.highest.position &&
        interaction.user.id !== interaction.guild.ownerId
      ) {
        return interaction.editReply({
          content: emoji.kbdWarn + " Bu kullanıcıyı susturamazsınız çünkü sizinle aynı veya daha yüksek bir role sahip!",
          ephemeral: true,
        });
      }

      await member.timeout(duration, `${interaction.user.tag} tarafından: ${reason}`);

      let timeString;
      if (duration < 60000) {
        timeString = `${duration / 1000} saniye`;
      } else if (duration < 3600000) {
        timeString = `${duration / 60000} dakika`;
      } else if (duration < 86400000) {
        timeString = `${duration / 3600000} saat`;
      } else {
        timeString = `${duration / 86400000} gün`;
      }

      // Düzeltme: client.config.embedColor yerine sabit bir renk kodu kullanıyoruz
      const embed = new EmbedBuilder()
        .setColor(0xFF0000) // Kırmızı renk (isteğe göre değiştirebilirsiniz)
        .setTitle(emoji.kapal + " | Kullanıcı Susturuldu")
        .setDescription(`**${user.tag}** başarıyla susturuldu!`)
        .addFields([
          { name: emoji.kbdSaat + " Süre", value: timeString, inline: true },
          { name: emoji.kbdNews + " Sebep", value: reason, inline: true },
          { name: emoji.kbdUser + " Yetkili", value: `${interaction.user}`, inline: true },
        ])
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: emoji.kbdDiscordLink + " 2024 Sunucu Yönetimi" }) // client.config.footer yerine sabit metin
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Mute komutunda hata:", error);
      
      let errorMessage = emoji.kbdWarn + " Kullanıcı susturulurken bir hata oluştu.";
      
      if (error.code === 50013) {
        errorMessage = emoji.kbdWarn + " Bu işlem için gerekli yetkilere sahip değilim!";
      } else if (error.code === 50001) {
        errorMessage = emoji.kbdWarn + " Kullanıcıyı görmek için yetkim yok!";
      }
      
      await interaction.editReply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  },
};