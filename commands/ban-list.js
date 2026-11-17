const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType
} = require("discord.js");
const config = require("../config.json");
const emoji = require("../emoji.js");

module.exports = {
  name: "banlist",
  description: "Banlı kullanıcıları listeler!",
  type: 1,
  options: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferReply(); 

      const bannedUsers = await interaction.guild.bans.fetch();

      if (bannedUsers.size === 0) {
        return await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle(emoji.kbdKilit + " Ban Listesi")
              .setDescription("Sunucuda banlanan kullanıcı yok.")
          ]
        });
      }

      let page = 0;
      const pageSize = 10;
      const content = bannedUsers.map(
        ban => `${emoji.kbdCalisma} **${ban.user.username}** • \`${ban.user.id}\``
      );
      const totalPages = Math.ceil(content.length / pageSize);

      const generateEmbed = () => {
        return new EmbedBuilder()
          .setColor("#e74c3c")
          .setTitle(`${emoji.carpi} ${config["bot-adi"] || "Bot"} - Ban Listesi`)
          .setDescription(content.slice(page * pageSize, (page + 1) * pageSize).join("\n"))
          .setFooter({
            text: `Sayfa ${page + 1} / ${totalPages}`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
          })
          .setTimestamp();
      };

      const getButtons = () => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("back")
            .setLabel(emoji.kbdDiscordLink + " Geri")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("İleri " + emoji.kbdDiscordLink)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1),
          new ButtonBuilder()
            .setCustomId("close")
            .setLabel(emoji.carpi + " Kapat")
            .setStyle(ButtonStyle.Danger)
        );
      };

      const message = await interaction.editReply({
        embeds: [generateEmbed()],
        components: [getButtons()],
        fetchReply: true
      });

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: i => i.user.id === interaction.user.id
      });

      collector.on("collect", async i => {
        if (i.customId === "close") {
          collector.stop();
          return await message.delete().catch(() => {});
        }

        if (i.customId === "back") page--;
        if (i.customId === "next") page++;

        await i.update({
          embeds: [generateEmbed()],
          components: [getButtons()]
        });
      });

      collector.on("end", async () => {
        try {
          await message.edit({
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId("expired")
                  .setLabel("Süre Doldu")
                  .setStyle(ButtonStyle.Secondary)
                  .setDisabled(true)
              )
            ]
          });
        } catch (_) {
         
        }
      });

    } catch (error) {
      console.error("Ban listesi hatası:", error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle(emoji.kbdWarn + " Hata Oluştu")
              .setDescription("Ban listesi alınırken bir hata oluştu.")
          ],
          ephemeral: true
        }).catch(() => {});
      } else {
        // Zaten replied olan etkileşimlerde ekstra mesaj atma
        console.warn("İkinci yanıt engellendi.");
      }
    }
  }
};
