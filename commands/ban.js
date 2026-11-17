const {
  Client,
  EmbedBuilder,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const emoji = require("../emoji.js");

module.exports = {
  name: "ban",
  description: "Belirtilen kullanıcıyı sunucudan yasaklarsın.",
  type: 1,
  options: [
    {
      name: "user",
      description: "Yasaklanacak kullanıcıyı seçin.",
      type: 6,
      required: true
    }
  ],

  run: async (client, interaction) => {
    try {
      // Yetki kontrolü
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({
          content: emoji.carpi + "  | Üyeleri yasaklama yetkin yok!",
          ephemeral: true
        });
      }

      const user = interaction.options.getUser("user");
      const member = interaction.guild.members.cache.get(user.id);

      if (!member) {
        return interaction.reply({
          content: emoji.carpi + "  | Bu kullanıcı sunucuda bulunmuyor.",
          ephemeral: true
        });
      }

      if (!member.bannable) {
        return interaction.reply({
          content: emoji.carpi + "  | Kullanıcıyı yasaklamak için yeterli yetkim yok.",
          ephemeral: true
        });
      }

      // Modal oluştur
      const modal = new ModalBuilder()
        .setCustomId(`banReasonModal-${interaction.id}`)
        .setTitle("Ban Sebebi");

      const reasonInput = new TextInputBuilder()
        .setCustomId("banReason")
        .setLabel("Hangi sebepten dolayı yasaklanacak?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);

      // Modal yanıtı bekle
      const submitted = await interaction
        .awaitModalSubmit({
          filter: (i) => i.customId === `banReasonModal-${interaction.id}` && i.user.id === interaction.user.id,
          time: 60000
        })
        .catch(() => null);

      if (!submitted) {
        return interaction.followUp({
          content: emoji.carpi + "  | Ban işlemi zaman aşımına uğradı veya iptal edildi.",
          ephemeral: true
        });
      }

      const reason = submitted.fields.getTextInputValue("banReason");

      // Kullanıcıya özel mesaj gönder
      try {
        await user.send(`${emoji.carpi} **${interaction.guild.name}** sunucusundan yasaklandınız!\nSebep: ${reason}`);
      } catch {
        console.warn(emoji.kbdWarn + " Kullanıcıya DM gönderilemedi.");
      }

      // Yasaklama işlemi
      await member.ban({ reason });

      const banEmbed = new EmbedBuilder()
        .setColor("Red")
        .setAuthor({ name: "Ban İşlemi Gerçekleşti", iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setDescription(`**${user.tag}** adlı kullanıcı **${reason}** sebebiyle yasaklandı.`)
        .setImage("https://media.giphy.com/media/fe4dDMD2cAU5RfEaCU/giphy.gif")
        .setFooter({ text: `Yasaklayan: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      // Butonlar
      const unbanButton = new ButtonBuilder()
        .setCustomId(`unban-${user.id}`)
        .setLabel("Banı Kaldır")
        .setStyle(ButtonStyle.Primary);

      const deleteButton = new ButtonBuilder()
        .setCustomId(`delete-${interaction.id}`)
        .setEmoji(emoji.kbdNews)
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(unbanButton, deleteButton);

      const msg = await submitted.reply({
        embeds: [banEmbed],
        components: [row],
        fetchReply: true
      });

      // Collector
      const collector = msg.createMessageComponentCollector({ time: 300000 });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: emoji.carpi + "  | Bu butonları sadece komutu kullanan kişi yönetebilir!",
            ephemeral: true
          });
        }

        if (i.customId === `unban-${user.id}`) {
          try {
            await interaction.guild.bans.remove(user.id);
            await i.reply({
              content: `${emoji.tik}  | **${user.tag}** adlı kullanıcının yasağı kaldırıldı.`,
              ephemeral: true
            });
          } catch (err) {
            await i.reply({
              content: emoji.carpi + "  | Kullanıcının yasağını kaldıramadım.",
              ephemeral: true
            });
          }
        }

        if (i.customId === `delete-${interaction.id}`) {
          await msg.delete().catch(() => {});
        }
      });

    } catch (error) {
      console.error(emoji.carpi + " Ban komutunda hata:", error);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({
          content: emoji.carpi + "  | Bir hata oluştu, lütfen tekrar dene.",
          ephemeral: true
        });
      }
    }
  }
};
