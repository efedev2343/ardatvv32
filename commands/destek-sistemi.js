const emoji = require("../emoji.js");
const {
    EmbedBuilder,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    PermissionsBitField,
    ChannelType,
} = require("discord.js");
const db = require("croxydb");
const config = require("../config.json");
const { createTranscript } = require("discord-html-transcripts");

module.exports = {
    name: "destek-sistemi",
    description: "Destek sistemi kurar ve yönetir.",
    type: ApplicationCommandType.ChatInput,
    cooldown: 10,
    options: [
        {
            name: "kanal",
            description: "Destek talebi embed'inin gönderileceği kanal",
            type: ApplicationCommandOptionType.Channel,
            required: true,
            channel_types: [ChannelType.GuildText],
        },
        {
            name: "embedmesaj",
            description: "Destek talebi embed'inin açıklaması",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: "logkanal",
            description: "Destek taleplerinin loglarının gönderileceği kanal",
            type: ApplicationCommandOptionType.Channel,
            required: true,
            channel_types: [ChannelType.GuildText],
        },
        {
            name: "yetkilirol",
            description: "Destek ekibinin rolü (boş bırakılırsa sadece yöneticiler)",
            type: ApplicationCommandOptionType.Role,
            required: false,
        },
    ],

    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({
                content: emoji.carpi + " | Bu komutu kullanmak için `Kanalları Yönet` yetkisine sahip olmalısınız!",
                ephemeral: true,
            });
        }

        const kanal = interaction.options.getChannel("kanal");
        const embedMesaj = interaction.options.getString("embedmesaj");
        const logKanal = interaction.options.getChannel("logkanal");
        const yetkiliRol = interaction.options.getRole("yetkilirol");

        if (!kanal || !logKanal) {
            return interaction.reply({
                content: emoji.carpi + " | Belirtilen kanallar bulunamadı. Lütfen geçerli bir kanal seçin.",
                ephemeral: true,
            });
        }

        db.set(`destek_sistemi_${interaction.guild.id}`, {
            kanal: kanal.id,
            embedMesaj: embedMesaj,
            logKanal: logKanal.id,
            yetkiliRol: yetkiliRol?.id || null,
            ticketSayac: 0,
        });

        const destekEmbed = new EmbedBuilder()
            .setTitle(`${config["bot-adi"]} - Destek Sistemi`)
            .setDescription(embedMesaj.length > 4096 ? embedMesaj.substring(0, 4093) + "..." : embedMesaj)
            .setColor("#00ff00")
            .addFields({
                name: emoji.kbdNews + " Nasıl Çalışır?",
                value: "Aşağıdaki butona tıklayarak destek talebi açabilirsiniz. Size özel bir kanal oluşturulacak ve ekibimizle iletişim kurabileceksiniz.",
                inline: false,
            })
            .setFooter({
                text: config.footer || "Destek talebi oluşturmak için aşağıdaki butona tıklayın!",
            })
            .setTimestamp()
            .setImage("https://i.hizliresim.com/orosrif.gif");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("destek_ac")
                .setLabel("Destek Talebi Aç")
                .setStyle(ButtonStyle.Primary)
                .setEmoji(emoji.kbdNews)
        );

        try {
            const mesaj = await kanal.send({
                embeds: [destekEmbed],
                components: [row],
            });

            db.set(`destek_sistemi_${interaction.guild.id}.mesajId`, mesaj.id);

            await interaction.reply({
                content: `${emoji.tik} | Destek sistemi başarıyla ${kanal} kanalına kuruldu! Loglar ${logKanal}'a gönderilecek.` +
                    (yetkiliRol ? ` Yetkili rolü: ${yetkiliRol}` : ""),
                ephemeral: true,
            });
        } catch (error) {
            console.error("Destek sistemi kurulurken hata:", error);
            await interaction.reply({
                content: emoji.carpi + " | Destek sistemi kurulurken bir hata oluştu. Lütfen kanal izinlerini kontrol edin.",
                ephemeral: true,
            });
        }
    },
};

// Handle interactions
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

    try {
        // Open ticket button
        if (interaction.isButton() && interaction.customId === "destek_ac") {
            const mevcutKanal = db.get(`destek_kanal_${interaction.guild.id}_${interaction.user.id}`);
            if (mevcutKanal) {
                const kanal = interaction.guild.channels.cache.get(mevcutKanal.kanalId);
                if (kanal) {
                    return interaction.reply({
                        content: `${emoji.carpi} | Zaten açık bir destek talebiniz var: ${kanal}!`,
                        ephemeral: true,
                    });
                } else {
                    db.delete(`destek_kanal_${interaction.guild.id}_${interaction.user.id}`);
                }
            }

            const modal = new ModalBuilder()
                .setCustomId("destek_talep_modal")
                .setTitle("Destek Talebi Oluştur")
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("destek_konu")
                            .setLabel("Destek Talebinin Konusu")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("destek_aciklama")
                            .setLabel("Talebin Detaylı Açıklaması")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );

            await interaction.showModal(modal);
            return;
        }

        // Ticket creation modal
        if (interaction.isModalSubmit() && interaction.customId === "destek_talep_modal") {
            await interaction.deferReply({ ephemeral: true });

            const konu = interaction.fields.getTextInputValue("destek_konu");
            let aciklama = interaction.fields.getTextInputValue("destek_aciklama");

            if (aciklama.length > 1024) {
                aciklama = aciklama.substring(0, 1021) + "...";
            }

            const sistemVeri = db.get(`destek_sistemi_${interaction.guild.id}`);
            if (!sistemVeri || !sistemVeri.logKanal) {
                return interaction.editReply({
                    content: emoji.carpi + " | Destek sistemi düzgün yapılandırılmamış. Lütfen yetkililere bildirin.",
                });
            }

            const logKanal = interaction.guild.channels.cache.get(sistemVeri.logKanal);
            if (!logKanal) {
                return interaction.editReply({
                    content: emoji.carpi + " | Log kanalı bulunamadı. Lütfen yetkililere bildirin.",
                });
            }

            const yetkiliRol = sistemVeri.yetkiliRol ?
                interaction.guild.roles.cache.get(sistemVeri.yetkiliRol) :
                null;

            // Aktif yetkilileri bul
            let aktifYetkililer = [];
            let etiketlenecekYetkililer = [];
            
            if (yetkiliRol) {
                aktifYetkililer = yetkiliRol.members.filter(member => 
                    member.presence && 
                    member.presence.status !== 'offline' && 
                    !member.user.bot
                ).map(member => member.user);
                
                etiketlenecekYetkililer = yetkiliRol.members.map(member => member.id);
            } else {
                // Eğer yetkili rolü yoksa, ManageChannels yetkisine sahip olan ve çevrimiçi olan üyeleri al
                aktifYetkililer = interaction.guild.members.cache.filter(member => 
                    member.permissions.has(PermissionsBitField.Flags.ManageChannels) &&
                    member.presence && 
                    member.presence.status !== 'offline' && 
                    !member.user.bot
                ).map(member => member.user);
                
                etiketlenecekYetkililer = interaction.guild.members.cache.filter(member => 
                    member.permissions.has(PermissionsBitField.Flags.ManageChannels) &&
                    !member.user.bot
                ).map(member => member.id);
            }

            let ticketSayac = sistemVeri.ticketSayac || 0;
            ticketSayac++;
            db.set(`destek_sistemi_${interaction.guild.id}.ticketSayac`, ticketSayac);

            let destekKanal;
            try {
                destekKanal = await interaction.guild.channels.create({
                    name: `destek-${ticketSayac.toString().padStart(4, '0')}`,
                    type: ChannelType.GuildText,
                    parent: interaction.channel.parentId,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory,
                            ],
                        },
                        {
                            id: client.user.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory,
                                PermissionsBitField.Flags.ManageChannels,
                            ],
                        },
                        ...(yetkiliRol ? [{
                            id: yetkiliRol.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory,
                                PermissionsBitField.Flags.ManageMessages,
                            ],
                        }]: []),
                        ...(!yetkiliRol ? [{
                            id: interaction.guild.roles.cache.find(
                                role => role.permissions.has(PermissionsBitField.Flags.ManageChannels)
                            )?.id || interaction.guild.ownerId,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory,
                                PermissionsBitField.Flags.ManageMessages,
                            ],
                        }]: []),
                    ],
                });
            } catch (error) {
                console.error("Kanal oluşturulurken hata:", error);
                return interaction.editReply({
                    content: emoji.carpi + " | Destek kanalı oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
                });
            }

            db.set(`destek_kanal_${interaction.guild.id}_${interaction.user.id}`, {
                kanalId: destekKanal.id,
                konu: konu,
                aciklama: aciklama,
                acilisZamani: Date.now(),
                yetkililer: [],
            });

            const kanalEmbed = new EmbedBuilder()
                .setTitle(emoji.kbdNews + " | Yeni Destek Talebi")
                .setDescription(`Merhaba ${interaction.user}, destek talebiniz oluşturuldu! Ekibimiz en kısa sürede size yardımcı olacak.`)
                .addFields(
                    { name: emoji.kbdNews + " Konu", value: `\`${konu}\``, inline: true },
                    { name: emoji.kbdNews + " Açıklama", value: aciklama, inline: false },
                    {
                        name: emoji.kbdUser + " Kullanıcı",
                        value: `${interaction.user.tag} (${interaction.user.id})`,
                        inline: true,
                    }
                )
                .setColor("#00ff00")
                .setFooter({
                    text: config.footer || "Destek talebinizi yönetmek için aşağıdaki menüyü kullanabilirsiniz.",
                })
                .setTimestamp();

            // Aktif yetkilileri gösteren embed - İÇİNDE ETİKETLERLE
            const yetkiliEmbed = new EmbedBuilder()
                .setTitle("🟢 Aktif Yetkililer")
                .setDescription(
                    aktifYetkililer.length > 0 ? 
                    aktifYetkililer.map((yetkili, index) => `${index + 1}. <@${yetkili.id}>`).join('\n') : 
                    "Şu anda aktif yetkili bulunmamaktadır."
                )
                .addFields(
                    {
                        name: emoji.kbdZil + " Etiketlenen Yetkililer",
                        value: etiketlenecekYetkililer.length > 0 ? 
                            etiketlenecekYetkililer.map(id => `<@${id}>`).join(' ') : 
                            "Etiketlenen yetkili yok"
                    }
                )
                .setColor("#00ff00")
                .setFooter({ text: "Yukarıdaki yetkililer şu anda çevrimiçi ve size yardımcı olabilir." })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("destek_yonetim")
                    .setPlaceholder("Talebi Yönet")
                    .addOptions([
                        {
                            label: "Talebi Kapat",
                            description: "Destek talebini kapatır ve kanalı siler",
                            value: "kapat",
                            emoji: emoji.kbdKilit,
                        },
                        {
                            label: "Kanalı Kilitle",
                            description: "Kullanıcının yazmasını engeller",
                            value: "kilitle",
                            emoji: emoji.kbdCalisma,
                        },
                        {
                            label: "Kanalın Kilidini Aç",
                            description: "Kullanıcının tekrar yazmasını sağlar",
                            value: "kilit_ac",
                            emoji: emoji.acik,
                        },
                        {
                            label: "Üye Ekle",
                            description: "Kanal başka bir üye ekler",
                            value: "uye_ekle",
                            emoji: emoji.tik,
                        },
                        {
                            label: "Üye Çıkar",
                            description: "Kanalda bir üyeyi çıkarır",
                            value: "uye_cikar",
                            emoji: emoji.carpi,
                        },
                        {
                            label: "Talep Bilgisi",
                            description: "Talep detaylarını gösterir",
                            value: "bilgi",
                            emoji: emoji.kbdNews,
                        },
                    ])
            );

            try {
                // Yetkili rolünü etiketle
                let etiketMesaji = "";
                if (yetkiliRol) {
                    etiketMesaji = `${yetkiliRol}`;
                } else if (etiketlenecekYetkililer.length > 0) {
                    etiketMesaji = etiketlenecekYetkililer.map(id => `<@${id}>`).join(' ');
                }

                await destekKanal.send({
                    content: `${interaction.user} ${etiketMesaji ? `| ${etiketMesaji}` : ''}`,
                    embeds: [kanalEmbed, yetkiliEmbed],
                    components: [row],
                });

                const logEmbed = new EmbedBuilder()
                    .setTitle(emoji.kbdNews + " | Yeni Destek Talebi")
                    .setDescription(`Yeni bir destek talebi açıldı.`)
                    .addFields(
                        {
                            name: emoji.kbdUser + " Kullanıcı",
                            value: `${interaction.user.tag} (${interaction.user.id})`,
                            inline: true,
                        },
                        { name: emoji.kbdNews + " Konu", value: `\`${konu}\``, inline: true },
                        { name: emoji.kbdNews + " Açıklama", value: aciklama, inline: false },
                        { name: emoji.kbdNews + " Kanal", value: `<#${destekKanal.id}>`, inline: true },
                        {
                            name: "🟢 Aktif Yetkililer",
                            value: aktifYetkililer.length > 0 ? 
                                aktifYetkililer.map(y => y.tag).join(', ') : 
                                "Aktif yetkili yok",
                            inline: false,
                        },
                        {
                            name: emoji.kbdZil + " Etiketlenenler",
                            value: etiketMesaji || "Etiketlenen yetkili yok",
                            inline: false,
                        }
                    )
                    .setColor("#00ff00")
                    .setTimestamp();
                await logKanal.send({ embeds: [logEmbed] });

                db.set(`destek_cooldown_${interaction.guild.id}_${interaction.user.id}`, Date.now());

                await interaction.editReply({
                    content: `${emoji.tik} | Destek talebiniz başarıyla oluşturuldu! Lütfen <#${destekKanal.id}> kanalına göz atın.`,
                });
            } catch (error) {
                console.error("Mesaj gönderilirken hata:", error);
                await interaction.editReply({
                    content: emoji.carpi + " | Destek talebi oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
                });
                if (destekKanal) {
                    await destekKanal.delete().catch(console.error);
                }
                db.delete(`destek_kanal_${interaction.guild.id}_${interaction.user.id}`);
            }
            return;
        }

        // Ticket management select menu
        if (interaction.isStringSelectMenu() && interaction.customId === "destek_yonetim") {
            const kullanıcıId = Object.keys(db.all())
                .find(
                    (key) =>
                        key.startsWith(`destek_kanal_${interaction.guild.id}_`) &&
                        db.get(key).kanalId === interaction.channel.id
                )
                ?.split("_")
                .pop();

            if (!kullanıcıId) {
                return interaction.reply({
                    content: emoji.carpi + " | Bu kanal bir destek talebine bağlı değil.",
                    ephemeral: true,
                });
            }

            const selectedValue = interaction.values[0];
            const sistemVeri = db.get(`destek_sistemi_${interaction.guild.id}`);
            const logKanal = sistemVeri?.logKanal
                ? interaction.guild.channels.cache.get(sistemVeri.logKanal)
                : null;

            const yetkiliRol = sistemVeri.yetkiliRol ?
                interaction.guild.roles.cache.get(sistemVeri.yetkiliRol) :
                null;

            const isYetkili = yetkiliRol ?
                interaction.member.roles.cache.has(yetkiliRol.id) :
                interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

            if (!isYetkili && interaction.user.id !== kullanıcıId) {
                return interaction.reply({
                    content: emoji.carpi + " | Bu işlemi gerçekleştirmek için yetkiniz yok!",
                    ephemeral: true,
                });
            }

            // Close ticket
            if (selectedValue === "kapat") {
                await interaction.deferReply({ ephemeral: true });

                const closingMessage = await interaction.channel.send({
                    content: emoji.kbdKilit + " | Destek talebi kapatılıyor, lütfen bekleyin...",
                }).catch(console.error);

                const kanalAdi = interaction.channel.name;
                const talep = db.get(`destek_kanal_${interaction.guild.id}_${kullanıcıId}`);

                try {
                    const attachment = await createTranscript(interaction.channel, {
                        limit: -1,
                        returnType: "attachment",
                        filename: `${kanalAdi}.html`,
                        saveImages: true,
                        poweredBy: false,
                    });

                    try {
                        const kullanıcı = await client.users.fetch(kullanıcıId);
                        await kullanıcı.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle(emoji.kbdKilit + " | Destek Talebiniz Kapatıldı")
                                    .setDescription(
                                        "Destek talebiniz kapatıldı. Yeni bir talep oluşturabilirsiniz!\n\nAşağıda bu destek talebinin tam transkriptini bulabilirsiniz."
                                    )
                                    .setColor("#ff0000")
                                    .setFooter({ text: config.footer })
                                    .setTimestamp(),
                            ],
                            files: [attachment],
                        }).catch(() => {
                            interaction.channel.send({
                                content: `<@${kullanıcıId}> DM'leriniz kapalı olduğu için transkript gönderilemedi.`,
                            }).catch(console.error);
                        });
                    } catch (error) {
                        console.error("Kullanıcıya DM gönderilemedi:", error);
                        await interaction.channel.send({
                            content: `<@${kullanıcıId}> DM'leriniz kapalı olduğu için transkript gönderilemedi.`,
                        }).catch(console.error);
                    }

                    if (logKanal) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(emoji.kbdKilit + " | Destek Talebi Kapatıldı")
                            .setDescription(`Bir destek talebi kapatıldı. Transkript ektedir.`)
                            .addFields(
                                {
                                    name: emoji.kbdUser + " İşlem Yapan",
                                    value: `${interaction.user.tag} (${interaction.user.id})`,
                                    inline: true,
                                },
                                {
                                    name: emoji.kbdUser + " Kullanıcı",
                                    value: `<@${kullanıcıId}>`,
                                    inline: true,
                                },
                                { name: emoji.kbdNews + " Kanal", value: kanalAdi, inline: true },
                                {
                                    name: emoji.kbdSaat + " Süre",
                                    value: `<t:${Math.floor(talep.acilisZamani / 1000)}:R> açıldı`,
                                    inline: true,
                                },
                                {
                                    name: emoji.kbdNews + " Konu",
                                    value: talep.konu?.length > 256 ? talep.konu.substring(0, 253) + "..." : talep.konu || "Belirtilmemiş",
                                    inline: true,
                                }
                            )
                            .setColor("#ff0000")
                            .setTimestamp();

                        await logKanal.send({
                            embeds: [logEmbed],
                            files: [attachment],
                        }).catch(console.error);
                    }

                    await interaction.channel.send({
                        content: emoji.tik + " | Destek talebi başarıyla kapatıldı. Kanal kısa süre içinde silinecek.",
                    }).catch(console.error);

                    await interaction.editReply({
                        content: emoji.tik + " | Destek talebi başarıyla kapatıldı.",
                    });

                    await interaction.channel.delete().catch(async (error) => {
                        console.error("Kanal silinirken hata:", error);
                        await interaction.channel.send({
                            content: emoji.carpi + " | Kanal silinirken bir hata oluştu. Lütfen kanalı manuel olarak silin.",
                        }).catch(console.error);
                    });

                    db.delete(`destek_kanal_${interaction.guild.id}_${kullanıcıId}`);
                } catch (error) {
                    console.error("Destek talebi kapatılırken hata:", error);
                    await interaction.editReply({
                        content: emoji.carpi + " | Destek talebi kapatılırken bir hata oluştu. Lütfen tekrar deneyin.",
                    });
                }
                return;
            }
            // Lock channel
            else if (selectedValue === "kilitle") {
                await interaction.deferReply({ ephemeral: true });
                await interaction.channel.permissionOverwrites.edit(kullanıcıId, {
                    SendMessages: false,
                });

                await interaction.editReply({
                    content: emoji.kbdCalisma + " | Destek kanalı kilitlendi. Kullanıcı artık yazamaz.",
                });

                if (logKanal) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(emoji.kbdCalisma + " | Destek Kanalı Kilitlendi")
                        .setDescription(`Destek kanalı kilitlendi.`)
                        .addFields(
                            {
                                name: emoji.kbdUser + " Yetkili",
                                value: `${interaction.user.tag} (${interaction.user.id})`,
                                inline: true,
                            },
                            { name: emoji.kbdUser + " Kullanıcı", value: `<@${kullanıcıId}>`, inline: true },
                            {
                                name: emoji.kbdNews + " Kanal",
                                value: `<#${interaction.channel.id}>`,
                                inline: true,
                            }
                        )
                        .setColor("#ff9900")
                        .setTimestamp();
                    await logKanal.send({ embeds: [logEmbed] });
                }
            }
            // Unlock channel
            else if (selectedValue === "kilit_ac") {
                await interaction.deferReply({ ephemeral: true });
                await interaction.channel.permissionOverwrites.edit(kullanıcıId, {
                    SendMessages: true,
                });

                await interaction.editReply({
                    content: emoji.acik + " | Destek kanalı kilidi açıldı. Kullanıcı artık yazabilir.",
                });

                if (logKanal) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(emoji.acik + " | Destek Kanalı Kilidi Açıldı")
                        .setDescription(`Destek kanalı kilidi açıldı.`)
                        .addFields(
                            {
                                name: emoji.kbdUser + " Yetkili",
                                value: `${interaction.user.tag} (${interaction.user.id})`,
                                inline: true,
                            },
                            { name: emoji.kbdUser + " Kullanıcı", value: `<@${kullanıcıId}>`, inline: true },
                            {
                                name: emoji.kbdNews + " Kanal",
                                value: `<#${interaction.channel.id}>`,
                                inline: true,
                            }
                        )
                        .setColor("#00ff00")
                        .setTimestamp();
                    await logKanal.send({ embeds: [logEmbed] });
                }
            }
            // Add member
            else if (selectedValue === "uye_ekle") {
                const modal = new ModalBuilder()
                    .setCustomId("destek_uye_ekle_modal")
                    .setTitle("Üye Ekle")
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("uye_id")
                                .setLabel("Eklemek İstediğiniz Üyenin ID'si")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }
            // Remove member
            else if (selectedValue === "uye_cikar") {
                const talep = db.get(`destek_kanal_${interaction.guild.id}_${kullanıcıId}`);
                if (!talep || !talep.yetkililer || talep.yetkililer.length === 0) {
                    return interaction.reply({
                        content: emoji.carpi + " | Kanalda çıkarılacak üye bulunamadı.",
                        ephemeral: true,
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId("destek_uye_cikar_modal")
                    .setTitle("Üye Çıkar")
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("uye_id")
                                .setLabel("Çıkarmak İstediğiniz Üyenin ID'si")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder("Örnek: 123456789012345678")
                        )
                    );

                await interaction.showModal(modal);
            }
            // Ticket info
            else if (selectedValue === "bilgi") {
                const talep = db.get(`destek_kanal_${interaction.guild.id}_${kullanıcıId}`);
                if (!talep) {
                    return interaction.reply({
                        content: emoji.carpi + " | Talep bilgileri bulunamadı.",
                        ephemeral: true,
                    });
                }

                const bilgiEmbed = new EmbedBuilder()
                    .setTitle(emoji.kbdNews + " | Destek Talebi Bilgileri")
                    .setDescription(`Destek talebi detayları aşağıda yer alıyor.`)
                    .addFields(
                        { name: emoji.kbdUser + " Kullanıcı", value: `<@${kullanıcıId}>`, inline: true },
                        {
                            name: emoji.kbdNews + " Konu",
                            value: `\`${talep.konu?.length > 256 ? talep.konu.substring(0, 253) + "..." : talep.konu || "Belirtilmemiş"}\``,
                            inline: true,
                        },
                        {
                            name: emoji.kbdNews + " Açıklama",
                            value: talep.aciklama?.length > 1024 ? talep.aciklama.substring(0, 1021) + "..." : talep.aciklama || "Belirtilmemiş",
                            inline: false,
                        },
                        {
                            name: emoji.kbdSaat + " Açılış Zamanı",
                            value: `<t:${Math.floor(talep.acilisZamani / 1000)}:R>`,
                            inline: true,
                        },
                        {
                            name: emoji.kbdUser + " Eklenen Üyeler",
                            value: talep.yetkililer?.length > 0 ?
                                talep.yetkililer.map(id => `<@${id}>`).join(", ") :
                                "Eklenen üye yok",
                            inline: false,
                        }
                    )
                    .setColor("#00ff00")
                    .setTimestamp();

                await interaction.reply({ embeds: [bilgiEmbed], ephemeral: true });
            }
            return;
        }

        // Add member modal
        if (interaction.isModalSubmit() && interaction.customId === "destek_uye_ekle_modal") {
            await interaction.deferReply({ ephemeral: true });
            const uyeId = interaction.fields.getTextInputValue("uye_id");
            const kullanıcıId = Object.keys(db.all())
                .find(
                    (key) =>
                        key.startsWith(`destek_kanal_${interaction.guild.id}_`) &&
                        db.get(key).kanalId === interaction.channel.id
                )
                ?.split("_")
                .pop();

            const sistemVeri = db.get(`destek_sistemi_${interaction.guild.id}`);
            const logKanal = sistemVeri?.logKanal
                ? interaction.guild.channels.cache.get(sistemVeri.logKanal)
                : null;

            if (kullanıcıId) {
                try {
                    const uye = await interaction.guild.members.fetch(uyeId).catch(() => null);
                    if (!uye) {
                        return interaction.editReply({
                            content: emoji.carpi + " | Geçersiz kullanıcı ID'si veya kullanıcı sunucuda bulunamadı.",
                        });
                    }

                    await interaction.channel.permissionOverwrites.edit(uyeId, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                    });

                    const talep = db.get(`destek_kanal_${interaction.guild.id}_${kullanıcıId}`);
                    if (!talep.yetkililer) talep.yetkililer = [];
                    if (!talep.yetkililer.includes(uyeId)) {
                        talep.yetkililer.push(uyeId);
                        db.set(`destek_kanal_${interaction.guild.id}_${kullanıcıId}`, talep);
                    }

                    await interaction.editReply({
                        content: `${emoji.tik} | ${uye} kullanıcısı başarıyla kanala eklendi!`,
                    });

                    if (logKanal) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(emoji.tik + " | Destek Kanalına Üye Eklendi")
                            .setDescription(`Destek kanalına yeni bir üye eklendi.`)
                            .addFields(
                                {
                                    name: emoji.kbdUser + " Yetkili",
                                    value: `${interaction.user.tag} (${interaction.user.id})`,
                                    inline: true,
                                },
                                {
                                    name: emoji.kbdUser + " Kullanıcı",
                                    value: `<@${kullanıcıId}>`,
                                    inline: true,
                                },
                                {
                                    name: emoji.kbdUser + " Eklenen Üye",
                                    value: `<@${uyeId}>`,
                                    inline: true,
                                },
                                {
                                    name: emoji.kbdNews + " Kanal",
                                    value: `<#${interaction.channel.id}>`,
                                    inline: true,
                                }
                            )
                            .setColor("#00ccff")
                            .setTimestamp();
                        await logKanal.send({ embeds: [logEmbed] });
                    }

                    await interaction.channel.send({
                        content: `${uye} kullanıcısı ${interaction.user} tarafından kanala eklendi!`,
                    });
                } catch (error) {
                    console.error("Üye eklenirken hata:", error);
                    await interaction.editReply({
                        content: emoji.carpi + " | Üye eklenirken bir hata oluştu. Lütfen tekrar deneyin.",
                    });
                }
            }
            return;
        }

        // Remove member modal
        if (interaction.isModalSubmit() && interaction.customId === "destek_uye_cikar_modal") {
            await interaction.deferReply({ ephemeral: true });
            const uyeId = interaction.fields.getTextInputValue("uye_id");
            const kullanıcıId = Object.keys(db.all())
                .find(
                    (key) =>
                        key.startsWith(`destek_kanal_${interaction.guild.id}_`) &&
                        db.get(key).kanalId === interaction.channel.id
                )
                ?.split("_")
                .pop();

            const sistemVeri = db.get(`destek_sistemi_${interaction.guild.id}`);
            const logKanal = sistemVeri?.logKanal
                ? interaction.guild.channels.cache.get(sistemVeri.logKanal)
                : null;

            if (kullanıcıId) {
                try {
                    const uye = await interaction.guild.members.fetch(uyeId).catch(() => null);
                    if (!uye) {
                        return interaction.editReply({
                            content: emoji.carpi + " | Geçersiz kullanıcı ID'si veya kullanıcı sunucuda bulunamadı.",
                        });
                    }

                    await interaction.channel.permissionOverwrites.delete(uyeId);

                    const talep = db.get(`destek_kanal_${interaction.guild.id}_${kullanıcıId}`);
                    if (talep.yetkililer) {
                        talep.yetkililer = talep.yetkililer.filter(id => id !== uyeId);
                        db.set(`destek_kanal_${interaction.guild.id}_${kullanıcıId}`, talep);
                    }

                    await interaction.editReply({
                        content: `${emoji.tik} | ${uye} kullanıcısı başarıyla kanaldan çıkarıldı!`,
                    });

                    if (logKanal) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(emoji.carpi + " | Destek Kanalından Üye Çıkarıldı")
                            .setDescription(`Destek kanalından bir üye çıkarıldı.`)
                            .addFields(
                                {
                                    name: emoji.kbdUser + " Yetkili",
                                    value: `${interaction.user.tag} (${interaction.user.id})`,
                                    inline: true,
                                },
                                {
                                    name: emoji.kbdUser + " Kullanıcı",
                                    value: `<@${kullanıcıId}>`,
                                    inline: true,
                                },
                                {
                                    name: emoji.kbdUser + " Çıkarılan Üye",
                                    value: `<@${uyeId}>`,
                                    inline: true,
                                },
                                {
                                    name: emoji.kbdNews + " Kanal",
                                    value: `<#${interaction.channel.id}>`,
                                    inline: true,
                                }
                            )
                            .setColor("#ff9900")
                            .setTimestamp();
                        await logKanal.send({ embeds: [logEmbed] });
                    }

                    await interaction.channel.send({
                        content: `${uye} kullanıcısı ${interaction.user} tarafından kanaldan çıkarıldı!`,
                    });
                } catch (error) {
                    console.error("Üye çıkarılırken hata:", error);
                    await interaction.editReply({
                        content: emoji.carpi + " | Üye çıkarılırken bir hata oluştu. Lütfen tekrar deneyin.",
                    });
                }
            }
            return;
        }
    } catch (error) {
        console.error("Destek sistemi işlenirken hata:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: emoji.carpi + " | İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.",
                ephemeral: true,
            }).catch(console.error);
        } else if (interaction.deferred) {
            await interaction.editReply({
                content: emoji.carpi + " | İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.",
            }).catch(console.error);
        }
    }
});