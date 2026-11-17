const emoji = require("./emoji.js");
const { ShardingManager, WebhookClient } = require('discord.js');
const config = require('./config.json');

const manager = new ShardingManager('./index.js', { //Burada main dosyanızın adı farklı ise değiştirmeniz gerek.
    token: config.token, //Tokenininin nerde olduğunu buradan ayarlamanız gerekiyor.
    totalShards: 1, //İsterseniz shard sayısını değiştirebilirsiniz. Ama shard sayısı değişmiyor diye biliyorum öyle ayarladım.
});

const webhook = new WebhookClient({ url: "https://discord.com/api/webhooks/1572199084364660756/xS9glhGUKjJiXVy76FVDaS3kUuKPf_vl4QG3Nevq8C_BageCCSo7VMk5_-YO9pOiG6i6" }); //Boş kısma webhook url gelecek.

manager.on('shardCreate', shard => {
    console.log(`${emoji.kbdRocket} Shard #${shard.id} başlatılıyor...`);

    shard.on('ready', async () => {
        console.log(`${emoji.kbdOK} Shard #${shard.id} çalışıyor.`);
        webhook.send(`${emoji.kbdOK} **Shard #${shard.id} çalışıyor!**`);

        try {
            const pleasant_sunucu = await manager.broadcastEval(c => c.guilds.cache.size);
            const pleasant_üye = await manager.broadcastEval(c => c.users.cache.size);
            const pleasant_topsunucu = pleasant_sunucu.reduce((a, b) => a + b, 0);
            const pleasant_topüye = pleasant_üye.reduce((a, b) => a + b, 0);

            console.log(`${emoji.kbdServer} Toplam Sunucu: ${pleasant_topsunucu} ${emoji.kbdUsers} Toplam Kullanıcı: ${pleasant_topüye}`);
            webhook.send(`${emoji.kbdServer} **Toplam Sunucu:** ${pleasant_topsunucu}\n${emoji.kbdUsers} **Toplam Kullanıcı:** ${pleasant_topüye}`);

        } catch (err) {
            console.error(emoji.kbdX + " Sunucu veya kullanıcı verisi alınamadı:", err);
            webhook.send(`${emoji.kbdX} **Hata:** \`\`\`${err.message}\`\`\``);
        }
    });

    shard.on('disconnect', () => webhook.send(`${emoji.kbdWarn} **Shard #${shard.id} bağlantısı koptu.**`));
    shard.on('reconnecting', () => webhook.send(`${emoji.kbdLoad} **Shard #${shard.id} tekrar bağlanıyor.**`));
    shard.on('error', error => webhook.send(`${emoji.kbdX} **Shard #${shard.id} hata verdi!**\n\`\`\`${error.message}\`\`\``));
});

manager.spawn().then(() => console.log(emoji.kbdOK + ' Tüm shardlar başlatıldı.'))
    .catch(err => console.error('Shard başlatma hatası:', err));