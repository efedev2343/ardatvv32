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
        const member = interaction.options.getMember('kullanıcı');
        const user = await client.users.fetch(member.id, { force: true });

        const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 1024 });
        const bannerUrl = await user.fetch().then(u => u.bannerURL({ dynamic: true, size: 1024 }));

        const buttonsRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('avatar_btn')
                .setLabel('Avatar')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('banner_btn')
                .setLabel('Banner')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!bannerUrl)
        );

        const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('size_select')
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
            .setDescription(bannerUrl ? 
                "Görüntülemek istediğiniz içeriği seçin.\n\n[Hata veya Sorun Bildir](" + config["desteksunucu"] + ")" :
                "Bu kullanıcının bannerı bulunmuyor.\n\n[Hata veya Sorun Bildir](" + config["desteksunucu"] + ")")
            .setImage(avatarUrl)
            .setColor(0x00AE86);

        try {
            const reply = await interaction.reply({
                embeds: [embed],
                components: [buttonsRow, selectRow],
                fetchReply: true
            });
        } catch (error) {
            if (error.code === 10062) {
                return;
            }
            console.error('Avatar reply hata:', error);
            return;
        }

        const filter = (i) => true; // Herkesin etkileşimini yakala
        const collector = reply.createMessageComponentCollector({
            filter,
            time: 60000
        });

        let currentType = 'avatar';
        let currentSize = 1024;

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: `${emoji.carpi} Bu menüyü sadece komutu kullanan kişi kullanabilir!`,
                    ephemeral: true
                });
            }

            try {
                if (i.isButton()) {
                    currentType = i.customId === 'avatar_btn' ? 'avatar' : 'banner';
                } else if (i.isStringSelectMenu()) {
                    currentSize = parseInt(i.values[0]);
                }

                let imageUrl;
                if (currentType === 'avatar') {
                    imageUrl = user.displayAvatarURL({ dynamic: true, size: currentSize });
                } else {
                    const banner = await user.fetch().then(u => u.bannerURL({ dynamic: true, size: currentSize }));
                    imageUrl = banner || avatarUrl;
                }

                const updatedEmbed = new EmbedBuilder()
                    .setTitle(`${user.tag} ${currentType === 'avatar' ? 'Avatarı' : 'Bannerı'}`)
                    .setDescription(`**Seçilen Boyut:** ${currentSize}x${currentSize}\n\n[Hata veya Sorun Bildir](${config["desteksunucu"]})`)
                    .setImage(imageUrl)
                    .setColor(0x00AE86);

                await i.update({
                    embeds: [updatedEmbed],
                    components: [buttonsRow, selectRow]
                });
            } catch (error) {
                if (error.code === 10062) {
                    return;
                }
                console.error('Hata:', error);
                try {
                    await i.reply({
                        content: "Bir hata oluştu! Lütfen daha sonra tekrar deneyin.",
                        ephemeral: true
                    });
                } catch (err) {
                    if (err.code !== 10062) console.error('İkincil hata:', err);
                }
            }
        });

        collector.on('end', () => {
            const disabledButtonsRow = new ActionRowBuilder().addComponents(
                buttonsRow.components.map(component =>
                    component.setDisabled(true)
                )
            );

            const disabledSelectRow = new ActionRowBuilder().addComponents(
                selectRow.components[0].setDisabled(true)
            );

            if (interaction.replied || interaction.deferred) {
                interaction.editReply({
                    components: [disabledButtonsRow, disabledSelectRow]
                }).catch((err) => {
                    if (err.code !== 10062) console.error('Collector end hata:', err);
                });
            }
        });
    }
};
