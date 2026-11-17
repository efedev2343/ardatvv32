const emoji = require("../emoji.js");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("croxydb");
const config = require("../config.json");

module.exports = {
    name: "seviye-kanal-ayarla",
    description: "Seviye atıldığında mesajın gideceği kanalı ayarlar.",
    type: 1,
    options: [
        {
            name: "kanal",
            description: "Seviye mesajlarının gideceği kanal",
            type: 7, // CHANNEL
            required: true,
            channel_types: [0],
        },
    ],

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: emoji.carpi + " | Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!",
                ephemeral: true,
            });
        }

        const kanal = interaction.options.getChannel("kanal");
        db.set(`seviyeKanal_${interaction.guild.id}`, kanal.id);

        const embed = new EmbedBuilder()
            .setColor(config.successColor || "#57F287")
            .setTitle(emoji.tik + " | Seviye Kanalı Ayarlandı")
            .setDescription(`Seviye atıldığında mesajlar ${kanal} kanalına gönderilecek!`)
            .setFooter({ text: config.footer || "Seviye Sistemi" })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
