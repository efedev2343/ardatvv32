const emoji = require("../emoji.js");
const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  name: "ai",
  description: "Yapay Zeka ile sohbet etmek için kullanılır.",
  type: 1,
  options: [
    {
      name: "soru",
      description: "Yapay zekaya sormak istediğiniz soru",
      type: 3,
      required: true,
    },
    {
      name: "gizli",
      description: "Yanıtı sadece sen görmek ister misin? (Varsayılan: Hayır)",
      type: 5,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const soru = interaction.options.getString("soru");
    const ephemeral = interaction.options.getBoolean("gizli") || false;
    const sessionId = uuidv4();
    const startTime = Date.now();

    if (!soru || soru.length < 2) {
      return interaction.reply({
        content: emoji.carpi + " Lütfen geçerli bir soru girin (en az 2 karakter).",
        ephemeral: true,
      });
    }

    if (soru.length > 500) {
      return interaction.reply({
        content: emoji.carpi + " Sorunuz çok uzun! Lütfen 500 karakteri geçmeyecek şekilde kısaltın.",
        ephemeral: true,
      });
    }

    try {
      await interaction.deferReply({ ephemeral });

      const apiConfig = {
        method: "get",
        url: "https://rudsdev.xyz/api/ai",
        params: {
          soru: encodeURIComponent(soru),
          lang: "tr",
          session: sessionId,
        },
        timeout: 30000,
        headers: {
          "Accept-Language": "tr-TR,tr;q=0.9",
          "User-Agent": "DiscordAIBot/1.0",
        },
      };

      let response;
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          response = await axios(apiConfig);
          if (response && response.data && response.data.cevap) break;
        } catch (error) {
          lastError = error;
          if (attempts === maxAttempts) break;
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempts));
          console.warn(`[AI] Deneme ${attempts}/${maxAttempts} başarısız, tekrar deneniyor...`);
        }
      }

      if (!response || !response.data || !response.data.cevap) {
        throw new Error(lastError ? lastError.message : "API geçersiz veya boş yanıt verdi");
      }

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      const cevap = response.data.cevap;

      const onlyBasicLatin = /^[\x00-\x7F]*$/.test(cevap);
      const containsTurkishChars = /[çğıöşüÇĞİÖŞÜ]/.test(cevap);
      const isEnglish = onlyBasicLatin && !containsTurkishChars;

      const embed = new EmbedBuilder()
        .setColor(isEnglish ? 0xffa500 : 0x00ff00)
        .setTitle(isEnglish ? [emoji.kbdWarn + " İngilizce Yanıt"] : emoji.kbdBot2 + " Yapay Zeka Yanıtı")
        .setDescription(cevap.length > 4096 ? cevap.substring(0, 4090) + "..." : cevap)
        .addFields(
          { name: "Soru", value: soru.length > 1024 ? soru.substring(0, 1020) + "..." : soru },
          { name: "İşlem Süresi", value: `${processingTime} saniye`, inline: true },
          { name: "Oturum ID", value: sessionId, inline: true }
        )
        .setFooter({ text: "Powered by rudsdev.xyz API" })
        .setTimestamp();

      if (isEnglish) {
        embed.addFields({
          name: "Not",
          value: "Yapay zeka İngilizce yanıt verdi. Sorunuzu Türkçe ifade etmeyi deneyebilir misiniz?",
        });
      }

      await interaction.editReply({
        embeds: [embed],
        content: isEnglish ? [emoji.kbdWarn + " Yapay zeka İngilizce yanıt verdi (aşağıda detaylar var)"] : null,
      });
    } catch (error) {
      console.error(`[AI ERROR] Session: ${sessionId}`, error.message);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(emoji.carpi + " Yapay Zeka Hatası")
        .setDescription(
          "Yapay zeka servisinde bir sorun oluştu veya servis şu anda yanıt vermiyor. Lütfen daha sonra tekrar deneyin."
        )
        .addFields(
          { name: "Hata", value: error.message || "Bilinmeyen hata", inline: false },
          { name: "Oturum ID", value: sessionId, inline: true }
        )
        .setFooter({ text: "Hata kaydı için bu ID'yi saklayın" })
        .setTimestamp();

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (err) {
        console.error("[AI] Yanıt gönderilemedi:", err.message);
      }
    }
  },
};
