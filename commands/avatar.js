const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../config.json");
const emoji = require("../emoji.js");

module.exports = {
    name: "avatar",
    description: "Birinin avatarını veya bannerını görüntülersiniz!",
    type: 1,
    options: [
        {
            name: "kullanıcı",
            description: "Avatarına/bannerına bakmak istediğin kullanıcıyı etiketle!",
            type: 6,
            required: true
        }
    ],
    run: async (client, interaction) => {
        // Geçersiz destek linki "yok" ise markdown bağlantısı eklenmez
        const destekHam = config["desteksunucu"];
        const destekLink = typeof destekHam === "string" && /^https?:\/\/[^\s]+$/i.test(destekHam.trim())
            ? destekHam.trim()
            : null;
        const destekMetni = destekLink ? `\n\n[Hata veya Sorun Bildir](${destekLink})` : "";

        try {
            const secilen = interaction.options.getUser('kullanıcı') || interaction.user;
            const user = await client.users.fetch(secilen.id, { force: true }).catch(() => secilen);

            const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 1024 });
            const bannerUrl = await user.fetch()
                .then(u => u.bannerURL({ dynamic: true, size: 1024 }))
                .catch(() => null);

            const id = interaction.id;
            const buttonsRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`avatar_btn_${id}`)
                    .setLabel('Avatar')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`banner_btn_${id}`)
                    .setLabel('Banner')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!bannerUrl)
            );

            const selectRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`size_select_${id}`)
                    .setPlaceholder('Boyut')
                    .addOptions([
                        { label: '16', value: '16' },
                        { label: '32', value: '32' },
                        { label: '64', value: '64' },
                        { label: '128', value: '128' },
                        { label: '256', value: '256' },
                        { label: '512', value: '512' },
                        { label: '1024', value: '1024' },
                    ])
            );

            const embed = new EmbedBuilder()
                .setTitle(`${user.tag} Avatarı`)
                .setDescription((bannerUrl
                    ? "Görüntülemek istediğiniz içeriği seçin."
                    : "Bu kullanıcının bannerı bulunmuyor.") + destekMetni)
                .setImage(avatarUrl)
                .setColor(0x00AE86);

            // reply artık try bloğunun dışında da erişilebilir
            let reply;
            try {
                reply = await interaction.reply({
                    embeds: [embed],
                    components: [buttonsRow, selectRow],
                    fetchReply: true
                });
            } catch (error) {
                if (![10062, 40060].includes(error.code)) {
                    console.error('Avatar reply hata:', error);
                }
                return;
            }
            if (!reply) return;

            const collector = reply.createMessageComponentCollector({
                filter: (i) => i.customId.endsWith(id),
                time: 60000
            });

            let currentType = 'avatar';
            let currentSize = 1024;

            collector.on('collect', async (i) => {
                try {
                    if (!i.isRepliable()) return;

                    if (i.user.id !== interaction.user.id) {
                        await i.reply({
                            content: `${emoji.carpi} Bu menüyü sadece komutu kullanan kişi kullanabilir!`,
                            ephemeral: true
                        }).catch(() => {});
                        return;
                    }

                    if (i.isButton()) {
                        currentType = i.customId === `avatar_btn_${id}` ? 'avatar' : 'banner';
                    } else if (i.isStringSelectMenu()) {
                        currentSize = parseInt(i.values[0]) || 1024;
                    }

                    let imageUrl;
                    if (currentType === 'avatar') {
                        imageUrl = user.displayAvatarURL({ dynamic: true, size: currentSize });
                    } else {
                        const banner = await user.fetch()
                            .then(u => u.bannerURL({ dynamic: true, size: currentSize }))
                            .catch(() => null);
                        imageUrl = banner || avatarUrl;
                    }

                    const updatedEmbed = new EmbedBuilder()
                        .setTitle(`${user.tag} ${currentType === 'avatar' ? 'Avatarı' : 'Bannerı'}`)
                        .setDescription(`**Seçilen Boyut:** ${currentSize}x${currentSize}${destekMetni}`)
                        .setImage(imageUrl)
                        .setColor(0x00AE86);

                    await i.deferUpdate().catch(() => {});
                    await reply.edit({
                        embeds: [updatedEmbed],
                        components: [buttonsRow, selectRow]
                    }).catch(() => {});
                } catch (error) {
                    if (![10062, 40060].includes(error.code)) {
                        console.error('Avatar collector hata:', error);
                    }
                }
            });

            collector.on('end', () => {
                const disabledButtonsRow = new ActionRowBuilder().addComponents(
                    buttonsRow.components.map(component => ButtonBuilder.from(component).setDisabled(true))
                );
                const disabledSelectRow = new ActionRowBuilder().addComponents(
                    StringSelectMenuBuilder.from(selectRow.components[0]).setDisabled(true)
                );

                reply.edit({
                    components: [disabledButtonsRow, disabledSelectRow]
                }).catch((err) => {
                    if (![10062, 40060, 10008].includes(err.code)) {
                        console.error('Collector end hata:', err);
                    }
                });
            });
        } catch (err) {
            if (![10062, 40060].includes(err.code)) {
                console.error('Avatar komut hatası:', err);
            }
        }
    }
};
