const emoji = require("../emoji.js");
const { EmbedBuilder } = require("discord.js");
const db = require("croxydb");
const config = require("../config.json");

const XP_COOLDOWN = 60000; // 1 dakika
const XP_MIN = 15;
const XP_MAX = 25;
const XP_BASE = 100;

function getXpForLevel(level) {
    return Math.floor(XP_BASE * (level * 1.5));
}

function getLevelFromXp(xp) {
    let level = 0;
    let needed = getXpForLevel(level + 1);
    while (xp >= needed) {
        level++;
        needed = getXpForLevel(level + 1);
    }
    return level;
}

module.exports = {
    name: "messageCreate",
    run: async (client, message) => {
        if (message.author.bot) return;
        if (!message.guild) return;

        const guildId = message.guild.id;
        const userId = message.author.id;
        const key = `seviye_${guildId}_${userId}`;
        const cooldownKey = `seviye_cooldown_${guildId}_${userId}`;

        // Cooldown kontrolü
        const lastXp = db.get(cooldownKey);
        const now = Date.now();
        if (lastXp && now - lastXp < XP_COOLDOWN) return;

        db.set(cooldownKey, now);

        // Mevcut veriyi al
        let data = db.get(key) || { xp: 0, level: 0 };
        let currentXp = data.xp || 0;
        let currentLevel = data.level || getLevelFromXp(currentXp);

        // XP ekle
        const gainedXp = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
        currentXp += gainedXp;

        // Seviye kontrolü
        let newLevel = getLevelFromXp(currentXp);
        let leveledUp = false;

        if (newLevel > currentLevel) {
            leveledUp = true;
            data.level = newLevel;
        }

        data.xp = currentXp;
        db.set(key, data);

        // Seviye atıldı mesajı
        if (leveledUp) {
            const seviyeKanal = db.get(`seviyeKanal_${guildId}`);
            const targetChannel = seviyeKanal
                ? message.guild.channels.cache.get(seviyeKanal)
                : message.channel;

            if (targetChannel && targetChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setAuthor({
                        name: `${emoji.kbdOyun} Seviye Atladı!`,
                        iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    })
                    .setColor(config.successColor || "#57F287")
                    .setDescription(
                        `${message.author} Tebrikler! Yeni seviyeye ulaştın: **${newLevel}**`
                    )
                    .addFields(
                        {
                            name: emoji.kbdTac + " Toplam XP",
                            value: `\`${currentXp.toLocaleString()}\``,
                            inline: true,
                        },
                        {
                            name: emoji.kbdNews + " Yeni Seviye",
                            value: `\`${newLevel}\``,
                            inline: true,
                        },
                    )
                    .setFooter({
                        text: config.footer || "Seviye Sistemi",
                        iconURL: client.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                await targetChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    },
};
