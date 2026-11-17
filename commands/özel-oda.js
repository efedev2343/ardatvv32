const emoji = require("../emoji.js");
const { PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder,UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const db = require("croxydb");
const config = require('../config.json');

function cleanupPrivateRoom(userId, channelId) {
  db.delete(`privateRoom_${userId}`);
  db.delete(`privateRoom_${channelId}`);
}

module.exports = {
  name: "özel-oda",
  description: "Özel oda sistemini başlatır.",
  options: [
    {
      name: "kategori",
      description: "Özel odaların oluşturulacağı kategori",
      type: 7,
      required: true,
      channel_types: [4]
    }
  ],
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!", ephemeral: true });
    }
    const category = interaction.options.getChannel("kategori");
    
    if (category.type !== ChannelType.GuildCategory) {
      return interaction.reply({ content: "Lütfen geçerli bir kategori seçin!", ephemeral: true });
    }

    db.set(`privateRoomCategory_${interaction.guildId}`, category.id);

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(emoji.kbdOyun + " Özel Oda Sistemi")
      .setDescription(`Özel odanızı oluşturmak için aşağıdaki butona tıklayın.\nOdalar "${category.name}" kategorisi altında oluşturulacak.`)
      .setFooter({ text: "Özel odanızı oluşturun ve yönetin!" });

    const button = new ButtonBuilder()
      .setCustomId("private_room_create")
      .setLabel("Özel Oda Aç")
      .setStyle(ButtonStyle.Primary)
      .setEmoji(emoji.kbdKilit);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({ content: "Özel oda sistemi başarıyla ayarlandı!", ephemeral: true });

  },
};

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId === "private_room_create") {
        await createPrivateRoom(interaction);
      } else if (interaction.customId.startsWith("room_")) {
        await handleRoomControl(interaction);
      } else if (interaction.customId.startsWith("user_")) {
        await handleUserManage(interaction);
      } else  if (interaction.customId === "room_manage") {
        await showManageUsersMenu(interaction);
      } else  if (interaction.customId === 'private_room_user_search') {
        await handleUserSearchButton(interaction);
      } 
    }   if (interaction.isUserSelectMenu()) {
      if (interaction.customId === 'private_room_server_user_select') {
        await handleUserSelect(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'room_limit_modal') {
        await handleRoomLimitChange(interaction);
      } else if (interaction.customId === 'room_name_modal') {
        await handleRoomNameChange(interaction);
      } else if (interaction.customId === 'user_search_modal') {
        await handleUserSearchModal(interaction);
      }
    }
  } catch (error) {
    console.error("Etkileşim işlenirken hata oluştu:", error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.", ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.", ephemeral: true }).catch(() => {});
    }
  }
});

async function createPrivateRoom(interaction) {
  const { user, guild } = interaction;

  const existingRoomId = db.get(`privateRoom_${user.id}`);
  if (existingRoomId) {
    const existingRoom = guild.channels.cache.get(existingRoomId);
    if (!existingRoom) {
      db.delete(`privateRoom_${user.id}`);
      db.delete(`privateRoom_${existingRoomId}`);
    } else {
      return interaction.reply({ content: "Zaten bir özel odanız var!", ephemeral: true });
    }
  }

  const categoryId = db.get(`privateRoomCategory_${guild.id}`);
  const category = guild.channels.cache.get(categoryId);

  if (!category) {
    return interaction.reply({ content: "Özel oda kategorisi bulunamadı!", ephemeral: true });
  }

  const permissionOverwrites = category.permissionOverwrites.cache.map(overwrite => ({
    id: overwrite.id,
    allow: overwrite.allow,
    deny: overwrite.deny,
    type: overwrite.type
  }));


  permissionOverwrites.push({
    id: user.id,
    allow: [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
      PermissionsBitField.Flags.Stream
    ],
  });

  const channel = await guild.channels.create({
    name: `${emoji.kbdKilit} ${user.username}'nin Odası`,
    type: ChannelType.GuildVoice,
    parent: category,
    permissionOverwrites: permissionOverwrites,
  });

  db.set(`privateRoom_${user.id}`, channel.id);
  db.set(`privateRoom_${channel.id}`, user.id);

  setTimeout(async () => {
    const currentChannel = interaction.guild.channels.cache.get(channel.id);
    if (currentChannel && currentChannel.members.size === 0) {
      try {
        await currentChannel.delete();
      } catch (error) {
      }
      cleanupPrivateRoom(user.id, channel.id);
    }
  }, 10000); 

  await interaction.reply({ content: `Özel odanız oluşturuldu! <#${channel.id}>`, ephemeral: true });
  await sendControlPanel(channel, user);
}



async function sendControlPanel(channel, user) {
  const existingPanel = await channel.messages.fetch({ limit: 1 }).then(messages => messages.first());
  if (existingPanel && existingPanel.author.id === client.user.id) {
    await existingPanel.delete();
  }

  const controlPanel = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(emoji.kbdOyun + " Kontrol Paneli")
    .setDescription("Odanızı yönetmek için aşağıdaki butonları kullanın.")
    .setFooter({ text: "Özel odanızı dilediğiniz gibi özelleştirin!" });

  const buttons1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId("room_lock").setStyle(ButtonStyle.Success).setEmoji(emoji.kbdKilit),
      new ButtonBuilder().setCustomId("room_eyes").setStyle(ButtonStyle.Success).setEmoji(emoji.kbdUser),
      new ButtonBuilder().setCustomId("room_mute").setStyle(ButtonStyle.Success).setEmoji(emoji.kbdZil),
      new ButtonBuilder().setCustomId("room_video").setStyle(ButtonStyle.Success).setEmoji(emoji.kbdNews),
      new ButtonBuilder().setCustomId("room_events").setStyle(ButtonStyle.Success).setEmoji(emoji.kbdOyun)
        );

  const buttons2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId("room_name").setStyle(ButtonStyle.Secondary).setEmoji(emoji.kbdNews),
      new ButtonBuilder().setCustomId("room_limit").setStyle(ButtonStyle.Secondary).setEmoji(emoji.kbdApi),
      new ButtonBuilder().setCustomId("room_manage").setStyle(ButtonStyle.Primary).setEmoji(emoji.kbdUser),
      new ButtonBuilder().setCustomId("room_time").setStyle(ButtonStyle.Secondary).setEmoji(emoji.kbdSaat)
    );

  await channel.send({ 
    content: `<@${user.id}>, özel odanızın kontrol paneli:`, 
    embeds: [controlPanel], 
    components: [buttons1, buttons2 ] 
  });
}

async function handleRoomControl(interaction) {
  const roomOwnerId = db.get(`privateRoom_${interaction.channel.id}`);
  const isAdmin = db.get(`admin_${interaction.channel.id}_${interaction.user.id}`);
  
  if (interaction.user.id !== roomOwnerId && !isAdmin) {
    return interaction.reply({ content: "Bu odanın sahibi değilsiniz veya yönetici yetkiniz yok!", ephemeral: true });
  }

  const action = interaction.customId.split("_")[1];
  
  switch (action) {
    case "lock":
      await toggleRoomLock(interaction);
      break;
    case "mute":
      await toggleMuteForAll(interaction);
      break;
    case "video":
      await toggleVideoForAll(interaction);
      break;
    case "manage":
      await showManageUsersMenu(interaction);
      break;
    case "name":
      await showRoomNameModal(interaction);
      break;
    case "limit":
      await showRoomLimitModal(interaction);
      break;
    case "events":
      await toggleEventsKey(interaction);
      break;
    case "eyes":
      await toggleEyesKey(interaction);
      break;
    case "time":
      await showChannelTime(interaction);
      break;
  }
}

async function toggleButton(interaction, customId, enabledState) {
  const actionRow = interaction.message.components[0];
  const button = actionRow.components.find(c => c.data.custom_id === customId);
  if (button) {
    button.data.style = enabledState ? ButtonStyle.Success : ButtonStyle.Danger;
  }
  await interaction.update({ components: interaction.message.components });
}

async function toggleRoomLock(interaction) {
  const channel = interaction.channel;
  const isLocked = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionsBitField.Flags.Connect);

  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    Connect: !isLocked
  });

  await toggleButton(interaction, "room_lock", !isLocked);
  await interaction.followUp({ content: `Oda ${isLocked ? 'kilitlendi' : 'kilidi açıldı'}.`, ephemeral: true });
}

async function toggleMuteForAll(interaction) {
  const channel = interaction.channel;
  const currentState = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionsBitField.Flags.Speak);

  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    Speak: !currentState
  });

  await toggleButton(interaction, "room_mute", !currentState);
  await interaction.followUp({ content: `Kanal ${currentState ? 'susturuldu' : 'susturma kaldırıldı'}.`, ephemeral: true });
}

async function toggleVideoForAll(interaction) {
  const channel = interaction.channel;
  const currentState = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionsBitField.Flags.Stream);

  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    Stream: !currentState
  });

  await toggleButton(interaction, "room_video", !currentState);
  await interaction.followUp({ content: `Video izni ${currentState ? 'kapatıldı' : 'açıldı'}.`, ephemeral: true });
}
async function toggleEventsKey(interaction) {
  const channel = interaction.channel;
  const currentState = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionsBitField.Flags.CreateEvents);

  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    CreateEvents: !currentState
  });

  await toggleButton(interaction, "room_events", !currentState);
  await interaction.followUp({ content: `Etkinlik izni ${currentState ? 'kapatıldı' : 'açıldı'}.`, ephemeral: true });
}
async function toggleEyesKey(interaction) {
  const channel = interaction.channel;
  const currentState = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionsBitField.Flags.ViewChannel);

  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    ViewChannel: !currentState
  });

  await toggleButton(interaction, "room_eyes", !currentState);
  await interaction.followUp({ content: `Kanal görünürlüğü ${currentState ? 'kapatıldı' : 'açıldı'}.`, ephemeral: true });
}


async function showManageUsersMenu(interaction) {
  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId('private_room_server_user_select')
    .setPlaceholder('Bir kullanıcı seçin')
    .setMaxValues(1);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const searchButton = new ButtonBuilder()
    .setCustomId('private_room_user_search')
    .setLabel('Kullanıcı ID ile Ara')
    .setStyle(ButtonStyle.Primary)
    .setEmoji(emoji.kbdCalisma);

  const buttonRow = new ActionRowBuilder().addComponents(searchButton);

  await interaction.reply({ 
    content: 'Yönetmek istediğiniz kullanıcıyı seçin:', 
    components: [row, buttonRow], 
    ephemeral: true 
  });
}

async function handleUserSearchButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('user_search_modal')
    .setTitle('Kullanıcı ID ile Ara');

  const userIdInput = new TextInputBuilder()
    .setCustomId('user_id_input')
    .setLabel('Kullanıcı ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);
  modal.addComponents(firstActionRow);

  await interaction.showModal(modal);
}

async function handleUserSearchModal(interaction) {
  const userId = interaction.fields.getTextInputValue('user_id_input');
  
  try {
    const member = await interaction.guild.members.fetch(userId);
    
    if (!member) {
      return await interaction.reply({ content: "Kullanıcı bulunamadı.", ephemeral: true });
    }
    
    await showUserManagementMenu(interaction, member);
  } catch (error) {
    console.error('Kullanıcı bulunamadı:', error);
    await interaction.reply({ content: "Kullanıcı bulunamadı. Lütfen geçerli bir kullanıcı ID'si girin.", ephemeral: true });
  }
}

async function showUserManagementMenu(interaction, member) {
  const currentPermissions = interaction.channel.permissionOverwrites.resolve(member.id);
  const isAdmin = currentPermissions && currentPermissions.allow.has(PermissionsBitField.Flags.ManageChannels);
  const canView = currentPermissions && currentPermissions.allow.has(PermissionsBitField.Flags.ViewChannel);
  const canSendMessages = currentPermissions && currentPermissions.allow.has(PermissionsBitField.Flags.SendMessages);
  const canConnect = currentPermissions && currentPermissions.allow.has(PermissionsBitField.Flags.Connect);

  const manageButtons1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`user_manage_${member.id}_${isAdmin ? 'removeAdmin' : 'makeAdmin'}`)
      .setLabel(isAdmin ? 'Yetkileri Kaldır' : 'Yönetici Yap')
      .setStyle(isAdmin ? ButtonStyle.Danger : ButtonStyle.Success)
      .setEmoji(isAdmin ? [emoji.carpi] : emoji.kbdCalisma),

    new ButtonBuilder()
      .setCustomId(`user_manage_${member.id}_${canView ? 'denyView' : 'allowView'}`)
      .setLabel(canView ? 'Görmeyi Kaldır' : 'Görme İzni Ver')
      .setStyle(canView ? ButtonStyle.Danger : ButtonStyle.Success)
      .setEmoji(canView ? [emoji.carpi] : emoji.kbdUser),

    new ButtonBuilder()
      .setCustomId(`user_manage_${member.id}_${canSendMessages ? 'denySendMessages' : 'allowSendMessages'}`)
      .setLabel(canSendMessages ? 'Mesaj Gönderme İzni Kaldır' : 'Mesaj Gönderme İzni Ver')
      .setStyle(canSendMessages ? ButtonStyle.Danger : ButtonStyle.Success)
      .setEmoji(canSendMessages ? [emoji.carpi] : emoji.kbdNews)
  );

  const manageButtons2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`user_manage_${member.id}_${canConnect ? 'denyConnect' : 'allowConnect'}`)
      .setLabel(canConnect ? 'Bağlanma İzni Kaldır' : 'Bağlanma İzni Ver')
      .setStyle(canConnect ? ButtonStyle.Danger : ButtonStyle.Success)
      .setEmoji(canConnect ? [emoji.carpi] : emoji.kbdDiscordLink),

    new ButtonBuilder()
      .setCustomId(`user_manage_${member.id}_transfer`)
      .setLabel('Oda Sahipliğini Devret')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(emoji.kbdTac),

    new ButtonBuilder()
      .setCustomId(`user_manage_${member.id}_kick`)
      .setLabel('Sesten At')
      .setStyle(ButtonStyle.Danger)
      .setEmoji(emoji.kbdUser)
  );

  await interaction.update({ 
    content: `${member.user.tag} kullanıcısı için işlem seçiniz:`, 
    components: [manageButtons1, manageButtons2], 
    ephemeral: true 
  }).catch(err => {
    console.error('Interaction update failed:', err);
  });
}

async function handleUserSelect(interaction) {
  const selectedUserId = interaction.values[0];
  const member = await interaction.guild.members.fetch(selectedUserId).catch(() => null);

  if (!member) {
    console.log('User not found');
    return await interaction.reply({ content: "Seçilen kullanıcı bulunamadı.", ephemeral: true });
  }
  
  await showUserManagementMenu(interaction, member);
}



async function handleUserManage(interaction) {
  const [action, userId, operation] = interaction.customId.split('_').slice(1);
  const channel = interaction.channel;
  const member = await channel.guild.members.fetch(userId).catch(() => null);

  if (!member) {
    return interaction.reply({ content: "Seçilen kullanıcı bulunamadı.", ephemeral: true });
  }

  const permissionMessages = {
    makeAdmin: `${member.user.tag} yönetici yapıldı.`,
    removeAdmin: `${member.user.tag} yönetici yetkisi kaldırıldı.`,
    allowView: `${member.user.tag} için görme izni verildi.`,
    denyView: `${member.user.tag} için görme izni kaldırıldı.`,
    allowSendMessages: `${member.user.tag} için mesaj gönderme izni verildi.`,
    denySendMessages: `${member.user.tag} için mesaj gönderme izni kaldırıldı.`,
    allowConnect: `${member.user.tag} için bağlanma izni verildi.`,
    denyConnect: `${member.user.tag} için bağlanma izni kaldırıldı.`,
    kick: `${member.user.tag} ses kanalından atıldı.`
  };

  if (operation === 'transfer') {
    const roomOwnerId = db.get(`privateRoom_${channel.id}`);

    if (interaction.user.id !== roomOwnerId) {
      return interaction.reply({ content: "Bu odanın sahibi değilsiniz!", ephemeral: true });
    }

    await channel.permissionOverwrites.edit(interaction.user, {
      ManageChannels: null,
      Connect: null,
      Speak: null,
      Stream: null
    });

    await channel.permissionOverwrites.edit(member, {
      ManageChannels: true,
      Connect: true,
      Speak: true,
      Stream: true
    });
    db.delete(roomOwnerId);
    db.set(`privateRoom_${channel.id}`, member.id);
    db.set(`privateRoom_${member.id}`, channel.id);

    await channel.send(`<@${member.id}>, bu odanın yeni sahibi oldunuz!`);
    await interaction.reply({ content: `Oda sahipliği başarıyla ${member.user.tag} kullanıcısına devredildi.`, ephemeral: true });
  } else if (operation === 'kick') {
    if (member.voice.channel && member.voice.channel.id === channel.id) {
      await member.voice.disconnect();
      await interaction.reply({ content: permissionMessages[operation], ephemeral: true });
    } else {
      await interaction.reply({ content: "Kullanıcı ses kanalında değil.", ephemeral: true });
    }
  } else {
    if (operation === 'makeAdmin') {
      db.set(`admin_${channel.id}_${member.id}`, true);
      await channel.permissionOverwrites.edit(member, {
        ManageChannels: true
      });
    } else if (operation === 'removeAdmin') {
      db.delete(`admin_${channel.id}_${member.id}`);
      await channel.permissionOverwrites.edit(member, {
        ManageChannels: false
      });
    }
    else {
      const permissionChanges = {
        allowView: { ViewChannel: true },
        denyView: { ViewChannel: false },
        allowSendMessages: { SendMessages: true },
        denySendMessages: { SendMessages: false },
        allowConnect: { Connect: true },
        denyConnect: { Connect: false }
      };

      await channel.permissionOverwrites.edit(member, permissionChanges[operation]);
    }
    await interaction.update({ content: permissionMessages[operation], components: [], ephemeral: true });
  }
}







async function showChannelTime(interaction) {
  const channel = interaction.channel;
  const createdAt = channel.createdAt;
  const now = new Date();
  const diff = now - createdAt;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let timeString = '';
  if (days > 0) timeString += `${days} gün `;
  if (hours > 0) timeString += `${hours} saat `;
  timeString += `${minutes} dakika`;

  const timeEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(emoji.kbdSaat + ' Oda Süresi')
    .setDescription(`Bu oda ${timeString} süredir açık.`)
    .setFooter({ text: 'Özel odanızı keyifle kullanın!' });

  await interaction.reply({ embeds: [timeEmbed], ephemeral: true });
}

async function showRoomNameModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('room_name_modal')
    .setTitle('Oda İsmini Değiştir');

  const nameInput = new TextInputBuilder()
    .setCustomId('name_input')
    .setLabel('Yeni oda ismi')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(nameInput));

  await interaction.showModal(modal);
}

async function showRoomLimitModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('room_limit_modal')
    .setTitle('Oda Limiti Ayarla');

  const limitInput = new TextInputBuilder()
    .setCustomId('limit_input')
    .setLabel('Yeni limit (0-99 arası, 0 = sınırsız)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(limitInput));

  await interaction.showModal(modal);
}

async function handleRoomNameChange(interaction) {
  const newName = interaction.fields.getTextInputValue('name_input');
  await interaction.channel.setName(newName);
  await interaction.reply({ content: `Oda ismi "${newName}" olarak değiştirildi.`, ephemeral: true });
}

async function handleRoomLimitChange(interaction) {
  const newLimit = parseInt(interaction.fields.getTextInputValue('limit_input'));
  if (isNaN(newLimit) || newLimit < 0 || newLimit > 99) {
    return interaction.reply({ content: 'Geçersiz limit. 0-99 arası bir sayı girin.', ephemeral: true });
  }
  await interaction.channel.setUserLimit(newLimit);
  await interaction.reply({ content: `Oda limiti ${newLimit === 0 ? 'sınırsız' : newLimit} olarak ayarlandı.`, ephemeral: true });
}


client.on("voiceStateUpdate", async (oldState, newState) => {
  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  if (oldChannel && !newChannel) {
    const roomOwnerId = db.get(`privateRoom_${oldChannel.id}`);

    if (roomOwnerId && oldChannel.members.size === 0) {
      try {
        await oldChannel.delete();
      } catch (error) {
      }
      cleanupPrivateRoom(roomOwnerId, oldChannel.id);
    }
  }

  if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
    const oldRoomOwnerId = db.get(`privateRoom_${oldChannel.id}`);
    
    if (oldRoomOwnerId === oldState.member.id && oldChannel.members.size === 0) {
      try {
        await oldChannel.delete();
      } catch (error) {
      }
      cleanupPrivateRoom(oldRoomOwnerId, oldChannel.id);
    }
    
    if (oldRoomOwnerId === oldState.member.id && oldChannel.members.size > 0) {
      const newOwner = oldChannel.members.random();
      
      db.set(`privateRoom_${oldChannel.id}`, newOwner.id);
      db.set(`privateRoom_${newOwner.id}`, oldChannel.id);
      
      db.delete(`privateRoom_${oldRoomOwnerId}`);

      oldChannel.send(`<@${newOwner.id}>, bu odanın yeni sahibi oldunuz!`);
    }
  }
});