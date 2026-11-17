const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("croxydb");
const emoji = require("../emoji.js");

// Çekiliş süresi seçenekleri (Türkçe)
const durationOptions = {
    "1dakika": 60000,
    "5dakika": 300000,
    "10dakika": 600000,
    "30dakika": 1800000,
    "1saat": 3600000,
    "3saat": 10800000,
    "6saat": 21600000,
    "12saat": 43200000,
    "1gun": 86400000,
    "3gun": 259200000,
    "7gun": 604800000,
};

module.exports = {
    name: "çekiliş",
    description: "Bir çekiliş başlatır!",
    type: 1,
    options: [
        {
            name: "ödül",
            description: "Çekilişin ödülü nedir?",
            type: 3,
            required: true,
        },
        {
            name: "süre",
            description: "Çekiliş süresini seçin",
            type: 3,
            required: true,
            choices: [
                { name: "1 Dakika", value: "1dakika" },
                { name: "5 Dakika", value: "5dakika" },
                { name: "10 Dakika", value: "10dakika" },
                { name: "30 Dakika", value: "30dakika" },
                { name: "1 Saat", value: "1saat" },
                { name: "3 Saat", value: "3saat" },
                { name: "6 Saat", value: "6saat" },
                { name: "12 Saat", value: "12saat" },
                { name: "1 Gün", value: "1gun" },
                { name: "3 Gün", value: "3gun" },
                { name: "7 Gün", value: "7gun" },
            ],
        },
        {
            name: "kazanan_sayısı",
            description: "Kaç kişi kazanacak? (1-10)",
            type: 4,
            required: true,
            min_value: 1,
            max_value: 10,
        },
    ],
    run: async (client, interaction) => {
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
        ) {
            return interaction.reply({
                content: `${emoji.carpi} | Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısınız!`,
                ephemeral: true,
            });
        }

        const ödül = interaction.options.getString("ödül");
        const süreKey = interaction.options.getString("süre");
        const kazananSayısı = interaction.options.getInteger("kazanan_sayısı");

        const süreMs = durationOptions[süreKey];
        if (!süreMs) {
            return interaction.reply({
                content: `${emoji.carpi} | Geçersiz süre seçimi!`,
                ephemeral: true,
            });
        }

        const bitişZamanı = Date.now() + süreMs;
        const bitişZamanıFormat = `<t:${Math.floor(bitişZamanı / 1000)}:R>`;

        const embed = new EmbedBuilder()
            .setTitle(`${emoji.kbdOyun} Yeni Çekiliş!`)
            .setDescription(
                `
                **Ödül:** ${ödül}
                **Kazanan Sayısı:** ${kazananSayısı}
                **Bitiş Zamanı:** ${bitişZamanıFormat}
                **Katılımcılar:** 0 kişi
                **Başlatan:** ${interaction.user}

                Çekilişe katılmak için aşağıdaki **Katıl** butonuna tıkla!
            `
            )
            .setColor("#FFD700")
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({
                text: `Çekiliş ID: Henüz gönderilmedi`,
                iconURL: interaction.guild.iconURL(),
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("cekilis_katil")
                .setLabel("Katıl")
                .setStyle(ButtonStyle.Success)
                .setEmoji(emoji.oyun)
        );

        const msg = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true,
        });

        db.set(`cekilis_${msg.id}`, {
            ödül,
            kazananSayısı,
            bitişZamanı,
            kanalId: msg.channel.id,
            mesajId: msg.id,
            başlatan: interaction.user.id,
            katılımcılar: [],
        });

        embed.setFooter({
            text: `Çekiliş ID: ${msg.id}`,
            iconURL: interaction.guild.iconURL(),
        });
        await msg.edit({ embeds: [embed] });

        checkCekilisSuresi(client, msg.id);

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.customId === "cekilis_katil",
            time: süreMs,
        });

        collector.on("collect", async (i) => {
            const cekilisData = db.get(`cekilis_${msg.id}`);
            if (!cekilisData) return;

            if (cekilisData.katılımcılar.includes(i.user.id)) {
                return i.reply({
                    content: `${emoji.carpi} | Zaten bu çekilişe katıldın!`,
                    ephemeral: true,
                });
            }

            cekilisData.katılımcılar.push(i.user.id);
            db.set(`cekilis_${msg.id}`, cekilisData);

            const newEmbed = EmbedBuilder.from(embed).setDescription(`
                **Ödül:** ${ödül}
                **Kazanan Sayısı:** ${kazananSayısı}
                **Bitiş Zamanı:** ${bitişZamanıFormat}
                **Katılımcılar:** ${cekilisData.katılımcılar.length} kişi
                **Başlatan:** <@${cekilisData.başlatan}>

                Çekilişe katılmak için aşağıdaki **Katıl** butonuna tıkla!
            `);

            await i.update({ embeds: [newEmbed] });
        });

        collector.on("end", () => {
            finishCekilis(client, msg.id);
        });
    },
};

function parseDuration(duration) {
    const units = {
        s: 1000,
        m: 60000,
        h: 3600000,
        d: 86400000,
    };
    const match = duration.match(/^(\d+)([smhd])$/);
    return match ? parseInt(match[1]) * units[match[2]] : null;
}

async function checkCekilisSuresi(client, msgId) {
    const cekilisData = db.get(`cekilis_${msgId}`);
    if (!cekilisData) return;

    const kalanSüre = cekilisData.bitişZamanı - Date.now();
    if (kalanSüre <= 0) {
        finishCekilis(client, msgId);
    } else {
        setTimeout(() => finishCekilis(client, msgId), kalanSüre);
    }
}

async function finishCekilis(client, msgId) {
    const cekilisData = db.get(`cekilis_${msgId}`);
    if (!cekilisData) return;

    const kanal = await client.channels
        .fetch(cekilisData.kanalId)
        .catch(() => null);
    if (!kanal) {
        db.delete(`cekilis_${msgId}`);
        return;
    }

    const msg = await kanal.messages.fetch(cekilisData.mesajId).catch(() => null);
    if (!msg) {
        db.delete(`cekilis_${msgId}`);
        return;
    }

    let kazananlar = [];
    if (cekilisData.katılımcılar.length > 0) {
        const shuffled = cekilisData.katılımcılar.sort(() => 0.5 - Math.random());
        kazananlar = shuffled.slice(
            0,
            Math.min(cekilisData.kazananSayısı, cekilisData.katılımcılar.length)
        );
    }

    const resultEmbed = new EmbedBuilder()
        .setTitle(`${emoji.kbdOyun} Çekiliş Sona Erdi!`)
        .setDescription(
            `
            **Ödül:** ${cekilisData.ödül}
            **Kazananlar:** ${
                kazananlar.length > 0
                    ? kazananlar.map((id) => `<@${id}>`).join(", ")
                    : "Katılım olmadı!"
            }
            **Katılımcı Sayısı:** ${cekilisData.katılımcılar.length}
            **Başlatan:** <@${cekilisData.başlatan}>
        `
        )
        .setColor("#FF4500")
        .setFooter({ text: `Çekiliş ID: ${msgId}`, iconURL: msg.guild.iconURL() })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("cekilis_katil")
            .setLabel("Katıl ")
            .setStyle(ButtonStyle.Success)
            .setEmoji(emoji.oyun)
            .setDisabled(true)
    );

    await msg.edit({ embeds: [resultEmbed], components: [row] });

    if (kazananlar.length > 0) {
        await kanal.send({
            content: `${emoji.kbdOyun} **${cekilisData.ödül}** çekilişinin kazananları: ${kazananlar
                .map((id) => `<@${id}>`)
                .join(", ")}! Tebrikler!`,
            embeds: [resultEmbed],
        });
    }

    db.set(`tamamlanmis_cekilis_${msgId}`, {
        ödül: cekilisData.ödül,
        kazananSayısı: cekilisData.kazananSayısı,
        kanalId: cekilisData.kanalId,
        mesajId: cekilisData.mesajId,
        başlatan: cekilisData.başlatan,
        katılımcılar: cekilisData.katılımcılar,
        sonKazananlar: kazananlar,
    });

    db.delete(`cekilis_${msgId}`);
}

module.exports.checkCekilisSuresi = checkCekilisSuresi;
module.exports.finishCekilis = finishCekilis;
module.exports.parseDuration = parseDuration;
