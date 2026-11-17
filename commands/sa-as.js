const emoji = require("../emoji.js");
const { Client, EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "sa-as",
  description: "Selam Sistemini Açıp Kapatırsın!",
  type: 1,
  options: [
    {
      type: 3,
      name: "seçenek",
      description: "Sistemi kapatacak mısın yoksa açacak mısın?",
      required: true,
      choices: [
        {
          name: "Aç",
          value: "ac"
        },
        {
          name: "Kapat",
          value: "kapat"
        }
      ]
    }
  ],

  run: async (client, interaction) => {
    const { guild, options, member } = interaction;
    
    if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({
        content: emoji.carpi + "  | Rolleri Yönet Yetkin Yok!",
        ephemeral: true
      });
    }

    const saasSystemTrue = options.getString("seçenek");
    const saasSystem = !!db.get(`saas_${guild.id}`); // Veriyi boolean olarak al

    if (saasSystemTrue === "ac") {
      if (saasSystem) {
        return interaction.reply({
          content: emoji.carpi + " | Bu sistem zaten açık!"
        });
      }

      db.set(`saas_${guild.id}`, true);
      return interaction.reply({
        content: emoji.tik + "  | Başarılı bir şekilde sistem açıldı!"
      });
    }

    if (saasSystemTrue === "kapat") {
      if (!saasSystem) {
        return interaction.reply({
          content: emoji.carpi + "  | Bu sistem zaten kapalı!"
        });
      }

      db.delete(`saas_${guild.id}`);
      return interaction.reply({
        content: emoji.tik + " | Başarılı bir şekilde sistem kapatıldı!"
      });
    }
  }
};
