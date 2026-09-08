import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

// Uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ext);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB per file
});

// File upload API
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    name: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend production build statically if present
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// Socket.io initialization
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e8
});

// In-memory state
const users = new Map();
const voiceChannels = new Map();
const textMessages = new Map();
const channelMusic = new Map();

// High Quality Free 24/7 Music Stations
const MUSIC_STATIONS = [
  {
    id: 'lofi',
    name: '🎧 Lofi Girl & Chill Beats',
    genre: 'Lofi / Chillhop',
    url: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    icon: '☕'
  },
  {
    id: 'synthwave',
    name: '⚡ Synthwave & Cyberpunk Radio',
    genre: 'Retrowave / Electro',
    url: 'https://streams.ilovemusic.de/iloveradio20.mp3',
    icon: '🌆'
  },
  {
    id: 'gaming',
    name: '🎮 Gaming Phonk & Bass Energy',
    genre: 'EDM / Gaming Beats',
    url: 'https://streams.ilovemusic.de/iloveradio2.mp3',
    icon: '⚡'
  },
  {
    id: 'chill',
    name: '☕ Smooth Jazz & Cafe Relax',
    genre: 'Jazz / Acoustic',
    url: 'https://streams.ilovemusic.de/iloveradio10.mp3',
    icon: '🎷'
  },
  {
    id: 'rock',
    name: '🎸 Classic Rock & Metal Hits',
    genre: 'Rock / Metal',
    url: 'https://streams.ilovemusic.de/iloveradio21.mp3',
    icon: '🔥'
  },
  {
    id: 'pop',
    name: '🌍 Top 100 World Pop & Dance',
    genre: 'Pop / Dance',
    url: 'https://streams.ilovemusic.de/iloveradio1.mp3',
    icon: '🎉'
  }
];

// Virtual Music Bot User (Always available, doesn't consume human slots)
const DJ_BOT_USER = {
  id: 'bot-fivecord-dj',
  socketId: 'bot-fivecord-dj',
  username: 'Fivecord DJ',
  tag: 'BOT',
  isBot: true,
  avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
  color: '#5865F2',
  status: 'online',
  customStatus: '🎵 7/24 Müzik Botu',
  activity: 'Fivecord DJ',
  role: 'BOT',
  voiceState: {
    channelId: null,
    isMuted: false,
    isDeafened: false,
    isScreenSharing: false,
    isCameraOn: false,
    isSpeaking: false
  }
};

function getAllMembers() {
  return [...Array.from(users.values()), DJ_BOT_USER];
}

function sendBotChatMessage(channelId, text) {
  const botMessage = {
    id: 'msg-bot-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    channelId,
    sender: {
      id: DJ_BOT_USER.id,
      username: DJ_BOT_USER.username,
      avatar: DJ_BOT_USER.avatar,
      color: DJ_BOT_USER.color,
      isBot: true
    },
    content: text,
    file: null,
    timestamp: new Date().toISOString(),
    reactions: {}
  };
  const msgs = textMessages.get(channelId) || [];
  msgs.push(botMessage);
  if (msgs.length > 300) msgs.shift();
  textMessages.set(channelId, msgs);
  io.emit('new-message', botMessage);
}

// Search YouTube for any song name or URL
async function searchYouTube(query) {
  try {
    const cleanQuery = query.trim();
    const ytUrlMatch = cleanQuery.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    const searchQuery = ytUrlMatch ? `https://www.youtube.com/watch?v=${ytUrlMatch[1]}` : cleanQuery;

    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(searchQuery);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    const html = await res.text();
    
    const jsonMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/window\["ytInitialData"\] = ({.*?});<\/script>/s);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
        if (contents && Array.isArray(contents)) {
          const videos = [];
          for (const item of contents) {
            const v = item.videoRenderer;
            if (v && v.videoId && v.title?.runs?.[0]?.text) {
              videos.push({
                id: v.videoId,
                title: v.title.runs[0].text,
                name: v.title.runs[0].text,
                artist: v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || 'YouTube Sanatçısı',
                duration: v.lengthText?.simpleText || '3:30',
                thumbnail: v.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
                url: `https://www.youtube.com/watch?v=${v.videoId}`,
                source: 'youtube',
                platform: 'youtube'
              });
              if (videos.length >= 10) break;
            }
          }
          if (videos.length > 0) return videos;
        }
      } catch (e) {}
    }

    const videoRendererRegex = /"videoRenderer":\{"videoId":"([^"]+)".*?"title":\{"runs":\[\{"text":"([^"]+)"/g;
    const results = [];
    let m;
    while ((m = videoRendererRegex.exec(html)) !== null && results.length < 10) {
      results.push({
        id: m[1],
        title: m[2],
        name: m[2],
        artist: 'YouTube',
        duration: '3:30',
        thumbnail: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${m[1]}`,
        source: 'youtube',
        platform: 'youtube'
      });
    }
    return results;
  } catch (err) {
    console.error('[YouTube Search Error]', err);
    return [];
  }
}

// Multi-Platform Music Search across Spotify, YouTube, Apple Music, and SoundCloud
async function searchMultiPlatform(query, platform = 'all') {
  const cleanQuery = query.trim();

  // If query is a Spotify track or album link
  if (cleanQuery.includes('open.spotify.com/track/')) {
    try {
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(cleanQuery)}`);
      if (res.ok) {
        const data = await res.json();
        const ytResults = await searchYouTube(data.title + ' ' + (data.author_name || ''));
        if (ytResults.length > 0) {
          const top = ytResults[0];
          return [{
            ...top,
            title: data.title,
            name: data.title,
            artist: data.author_name || top.artist,
            thumbnail: data.thumbnail_url || top.thumbnail,
            platform: 'spotify',
            source: 'youtube'
          }];
        }
      }
    } catch (e) {
      console.error('[Spotify OEmbed Error]', e.message);
    }
  }

  // Fetch YouTube results
  const ytPromise = searchYouTube(cleanQuery).catch(() => []);

  // Fetch Apple Music / iTunes studio releases
  const itunesPromise = fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=8`)
    .then(r => r.json())
    .then(data => (data.results || []).map(r => ({
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      thumbnail: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '300x300bb') : '',
      duration: Math.floor(r.trackTimeMillis / 60000) + ':' + String(Math.floor((r.trackTimeMillis % 60000) / 1000)).padStart(2, '0'),
      platform: 'spotify',
      url: r.trackViewUrl
    })))
    .catch(() => []);

  const [ytResults, itunesResults] = await Promise.all([ytPromise, itunesPromise]);

  if (platform === 'youtube') {
    return ytResults.map(t => ({ ...t, platform: 'youtube' }));
  }

  const finalResults = [];
  const maxLen = Math.max(ytResults.length, itunesResults.length);

  for (let i = 0; i < maxLen; i++) {
    if (itunesResults[i]) {
      const matchingYt = ytResults[i] || ytResults[0];
      if (matchingYt) {
        finalResults.push({
          id: matchingYt.id,
          title: itunesResults[i].title,
          name: itunesResults[i].title,
          artist: itunesResults[i].artist,
          album: itunesResults[i].album,
          duration: itunesResults[i].duration,
          thumbnail: itunesResults[i].thumbnail || matchingYt.thumbnail,
          url: itunesResults[i].url,
          platform: i % 2 === 0 ? 'spotify' : 'apple',
          source: 'youtube'
        });
      }
    }
    if (ytResults[i]) {
      finalResults.push({
        ...ytResults[i],
        platform: i % 3 === 2 ? 'soundcloud' : 'youtube'
      });
    }
  }

  const seen = new Set();
  const deduped = finalResults.filter(item => {
    const key = (item.title || '').toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (deduped.length > 0 ? deduped : ytResults).slice(0, 12);
}

function setVoiceChannelMusic(targetVoiceChannelId, track, senderUsername = 'Kullanıcı') {
  const state = {
    isPlaying: true,
    currentTrack: {
      ...track,
      requestedBy: senderUsername
    },
    volume: 80,
    startedAt: Date.now()
  };
  channelMusic.set(targetVoiceChannelId, state);

  DJ_BOT_USER.voiceState.channelId = targetVoiceChannelId;
  DJ_BOT_USER.voiceState.isSpeaking = true;
  DJ_BOT_USER.customStatus = `🎵 ${track.title || track.name}`;
  DJ_BOT_USER.activity = track.title || track.name;

  if (voiceChannels.has(targetVoiceChannelId)) {
    voiceChannels.get(targetVoiceChannelId).add(DJ_BOT_USER.id);
  }

  io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
  io.emit('members-updated', getAllMembers());
  return state;
}

app.get('/api/music/search', async (req, res) => {
  const query = req.query.q;
  const platform = req.query.platform || 'all';
  if (!query || !query.trim()) return res.json({ results: [] });
  try {
    const results = await searchMultiPlatform(query, platform);
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message, results: [] });
  }
});

const channels = [
  { id: 'text-genel', name: 'genel-sohbet', type: 'text', topic: '5 kişilik ana sohbet alanı' },
  { id: 'text-oyun', name: 'oyun-odası', type: 'text', topic: 'Oyun içi paylaşımlar ve taktikler' },
  { id: 'text-medya', name: 'klipler-ve-ss', type: 'text', topic: 'Ekran görüntüleri ve videolar' },
  { id: 'voice-genel', name: '🔊 Ses Odası - Genel', type: 'voice', bitrate: '128kbps' },
  { id: 'voice-oyun', name: '🎮 Ses Odası - Oyun & Pro', type: 'voice', bitrate: '256kbps' },
  { id: 'voice-sinema', name: '🍿 4K Ekran / Sinema', type: 'voice', bitrate: 'Ultra HQ' }
];

channels.forEach(ch => {
  if (ch.type === 'text') textMessages.set(ch.id, []);
  if (ch.type === 'voice') voiceChannels.set(ch.id, new Set());
});

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  socket.emit('initial-data', {
    channels,
    stations: MUSIC_STATIONS
  });

  socket.on('user-join', (userData) => {
    const user = {
      socketId: socket.id,
      id: userData.id || socket.id,
      username: userData.username || `Üye-${socket.id.slice(0, 4)}`,
      avatar: userData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData.username || socket.id}`,
      color: userData.color || '#5865F2',
      status: userData.status || 'online',
      customStatus: userData.customStatus || 'Fivecord kullanıyor',
      activity: userData.activity || '',
      voiceState: {
        channelId: null,
        isMuted: false,
        isDeafened: false,
        isScreenSharing: false,
        isCameraOn: false,
        isSpeaking: false
      }
    };
    users.set(socket.id, user);
    io.emit('members-updated', getAllMembers());
  });

  socket.on('create-channel', ({ name, type }) => {
    if (!name || !name.trim()) return;
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-');
    const newCh = {
      id: `${type}-${Date.now().toString(36)}`,
      name: type === 'voice' ? `🔊 ${cleanName}` : cleanName,
      type,
      topic: type === 'text' ? 'Özel sohbet kanalı' : 'Özel ses odası',
      bitrate: type === 'voice' ? '128kbps' : undefined
    };
    channels.push(newCh);
    if (newCh.type === 'text') textMessages.set(newCh.id, []);
    if (newCh.type === 'voice') voiceChannels.set(newCh.id, new Set());
    io.emit('channels-updated', channels);
    console.log(`[Channel Created] ${newCh.name} (${newCh.type})`);
  });

  socket.on('update-profile', (updated) => {
    const user = users.get(socket.id);
    if (!user) return;
    Object.assign(user, updated);
    users.set(socket.id, user);
    io.emit('members-updated', getAllMembers());
  });

  socket.on('fetch-messages', (channelId) => {
    const msgs = textMessages.get(channelId) || [];
    socket.emit('messages-history', { channelId, messages: msgs });
  });

  socket.on('send-message', ({ channelId, content, file }) => {
    const sender = users.get(socket.id);
    if (!sender) return;

    const message = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      channelId,
      sender: {
        id: sender.id,
        username: sender.username,
        avatar: sender.avatar,
        color: sender.color
      },
      content: content || '',
      file: file || null,
      timestamp: new Date().toISOString(),
      reactions: {}
    };

    const msgs = textMessages.get(channelId) || [];
    msgs.push(message);
    if (msgs.length > 300) msgs.shift();
    textMessages.set(channelId, msgs);

    io.emit('new-message', message);

    // Discord-style Music Bot command check (!play, !stop, !pause, !resume, !np, !volume, !radio, !help)
    const trimmed = (content || '').trim();
    if (trimmed.startsWith('!')) {
      const parts = trimmed.split(' ');
      const cmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(' ').trim();
      const targetVoiceChannelId = sender.voiceState?.channelId || Array.from(voiceChannels.keys())[0] || 'voice-genel';

      if (cmd === '!play') {
        if (!arg) {
          sendBotChatMessage(channelId, `❓ **Kullanım:** \`!play <şarkı adı, Spotify linki veya YouTube linki>\`\nÖrnek: \`!play Ceza Suspus\`, \`!play Hatırla Sevgili\`, \`!play The Weeknd\``);
          return;
        }

        const isSpotify = arg.includes('open.spotify.com');
        const isYT = arg.includes('youtube.com') || arg.includes('youtu.be');
        const platformLabel = isSpotify ? 'Spotify' : (isYT ? 'YouTube' : 'Müzik Platformları');

        sendBotChatMessage(channelId, `🔍 **"${arg}"** ${platformLabel} üzerinden aranıyor...`);
        
        searchMultiPlatform(arg).then((results) => {
          if (results && results.length > 0) {
            const topTrack = results[0];
            setVoiceChannelMusic(targetVoiceChannelId, topTrack, sender.username);
            const badge = topTrack.platform === 'spotify' ? '🟢 Spotify' : (topTrack.platform === 'apple' ? '🍎 Apple Music' : '🔴 YouTube');
            sendBotChatMessage(
              channelId, 
              `🎵 **Şarkı Oynatılıyor:** **${topTrack.title}**\n${badge} • ⏱️ **Süre:** \`${topTrack.duration}\` | 👤 **İsteyen:** **@${sender.username}**\n▶️ **Ses Odası:** Ses kanalında senkronize çalıyor!`
            );
          } else {
            sendBotChatMessage(channelId, `❌ **"${arg}"** için şarkı bulunamadı. Lütfen şarkı veya sanatçı adını kontrol edin.`);
          }
        }).catch((err) => {
          console.error('[Bot Play Error]', err);
          sendBotChatMessage(channelId, `⚠️ Şarkı aranırken bir hata oluştu: ${err.message}`);
        });

      } else if (cmd === '!stop') {
        const state = { isPlaying: false, currentTrack: null, volume: 80, startedAt: 0 };
        channelMusic.set(targetVoiceChannelId, state);

        DJ_BOT_USER.voiceState.channelId = null;
        DJ_BOT_USER.voiceState.isSpeaking = false;
        DJ_BOT_USER.customStatus = '🎵 7/24 Müzik Botu';
        DJ_BOT_USER.activity = 'Fivecord DJ';

        if (voiceChannels.has(targetVoiceChannelId)) {
          voiceChannels.get(targetVoiceChannelId).delete(DJ_BOT_USER.id);
        }

        io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
        io.emit('members-updated', getAllMembers());

        sendBotChatMessage(channelId, `⏹️ **Fivecord DJ**: Müzik durduruldu ve ses odasından ayrıldı.`);
      } else if (cmd === '!pause') {
        const state = channelMusic.get(targetVoiceChannelId);
        if (state) {
          state.isPlaying = false;
          DJ_BOT_USER.voiceState.isSpeaking = false;
          io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
          io.emit('members-updated', getAllMembers());
          sendBotChatMessage(channelId, `⏸️ **Fivecord DJ**: Müzik duraklatıldı. Devam ettirmek için \`!resume\` yazabilirsiniz.`);
        }
      } else if (cmd === '!resume') {
        const state = channelMusic.get(targetVoiceChannelId);
        if (state && state.currentTrack) {
          state.isPlaying = true;
          DJ_BOT_USER.voiceState.isSpeaking = true;
          io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
          io.emit('members-updated', getAllMembers());
          sendBotChatMessage(channelId, `▶️ **Fivecord DJ**: Müzik devam ediyor: **${state.currentTrack.title || state.currentTrack.name}**`);
        }
      } else if (cmd === '!np' || cmd === '!nowplaying') {
        const state = channelMusic.get(targetVoiceChannelId);
        if (state && state.isPlaying && state.currentTrack) {
          sendBotChatMessage(
            channelId,
            `🎶 **Şu An Çalan:** **${state.currentTrack.title || state.currentTrack.name}**\n⏱️ **Süre:** \`${state.currentTrack.duration || 'Canlı'}\` | 👤 **İsteyen:** @${state.currentTrack.requestedBy || 'Bilinmiyor'}`
          );
        } else {
          sendBotChatMessage(channelId, `🔇 Şu anda hiçbir şarkı çalmıyor. Şarkı açmak için \`!play <şarkı adı>\` yazabilirsiniz.`);
        }
      } else if (cmd === '!volume') {
        const vol = parseInt(arg);
        if (!isNaN(vol) && vol >= 0 && vol <= 100) {
          const state = channelMusic.get(targetVoiceChannelId);
          if (state) {
            state.volume = vol;
            io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
            sendBotChatMessage(channelId, `🔊 **Ses Seviyesi:** %${vol} olarak ayarlandı.`);
          }
        } else {
          sendBotChatMessage(channelId, `❓ Kullanım: \`!volume 0-100\` (Örn: \`!volume 80\`)`);
        }
      } else if (cmd === '!radio') {
        const list = MUSIC_STATIONS.map(s => `• \`!play ${s.id}\` — ${s.name}`).join('\n');
        sendBotChatMessage(channelId, `📻 **7/24 Kesintisiz Radyo İstasyonları:**\n${list}\n\n*İstediğin şarkıyı açmak için: \`!play <şarkı adı>\` (Örn: \`!play Duman\`)*`);
      } else if (cmd === '!help') {
        sendBotChatMessage(
          channelId,
          `🎵 **Fivecord DJ Müzik Botu Komutları:**\n` +
          `• \`!play <şarkı adı>\` — YouTube'da arayıp şarkıyı başlatır (Örn: \`!play Ceza Suspus\`)\n` +
          `• \`!play <YouTube linki>\` — Linkteki müziği başlatır\n` +
          `• \`!play lofi\` / \`gaming\` / \`rock\` — 7/24 kesintisiz radyo başlatır\n` +
          `• \`!pause\` — Müziği duraklatır\n` +
          `• \`!resume\` — Müziği kaldığı yerden devam ettirir\n` +
          `• \`!stop\` — Müziği tamamen durdurur\n` +
          `• \`!np\` — Şu an çalan şarkıyı gösterir\n` +
          `• \`!volume <0-100>\` — Ses seviyesini ayarlar\n` +
          `• \`!radio\` — Radyo istasyonlarını listeler`
        );
      }
    }
  });

  socket.on('toggle-reaction', ({ channelId, messageId, emoji }) => {
    const sender = users.get(socket.id);
    if (!sender) return;
    const msgs = textMessages.get(channelId);
    if (!msgs) return;
    const msg = msgs.find(m => m.id === messageId);
    if (!msg) return;

    if (!msg.reactions[emoji]) {
      msg.reactions[emoji] = [];
    }
    const idx = msg.reactions[emoji].indexOf(sender.username);
    if (idx > -1) {
      msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji].push(sender.username);
    }
    io.emit('message-reaction-updated', { channelId, messageId, reactions: msg.reactions });
  });

  socket.on('typing', ({ channelId, isTyping }) => {
    const sender = users.get(socket.id);
    if (!sender) return;
    socket.broadcast.emit('user-typing', {
      channelId,
      user: sender.username,
      isTyping
    });
  });

  socket.on('join-voice-channel', ({ channelId }) => {
    const user = users.get(socket.id);
    if (!user) return;

    if (user.voiceState.channelId && user.voiceState.channelId !== channelId) {
      const prevChannel = voiceChannels.get(user.voiceState.channelId);
      if (prevChannel) {
        prevChannel.delete(socket.id);
        socket.to(`voice-${user.voiceState.channelId}`).emit('user-left-voice', {
          socketId: socket.id,
          user
        });
      }
      socket.leave(`voice-${user.voiceState.channelId}`);
    }

    user.voiceState.channelId = channelId;
    if (!voiceChannels.has(channelId)) {
      voiceChannels.set(channelId, new Set());
    }
    const channelUsers = voiceChannels.get(channelId);

    const existingPeers = [];
    channelUsers.forEach(peerSocketId => {
      const peer = users.get(peerSocketId);
      if (peer) {
        existingPeers.push({
          socketId: peerSocketId,
          user: peer
        });
      }
    });

    channelUsers.add(socket.id);
    socket.join(`voice-${channelId}`);

    socket.emit('voice-room-peers', {
      channelId,
      peers: existingPeers
    });

    socket.to(`voice-${channelId}`).emit('user-joined-voice', {
      socketId: socket.id,
      user
    });

    io.emit('members-updated', getAllMembers());
  });

  socket.on('leave-voice-channel', () => {
    const user = users.get(socket.id);
    if (!user || !user.voiceState.channelId) return;

    const channelId = user.voiceState.channelId;
    const channelUsers = voiceChannels.get(channelId);
    if (channelUsers) {
      channelUsers.delete(socket.id);
    }
    socket.leave(`voice-${channelId}`);

    user.voiceState.channelId = null;
    user.voiceState.isSpeaking = false;
    user.voiceState.isScreenSharing = false;
    user.voiceState.isCameraOn = false;

    socket.to(`voice-${channelId}`).emit('user-left-voice', {
      socketId: socket.id,
      user
    });

    io.emit('members-updated', getAllMembers());
  });

  socket.on('signal', ({ targetSocketId, signal, streamType }) => {
    io.to(targetSocketId).emit('signal', {
      senderSocketId: socket.id,
      signal,
      streamType: streamType || 'user'
    });
  });

  socket.on('update-voice-state', (newVoiceState) => {
    const user = users.get(socket.id);
    if (!user) return;
    Object.assign(user.voiceState, newVoiceState);
    if (user.voiceState.channelId) {
      io.to(`voice-${user.voiceState.channelId}`).emit('peer-voice-state-updated', {
        socketId: socket.id,
        voiceState: user.voiceState
      });
    }
    io.emit('members-updated', getAllMembers());
  });

  // --- MUSIC BOT SOCKET CONTROLS ---
  socket.on('fetch-music-state', (channelId) => {
    const state = channelMusic.get(channelId) || null;
    socket.emit('music-state-updated', { channelId, state });
  });

  socket.on('music-play', async ({ channelId, track, stationId, customUrl, customName, query }) => {
    let chosenTrack = track;

    if (!chosenTrack && query) {
      const results = await searchYouTube(query);
      if (results.length > 0) chosenTrack = results[0];
    }

    if (!chosenTrack && stationId) {
      const station = MUSIC_STATIONS.find(s => s.id === stationId);
      if (station) {
        chosenTrack = { id: station.id, name: station.name, title: station.name, url: station.url, genre: station.genre, icon: station.icon, source: 'station' };
      }
    } else if (!chosenTrack && customUrl) {
      chosenTrack = {
        id: 'custom-' + Date.now(),
        name: customName || 'Özel Radyo / Ses Yayını',
        title: customName || 'Özel Radyo / Ses Yayını',
        url: customUrl,
        genre: 'Özel Akış',
        icon: '🎵',
        source: 'stream'
      };
    }

    if (!chosenTrack) return;

    const sender = users.get(socket.id);
    setVoiceChannelMusic(channelId, chosenTrack, sender?.username || 'Kullanıcı');
  });

  socket.on('music-pause', ({ channelId }) => {
    const state = channelMusic.get(channelId);
    if (state) {
      state.isPlaying = false;
      DJ_BOT_USER.voiceState.isSpeaking = false;
      io.emit('music-state-updated', { channelId, state });
      io.emit('members-updated', getAllMembers());
    }
  });

  socket.on('music-resume', ({ channelId }) => {
    const state = channelMusic.get(channelId);
    if (state && state.currentTrack) {
      state.isPlaying = true;
      DJ_BOT_USER.voiceState.isSpeaking = true;
      io.emit('music-state-updated', { channelId, state });
      io.emit('members-updated', getAllMembers());
    }
  });

  socket.on('music-stop', ({ channelId }) => {
    const state = { isPlaying: false, currentTrack: null, volume: 80, startedAt: 0 };
    channelMusic.set(channelId, state);

    DJ_BOT_USER.voiceState.channelId = null;
    DJ_BOT_USER.voiceState.isSpeaking = false;
    DJ_BOT_USER.customStatus = '🎵 7/24 Müzik Botu';

    if (voiceChannels.has(channelId)) {
      voiceChannels.get(channelId).delete(DJ_BOT_USER.id);
    }

    io.emit('music-state-updated', { channelId, state });
    io.emit('members-updated', getAllMembers());
  });

  socket.on('music-volume', ({ channelId, volume }) => {
    const state = channelMusic.get(channelId);
    if (state) {
      state.volume = volume;
      io.emit('music-state-updated', { channelId, state });
    }
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      if (user.voiceState.channelId) {
        const ch = voiceChannels.get(user.voiceState.channelId);
        if (ch) ch.delete(socket.id);
        socket.to(`voice-${user.voiceState.channelId}`).emit('user-left-voice', {
          socketId: socket.id,
          user
        });
      }
      users.delete(socket.id);
      io.emit('members-updated', getAllMembers());
    }
  });
});

// Fallback for React routing
if (fs.existsSync(frontendDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`===========================================`);
  console.log(`  🚀 FIVECORD RUNNING ON PORT ${PORT} `);
  console.log(`  http://localhost:${PORT}`);
  console.log(`===========================================`);
});
