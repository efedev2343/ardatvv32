const emoji = require("../emoji.js");
const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const db = require("croxydb");

let lastCheckedUnix = null;
let isChecking = false;

async function kontrolEt(client) {
  if (isChecking) return;
  isChecking = true;

  try {
    const response = await axios.get("https://api.orhanaydogdu.com.tr/deprem/lives", {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const raw = response.data.result || response.data || [];
    const deprem = raw[0];
    if (!deprem) return;

    const depremUnix = deprem.unix || deprem.timestamp || Date.now();
    if (depremUnix === lastCheckedUnix) return;
    lastCheckedUnix = depremUnix;

    const embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle(emoji.kbdZil + " Yeni Deprem Tespit Edildi!")
      .setDescription(
        `**Yer:** ${deprem.location || deprem.yer || 'Bilinmiyor'}\n${emoji.kbdNews} **Büyüklük:** ${deprem.mag || deprem.buyukluk || '?'} ML\n${emoji.kbdCalisma} **Derinlik:** ${deprem.depth || deprem.derinlik || '?'} km\n${emoji.kbdSaat} **Zaman:** ${deprem.date || deprem.tarih || ''} ${deprem.time || deprem.saat || ''}`
      )
      .setTimestamp();

    const allData = db.all();
    const kanallar = Object.entries(allData)
      .filter(([key]) => key.startsWith("depremKanal_"))
      .map(([key, value]) => ({
        guildId: key.split("_")[1],
        channelId: value
      }));

    for (const { guildId, channelId } of kanallar) {
      try {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        const channel = guild?.channels.cache.get(channelId);
        if (channel?.isTextBased()) {
          await channel.send({ embeds: [embed] });
        }
      } catch (err) {
        console.error(`[${guildId}/${channelId}] kanalına mesaj gönderilemedi:`, err.message);
      }
    }
  } catch (err) {
    if (err.code !== 404 && !err.message.includes("404")) {
      console.error("Deprem kontrol hatası:", err.message);
    }
  } finally {
    isChecking = false;
  }
}

module.exports = { kontrolEt };
