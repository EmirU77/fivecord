# 🚀 Fivecord — 5 Kişilik Özel Discord Platformu (Nitro-Tier & Tamamen Ücretsiz)

Discord Nitro'nun sınırlarını (ekran kalitesi, dosya boyutu, soundboard) kaldıran, 5 kişilik arkadaş grubuna özel, sıfır gecikmeli WebRTC tabanlı bağımsız iletişim uygulaması.

---

## ✨ Öne Çıkan Özellikler

- 🖥️ **En Yüksek Kalite Ekran Paylaşımı:**
  - **4K @ 60 FPS, 1080p @ 60 FPS, 720p @ 60 FPS** ve Kaynak Kalite seçenekleri.
  - Sınırsız video bitrate (15 Mbps'e kadar kristal netlik).
  - Masaüstü / Oyun sesini (System Audio) doğrudan aktarma.
  - Tam ekran ve Tiyatro modu.
- 🎙️ **Kristal Netliğinde Ses (Opus Stereo):**
  - WebRTC P2P doğrudan bağlantı (sunucudan geçmez, 20-40ms gecikme).
  - Konuşuyor göstergesi (Discord tarzı canlı yeşil halka).
  - Mikrofon susturma (Mute) & Sağırlaştırma (Deafen).
  - Her arkadaşınızın sesini ayrı ayrı kısabilme/artırabilme (%0 - %200).
- 💬 **1-e-1 Özel Mesajlar (DM):**
  - Arkadaş listenizden dilediğiniz kişiyle doğrudan baş başa özel mesajlaşma.
  - Özel sohbet geçmişi ve dosya gönderimi.
- 💬 **Sınırsız Metin Sohbeti & Dosya Paylaşımı:**
  - Discord'un 8MB sınırına takılmadan **100MB**'a kadar resim, video ve dosya gönderme.
  - Mesajlara anlık emoji reaksiyonları bırakma.
  - Canlı yazıyor göstergesi ("Ali yazıyor...").
- 🎨 **Discord Birebir Karanlık Tema:**
  - Sol tarafta ses ve metin kanalları.
  - Sol altta profil ayarları (Avatar değiştirme, kullanıcı adı, özel durum mesajı).
  - Sağ tarafta 5 kişilik VIP üye listesi.

---

## 🚀 Nasıl Başlatılır?

### Tek Tıkla Başlatma:
Proje klasöründeki `start.bat` dosyasına çift tıklayın. Otomatik olarak hem backend'i hem frontend'i açacak ve tarayıcınızı `http://localhost:3000` adresine yönlendirecektir.

### Manuel Başlatma (Terminal):
1. **Backend:**
   ```bash
   cd backend
   node src/server.js
   ```
2. **Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
3. Tarayıcınızda açın: `http://localhost:3000`

---

## 🌐 4 Arkadaşınızı Nasıl Davet Edeceksiniz? (İnternet Üzerinden)

Aynı evde / Wi-Fi ağındaysanız doğrudan yerel IP adresinizi verebilirsiniz:
`http://192.168.1.15:3000`

İnternet üzerinden (farklı şehirler/evler) bağlanmak için en hızlı ve ücretsiz 2 yöntem:

### Yöntem 1: Ücretsiz Cloudflare Tunnel (Önerilen, HTTPS Destekli)
Tarayıcıların mikrofon ve ekran paylaşımına izin vermesi için güvenli bağlantı (HTTPS) önerilir:
1. [Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)'i indirin.
2. Terminalde şu komutu çalıştırın:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
3. Size vereceği `https://xyz.trycloudflare.com` bağlantısını 4 arkadaşınıza gönderin. Hepsi tek tıkla odaya katılsın!

### Yöntem 2: Ngrok
```bash
ngrok http 3000
```
Verilen https bağlantısını arkadaşlarınıza atmanız yeterlidir.
