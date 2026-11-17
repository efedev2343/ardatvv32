const emoji = require("../emoji.js");
const { EmbedBuilder, PermissionsBitField, AttachmentBuilder } = require("discord.js");
const db = require("croxydb");
const moment = require("moment");
require("moment-duration-format");
moment.locale("tr");
const { WelcomeLeave } = require("canvafy");

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    const guild = member.guild;
    const guildId = guild.id;

    try {
      /** =======================
       * HOŞGELDİN / DAVET / SAYAC
       * ======================= */
      const hgbb = db.get(`hgbb_${guildId}`);
      const sayacMessage = db.get(`sayacmessage_${guildId}`);
      const memberCount = guild.memberCount.toLocaleString();

      let inviter = null;
      let inviteCode = null;
      let totalInvites = 0;

      const guildMe = await guild.members.fetchMe();
      if (!guildMe.permissions.has(PermissionsBitField.Flags.ManageGuild)) return;

      const oldInvites = db.get(`invites_${guildId}`) || {};
      const newInvites = await guild.invites.fetch().catch(() => null);
      if (!newInvites) return;

      for (const [code, invite] of newInvites) {
        const oldUses = oldInvites[code]?.uses || 0;
        if (invite.uses > oldUses) {
          inviter = invite.inviter;
          inviteCode = code;
          break;
        }
      }

     
      const updatedInvites = {};
      newInvites.forEach((invite) => {
        updatedInvites[invite.code] = {
          uses: invite.uses,
          inviter: invite.inviter?.id,
        };
      });
      db.set(`invites_${guildId}`, updatedInvites);

      if (inviter) {
        totalInvites = [...newInvites.values()]
          .filter((i) => i.inviter?.id === inviter.id)
          .reduce((sum, i) => sum + (i.uses || 0), 0);
      }

      const channel = hgbb?.channel && guild.channels.cache.get(hgbb.channel);
      if (channel?.isTextBased()) {
        try {
          const welcomeImage = await new WelcomeLeave()
            .setAvatar(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setBackground("image", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2070&auto=format&fit=crop")
            .setTitle(emoji.kbdOyun + " Sunucuya Hoş Geldin!")
            .setDescription(`${member.user} sunucuya katıldı!\n\n${emoji.kbdUser} Sunucuda artık **${memberCount}** kişi var!`)
            .setBorder("#57F287")
            .setAvatarBorder("#57F287")
            .setOverlayOpacity(0.85)
            .build();

          const attachment = new AttachmentBuilder(welcomeImage, { name: "welcome.png" });
          await channel.send({ content: `${member.user}`, files: [attachment] });
        } catch (canvasErr) {
          console.error("Canvas welcome hatası:", canvasErr.message);
        }
      }

      /** ================
       * OTO TAG SİSTEMİ
       * ================ */
      const tag = db.get(`ototag_${guildId}`);
      if (tag) {
        try {
          const newNickname = `${tag} | ${member.displayName}`.substring(0, 32);
          await member.setNickname(newNickname);
        } catch (err) {
          console.error("Kullanıcı adı değiştirilirken hata oluştu:", err);
        }
      }

      /** ================
       * OTO ROL SİSTEMİ
       * ================ */
      const acc = member.user.bot ? db.get(`botrol_${guildId}`) : db.get(`otorol_${guildId}`);
      if (acc) {
        try {
          const role = member.guild.roles.cache.get(acc);
          const botMember = await member.guild.members.fetch(client.user.id);

          if (
            !role ||
            !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
            role.position >= botMember.roles.highest.position
          ) {
            console.log("Botun rol atama yetkisi yok veya rol pozisyonu uygun değil.");
          } else {
            await member.roles.add(role);

            const roleLogChannel = db.get(`roleLogChannel_${guildId}`);
            if (roleLogChannel) {
              const logChannel = member.guild.channels.cache.get(roleLogChannel);
              if (logChannel) {
                const embed = new EmbedBuilder()
                  .setTitle("Yeni Rol Eklendi! " + emoji.kbdKilit)
                  .setDescription(`**${member.user.tag}** adlı üyeye ${role} rolü verildi! ${emoji.kbdOyun}`)
                  .setColor("#FFD700")
                  .setFooter({
                    text: "Rol Verildi",
                    iconURL: member.user.displayAvatarURL({ dynamic: true }),
                  })
                  .setTimestamp();

                await logChannel.send({ embeds: [embed] });
              }
            }
          }
        } catch (err) {
          console.error("Rol eklenirken hata oluştu:", err);
        }
      }

      /** =======================
       * HESAP KORUMA SİSTEMİ
       * ======================= */
      const hesapKoruma1 = db.get(`hesapkoruma1_${guildId}`);
      const hesapkorumaSystem = db.get(`hesapkoruma_${guildId}`);
      if (hesapKoruma1 && hesapkorumaSystem) {
        const logChannel = member.guild.channels.cache.get(hesapKoruma1.channel);
        const isRisky = new Date().getTime() - member.user.createdAt.getTime() < 1296000000; // 15 gün
        if (isRisky) {
          try {
            await member.ban({ reason: "Yeni riskli hesap " + emoji.carpi });
            if (logChannel) {
              const embed = new EmbedBuilder()
                .setDescription(
                  `${emoji.kbdWarn}  | **${member.user.tag}**, Hesabı yeni olduğu için sunucudan yasaklandı! ${emoji.carpi}`
                )
                .setColor("#FEE75C")
                .setFooter({
                  text: member.user.tag,
                  iconURL: member.user.displayAvatarURL({ dynamic: true }),
                })
                .setTimestamp();

              await logChannel.send({ embeds: [embed] });
            }
          } catch (err) {
            console.error("Hesap koruma sırasında hata oluştu:", err);
          }
        }
      }

      /** ================
       * SAYAC SİSTEMİ
       * ================ */
      const sayac = db.get(`sayac_${guildId}`);
      if (sayac && sayac.sayi && sayac.kanal) {
        const kalan = sayac.sayi - guild.memberCount || 0;
        const kanal = client.channels.cache.get(sayac.kanal);
        if (kanal) {
          await kanal.send(
            `Hoşgeldin **${member.user.tag}**! Seninle beraber **${guild.memberCount}** kişi olduk! \n **${sayac.sayi}** kişiye ulaşmamıza sadece **${kalan}** kişi kaldı!`
          );
        }
      }
    } catch (error) {
      console.error("guildMemberAdd eventinde beklenmeyen hata:", error);
    }
  },
};
