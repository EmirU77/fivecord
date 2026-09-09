# 🚀 Synapse — Sesli & Görüntülü İletişim Platformu (Ultra Düşük Gecikme & 60 FPS)

Discord sınırlarını (ekran kalitesi, dosya boyutu, soundboard) kaldıran, sıfır gecikmeli WebRTC ve hibrit ses aktarımı tabanlı bağımsız iletişim platformu.

---

## ✨ Öne Çıkan Özellikler

- 🖥️ **En Yüksek Kalite Ekran Paylaşımı:**
  - **4K @ 60 FPS, 1080p @ 60 FPS, 720p @ 60 FPS** ve Kaynak Kalite seçenekleri.
  - Sınırsız video bitrate (15 Mbps'e kadar kristal netlik).
  - Masaüstü / Oyun sesini (System Audio) doğrudan aktarma.
  - Bağımsız yayın ses mikseri ve Picture-in-Picture (PiP) mini oynatıcı.
- 🎙️ **Kristal Netliğinde Doğal Ses (Opus Direct):**
  - WebRTC P2P ve Hibrit Relay destekli doğrudan bağlantı.
  - Canlı konuşuyor göstergesi ve gürültüsüz doğal ses.
  - Her kullanıcının mikrofon ve yayın sesini ayrı ayrı kısabilme/artırabilme (%0 - %200).
- 👑 **Roller ve Yetki Hiyerarşisi:**
  - Kurucu, Moderatör, VIP ve özel roller.
  - Sağ tık menüsü ile anında rol atama, susturma, atma ve üyelik kaydını silme.
- 💬 **1-e-1 Özel Mesajlar (DM):**
  - Dilediğiniz kullanıcıyla doğrudan baş başa özel mesajlaşma.
  - 100MB'a kadar sınırsız dosya ve medya paylaşımı.
- 🎨 **Modern ve Profesyonel Arayüz:**
  - Sol tarafta ses ve metin kanalları, sağ tarafta hiyerarşik üye listesi.

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
