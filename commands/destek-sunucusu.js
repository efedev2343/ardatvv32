const emoji = require("../emoji.js");
// destek.js
const { EmbedBuilder } = require('discord.js');
const config = require("../config.json");

module.exports = {
  name: 'destek',
  description: 'Sunucu destek linkini paylaşır.',
  
  run: async (client, interaction) => {
    try {
      const embed = new EmbedBuilder()
        .setTitle(emoji.kbdCalisma + ' **Destek İhtiyacınız Var mı?** ' + emoji.kbdCalisma)
        .setDescription('**Merhaba!** ' + emoji.kbdOyun + '\n\nEğer herhangi bir sorun yaşıyorsanız veya bir konuda yardıma ihtiyacınız varsa, doğru yerdesiniz! Biz buradayız ve size yardımcı olmaktan mutluluk duyarız. ' + emoji.kbdOyun + '\n\nBize her zaman ulaşabilirsiniz. Sorularınızı sormak veya önerilerinizi iletmek için destek sunucumuza katılmayı unutmayın!')
        .addFields(
          { name: emoji.kbdNews + ' **Destek Sunucusu Bağlantısı**', value: `[Buraya Tıklayın ve Bize Katılın!](${config["desteksunucu"]})` },
          { name: emoji.kbdNews + ' **Neler Yapabilirsiniz?**', value: '• Sorularınızı sorabilirsiniz.\n• Önerilerinizi iletebilirsiniz.\n• Diğer topluluk üyeleriyle etkileşime geçebilirsiniz.\n• Eğlenceli etkinliklere katılabilirsiniz!' },
          { name: emoji.kbdWarn + '  **Hata Alıyorsanız:**', value: `Bot ile ilgili bir sorun yaşıyorsanız, lütfen destek almak için [buraya tıklayarak sunucumuza katılın!](${config["desteksunucu"]})` },
          { name: emoji.kbdNews + ' **Öneri Yapmak İçin:**', value: 'Öneri yapmak için `/öneri <öneriniz>` yazabilirsiniz.' }, // Öneri komutu hakkında bilgi
          { name: emoji.kbdNews + ' **Bot ile İletişim:**', value: 'Botumuzla etkileşimde bulunarak çeşitli komutları kullanabilirsiniz. Öneri veya destek almak için her zaman buradayız!' } // Bot ile etkileşim bilgisi
        )
        .setColor('#3498db')
        .setFooter({ text: 'Sizin için buradayız! ' + emoji.kbdOyun })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error); // Hatanın detaylarını konsola yazdır
      await interaction.reply(`Bir hata oluştu, lütfen daha sonra tekrar deneyin. Eğer sorun devam ederse, [destek sunucumuza katılmayı unutmayın!](${config["desteksunucu"]})`); // Kullanıcıya hata mesajı
    }
  }
};
