const { Client, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const emoji = require("../emoji.js");
const config = require("../config.json");
const guvenliURL = (v) => (typeof v === "string" && /^https?:\/\/[^\s]+$/i.test(v.trim()) ? v.trim() : null);

module.exports = {
  name: "yardım",
  description: "Yardım Menüsü",
  type: 1,
  options: [],

  run: async (client, interaction) => {
    try {
      await interaction.deferReply({ ephemeral: false });

      const commands = Array.from(client.commands.values());

      const baseEmbed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("Yardım Menüsü")
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setDescription(`
        **Merhaba ${interaction.user.username}!** 
        
        Aşağıdan bir kategori seçerek botun tüm özelliklerini keşfedebilirsiniz.
        Her kategori, ilgili komutlar hakkında detaylı bilgi ve kullanım örnekleri içerir.
        
        **Bot İstatistikleri:**
        > ${emoji.kbdCommands} **Komut Sayısı:** ${commands.length}
        > ${emoji.kbdPing} **Ping:** ${client.ws.ping}ms
        > ${emoji.kbdUptime} **Çalışma Süresi:** ${formatUptime(process.uptime())}
        `)
        .setFooter({
          text: `${client.user.username} • v2.1.0`,
          iconURL: client.user.displayAvatarURL(),
        })
        .setTimestamp();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`yardım_menu_${interaction.id}`)
        .setPlaceholder("Bir kategori seçin...")
        .addOptions([
          {
            label: "Ana Menü",
            value: "anamenü",
            description: "Ana menüye geri dön",
          },
          {
            label: "Moderasyon",
            value: "moderasyon",
            emoji: emoji.admin,
            description: "Sunucu yönetim araçları",
          },
          {
            label: "Kullanıcı",
            value: "kullanıcı",
            emoji: emoji.kbdUser,
            description: "Kullanıcı komutları",
          },
          {
            label: "Eğlence",
            value: "eglence",
            emoji: emoji.kbdOyun,
            description: "Eğlenceli komutlar",
          },
          {
            label: "Sunucu",
            value: "sunucu",
            emoji: emoji.kbdAyarlar,
            description: "Sunucu yönetimi",
          },
          {
            label: "Bot",
            value: "bot",
            emoji: emoji.kbdBot2,
            description: "Bot kontrol komutları",
          },
          {
            label: "Yetkili",
            value: "yetkili",
            emoji: emoji.kbdCalisma,
            description: "Yetkili komutları",
          },
        ]);

      const rowMenu = new ActionRowBuilder().addComponents(selectMenu);

      // "yok" / boş / geçersiz linkler buton eklenmeden önce elenir
      const buttonComponents = [];
      const linkButtons = [
        { label: "Davet Et", url: guvenliURL(config["bot-davet"]), emoji: emoji.kbdDavet },
        { label: "Website", url: guvenliURL(config["website"]), emoji: emoji.kbdWebsite },
        { label: "Destek", url: guvenliURL(config["desteksunucu"]), emoji: emoji.kbdDestek },
      ];
      for (const link of linkButtons) {
        if (link.url) {
          buttonComponents.push(
            new ButtonBuilder()
              .setLabel(link.label)
              .setStyle(ButtonStyle.Link)
              .setURL(link.url)
              .setEmoji(link.emoji)
          );
        }
      }
      buttonComponents.push(
        new ButtonBuilder()
          .setLabel("Komut Listesi")
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(`komut_listesi_${interaction.id}`)
          .setEmoji(emoji.kbdCommands)
      );

      const buttons = new ActionRowBuilder().addComponents(buttonComponents);

      const message = await interaction.followUp({
        embeds: [baseEmbed],
        components: [rowMenu, buttons],
        ephemeral: false,
        fetchReply: true,
      });

      const collector = message.createMessageComponentCollector({
        time: 15 * 60 * 1000, // 15 dakika
      });

      collector.on("collect", async (i) => {
        try {
          if (!i.isRepliable()) return;
          if (!i.customId.includes(interaction.id)) return;

          // Token süresi (15 dk) dolmuş eski etkileşimlerde sessizce çık
          if (Date.now() - i.createdTimestamp > 15 * 60 * 1000) return;

          if (i.user.id !== interaction.user.id) {
            return await safeReply(i, () =>
              i.reply({
                content: "Bu menüyü sadece komutu kullanan kişi kullanabilir!",
                ephemeral: true,
              })
            );
          }

          if (i.isStringSelectMenu()) {
            // Önce onayla, sonra hazırla (3 saniyelik token süresi aşılmasın)
            await safeReply(i, () => i.deferUpdate());
            const kategori = i.values[0];
            const commands = Array.from(client.commands.values());

            const kategoriler = {
              anamenü: {
                title: "Ana Menü",
                description: `
                **Merhaba ${i.user.username}!** 
                
                Aşağıdaki menüden bir kategori seçerek botun tüm özelliklerini keşfedebilirsiniz.
                Her kategori, ilgili komutlar hakkında detaylı bilgi ve kullanım örnekleri içerir.
                
                📊 **Bot İstatistikleri:**
                > ${emoji.kbdCommands} **Komut Sayısı:** ${commands.length}
                > ${emoji.kbdPing} **Ping:** ${client.ws.ping}ms
                > ${emoji.kbdUptime} **Çalışma Süresi:** ${formatUptime(process.uptime())}
                `,
                color: "#5865F2",
              },
              moderasyon: {
                title: `${emoji.admin} Moderasyon Komutları`,
                description: `
                **Sunucu yönetimi için güçlü moderasyon araçları:**
                
                ${commands
                  .filter(
                    (cmd) =>
                      cmd.description.includes("moderasyon") ||
                      cmd.name.includes("ban") ||
                      cmd.name.includes("kick") ||
                      cmd.name.includes("mute") ||
                      cmd.name.includes("temizle")
                  )
                  .map((cmd) => `\`/${cmd.name}\` - ${cmd.description}`)
                  .join("\n")}
                
                **Kullanım Örneği:**  
                \`/ban kullanıcı: @HatalıKullanıcı sebep: "Kuralları ihlal"\`
                `,
                color: "#ED4245",
              },
              kullanıcı: {
                title: `${emoji.kbdUser} Kullanıcı Komutları`,
                description: `
                **Kullanıcılar için faydalı araçlar:**
                
                ${commands
                  .filter(
                    (cmd) =>
                      cmd.description.includes("kullanıcı") ||
                      cmd.name.includes("avatar") ||
                      cmd.name.includes("bilgi") ||
                      cmd.name.includes("ping") ||
                      cmd.name.includes("yetkilerim")
                  )
                  .map((cmd) => `\`/${cmd.name}\` - ${cmd.description}`)
                  .join("\n")}
                
                **Kullanım Örneği:**  
                \`/avatar kullanıcı: @Kullanıcı\`
                `,
                color: "#57F287",
              },
              eglence: {
                title: `${emoji.kbdOyun} Eğlence Komutları`,
                description: `
                **Eğlenceli vakit geçirmeniz için komutlar:**
                
                ${commands
                  .filter(
                    (cmd) =>
                      cmd.description.includes("eğlence") ||
                      cmd.description.includes("oyun") ||
                      cmd.name.includes("şaka") ||
                      cmd.name.includes("aşk-ölçer")
                  )
                  .map((cmd) => `\`/${cmd.name}\` - ${cmd.description}`)
                  .join("\n")}
                
                **Kullanım Örneği:**  
                \`/aşk-ölçer kullanıcı1: @Kullanıcı1 kullanıcı2: @Kullanıcı2\`
                `,
                color: "#FEE75C",
              },
              sunucu: {
                title: `${emoji.kbdAyarlar} Sunucu Yönetimi`,
                description: `
                **Sunucunuzu yönetmek için araçlar:**
                
                ${commands
                  .filter(
                    (cmd) =>
                      cmd.description.includes("sunucu") ||
                      cmd.name.includes("sunucu") ||
                      cmd.name.includes("kanal") ||
                      cmd.name.includes("rol")
                  )
                  .map((cmd) => `\`/${cmd.name}\` - ${cmd.description}`)
                  .join("\n")}
                
                **Kullanım Örneği:**  
                \`/sunucu-kur kategori: "Temel Kanalar" kanallar: "genel, sohbet, kurallar"\`
                `,
                color: "#EB459E",
              },
              bot: {
                title: `${emoji.kbdBot2} Bot Komutları`,
                description: `
                **Bot kontrol ve bilgi komutları:**
                
                ${commands
                  .filter(
                    (cmd) =>
                      cmd.description.includes("bot") ||
                      cmd.name.includes("yardım") ||
                      cmd.name.includes("istatistik") ||
                      cmd.name.includes("davet")
                  )
                  .map((cmd) => `\`/${cmd.name}\` - ${cmd.description}`)
                  .join("\n")}
                
                **Kullanım Örneği:**  
                \`/yardım\`
                `,
                color: "#5865F2",
              },
              yetkili: {
                title: `${emoji.kbdCalisma} Yetkili Komutları`,
                description: `
                **Sadece yetkililer için özel komutlar:**
                
                ${commands
                  .filter(
                    (cmd) =>
                      cmd.description.includes("yetkili") ||
                      cmd.name.includes("bakım") ||
                      cmd.name.includes("komut-yükle")
                  )
                  .map((cmd) => `\`/${cmd.name}\` - ${cmd.description}`)
                  .join("\n")}
                `,
                color: "#FF0000",
              },
            };

            const secilenKategori = kategoriler[kategori] || kategoriler.anamenü;

            const kategoriEmbed = new EmbedBuilder()
              .setColor(secilenKategori.color)
              .setTitle(secilenKategori.title)
              .setDescription(secilenKategori.description)
              .setThumbnail(client.user.displayAvatarURL())
              .setFooter({
                text: `${client.user.username} • Sayfa: ${
                  Object.keys(kategoriler).indexOf(kategori) + 1
                }/${Object.keys(kategoriler).length}`,
                iconURL: client.user.displayAvatarURL(),
              })
              .setTimestamp();

            await safeReply(i, () =>
              i.editReply({
                embeds: [kategoriEmbed],
                components: i.message.components,
              })
            );
          } else if (i.isButton()) {
            await safeReply(i, () => i.deferReply({ ephemeral: true }));
            const commands = Array.from(client.commands.values());

            // Tüm komutları listelemek için
            const komutListesi = commands
              .map((cmd) => `**/${cmd.name}** - ${cmd.description}`)
              .join("\n");

            const embeds = [];
            let currentDescription = "";
            let partIndex = 1;

            const komutArray = komutListesi.split("\n");
            for (const komut of komutArray) {
              if (currentDescription.length + komut.length + 1 <= 4096) {
                currentDescription += komut + "\n";
              } else {
                if (currentDescription) {
                  const embed = new EmbedBuilder()
                    .setTitle(`Tüm Komutlar - Bölüm ${partIndex}`)
                    .setDescription(currentDescription)
                    .setColor("#5865F2")
                    .setThumbnail(client.user.displayAvatarURL())
                    .setFooter({
                      text: `${client.user.username} • v2.1.0`,
                      iconURL: client.user.displayAvatarURL(),
                    })
                    .setTimestamp();
                  embeds.push(embed);
                  currentDescription = komut + "\n";
                  partIndex++;
                }
              }
            }

           
            if (currentDescription) {
              const embed = new EmbedBuilder()
                .setTitle(`Tüm Komutlar - Bölüm ${partIndex}`)
                .setDescription(currentDescription)
                .setColor("#5865F2")
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({
                  text: `${client.user.username} • v2.1.0`,
                  iconURL: client.user.displayAvatarURL(),
                })
                .setTimestamp();
              embeds.push(embed);
            }

            await safeReply(i, () => i.editReply({ embeds }));
          }
        } catch (err) {
          if (![10062, 40060, 10008].includes(err.code)) {
            console.error("Collector interaction işlenirken hata:", err);
          }
        }
      });

      collector.on("end", async () => {
        try {
          // Mesajın hala var olup olmadığını ve düzenlenebilir olup olmadığını kontrol et
          const channel = await client.channels.fetch(message.channelId).catch(() => null);
          if (!channel) {
            console.warn("Kanal bulunamadı, menü devre dışı bırakılamadı.");
            return;
          }

          const fetchedMessage = await channel.messages.fetch(message.id).catch(() => null);
          if (!fetchedMessage) {
            console.warn("Mesaj bulunamadı, menü devre dışı bırakılamadı.");
            return;
          }

          const disabledMenu = new StringSelectMenuBuilder()
            .setCustomId(`yardım_menu_${interaction.id}_disabled`)
            .setPlaceholder("Menü süresi doldu...")
            .setDisabled(true)
            .addOptions([{ label: "Süre Doldu", value: "disabled" }]);

          // Link butonlar devre dışı bırakılamaz (Discord kuralı), sadece diğerlerini kapat
          const disabledButtons = new ActionRowBuilder().addComponents(
            buttons.components
              .filter((btn) => btn.data.style !== ButtonStyle.Link)
              .map((btn) => ButtonBuilder.from(btn).setDisabled(true))
          );

          await fetchedMessage.edit({
            components: [
              new ActionRowBuilder().addComponents(disabledMenu),
              disabledButtons,
            ],
          });
        } catch (err) {
          console.error("Collector kapatma hatası:", err);
          // Mesaj silinmiş olabilir, hata bastırılır
        }
      });
    } catch (err) {
      if (![10062, 40060, 10008].includes(err.code)) {
        console.error("Yardım komutu çalıştırılırken hata:", err);
      }
      const hataMesaji = {
        content: "Bir hata oluştu, lütfen tekrar deneyin.",
        ephemeral: true,
      };
      if (!interaction.replied && !interaction.deferred) {
        await safeReply(interaction, () => interaction.reply(hataMesaji));
      } else if (interaction.deferred) {
        await safeReply(interaction, () => interaction.followUp(hataMesaji));
      }
    }
  },
};

// Süresi dolmuş / zaten yanıtlanmış interaction hatalarını (10062, 40060, 10008) bastırır
async function safeReply(interaction, fn) {
  try {
    return await fn();
  } catch (err) {
    if ([10062, 40060, 10008].includes(err.code)) return null;
    throw err;
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  seconds %= 3600 * 24;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}g ${hours}s ${minutes}d ${secs}sn`;
}