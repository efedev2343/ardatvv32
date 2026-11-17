const emoji = require("../emoji.js");
const { Client, CommandInteraction, PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "nuke",
  description: "Belirtilen kanalı siler ve aynı ayarlarla yeniden oluşturur.",
  type: 1,
  options: [],

  run: async (client, interaction) => {
    
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({
        content: emoji.carpi + " Bu komutu kullanmak için `Kanalları Yönet` yetkisine sahip olmalısınız.",
        ephemeral: true,
      });
    }

   
    const botPermissions = interaction.guild.members.me.permissions;
    if (!botPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({
        content: emoji.carpi + " Bu komutu kullanabilmem için `Kanalları Yönet` yetkisine ihtiyacım var. Lütfen botun yetkilerini kontrol edin.",
        ephemeral: true,
      });
    }

    const channel = interaction.channel;

    try {
     
      const channelData = {
        name: channel.name,
        type: channel.type,
        topic: channel.topic,
        nsfw: channel.nsfw,
        parent: channel.parentId,
        position: channel.position,
        rateLimitPerUser: channel.rateLimitPerUser,
        permissionOverwrites: channel.permissionOverwrites.cache.map(overwrite => ({
          id: overwrite.id,
          allow: overwrite.allow.bitfield,
          deny: overwrite.deny.bitfield,
          type: overwrite.type
        }))
      };

     
      await interaction.reply({
        content: `${emoji.kbdWarn} **${channel.name}** kanalını nukelemek istediğinize emin misiniz? Bu işlem geri alınamaz! (10 saniye içinde "Evet" yazın)`,
        ephemeral: false
      });

    
      const filter = m => m.author.id === interaction.user.id && m.content.toLowerCase() === 'evet';
      const collector = interaction.channel.createMessageCollector({ filter, time: 10000, max: 1 });

      collector.on('collect', async () => {
        try {
         
          try {
            await channel.delete();
          } catch (deleteError) {
            if (deleteError.code === 50074) {
              return interaction.followUp({
                content: emoji.carpi + " Bu kanal topluluk sunucusu için gerekli bir kanal olduğundan silinemez!",
                ephemeral: true
              });
            }
            throw deleteError; 
          }

          
          const newChannel = await interaction.guild.channels.create(channelData);

          
          const embed = new EmbedBuilder()
            .setTitle(emoji.carpi + " KALKIŞA HAZIR OLUN!")
            .setColor("#FF0000")
            .setDescription(`**${channelData.name}** kanalı başarıyla nukelandı!`)
            .addFields(
              { name: "Nukeleyen Yetkili", value: interaction.user.tag, inline: true },
              { name: "Zaman", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setImage("https://media.giphy.com/media/oe33xf3B50fsc/giphy.gif")
            .setFooter({ 
              text: `${interaction.guild.name} | Nuke Komutu`,
              iconURL: interaction.guild.iconURL() 
            });

          
          const msg = await newChannel.send({ embeds: [embed] });
          setTimeout(() => msg.delete().catch(() => {}), 15000);

        } catch (error) {
          console.error("Nuke hatası:", error);
          interaction.followUp({
            content: `${emoji.carpi} Kanal nukelenirken bir hata oluştu! Hata: ${error.message}`,
            ephemeral: true
          });
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          interaction.followUp({
            content: emoji.carpi + " Nuke işlemi zaman aşımına uğradı veya iptal edildi.",
            ephemeral: true
          });
        }
      });

    } catch (error) {
      console.error("Hata:", error);
      interaction.reply({
        content: `${emoji.carpi} Bir hata oluştu! Hata: ${error.message}`,
        ephemeral: true
      });
    }
  }
};