const emoji = require("../emoji.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const db = require("croxydb");
const moment = require("moment");
require("moment-duration-format");
const { WelcomeLeave } = require("canvafy");

module.exports = {
    name: "guildMemberRemove",
    run: async (client, member) => {
        try {
         
            const hgbb1 = db.fetch(`hgbb1_${member.guild.id}`);
            if (!hgbb1 || !hgbb1.channel) {
                return;
            }
            
            const kanal = member.guild.channels.cache.get(hgbb1.channel);
            if (!kanal || !kanal.isTextBased()) {
                console.error(`Kanal bulunamadı veya metin kanalı değil: ${hgbb1.channel}`);
                return;
            }

            if (!kanal.permissionsFor(client.user).has(["SendMessages", "EmbedLinks"])) {
                console.error(`Botun kanalda mesaj gönderme yetkisi yok: ${kanal.id}`);
                return;
            }

         
            try {
              const leaveImage = await new WelcomeLeave()
                .setAvatar(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setBackground("image", "https://images.unsplash.com/photo-1544717297-fa65b98c6453?q=80&w=2070&auto=format&fit=crop")
                .setTitle(emoji.kbdOyun + " Sunucudan Ayrıldı!")
                .setDescription(`${member.user} sunucudan ayrıldı!\n\n${emoji.kbdUser} Sunucuda **${member.guild.memberCount}** kişi kaldı!`)
                .setBorder("#FF4D4D")
                .setAvatarBorder("#FF4D4D")
                .setOverlayOpacity(0.85)
                .build();

              const attachment = new AttachmentBuilder(leaveImage, { name: "leave.png" });
              await kanal.send({ 
                content: `${emoji.kbdOyun} ${member.user}`, 
                files: [attachment] 
              });
            } catch (canvasErr) {
              console.error("Canvas leave hatası:", canvasErr.message);
            }

        } catch (err) {
            console.error(`[MEMBER_LEAVE_ERROR] Sunucu: ${member.guild.id} - Üye: ${member.id} - Hata:`, err);
            
            
            const hgbb1 = db.fetch(`hgbb1_${member.guild.id}`);
            if (hgbb1?.channel) {
                const kanal = member.guild.channels.cache.get(hgbb1.channel);
                if (kanal && kanal.isTextBased()) {
                    await kanal.send({
                        content: `${emoji.kbdWarn} **${member.user.tag}** sunucudan ayrıldı, ancak ayrıntılı bilgi gösterilirken bir hata oluştu.`
                    }).catch(console.error);
                }
            }
        }
    }
};


client.on('guildMemberRemove', async member => {
  const sayac = db.fetch(`sayac_${member.guild.id}`);
  if (!sayac || !sayac.sayi || !sayac.kanal) return;

  const kalan = sayac.sayi - member.guild.memberCount || 0;
  const kanal = client.channels.cache.get(sayac.kanal);
  if (!kanal) return;

  try {
    await kanal.send(`Güle güle <@${member.id}>! Sensiz şimdi **${member.guild.memberCount}** kişiyiz... \n **${sayac.sayi}** kişiye ulaşmamıza **${kalan}** kişi kaldı!`);
  } catch (error) {
    console.error(`Mesaj gönderilemedi: ${error}`);
  }
});

