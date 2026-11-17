const emoji = require("../emoji.js");
const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder } = require("discord.js");
const db = require("croxydb");
const config = require("../config.json");

// XP ayarları
const XP_PER_MESSAGE = { min: 15, max: 25 };
const XP_COOLDOWN = 60000; // 1 dakika
const XP_BASE = 100; // Seviye baz puanı

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
    name: "seviye",
    description: "Kullanıcının seviyesini ve XP'sini gösterir.",
    type: 1,
    options: [
        {
            name: "kullanıcı",
            description: "Seviyesini görmek istediğiniz kullanıcı",
            type: 6, // USER
            required: false,
        },
    ],

    run: async (client, interaction) => {
        const targetUser = interaction.options.getMember("kullanıcı") || interaction.member;
        const guildId = interaction.guild.id;
        const userId = targetUser.id;

        const data = db.get(`seviye_${guildId}_${userId}`) || { xp: 0, level: 0 };
        const currentXp = data.xp || 0;
        const currentLevel = data.level || getLevelFromXp(currentXp);
        const neededXp = getXpForLevel(currentLevel + 1);
        const remainingXp = neededXp - currentXp;
        const progress = Math.floor((currentXp / neededXp) * 100);

        // Bar çizimi
        const barLength = 12;
        const filled = Math.floor((progress / 100) * barLength);
        const empty = barLength - filled;
        const progressBar = "🟩".repeat(filled) + "⬜".repeat(empty);

        // Sıralama (rank)
        const allData = db.all();
        const guildUsers = Object.entries(allData)
            .filter(([key]) => key.startsWith(`seviye_${guildId}_`))
            .sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0));
        const rank = guildUsers.findIndex(([key]) => key.endsWith(`_${userId}`)) + 1;

        const embed = new EmbedBuilder()
            .setAuthor({
                name: `${targetUser.user.tag} - Seviye Bilgisi`,
                iconURL: targetUser.displayAvatarURL({ dynamic: true }),
            })
            .setColor(config.embedColor || "#5865F2")
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: emoji.kbdNews + " Seviye",
                    value: `\`${currentLevel}\``,
                    inline: true,
                },
                {
                    name: emoji.kbdTac + " XP",
                    value: `\`${currentXp.toLocaleString()}\` / \`${neededXp.toLocaleString()}\``,
                    inline: true,
                },
                {
                    name: emoji.kbdTac + " Sıralama",
                    value: `#${rank}`,
                    inline: true,
                },
                {
                    name: emoji.kbdNews + " İlerleme",
                    value: `\`${progress}%\`\n${progressBar}`,
                    inline: false,
                },
            )
            .setFooter({
                text: config.footer || "Seviye Sistemi",
                iconURL: client.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
