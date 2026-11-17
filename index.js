const emoji = require("./emoji.js");
const Discord = require("discord.js");
const { EmbedBuilder, REST, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, GatewayIntentBits, Partials } = require("discord.js");
const fs = require("fs");
const db = require('croxydb');
const config = require('./config.json');
const { Routes } = require('discord-api-types/v10');
const { kontrolEt } = require("./utils/depremKontrol");
const fetch = require("node-fetch");
const axios = require('axios');

if (!config.token) {
  console.error("[x] Token bulunamadı. Lütfen config.json dosyasındaki token değerini kontrol edin.");
  process.exit(1);
}

const client = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
  ],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.User,
    Partials.Reaction
  ],
  allowedMentions: {
    parse: ["users", "roles", "everyone"]
  },
  retryLimit: 3
});

global.client = client;
client.commands = (global.commands = []);


const missingNameCommands = [];
const commandNames = new Set();
console.log(`[-] ${fs.readdirSync("./commands").length} komut algılandı.`);

for (let commandName of fs.readdirSync("./commands")) {
  if (!commandName.endsWith(".js")) continue;

  try {
    const command = require(`./commands/${commandName}`);

    if (!command.name) {
      missingNameCommands.push(commandName);
      continue;
    }

    if (commandNames.has(command.name.toLowerCase())) {
      console.error(`[x] Aynı ada sahip komut: ${command.name}`);
      continue;
    }

    commandNames.add(command.name.toLowerCase());

    client.commands.push({
      name: command.name.toLowerCase(),
      description: command.description ? command.description.toLowerCase() : 'Açıklama yok',
      options: command.options || [],
      dm_permission: false,
      type: 1,
      execute: command.run || command.execute,
      autocomplete: command.autocomplete
    });

    console.log(`[+] ${commandName} komutu başarıyla yüklendi.`);
  } catch (error) {
    console.error(`[x] ${commandName} komutu yüklenirken hata oluştu:`, error);
  }
}

if (missingNameCommands.length > 0) {
  console.error("[x] 'name' özelliği eksik olan komutlar:");
  console.error("```");
  missingNameCommands.forEach(command => console.error(command));
  console.error("```");
}


client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
  if (!newPresence || !newPresence.guild || !newPresence.user) return;

  const user = newPresence.user;
  const guild = newPresence.guild;
  const member = guild.members.cache.get(user.id);
  if (!member) return;

  
  const durumRol = db.get(`durumRol_${user.id}`);
  if (!durumRol) return;

  const { roleId, statusMessage } = durumRol;


  const customStatus = newPresence.activities.find(activity => activity.type === Discord.ActivityType.Custom);
  const role = guild.roles.cache.get(roleId);

  if (!role) {
    console.error(`[x] Rol bulunamadı: ${roleId}`);
    return;
  }

  if (customStatus && customStatus.state === statusMessage) {
    
    try {
      await member.roles.add(role);
      console.log(`${user.tag} kullanıcısına "${role.name}" rolü verildi.`);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setDescription(`${user}, "${statusMessage}" durumu için "${role.name}" rolünü aldı!`)
        .setFooter({ text: "Durum rolü otomatik olarak verildi." });

    
      await user.send({ embeds: [embed] }).catch(() => console.error(`[x] ${user.tag} kullanıcısına DM gönderilemedi.`));
    } catch (error) {
      console.error(`[x] ${user.tag} kullanıcısına rol verilirken hata:`, error);
    }
  } else {
   
    try {
      await member.roles.remove(role);
      console.log(`${user.tag} kullanıcısından "${role.name}" rolü alındı.`);
    } catch (error) {
      console.error(`[x] ${user.tag} kullanıcısından rol kaldırılırken hata:`, error);
    }
  }
});


client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.guild) return;


  if (msg.content === `<@${config["bot-id"]}>`) {
    await msg.reply('Birisi beni çağırdı sanırım! Komutlarıma </yardım:1341487008568311931> ile bakabilirsin.');
  }

  
  const prefixes = [
    ...(Array.isArray(config.prefixes) ? config.prefixes : []),
    config.prefix
  ].filter((p) => typeof p === "string" && p.length > 0);

  const matchedPrefix = [...new Set(prefixes)]
    .sort((a, b) => b.length - a.length)
    .find((p) => msg.content.startsWith(p));

  if (matchedPrefix) {
    const args = msg.content.slice(matchedPrefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();
    if (!command) return;

    const cmd = client.commands.find(cmd => cmd.name === command);
    if (cmd) {
      try {
        if (cmd.execute) await cmd.execute(msg, args);
        else if (cmd.run) await cmd.run(msg, args);
      } catch (error) {
        console.error(`[x] ${command} komutu çalıştırılırken hata:`, error);
        await msg.reply('Komut çalıştırılırken bir hata oluştu.');
      }
    } else {
      console.error(`[x] Komut bulunamadı: ${command}`);
    }
  }
});







console.log(`[-] ${fs.readdirSync("./events").length} olay algılandı.`);
for (let eventName of fs.readdirSync("./events")) {
  if (!eventName.endsWith(".js")) continue;

  try {
    const event = require(`./events/${eventName}`);
    const event_name = eventName.split(".")[0];

    client.on(event.name, (...args) => {
      event.run(client, ...args);
    });

    console.log(`[+] ${eventName} olayı başarıyla yüklendi.`);
  } catch (error) {
    console.error(`[x] ${eventName} olayı yüklenirken hata:`, error);
  }
}


client.once("ready", async () => {
  const rest = new REST({ version: '10' }).setToken(config.token);
  
  
  setInterval(() => kontrolEt(client), 60000);

  // Bot yeniden başladığında aktif çekilişleri tekrar başlat
  const cekilisCmd = require('./commands/cekilis');
  try {
    const allData = db.all();
    const aktifCekilisler = Object.entries(allData)
      .filter(([key]) => key.startsWith('cekilis_'))
      .map(([key, value]) => ({ msgId: key.split('_')[1], data: value }));

    for (const { msgId, data } of aktifCekilisler) {
      cekilisCmd.checkCekilisSuresi(client, msgId);
    }
    if (aktifCekilisler.length > 0) {
      console.log(`[+] ${aktifCekilisler.length} aktif çekiliş yeniden başlatıldı.`);
    }
  } catch (err) {
    console.error('[x] Aktif çekilişler yeniden başlatılırken hata:', err);
  }

  try {
    // Slash komutları global kaydet: bot hangi sunucuya eklenirse eklensin çalışır
    const commandBody = client.commands.map(({ execute, autocomplete, ...cmd }) => cmd);

    if (commandBody.length > 100) {
      console.warn(`[!] ${commandBody.length} komut var, Discord global limiti 100. Fazla komutlar kaydedilemeyebilir.`);
    }

    // PUT, tüm global komutları yenisiyle değiştirir (eski komutlar otomatik silinir)
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commandBody,
    });
    console.log(`[+] ${commandBody.length} slash komutu global olarak kaydedildi (tüm sunucular).`);

    // guildId doluysa o sunucuya da kaydet (komutlar anında görünsün diye)
    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, config.guildId), {
        body: commandBody,
      });
      console.log(`[+] ${commandBody.length} slash komutu ayrıca sunucuya (${config.guildId}) kaydedildi.`);
    }

    console.log(`${client.user.tag} Aktif! ${emoji.kbdOK}`); // Bot aktif olduğunda konsola basılır
    db.set("botAcilis_", Date.now());


  } catch (error) {
    console.error("[x] Bot hazır olurken bir hata oluştu:", error);
  }
});


client.login(config.token)
  .then(() => {
    console.log('[-] Discord API\'ye istek gönderiliyor.');
  })
  .catch((err) => {
    console.error('[x] Discord API\'ye istek gönderimi başarısız:', err);
    setTimeout(() => {
      console.log('[i] Yeniden bağlantı kuruluyor...');
      client.login(config.token).catch((err2) => {
        console.error('[x] Yeniden bağlantı başarısız:', err2.message);
      });
    }, 10000);
  });


client.on('guildCreate', async (guild) => {
  const defaultChannel = guild.systemChannel;
  if (defaultChannel) {
    const embed = new EmbedBuilder()
      .setColor('#e01444')
      .setTitle('Merhaba!')
      .setDescription("Beni sunucuna eklediğin için teşekkürler!\n'/' ön ekini kullanarak komutları çağırabilirsin.\n\nHerhangi bir kanala '/yardım' yazarak beni kullanmaya başlayabilirsin :)");
    await defaultChannel.send({ embeds: [embed] }).catch(console.error);
  }
});


// Hata log kanalı config'den; boşsa eski sabit kullanılır
const hataLogKanalID = config.log || "1363268284035891270";


async function komutCalistir(interaction, komutIsmi, komutFonksiyonu) {
  try {
    await komutFonksiyonu();
  } catch (err) {
    console.error(`Komut Hatası (${komutIsmi}):`, err);
    const kanal = interaction.client.channels.cache.get(hataLogKanalID);
    if (kanal && kanal.isTextBased()) {
      kanal.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(emoji.carpi + " Komut Hatası")
            .setColor("Red")
            .addFields(
              { name: "Komutu Kullanan", value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
              { name: "Komut", value: komutIsmi, inline: false },
              { name: "Sunucu", value: `${interaction.guild?.name || "DM"} (${interaction.guild?.id || "Yok"})`, inline: false }
            )
            .setDescription(`\`\`\`js\n${err.stack?.slice(0, 1900) || err.message}\n\`\`\``)
            .setTimestamp()
        ]
      }).catch(() => {});
    }
  }
}


process.on('uncaughtException', async (err) => {
  console.error('Yakalanmayan Hata:', err);
  const kanal = client.channels.cache.get(hataLogKanalID);
  if (kanal && kanal.isTextBased()) {
    kanal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(emoji.carpi + " Yakalanmayan Hata")
          .setColor("Red")
          .setDescription(`\`\`\`js\n${err.stack?.slice(0, 1900) || err.message}\n\`\`\``)
          .setTimestamp()
      ]
    }).catch(() => {});
  }
});

process.on('unhandledRejection', async (err) => {
  console.error('Yakalanmayan Promise Hatası:', err);
  const kanal = client.channels.cache.get(hataLogKanalID);
  if (kanal && kanal.isTextBased()) {
    kanal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(emoji.kbdWarn + " Yakalanmayan Promise Hatası")
          .setColor("Orange")
          .setDescription(`\`\`\`js\n${(err?.stack || err)?.toString().slice(0, 1900)}\n\`\`\``)
          .setTimestamp()
      ]
    }).catch(() => {});
  }
});

client.on('error', async (err) => {
  console.error('Discord.js Hatası:', err);
  const kanal = client.channels.cache.get(hataLogKanalID);
  if (kanal && kanal.isTextBased()) {
    kanal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(emoji.kbdWarn + " Discord.js Hatası")
          .setColor("DarkRed")
          .setDescription(`\`\`\`js\n${(err.stack || err.message || err).toString().slice(0, 1900)}\n\`\`\``)
          .setTimestamp()
      ]
    }).catch(() => {});
  }
});

client.on('warn', async (info) => {
  console.warn('Uyarı:', info);
  const kanal = client.channels.cache.get(hataLogKanalID);
  if (kanal && kanal.isTextBased()) {
    kanal.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(emoji.kbdWarn + " Uyarı")
          .setColor("Yellow")
          .setDescription(`\`\`\`\n${info.toString().slice(0, 1900)}\n\`\`\``)
          .setTimestamp()
      ]
    }).catch(() => {});
  }
});


  

  ////////////////////// LOG AYARLARI //////////////////////

   client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "kapat2") {
        const yetkii = new Discord.EmbedBuilder()
            .setTitle("Yetersiz Yetki!")
            .setDescription("Bu komutu kullanabilmek için `Yönetici` yetkisine ihtiyacın var!")
            .setColor("Red")

        const embed1 = new Discord.EmbedBuilder()
            .setTitle("Başarıyla Sıfırlandı!")
            .setDescription("Log sistemi başarıyla **sıfırlandı**!")
            .setColor("Green")

        if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ embeds: [yetkii], ephemeral: true })

        db.delete(`mesaj-log_${interaction.guild.id}`)
        db.delete(`kanal-log_${interaction.guild.id}`)
        db.delete(`rol-log_${interaction.guild.id}`)
        db.delete(`emoji-log_${interaction.guild.id}`)
        db.delete(`sunucu-log_${interaction.guild.id}`)
        db.delete(`gelen-giden-log_${interaction.guild.id}`)
        return interaction.reply({ embeds: [embed1], ephemeral: true })
    }
})

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "ayarlar2") {
        let mesajlog = db.get(`mesaj-log_${interaction.guild.id}`)
        let kanallog = db.get(`kanal-log_${interaction.guild.id}`)
        let rollog = db.get(`rol-log_${interaction.guild.id}`)
        let emojilog = db.get(`emoji-log_${interaction.guild.id}`)
        let sunuculog = db.get(`sunucu-log_${interaction.guild.id}`)
        let gelengidenlog = db.get(`gelen-giden-log_${interaction.guild.id}`)

        const mesaj = new Discord.EmbedBuilder()
            .setTitle("Log Sistem Ayarları")
            .addFields(
                { name: "**Mesaj Log Kanalı**", value: `<#${mesajlog || "Ayarlanmamış"}>`, inline: true },
                { name: "**Kanal Log Kanalı**", value: `<#${kanallog || "Ayarlanmamış"}>`, inline: true },
                { name: "**Rol Log Kanalı**", value: `<#${rollog || "Ayarlanmamış"}>`, inline: true },
                { name: "**Emoji Log Kanalı**", value: `<#${emojilog || "Ayarlanmamış"}>`, inline: true },
                { name: "**Sunucu Log Kanalı**", value: `<#${sunuculog || "Ayarlanmamış"}>`, inline: true },
                { name: "**gelen giden kanalı**", value: `<#${gelengidenlog || "Ayarlanmamış"}>`, inline: true },
            )
            .setColor("Yellow")

        const yetki = new Discord.EmbedBuilder()
            .setTitle("Yetersiz Yetki!")
            .setDescription("Bu komutu kullanabilmek için `Yönetici` yetkisine ihtiyacın var!")
            .setColor("Red")
        if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ embeds: [yetki], ephemeral: true });

        interaction.reply({ embeds: [mesaj], ephemeral: true })
    }
})


client.on('messageDelete', async (message) => {
    if (!message.author || message.author.bot) return;

    const mesajlog = db.get(`mesaj-log_${message.guild.id}`);
    if (!mesajlog) return console.log('Silme günlüğü bulunamadı');

    try {
        const logs = await message.guild.fetchAuditLogs({
            limit: 1,
            type: 72 
        });

        const entry = logs.entries.first();
        if (!entry) return;

        const { executor } = entry;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${message.author.username}#${message.author.discriminator}`, iconURL: message.author.displayAvatarURL() })
            .setDescription(`${message.channel} kanalında bir mesaj silindi.\nMesaj içeriği: \`${message.content}\`\nMesaj sahibi: ${message.author}\nSilen kişi: ${executor}`);

        client.channels.cache.get(mesajlog).send({ embeds: [embed] });
    } catch (error) {
        console.error('Audit log alınırken bir hata oluştu:', error);
    }
});
client.on(Discord.Events.GuildUpdate, async (oldGuild, newGuild) => {
    if (oldGuild.name === newGuild.name && oldGuild.region === newGuild.region && oldGuild.afkChannelID === newGuild.afkChannelID) {
        return; 
    }

    const sunucuLog = db.get(`sunucu-log_${newGuild.id}`);
    if (!sunucuLog) return;

    const embed = new Discord.MessageEmbed()
        .setTitle(`Sunucu Bilgileri Güncellendi`)
        .setColor('Blue')
        .setTimestamp();

    if (oldGuild.name !== newGuild.name) {
        embed.addField('Eski Sunucu Adı', oldGuild.name, true);
        embed.addField('Yeni Sunucu Adı', newGuild.name, true);
    }

    if (oldGuild.region !== newGuild.region) {
        embed.addField('Eski Sunucu Bölgesi', oldGuild.region, true);
        embed.addField('Yeni Sunucu Bölgesi', newGuild.region, true);
    }

    if (oldGuild.afkChannelID !== newGuild.afkChannelID) {
        const oldAfkChannel = oldGuild.afkChannel ? oldGuild.afkChannel.name : 'Yok';
        const newAfkChannel = newGuild.afkChannel ? newGuild.afkChannel.name : 'Yok';
        embed.addField('Eski AFK Kanalı', oldAfkChannel, true);
        embed.addField('Yeni AFK Kanalı', newAfkChannel, true);
    }

    client.channels.cache.get(sunucuLog).send({ embeds: [embed] });
});
client.on(Discord.Events.MessageUpdate, async (oldMessage, newMessage) => {
    if (!newMessage.author || newMessage.author.bot) return;

    const mesajlog = db.get(`mesaj-log_${newMessage.guild.id}`);
    if (!mesajlog) return;

    const embed = new EmbedBuilder()
        .setAuthor({ name: `${newMessage.author.username}#${newMessage.author.discriminator}`, iconURL: newMessage.author.displayAvatarURL() })
        .setDescription(`${newMessage.channel} kanalında bir mesaj güncellendi.\nEski Mesaj: \`${oldMessage.content}\`\nYeni Mesaj: \`${newMessage.content}\``);

    client.channels.cache.get(mesajlog).send({ embeds: [embed] });
});

client.on(Discord.Events.MessageBulkDelete, async (messages) => {
    if (!messages.first().author || messages.first().author.bot) return;

    const mesajlog = db.get(`mesaj-log_${messages.first().guild.id}`);
    if (!mesajlog) return;

    const embed = new EmbedBuilder()
        .setAuthor({ name: `Toplu Mesaj Silindi`, iconURL: messages.first().guild.iconURL() })
        .setDescription(`${messages.first().channel} kanalında mesaj silindi.\nSilinen Mesaj Sayısı: ${messages.size}`);

    client.channels.cache.get(mesajlog).send({ embeds: [embed] });
});

client.on(Discord.Events.ChannelCreate, async (channelLink) => {
    try {
        const kanallog = db.get(`kanal-log_${channelLink.guild.id}`);
        if (!kanallog) return;

        let logChannel = client.channels.cache.get(kanallog);

        if (!logChannel) {
            try {
                logChannel = await channelLink.guild.channels.fetch(kanallog);
            } catch (fetchError) {
                console.error(`Log kanalı bulunamadı veya erişilemedi: ${kanallog}`, fetchError);
                return;
            }
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Bir Kanal Açıldı`, iconURL: channelLink.guild.iconURL() })
            .setDescription(`${channelLink} kanalı oluşturuldu.\nKanalın idsi: \`${channelLink.id}\`\nKanalın türü: \`${channelLink.type.toString().replace("0", "Yazı Kanalı").replace("2", "Ses Kanalı").replace("4", "Kategori")}\``);

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Kanal oluşturma log gönderme hatası:', error);
    }
});

client.on(Discord.Events.ChannelDelete, async (channelLink) => {

    const kanallog = db.get(`kanal-log_${channelLink.guild.id}`)
    if(!kanallog) return;

    const embed = new EmbedBuilder()
    .setAuthor({ name: `Bir Kanal Silindi`, iconURL: channelLink.guild.iconURL()})
    .setDescription(`\`${channelLink.name}\` kanalı silindi.\nKanalın idsi: \`${channelLink.id}\`\nKanalın türü: \`${channelLink.type.toString().replace("0", "Yazı Kanalı").replace("2", "Ses Kanalı").replace("4", "Kategori")}\``)
    client.channels.cache.get(kanallog).send({ embeds: [embed] })
})

client.on(Discord.Events.ChannelUpdate, async (oldChannel, newChannel) => {
    try {
        const kanallog = db.get(`kanal-log_${newChannel.guild.id}`);
        if (!kanallog) return;

        let logChannel = client.channels.cache.get(kanallog);

        if (!logChannel) {
            try {
                logChannel = await newChannel.guild.channels.fetch(kanallog);
            } catch (fetchError) {
                console.error(`Log kanalı bulunamadı veya erişilemedi: ${kanallog}`);
                return;
            }
        }

        const changedProperties = [];

        if (oldChannel.name !== newChannel.name) {
            changedProperties.push(`İsim: \`${oldChannel.name}\` => \`${newChannel.name}\``);
        }

        if (oldChannel.type !== newChannel.type) {
            const getChannelType = (type) => {
                return type.toString().replace("0", "Yazı Kanalı").replace("2", "Ses Kanalı").replace("4", "Kategori");
            };
            changedProperties.push(`Tür: \`${getChannelType(oldChannel.type)}\` => \`${getChannelType(newChannel.type)}\``);
        }

        

        if (changedProperties.length === 0) {
            return; 
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Bir Kanal Güncellendi`, iconURL: newChannel.guild.iconURL() })
            .setDescription(`${newChannel} kanalı güncellendi.\nKanalın ID'si: \`${newChannel.id}\`\n\nDeğişiklikler:\n${changedProperties.join('\n')}`);

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Kanal güncelleme log gönderme hatası:');
    }
});

client.on(Discord.Events.ChannelPinsUpdate, async (channelLink, channelPins) => {

    const kanallog = db.get(`kanal-log_${channelLink.guild.id}`)
    if(!kanallog) return;

    const embed = new EmbedBuilder()
    .setAuthor({ name: `Bir Mesaj Sabitlendi`, iconURL: channelLink.guild.iconURL()})
    .setDescription(`${channelLink} kanalında [Bu Mesaj](https://discord.com/channels/1067022779481870357/1068817883381108837/${channelPins}) sabitlendi.`)
    client.channels.cache.get(kanallog).send({ embeds: [embed] })
})

client.on(Discord.Events.GuildRoleCreate, async (roleMention) => {

    const rollog = db.get(`rol-log_${roleMention.guild.id}`)
    if(!rollog) return;

    const embed = new EmbedBuilder()
    .setAuthor({ name: `Bir Rol Oluşturuldu`, iconURL: roleMention.guild.iconURL()})
    .setDescription(`${roleMention} rolü oluşturuldu.\nRolün idsi: ${roleMention.id}\nRolün hex kodu: ${roleMention.hexColor}`)
    client.channels.cache.get(rollog).send({ embeds: [embed] })
})

client.on(Discord.Events.GuildRoleDelete, async (roleMention) => {

    const rollog = db.get(`rol-log_${roleMention.guild.id}`)
    if(!rollog) return;

    const embed = new EmbedBuilder()
    .setAuthor({ name: `Bir Rol Silindi`, iconURL: roleMention.guild.iconURL()})
    .setDescription(`\`${roleMention.name}\` rolü silindi.\nRolün idsi: ${roleMention.id}\nRolün hex kodu: ${roleMention.hexColor}`)
    client.channels.cache.get(rollog).send({ embeds: [embed] })
})

client.on(Discord.Events.GuildRoleUpdate, async (roleMention, role) => {

    const rollog = db.get(`rol-log_${roleMention.guild.id}`)
    if(!rollog) return;

    const embed = new EmbedBuilder()
    .setAuthor({ name: `Bir Rol Güncellendi`, iconURL: roleMention.guild.iconURL()})
    .setDescription(`\`${roleMention.name}\` rolü ${role} olarak güncellendi.\nRolün idsi: ${roleMention.id}\nRolün eski hex kodu: ${roleMention.hexColor}`)
    client.channels.cache.get(rollog).send({ embeds: [embed] })
})

client.on(Discord.Events.GuildEmojiCreate, async (formatEmoji) => {

    const emojilog = db.get(`emoji-log_${formatEmoji.guild.id}`)
    if(!emojilog) return;

    const embed = new EmbedBuilder()
    .setAuthor({ name: `Bir Emoji Oluşturuldu`, iconURL: formatEmoji.guild.iconURL()})
    .setDescription(`${formatEmoji} emojisi oluşturuldu.\nEmoji adı: \`${formatEmoji.name}\`\nEmoji türü: ${formatEmoji.animated.toString().replace("true","`Hareketli`").replace("false","`Hareketsiz`")}`)
    client.channels.cache.get(emojilog).send({ embeds: [embed] })
})

client.on(Discord.Events.GuildEmojiDelete, async (formatEmoji) => {

    const emojilog = db.get(`emoji-log_${formatEmoji.guild.id}`)
    if(!emojilog) return;

    const embed = new EmbedBuilder()
    .setAuthor({ name: `Bir Emoji Silindi`, iconURL: formatEmoji.guild.iconURL()})
    .setDescription(`\`${formatEmoji.name}\` emojisi silindi.\nEmoji türü: ${formatEmoji.animated.toString().replace("true","`Hareketli`").replace("false","`Hareketsiz`")}`)
    client.channels.cache.get(emojilog).send({ embeds: [embed] })
})

client.on(Discord.Events.GuildEmojiUpdate, async (formatEmoji, emoji) => {

    const emojilog = db.get(`emoji-log_${formatEmoji.guild.id}`)
    if(!emojilog) return;

    const embed = new EmbedBuilder()
    .setAuthor({ name: `Bir Emoji Güncellendi`, iconURL: formatEmoji.guild.iconURL()})
    .setDescription(`${formatEmoji} emojisinin adı \`${emoji.name}\` olarak değiştirildi.\nEmojinin eski adı: \`${formatEmoji.name}\``)
    client.channels.cache.get(emojilog).send({ embeds: [embed] })
})

client.on(Discord.Events.GuildBanAdd, async (user) => {

    const cezaLog = db.get(`ceza-log_${user.guild.id}`)
    if(!cezaLog) return;

    const embed = new EmbedBuilder()
    .setAuthor({ name: `Bir Kullanıcı Banlandı`, iconURL: user.user.displayAvatarURL()})
    .setDescription(`Banlanan kişi: <@${user.user.id}> (\`${user.user.id}\` - \`${user.user.username}#${user.user.discriminator}\`)`)
    client.channels.cache.get(cezaLog).send({ embeds: [embed] })
})

client.on(Discord.Events.GuildBanRemove, async (user) => {

    const banlog = db.get(`ban-log_${user.guild.id}`)
    if(!banlog) return;

    const embed = new EmbedBuilder()
    .setAuthor({ name: `Bir Kullanıcının Banı Açıldı`, iconURL: user.user.displayAvatarURL()})
    .setDescription(`Banı açılan kişi: <@${user.user.id}> (\`${user.user.id}\` - \`${user.user.username}#${user.user.discriminator}\`)`)
    client.channels.cache.get(cezaLog).send({ embeds: [embed] })
})
client.on(Discord.Events.GuildMemberUpdate, async (oldMember, newMember) => {
    if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
        const cezaLog = db.get(`ceza-log_${newMember.guild.id}`);
        if (!cezaLog) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Bir Kullanıcı Zaman Aşımı Aldı`, iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`Zaman aşımı alan kişi: <@${newMember.user.id}> (\`${newMember.user.id}\` - \`${newMember.user.username}#${newMember.user.discriminator}\`)`)
            .addFields({ name: 'Süre', value: `${newMember.communicationDisabledUntil}` });

        client.channels.cache.get(cezaLog).send({ embeds: [embed] });
    }

    if (oldMember.communicationDisabledUntil && !newMember.communicationDisabledUntil) {
        const cezaLog = db.get(`ceza-log_${newMember.guild.id}`);
        if (!cezaLog) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Bir Kullanıcının Zaman Aşımı Kaldırıldı`, iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`Zaman aşımı kaldırılan kişi: <@${newMember.user.id}> (\`${newMember.user.id}\` - \`${newMember.user.username}#${newMember.user.discriminator}\`)`);

        client.channels.cache.get(cezaLog).send({ embeds: [embed] });
    }
});

client.on(Discord.Events.GuildMemberAdd, async (member) => {
    const gelengidenlog = db.get(`gelen-giden-log_${member.guild.id}`);
    
    if(!gelengidenlog) return;
    
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Sunucuya Bir Kullanıcı Katıldı`, iconURL: member.user.displayAvatarURL()})
        .setDescription(`Sunucuya katılan kişi: <@${member.user.id}> (\`${member.user.id}\` - \`${member.user.username}#${member.user.discriminator}\`)`);
    
    client.channels.cache.get(gelengidenlog).send({ embeds: [embed] });
});

client.on(Discord.Events.VoiceStateUpdate, async (oldState, newState) => {
    const sesLog = db.get(`ses-log_${newState.guild.id}`);
    if (!sesLog) return;

    const user = newState.member.user;
    let embed;

    if (!oldState.channelId && newState.channelId) {
        db.set(`voiceJoin_${user.id}`, Date.now());

        embed = new EmbedBuilder()
            .setAuthor({ name: `Bir Kullanıcı Ses Kanalına Katıldı`, iconURL: user.displayAvatarURL() })
            .setDescription(`Ses kanalına katılan kişi: <@${user.id}> (\`${user.id}\` - \`${user.username}#${user.discriminator}\`)\nKatıldığı kanal: \`${newState.channel.name}\``);
    }

    else if (oldState.channelId && !newState.channelId) {
        const joinTime = db.get(`voiceJoin_${user.id}`);
        const duration = joinTime ? Date.now() - joinTime : 0;
        const durationString = msToTime(duration);

        db.delete(`voiceJoin_${user.id}`);

        embed = new EmbedBuilder()
            .setAuthor({ name: `Bir Kullanıcı Ses Kanalından Ayrıldı`, iconURL: user.displayAvatarURL() })
            .setDescription(`Ses kanalından ayrılan kişi: <@${user.id}> (\`${user.id}\` - \`${user.username}#${user.discriminator}\`)\nAyrıldığı kanal: \`${oldState.channel.name}\`\nBulunduğu süre: ${durationString}`);
    }

    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        embed = new EmbedBuilder()
            .setAuthor({ name: `Bir Kullanıcı Başka Bir Ses Kanalına Taşındı`, iconURL: user.displayAvatarURL() })
            .setDescription(`Kullanıcı: <@${user.id}> (\`${user.id}\` - \`${user.username}#${user.discriminator}\`)\nEski kanal: \`${oldState.channel.name}\`\nYeni kanal: \`${newState.channel.name}\``);
    }

    else if (!oldState.serverMute && newState.serverMute) {
        embed = new EmbedBuilder()
            .setAuthor({ name: `Bir Kullanıcı Ses Kanalında Susturuldu`, iconURL: user.displayAvatarURL() })
            .setDescription(`Ses kanalında susturulan kişi: <@${user.id}> (\`${user.id}\` - \`${user.username}#${user.discriminator}\`)\nBulunduğu kanal: \`${newState.channel.name}\``);
    }

    else if (oldState.serverMute && !newState.serverMute) {
        embed = new EmbedBuilder()
            .setAuthor({ name: `Bir Kullanıcının Ses Kanalındaki Susturulması Kaldırıldı`, iconURL: user.displayAvatarURL() })
            .setDescription(`Ses kanalında susturulması kaldırılan kişi: <@${user.id}> (\`${user.id}\` - \`${user.username}#${user.discriminator}\`)\nBulunduğu kanal: \`${newState.channel.name}\``);
    }
    if (!oldState.serverDeaf && newState.serverDeaf) {
        embed = new EmbedBuilder()
            .setAuthor({ name: `Bir Kullanıcı Ses Kanalında Sağırlaştırıldı`, iconURL: user.displayAvatarURL() })
            .setDescription(`Ses kanalında sağırlaştırılan kişi: <@${user.id}> (\`${user.id}\` - \`${user.username}#${user.discriminator}\`)\nBulunduğu kanal: \`${newState.channel.name}\``);
    }

    else if (oldState.serverDeaf && !newState.serverDeaf) {
        embed = new EmbedBuilder()
            .setAuthor({ name: `Bir Kullanıcının Ses Kanalındaki Sağırlaştırması Kaldırıldı`, iconURL: user.displayAvatarURL() })
            .setDescription(`Ses kanalındaki sağırlaştırması kaldırılan kişi: <@${user.id}> (\`${user.id}\` - \`${user.username}#${user.discriminator}\`)\nBulunduğu kanal: \`${newState.channel.name}\``);
    }
    if (embed) {
        client.channels.cache.get(sesLog).send({ embeds: [embed] });
    }
});

function msToTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    return `${days} gün, ${hours} saat, ${minutes} dakika, ${seconds} saniye`;
}
client.on(Discord.Events.GuildMemberRemove, async (member) => {
    const gelengidenlog = db.get(`gelen-giden-log_${member.guild.id}`);
    if (!gelengidenlog) return;

    const embed = new EmbedBuilder()
        .setAuthor({ name: `Sunucudan Bir Kullanıcı Ayrıldı`, iconURL: member.user.displayAvatarURL() })
        .setDescription(`Sunucudan ayrılan kişi: <@${member.user.id}> (\`${member.user.id}\` - \`${member.user.username}#${member.user.discriminator}\`)`);

    client.channels.cache.get(gelengidenlog).send({ embeds: [embed] });
});
client.on(Discord.Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const rollog = db.get(`rol-log_${newMember.guild.id}`);
    if (!rollog) return;

    const oldRoles = oldMember.roles.cache.map(role => role.id);
    const newRoles = newMember.roles.cache.map(role => role.id);

    const addedRoles = newRoles.filter(role => !oldRoles.includes(role));
    const removedRoles = oldRoles.filter(role => !newRoles.includes(role));

    const executor = await getExecutor(oldMember, newMember);
    
    if (addedRoles.length > 0) {
        const addedRolesInfo = addedRoles.map(roleId => {
            const role = newMember.guild.roles.cache.get(roleId);
            return `${role.name} (\`${role.id}\`)`;
        }).join(", ");

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Rol Eklendi`, iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`Kullanıcıya roller eklendi:\n${addedRolesInfo}\nKullanıcı: <@${newMember.user.id}> (\`${newMember.user.id}\` - \`${newMember.user.username}#${newMember.user.discriminator}\`)\nYetkili: ${executor}`);

        client.channels.cache.get(rollog).send({ embeds: [embed] });
    }

    if (removedRoles.length > 0) {
        const removedRolesInfo = removedRoles.map(roleId => {
            const role = newMember.guild.roles.cache.get(roleId);
            return `${role.name} (\`${role.id}\`)`;
        }).join(", ");

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Rol Kaldırıldı`, iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`Kullanıcıdan roller kaldırıldı:\n${removedRolesInfo}\nKullanıcı: <@${newMember.user.id}> (\`${newMember.user.id}\` - \`${newMember.user.username}#${newMember.user.discriminator}\`)\nYetkili: ${executor}`);

        client.channels.cache.get(rollog).send({ embeds: [embed] });
    }
});

async function getExecutor(oldMember, newMember) {
    const logs = await newMember.guild.fetchAuditLogs({
        type: 72
    });

    const entry = logs.entries.first();
    if (!entry) return "Bilinmiyor";

    return `<@${entry.executor.id}> (\`${entry.executor.id}\` - \`${entry.executor.username}#${entry.executor.discriminator}\`)`;
}


