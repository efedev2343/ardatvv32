const emoji = require("../emoji.js");
const { EmbedBuilder, WebhookClient } = require('discord.js');

module.exports = {
  name: 'öneri',
  description: 'Önerinizi paylaşın, öneriniz özel olarak iletilecektir.',
  options: [
    {
      name: 'öneri',
      description: 'Paylaşmak istediğiniz öneri',
      type: 3, // STRING type
      required: true
    }
  ],

  run: async (client, interaction) => {
    const öneri = interaction.options.getString('öneri');

    const webhookURL = 'https://discord.com/api/webhooks/1329114712088252417/QFJN5W54BTXKnG2XmNgLhl7jFCNwm4iGJefEfpKCX0LGZtBtDxFQHidDTcLoigS5Decv';
    const [_, webhookID, webhookToken] = webhookURL.match(/webhooks\/(\d+)\/(.+)/) || [];

    if (!webhookID || !webhookToken) {
      return interaction.reply({ content: emoji.carpi + '  Webhook bilgileri hatalı veya eksik!', ephemeral: true });
    }

    const webhookClient = new WebhookClient({ id: webhookID, token: webhookToken });

    const embed = new EmbedBuilder()
      .setTitle(emoji.kbdNews + ' Yeni Öneri')
      .setDescription(`${emoji.kbdZil} **Öneri:** ${öneri}`)
      .addFields(
        { name: emoji.kbdUser + ' Öneren Kullanıcı', value: `${interaction.user.username}`, inline: true },
        { name: emoji.kbdCalisma + ' Öneri Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
      )
      .setColor('#3498db')
      .setTimestamp();

    try {
      await webhookClient.send({ embeds: [embed] });
      interaction.reply({ content: emoji.tik + '  Öneriniz başarıyla iletildi!', ephemeral: true });
    } catch (error) {
      console.error('Öneri gönderilirken hata oluştu:', error);
      interaction.reply({ content: emoji.carpi + '  Öneriniz gönderilemedi. Lütfen tekrar deneyin.', ephemeral: true });
    }
  }
};
