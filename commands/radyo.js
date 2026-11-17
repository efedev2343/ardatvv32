const emoji = require("../emoji.js");
const { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { createAudioPlayer, createAudioResource, joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  name: "radyo",
  description: "Radyo dinle veya durdur!",
  type: 1,

  run: async (client, interaction) => {
    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: "Bir sesli kanala katılmalısınız!", ephemeral: true });

const radioStations = {
  "seymen": "https://yayin.radyoseymen.com.tr:1070/stream",
  "kralpop": "https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8",
  "extra": "http://yayin.radyolarburada.com:...",
  "alem": "https://turkmedya.radyotvonline.com/alemfmaac",
  "slowturk": "https://radyo.duhnet.tv/ak_dtvh_slowturk",
  "show": "http://sunucu4.radyolarburada.com:6065/",
  "turkiyemfm": "https://server7.streamserver24.com/proxy/turkiyemfm?mp=/stream",
  "turkuvaz": "https://trkvz-radyolar.ercdn.net/radyoturkuvaz/playlist.m3u8",
  "ankara": "https://ssl4.radyotvonline.com/radyohome/radyotrafikhome.stream_aac/playlist.m3u8",
  "kralfm": "https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8",
  "efkar": "",
  "turkfm": "https://live.radyositesihazir.com/8032/stream",
  "powerturk": "https://listen.powerapp.com.tr/powerturk/128/icecast.audio"
};

    const embed = new EmbedBuilder()
      .setTitle(emoji.kbdOyun + " Mükemmel Radyo Deneyimi")
      .setDescription("Aşağıdan istediğiniz radyoyu seçebilirsiniz!")
      .setColor("Blue")
      .setThumbnail("https://cdn.akakce.com/z/nns/nns-ns-8070bt-tasinabilir-nostaljik-bluetooth-hoparlor-usb.jpg");

    // Butonlar satırı
    const buttons1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("kralpop").setLabel(emoji.kbdTac + " Kral Pop").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("extra").setLabel(emoji.kbdZil + " Radyo Extra").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("alem").setLabel(emoji.kbdOyun + " Radyo alem").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("slowturk").setLabel(emoji.kbdOyun + " Slow Türk").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("turkiyemfm").setLabel(emoji.kbdOyun + " turkiyemfm").setStyle(ButtonStyle.Danger)
    );

    // Diğer buton satırları
    const buttons2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("show").setLabel(emoji.kbdOyun + " Show Radyo").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("turkuvaz").setLabel(emoji.kbdZil + " Radyo Turkuvaz").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("seymen").setLabel(emoji.kbdOyun + " Radyo Seymen").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ankara").setLabel(emoji.kbdServer + " Ankara Radyo").setStyle(ButtonStyle.Primary)
    );

    const buttons3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("kralfm").setLabel(emoji.kbdOyun + " Kral FM").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("turkfm").setLabel(emoji.kbdZil + " Türk FM").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("powerturk").setLabel(emoji.kbdZil + " Power Türk").setStyle(ButtonStyle.Primary)
    );

    const buttons4 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("efkar").setLabel(emoji.kbdOyun + " Efkar Radyo").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("durdur").setLabel(emoji.carpi + " Durdur").setStyle(ButtonStyle.Danger)
    );

    // Yanıtı zamanında gönderme
    try {
      await interaction.deferReply({ ephemeral: false });
      await interaction.editReply({ embeds: [embed], components: [buttons1, buttons2, buttons3, buttons4] });
    } catch (e) {
      console.error('Yanıt verme hatası:', e);
      return interaction.reply({ content: "Etkileşimde bir hata oluştu!", ephemeral: true });
    }

    // Etkileşim toplayıcı
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 900000 });

    collector.on('collect', async (i) => {
      try {
        // Etkileşimin önceden yanıtlanıp yanıtlanmadığını kontrol et
        if (i.replied || i.deferred || !i.isButton()) return;

        if (!i.member.voice.channel) {
          await i.reply({ content: "Bir sesli kanala katılmalısınız!", ephemeral: true }).catch((err) => {
            if (err.code !== 10062 && err.code !== 40060) console.error('Radyo reply hata:', err);
          });
          return;
        }

        const connection = joinVoiceChannel({
          channelId: i.member.voice.channel.id,
          guildId: i.guild.id,
          adapterCreator: i.guild.voiceAdapterCreator,
        });

        if (i.customId === "durdur") {
          const existingConnection = getVoiceConnection(i.guild.id);
          if (existingConnection) {
            existingConnection.destroy();
            await i.update({ content: emoji.kapal + " Radyo durduruldu.", components: [] }).catch((err) => {
              if (err.code !== 10062 && err.code !== 40060) console.error('Radyo update hata:', err);
            });
          }
          return;
        }

        const resource = createAudioResource(radioStations[i.customId], { inlineVolume: true });
        resource.volume.setVolume(1.0);
        const player = createAudioPlayer();
        player.play(resource);
        connection.subscribe(player);

        // Etkileşimi güncelle
        await i.update({ content: `${emoji.kbdZil} **Şu an çalan radyo:** ${i.customId}`, components: [buttons1, buttons2, buttons3, buttons4] }).catch((err) => {
          if (err.code !== 10062 && err.code !== 40060) console.error('Radyo update hata:', err);
        });
      } catch (e) {
        console.error('Etkileşimde bir hata oluştu:', e);
        try {
          await i.reply({ content: "Bir hata oluştu, lütfen tekrar deneyin.", ephemeral: true }).catch((err) => {
            if (err.code !== 10062 && err.code !== 40060) console.error('Radyo catch reply hata:', err);
          });
        } catch (err2) {
          if (err2.code !== 10062 && err2.code !== 40060) console.error('Radyo nested catch hata:', err2);
        }
      }
    });
  }
};
