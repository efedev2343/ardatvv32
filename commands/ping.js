const emoji = require("../emoji.js");
const { Client, EmbedBuilder } = require("discord.js");
const config = require("../config.json");

module.exports = {
  name: "ping",
  description: "Botun pingini gösterir.",
  type: 1,
  options: [],

  run: async (client, interaction) => {
    
    const yükleniyorEmbed = new EmbedBuilder()
      .setColor("#ffa500")
      .setTitle(emoji.kbdOyun + " Ping Ölçülüyor...")
      .setDescription("Lütfen bekleyin, ping verileri hesaplanıyor.")
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `${config["bot-adi"]} Ping Sistemi` });

    const reply = await interaction.reply({
      embeds: [yükleniyorEmbed],
      fetchReply: true,
    });

    
    const mesajGecikme = reply.createdTimestamp - interaction.createdTimestamp;
    const apiGecikme = Math.round(client.ws.ping);

   
    let renk = "#00ff00";
    if (apiGecikme >= 200) renk = "#ff0000";
    else if (apiGecikme >= 100) renk = "#ff9900";

    const pingEmbed = new EmbedBuilder()
      .setColor(renk)
      .setTitle(emoji.kbdZil + ` ${config["bot-adi"]} Bot Ping`)
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: emoji.kbdZil + " Mesaj Gecikmesi", value: `\`${mesajGecikme}ms\``, inline: true },
        { name: emoji.kbdZil + " API Gecikmesi", value: `\`${apiGecikme}ms\``, inline: true }
      )
      .setFooter({
        text: `Saat: ${new Date().toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      });

    await interaction.editReply({ embeds: [pingEmbed] });
  },
};
