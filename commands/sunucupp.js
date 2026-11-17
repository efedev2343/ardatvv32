const emoji = require("../emoji.js");
const {
    Client,
    EmbedBuilder,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
  } = require("discord.js");
  
  module.exports = {
    name: "sunucupp",
    description: "Sunucunun avatarını gösterir!",
    type: 1,
    options: [],
  
    run: async (client, interaction) => {
      const icon = interaction.guild.iconURL({ dynamic: true, size: 4096 });
  
      if (!icon) {
        return interaction.reply({
          content: emoji.carpi + " Bu sunucunun bir simgesi yok!",
          ephemeral: true,
        });
      }
  
      const embed = new EmbedBuilder()
        .setColor("#ff66cc")
        .setTitle(`${emoji.kbdTac} ${interaction.guild.name} • Sunucu Avatarı`)
        .setDescription(`${emoji.kbdDiscordLink} [Avatar Bağlantısı](${icon})\n${emoji.kbdOyun} Sunucu simgesine bir göz atalım:`)
        .setImage(icon)
        .setFooter({
          text: `Sunucu ID: ${interaction.guild.id} | Üye Sayısı: ${interaction.guild.memberCount}`,
          iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
  
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(emoji.kbdDiscordLink + " Avatarı Yeni Sekmede Aç")
          .setStyle(ButtonStyle.Link)
          .setURL(icon)
      );
  
      await interaction.reply({
        embeds: [embed],
        components: [row],
      });
    },
  };
  