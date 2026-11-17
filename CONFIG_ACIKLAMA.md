# config.json Alan Açıklamaları

`config.json` geçerli JSON olmalıdır. Yorum (`//`) veya `*_aciklama` gibi ek anahtarlar eklenirse bot açılışında hata verebilir. Bu yüzden açıklamalar bu dosyada tutulur.

> **Dikkat:** `token` ve `webhookURL` gizli bilgidir. Altyapıyı paylaşırken bu dosyadaki gerçek değerleri paylaşmayın; karşı taraf kendi değerleriyle değiştirsin.

## Alanlar

| Anahtar | Açıklama |
| --- | --- |
| `token` | Discord bot token'ı. Kimseyle paylaşmayın. |
| `log` | Genel log/olay mesajlarının gönderileceği kanal ID. |
| `sahip` | Bot sahibinin Discord kullanıcı ID (tek değer, dizi değil). |
| `sahip-adi` | Sahip/Hazırlayan adı. İstatistik ve "Oluşturan" alanlarında gösterilir. |
| `giris-cikis` | Karşılama ve ayrılma mesajlarının gönderileceği kanal ID. |
| `desteksunucu` | Destek sunucusu davet bağlantısı. Embed'lerde ve butonlarda kullanılır. |
| `bot-davet` | Botun sunucuya eklenmesi için OAuth2 davet bağlantısı. Davet butonlarında kullanılır. |
| `bot-adi` | Botun arayüzlerde görünen adı. |
| `bot-id` | Botun Discord kullanıcı ID. Davet bağlantısı fallback'inde kullanılır. |
| `website` | Website butonunun açtığı bağlantı. |
| `bot-banner` | Davet komutunda kullanılacak banner görseli URL. Boşsa varsayılan görsel kullanılır. |
| `sesXp` | Ses kanalında dakika başına verilen XP miktarı (sayı, örn. `5`). |
| `durum` | Botun özel durum (custom status) metni. `"yok"` ise durum ayarlanmaz. |
| `prefix` | Birincil prefix komut öneki (`.p`). |
| `prefixes` | Prefix komutlarının çalıştığı tüm önekler listesi. En uzun eşleşen önek kullanılır. |
| `embedColor` | Standart embed renk kodu. |
| `errorColor` | Hata embedlerinin renk kodu. |
| `successColor` | Başarı embedlerinin renk kodu. |
| `footer` | Embed alt bilgilerinde görünen metin/bot adı. |
| `webhookURL` | Log ve shard bildirimlerinin gönderildiği webhook URL. Gizli tutun. |
| `clientId` | Slash komutlarını kaydetmek için kullanılan uygulama ID. |
| `guildId` | Slash komutlarının **ek olarak** anında kaydedileceği sunucu ID (opsiyonel). Komutlar her zaman global kaydedilir; bot hangi sunucuya eklenirse eklensin çalışır. Bu alan doluysa o sunucuda komutlar anında görünür. |

## Notlar

- Slash komutları bot açılışında yeniden yüklenir (`index.js`).
- `*_aciklama` tarzı alanlar `config.json` içinde **bulunmamalıdır**; bot bunları tanımaz ve açılışta sorun çıkarabilir.
- Bağlantılarda baştaki/sondaki boşluk olmamalıdır; buton URL'lerinde hata yapar.
- `prefixes` içindeki `" ."`, `" !"`, `" /"` değerlerindeki baştaki boşluklar bilinçlidir.
