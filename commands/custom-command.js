const emoji = require("../emoji.js");
const {
  EmbedBuilder,
  ActionRowBuilder,
  SelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  PermissionsBitField,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("croxydb");
const config = require("../config.json");

// Yapılandırıldığı tüm prefix'ler ile çalışır
const getPrefixes = () => {
  if (config.prefixes && Array.isArray(config.prefixes) && config.prefixes.length > 0) {
    return config.prefixes;
  }
  if (config.prefix) return [config.prefix];
  return ["."];
};

module.exports = {
  name: "custom-command",
  description: "Özel komut yönetimi (tüm prefix'lerde çalışır).",
  type: 1,
  options: [],
  run: async (client, interaction) => {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    )
      return interaction.reply({
        content: `${emoji.carpi} | Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!`,
        ephemeral: true,
      });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${config["bot-adi"] || "Bot"} - Özel Komut Sistemi`,
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setDescription(
        `> Aşağıdaki seçim menüsünden özel komutlarınızı yönetebilirsiniz.\n> • **${emoji.tik} Ekle:** Yeni bir özel komut oluşturur.\n> • **${emoji.kbdNews} Sil:** Mevcut bir özel komutu kaldırır.\n> • **${emoji.kbdNews} Listele:** Sunucuda tanımlı tüm özel komutları gösterir.\n\n> ${emoji.kbdNews} **Not:** Özel komutlar şu prefix'lerle çalışır: \`${getPrefixes().join("`, `")}\``
      )
      .setColor(config.embedColor || "#5865F2")
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setFooter({
        text: config.footer || "Özel Komut Sistemi",
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new SelectMenuBuilder()
        .setCustomId("custom-command-menu")
        .setPlaceholder("Bir işlem seçin...")
        .addOptions([
          {
            label: "Özel Komut Ekle",
            description: "Yeni bir özel komut ekle",
            value: "add_custom_command",
            emoji: emoji.tik,
          },
          {
            label: "Özel Komut Sil",
            description: "Mevcut bir özel komutu sil",
            value: "delete_custom_command",
            emoji: emoji.kbdNews,
          },
          {
            label: "Özel Komutları Listele",
            description: "Tüm özel komutları görüntüle",
            value: "list_custom_commands",
            emoji: "📋",
          },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

// Seçim menüsü ve modal işlemleri
client.on("interactionCreate", async (interaction) => {
  if (
    interaction.isSelectMenu() &&
    interaction.customId === "custom-command-menu"
  ) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    )
      return interaction.reply({
        content: `${emoji.carpi} | Bu işlem için **Yönetici** yetkisine sahip olmalısınız!`,
        ephemeral: true,
      });

    const selectedValue = interaction.values[0];

    if (selectedValue === "add_custom_command") {
      const modal = new ModalBuilder()
        .setCustomId("addCustomCommandModal")
        .setTitle(emoji.tik + " Özel Komut Ekle")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("commandName")
              .setLabel("Komut Adı")
              .setPlaceholder("Örnek: selam")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("commandText")
              .setLabel("Komut Yanıtı (İçerik)")
              .setPlaceholder("Örnek: Merhaba! Nasıl yardımcı olabilirim?")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );
      await interaction.showModal(modal);
    } else if (selectedValue === "delete_custom_command") {
      const modal = new ModalBuilder()
        .setCustomId("deleteCustomCommandModal")
        .setTitle(emoji.kbdNews + " Özel Komut Sil")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("commandName")
              .setLabel("Silinecek Komut Adı")
              .setPlaceholder("Örnek: selam")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      await interaction.showModal(modal);
    } else if (selectedValue === "list_custom_commands") {
      const commands = Object.entries(db.all()).filter(([key]) =>
        key.startsWith(`custom_command_${interaction.guild.id}_`)
      );

      if (commands.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setAuthor({
            name: `${config["bot-adi"] || "Bot"} - Özel Komutlar`,
            iconURL: interaction.client.user.displayAvatarURL(),
          })
          .setDescription("> Bu sunucuda henüz tanımlı özel komut bulunmamaktadır.")
          .setColor(config.errorColor || "#ED4245")
          .setFooter({ text: config.footer || "Özel Komut Sistemi" })
          .setTimestamp();
        return interaction.reply({ embeds: [emptyEmbed], ephemeral: true });
      }

      const commandList = commands
        .map(
          ([key, entry], index) =>
            `**${index + 1}.** \`${key.replace(
              `custom_command_${interaction.guild.id}_`,
              ""
            )}\` → ${entry}`
        )
        .join("\n");

      const listEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${config["bot-adi"] || "Bot"} - Özel Komut Listesi`,
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setDescription(
          `> Toplam **${commands.length}** özel komut tanımlı:\n\n${commandList}`
        )
        .setColor(config.successColor || "#57F287")
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setFooter({
          text: config.footer || "Özel Komut Sistemi",
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [listEmbed], ephemeral: true });
    }
  } else if (interaction.type === InteractionType.ModalSubmit) {
    if (interaction.customId === "addCustomCommandModal") {
      const commandName = interaction.fields.getTextInputValue("commandName");
      const commandText = interaction.fields.getTextInputValue("commandText");

      const cleanName = commandName.trim().toLowerCase();
      if (!cleanName) {
        return interaction.reply({
          content: `${emoji.carpi} | Geçersiz komut adı girdiniz.`,
          ephemeral: true,
        });
      }

      db.set(
        `custom_command_${interaction.guild.id}_${cleanName}`,
        commandText
      );

      const successEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${config["bot-adi"] || "Bot"} - Komut Eklendi`,
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setDescription(
          `> ${emoji.tik} **${cleanName}** adlı özel komut başarıyla eklendi.\n> ${emoji.kbdNews} Kullanım: \`${getPrefixes()[0]}${cleanName}\` (ve diğer tanımlı prefix'lerle)`
        )
        .setColor(config.successColor || "#57F287")
        .setFooter({ text: config.footer || "Özel Komut Sistemi" })
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } else if (interaction.customId === "deleteCustomCommandModal") {
      const commandName = interaction.fields.getTextInputValue("commandName");
      const cleanName = commandName.trim().toLowerCase();

      const existed = db.get(
        `custom_command_${interaction.guild.id}_${cleanName}`
      );
      db.delete(`custom_command_${interaction.guild.id}_${cleanName}`);

      const resultEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${config["bot-adi"] || "Bot"} - Komut Silindi`,
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setDescription(
          existed
            ? `> ${emoji.tik} **${cleanName}** adlı özel komut başarıyla silindi.`
            : `> ${emoji.kbdWarn} **${cleanName}** adlı bir özel komut bulunamadı.`
        )
        .setColor(existed ? config.successColor || "#57F287" : config.errorColor || "#ED4245")
        .setFooter({ text: config.footer || "Özel Komut Sistemi" })
        .setTimestamp();

      await interaction.reply({ embeds: [resultEmbed], ephemeral: true });
    }
  }
});

// Mesaj üzerinden özel komut çalıştırma (tüm tanımlı prefix'lerle)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const prefixes = getPrefixes();
  const matchedPrefix = prefixes.find((p) => message.content.startsWith(p));
  if (!matchedPrefix) return;

  const commandName = message.content
    .slice(matchedPrefix.length)
    .trim()
    .split(/ +/)
    .shift()
    .toLowerCase();

  if (!commandName) return;

  const commandText = db.fetch(
    `custom_command_${message.guild.id}_${commandName}`
  );

  if (commandText) {
    await message.channel.send(commandText);
  }
});
