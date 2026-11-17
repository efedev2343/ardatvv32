const emoji = require("../emoji.js");
const { Client, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "rastgele-sifre",
  description: "Rastgele bir şifre oluşturur.",
  type: 1,
  options: [
    {
      name: "uzunluk",
      description: "Şifrenin uzunluğunu belirle.",
      type: 4, 
      required: true,
    },
  ],

  run: async (client, interaction) => {
    const uzunluk = interaction.options.getInteger("uzunluk");

   
    const karakterSeti = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    
    let sifre = "";
    for (let i = 0; i < uzunluk; i++) {
      const randomIndex = Math.floor(Math.random() * karakterSeti.length);
      sifre += karakterSeti[randomIndex];
    }

   
    const sifreEmbed = new EmbedBuilder()
      .setColor("Random")
      .setTitle(emoji.kbdKilit + " Rastgele Şifre Oluşturuldu!")
      .setDescription(`İşte oluşturduğunuz rastgele şifre: **${sifre}**`)
      .setFooter({ text: "Bu şifreyi güvende tutun!" });

    interaction.reply({ embeds: [sifreEmbed], ephemeral: true });
  },
};
