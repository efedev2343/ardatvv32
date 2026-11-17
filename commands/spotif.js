const emoji = require("../emoji.js");
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActivityType } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

module.exports = {
  name: 'spotify',
  description: 'Spotify bilgilerini özelleştirilmiş arka plan üzerine ekler.',
  type: 'command',
  options: [
    {
      name: 'üye',
      description: 'Spotify bilgilerini görüntülemek istediğiniz kullanıcıyı seçin.',
      type: 6, // USER type
      required: true
    },
    {
      name: 'ephemeral',
      description: 'Mesaj sadece size görünür olsun mu? (Varsayılan: false)',
      type: 5, // BOOLEAN type
      required: false
    }
  ],

  async run(client, interaction) {
    const isEphemeral = interaction.options.getBoolean('ephemeral') || false;

    await interaction.deferReply({ flags: isEphemeral ? 64 : 0 });

    const member = interaction.options.getMember('üye');
    const backgroundUrl = 'https://i.imgur.com/E0Eej6R.jpeg';

    if (!member || !member.presence || !member.presence.activities) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('> **Bu kullanıcı Spotify üzerinden şarkı dinlemiyor!**'),
        ],
      });
    }

    const spotifyActivity = member.presence.activities.find(
      activity => activity.name === 'Spotify' && activity.type === ActivityType.Listening
    );

    if (!spotifyActivity || !spotifyActivity.assets || !spotifyActivity.assets.largeImage) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('> **Bu kullanıcı Spotify üzerinden şarkı dinlemiyor!**'),
        ],
      });
    }

    try {
      // Spotify şarkı kapak görseli
      const spotifyImageKey = spotifyActivity.assets.largeImage.slice(8);
      const spotifyImageUrl = `https://i.scdn.co/image/${spotifyImageKey}`;

      // Spotify bilgileri
      const songTitle = spotifyActivity.details || 'Bilinmeyen Şarkı';
      const artistName = spotifyActivity.state || 'Bilinmeyen Sanatçı';
      const albumName = spotifyActivity.assets.largeText || 'Bilinmeyen Albüm';
      const startTime = new Date(spotifyActivity.timestamps.start);
      const endTime = new Date(spotifyActivity.timestamps.end);
      const duration = (endTime - startTime) / 1000; // saniye
      const currentTime = (Date.now() - startTime.getTime()) / 1000;

      // Arka plan ve Spotify kapak görsellerini yükle
      const background = await loadImage(backgroundUrl);
      const spotifyCover = await loadImage(spotifyImageUrl);

      // Canvas ayarları
      const canvas = createCanvas(1280, 720);
      const ctx = canvas.getContext('2d');

      // Arka plan resmi çiz
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

      // Spotify kapak resmi çiz
      const coverSize = 400;
      ctx.drawImage(spotifyCover, canvas.width / 2 - coverSize / 2, 50, coverSize, coverSize);

      // Yazılar için stil ayarları
      ctx.font = 'bold 50px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';

      // Şarkı ismi
      ctx.fillText(`${emoji.kbdOyun} Şarkı: ${songTitle}`, canvas.width / 2, 500);

      // Sanatçı ismi
      ctx.fillStyle = '#1DB954'; // Spotify yeşili
      ctx.fillText(`${emoji.kbdOyun} Sanatçı: ${artistName}`, canvas.width / 2, 570);

      // Albüm ismi
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${emoji.kbdNews} Albüm: ${albumName}`, canvas.width / 2, 640);

      // İlerleme çubuğu
      const progressBarWidth = 800;
      const progressBarHeight = 30;
      const progressBarX = canvas.width / 2 - progressBarWidth / 2;
      const progressBarY = 680;

      // Arka plan çubuğu
      ctx.fillStyle = '#555555';
      ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

      // İlerleme çubuğu doluluğu
      const progress = (currentTime / duration) * progressBarWidth;
      ctx.fillStyle = '#1DB954';
      ctx.fillRect(progressBarX, progressBarY, progress, progressBarHeight);

      // Süre bilgileri
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '30px Arial';
      ctx.fillText(
        `${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`,
        progressBarX - 50,
        progressBarY + progressBarHeight / 1.5
      );
      ctx.fillText(
        `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`,
        progressBarX + progressBarWidth + 50,
        progressBarY + progressBarHeight / 1.5
      );

      // Görseli Discord için dosya haline getir
      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: `spotify-${member.id}.png` });

      return interaction.followUp({ files: [attachment] });
    } catch (error) {
      console.error('Hata:', error);
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('> **Spotify bilgileri oluşturulurken bir hata oluştu.**'),
        ],
      });
    }
  },
};