const emoji = require("../emoji.js");
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { DiscordBanners } = require("discord-banners");
const config = require("../config.json");

module.exports = {
    name: "banner",
    description: "Kullanıcının banner'ını şık ve kullanıcı dostu şekilde gösterir.",
    type: 1,
    options: [
        {
            name: "kullanıcı",
            description: "Banner'ını görüntülemek istediğin kullanıcıyı seç.",
            type: 6,
            required: true,
        },
    ],
    run: async (client, interaction) => {
        const target = interaction.options.getUser("kullanıcı");
        const discordBanners = new DiscordBanners(client);
        let bannerURL;
        let hasBanner = true;

        try {
            bannerURL = await discordBanners.getBanner(target.id, { dynamic: true });

         
            if (!bannerURL || bannerURL.startsWith('#')) {
                hasBanner = false;
                bannerURL = "https://rudsdev.xyz/api/banner?renk=5865F2&style=soft";
            }
        } catch (error) {
            console.error("Banner alınırken hata:", error.message || error);
            hasBanner = false;
            bannerURL = "https://rudsdev.xyz/api/banner?renk=5865F2&style=soft";
        }

        const embed = new EmbedBuilder()
            .setColor(hasBanner ? 0x5865F2 : 0xED4245)
            .setAuthor({
                name: `${target.username} için özel bir vitrin`,
                iconURL: target.displayAvatarURL({ dynamic: true }),
            })
            .setTitle(hasBanner ? [emoji.kbdOyun + " Muhteşem bir banner keşfettik!"] : emoji.kbdNews + " Henüz bir banner yok!")
            .setDescription(
                hasBanner
                    ? `${emoji.kbdOyun} **${target.username}**, senin banner'ın gerçekten etkileyici görünüyor! Aşağıda detaylıca inceleyebilirsin.`
                    : `${emoji.kbdOyun} **${target.username}**, şu anda özel bir banner'ın yok ama merak etme, senin yerini dolduracak hoş bir görsel hazırladık!`
            )
            .setImage(bannerURL)
            .addFields(
                {
                    name: emoji.kbdUser + " Kullanıcı",
                    value: `<@${target.id}> (\`${target.tag}\`)`,
                    inline: true,
                },
                {
                    name: emoji.kbdApi + " Kullanıcı ID",
                    value: `\`${target.id}\``,
                    inline: true,
                }
            )
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setFooter({
                text: `Komutu kullanan: ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp();

        const buttons = new ActionRowBuilder();
        try {
            new URL(bannerURL); 
            buttons.addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(bannerURL)
                    .setLabel(emoji.kbdNews + " Banner'ı Gör / İndir"),
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(config["desteksunucu"])
                    .setLabel(emoji.kbdNews + " Destek Sunucusu")
            );
        } catch {
            // URL geçersizse sadece destek sunucusu butonunu ekle
            buttons.addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(config["desteksunucu"])
                    .setLabel(emoji.kbdNews + " Destek Sunucusu")
            );
        }

        return interaction.reply({
            embeds: [embed],
            components: [buttons],
        });
    },
};