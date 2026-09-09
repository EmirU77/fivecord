import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import * as persistence from './persistence.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- KNOWN GAME SIGNATURES FOR RICH PRESENCE ---
const GAME_SIGNATURES = [
  { exe: 'cs2.exe', name: 'Counter-Strike 2', icon: '🔫', detail: 'Premier / Rekabetçi' },
  { exe: 'csgo.exe', name: 'Counter-Strike: Global Offensive', icon: '🔫', detail: 'Rekabetçi' },
  { exe: 'valorant.exe', name: 'VALORANT', icon: '🎯', detail: 'Dereceli Maç' },
  { exe: 'valorant-win64-shipping.exe', name: 'VALORANT', icon: '🎯', detail: 'Dereceli Maç' },
  { exe: 'leagueclientux.exe', name: 'League of Legends', icon: '⚔️', detail: 'Sihirdar Vadisi' },
  { exe: 'league of legends.exe', name: 'League of Legends', icon: '⚔️', detail: 'Sihirdar Vadisi' },
  { exe: 'gta5.exe', name: 'Grand Theft Auto V', icon: '🚗', detail: 'GTA Online' },
  { exe: 'gtav.exe', name: 'Grand Theft Auto V', icon: '🚗', detail: 'GTA Online' },
  { exe: 'javaw.exe', name: 'Minecraft', icon: '⛏️', detail: 'Survival Dünyası' },
  { exe: 'minecraft.exe', name: 'Minecraft', icon: '⛏️', detail: 'Survival Dünyası' },
  { exe: 'rust.exe', name: 'Rust', icon: '🏹', detail: 'VIP Sunucu' },
  { exe: 'rustclient.exe', name: 'Rust', icon: '🏹', detail: 'VIP Sunucu' },
  { exe: 'rocketleague.exe', name: 'Rocket League', icon: '🏎️', detail: '3v3 Rekabetçi' },
  { exe: 'apex.exe', name: 'Apex Legends', icon: '💥', detail: 'Battle Royale' },
  { exe: 'r5apex.exe', name: 'Apex Legends', icon: '💥', detail: 'Battle Royale' },
  { exe: 'fortniteclient-win64-shipping.exe', name: 'Fortnite', icon: '🪂', detail: 'Battle Royale' },
  { exe: 'dota2.exe', name: 'Dota 2', icon: '🛡️', detail: 'Ranked Match' },
  { exe: 'tslgame.exe', name: 'PUBG: BATTLEGROUNDS', icon: '🍳', detail: 'Erangel' },
  { exe: 'rainbowsix.exe', name: 'Rainbow Six Siege', icon: '🎯', detail: 'Dereceli' },
  { exe: 'overwatch.exe', name: 'Overwatch 2', icon: '🤖', detail: 'Hızlı Karşılaşma' },
  { exe: 'cyberpunk2077.exe', name: 'Cyberpunk 2077', icon: '⚡', detail: 'Night City' },
  { exe: 'spotify.exe', name: 'Spotify', icon: '🎵', detail: 'Müzik Dinliyor' },
  { exe: 'code.exe', name: 'Visual Studio Code', icon: '💻', detail: 'Kod Yazıyor' }
];

function scanWindowsGames() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve(null);
    }
    exec('tasklist /fo csv /nh', { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const lower = stdout.toLowerCase();
      for (const game of GAME_SIGNATURES) {
        if (lower.includes(game.exe.toLowerCase())) {
          return resolve(game);
        }
      }
      resolve(null);
    });
  });
}

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

// Instant Game Detection API
app.get('/api/detect-game', async (req, res) => {
  const game = await scanWindowsGames();
  res.json({ detected: !!game, game });
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

// In-memory state & Persistence Engine
const users = new Map();
const voiceChannels = new Map();
const textMessages = persistence.loadMessages();
const channelMusic = new Map();
const watchTogetherRooms = new Map();

function loadAccounts() {
  return persistence.loadAccounts();
}

function saveAccount(userData) {
  return persistence.saveAccount(userData);
}


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
  persistence.scheduleSaveMessages(textMessages);
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

function parseDurationToSeconds(duration) {
  if (typeof duration === 'number') return duration;
  if (!duration || typeof duration !== 'string' || duration.toLowerCase().includes('canlı') || duration.toLowerCase().includes('live')) {
    return 0;
  }
  const parts = duration.trim().split(':').map(p => parseInt(p, 10));
  if (parts.some(isNaN)) return 210;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const parsed = parseInt(duration, 10);
  return isNaN(parsed) ? 210 : parsed;
}

function formatDuration(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return '0:00';
  const total = Math.floor(totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  if (hours > 0) {
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function setVoiceChannelMusic(targetVoiceChannelId, track, senderUsername = 'Kullanıcı') {
  const durationSec = parseDurationToSeconds(track.duration);
  const state = {
    isPlaying: true,
    isBuffering: true,
    currentTrack: {
      ...track,
      durationSec,
      requestedBy: senderUsername
    },
    duration: durationSec,
    currentTime: 0,
    volume: 80,
    startedAt: null,
    updatedAt: Date.now()
  };

  // Fallback timer: if no client reports synced start within 4s, activate timer naturally
  setTimeout(() => {
    const current = channelMusic.get(targetVoiceChannelId);
    if (current && current.isBuffering && current.isPlaying) {
      current.isBuffering = false;
      current.startedAt = Date.now();
      current.updatedAt = Date.now();
      io.emit('music-state-updated', { channelId: targetVoiceChannelId, state: current });
    }
  }, 4000);
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
function stopVoiceChannelMusic(targetVoiceChannelId, reason = 'stop') {
  const existing = channelMusic.get(targetVoiceChannelId);
  if (!existing || (!existing.isPlaying && !existing.currentTrack)) {
    return;
  }

  const trackTitle = existing.currentTrack?.title || existing.currentTrack?.name;
  console.log(`[Music Stopped] Channel: ${targetVoiceChannelId}, Reason: ${reason}, Track: ${trackTitle || 'None'}`);

  const state = {
    isPlaying: false,
    currentTrack: null,
    duration: 0,
    currentTime: 0,
    volume: 80,
    startedAt: 0,
    updatedAt: Date.now()
  };
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
  return state;
}

// Global server-side music duration watchdog (guarantees music closes when song finishes)
setInterval(() => {
  for (const [channelId, state] of channelMusic.entries()) {
    if (state && state.isPlaying && state.currentTrack && state.currentTrack.source !== 'station') {
      if (state.isBuffering) continue;
      const maxDur = state.duration || state.currentTrack.durationSec || 0;
      if (maxDur > 0 && state.startedAt) {
        const elapsed = (Date.now() - (state.updatedAt || state.startedAt)) / 1000;
        const totalPlayed = (state.currentTime || 0) + elapsed;
        if (totalPlayed >= maxDur + 2.5) {
          console.log(`[Music Auto-Ended by Watchdog] ${state.currentTrack.title || state.currentTrack.name} finished in ${channelId}`);
          stopVoiceChannelMusic(channelId, 'duration-completed');
        }
      }
    }
  }
}, 1000);


app.get('/api/accounts', (req, res) => {
  res.json({ accounts: loadAccounts() });
});

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

const channels = persistence.loadChannels();

channels.forEach(ch => {
  if (ch.type === 'text' && !textMessages.has(ch.id)) textMessages.set(ch.id, []);
  if (ch.type === 'voice' && !voiceChannels.has(ch.id)) voiceChannels.set(ch.id, new Set());
});

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  socket.emit('initial-data', {
    channels,
    stations: MUSIC_STATIONS,
    watchTogether: Object.fromEntries(watchTogetherRooms),
    music: Object.fromEntries(channelMusic)
  });

  socket.on('user-join', (userData) => {
    if (!userData) return;
    const cleanUsername = (userData.username || `Üye-${socket.id.slice(0, 4)}`).trim();

    // DEDUPLICATION: Check if another socket has the exact same username or ID
    // If so, replace old socket so user NEVER takes up duplicate slots (+1 yer kaplamaz)
    for (const [existingSocketId, existingUser] of users.entries()) {
      if (existingSocketId !== socket.id) {
        const isSameName = existingUser.username.toLowerCase() === cleanUsername.toLowerCase();
        const isSameId = userData.id && existingUser.id === userData.id;

        if (isSameName || isSameId) {
          console.log(`[Session Replaced] ${cleanUsername} reconnected from socket ${socket.id}. Removing stale socket ${existingSocketId}.`);
          
          // Clean up voice channel if old socket was in voice
          for (const [chId, membersSet] of voiceChannels.entries()) {
            if (membersSet.has(existingUser.id) || membersSet.has(existingSocketId)) {
              membersSet.delete(existingUser.id);
              membersSet.delete(existingSocketId);
            }
          }

          const oldSocket = io.sockets.sockets.get(existingSocketId);
          if (oldSocket) {
            oldSocket.emit('session-replaced', { 
              message: 'Hesabınıza başka bir sekmeden veya cihazdan (Google Chrome vb.) giriş yapıldı.' 
            });
          }

          users.delete(existingSocketId);
        }
      }
    }

    const user = {
      socketId: socket.id,
      id: userData.id || ('user-' + cleanUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '')),
      username: cleanUsername,
      avatar: userData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      color: userData.color || '#5865F2',
      status: userData.status || 'online',
      customStatus: userData.customStatus || 'Fivecord kullanıyor',
      activity: userData.activity || '',
      activityIcon: userData.activityIcon || '🎮',
      activityDetail: userData.activityDetail || '',
      activityStartTime: userData.activityStartTime || (userData.activity ? Date.now() : null),
      entranceSound: userData.entranceSound || 'mvp',
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
    saveAccount(user);
    io.emit('members-updated', getAllMembers());
    console.log(`[User Joined] ${user.username} (${socket.id}) - Toplam Aktif Üye: ${users.size}`);
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
    persistence.saveChannels(channels);
    io.emit('channels-updated', channels);
    console.log(`[Channel Created] ${newCh.name} (${newCh.type})`);
  });

  socket.on('delete-channel', (channelId) => {
    if (channelId === 'text-genel') {
      socket.emit('channel-error', { message: 'Ana genel sohbet kanalı silinemez.' });
      return;
    }
    const idx = channels.findIndex(c => c.id === channelId);
    if (idx !== -1) {
      const [removed] = channels.splice(idx, 1);
      if (removed.type === 'text') {
        textMessages.delete(removed.id);
      }
      if (removed.type === 'voice') {
        voiceChannels.delete(removed.id);
        channelMusic.delete(removed.id);
        // Kick any members in this voice channel
        for (const user of users.values()) {
          if (user.voiceState?.channelId === removed.id) {
            user.voiceState.channelId = null;
            user.voiceState.isSpeaking = false;
            user.voiceState.isScreenSharing = false;
            user.voiceState.isCameraOn = false;
          }
        }
        if (DJ_BOT_USER.voiceState.channelId === removed.id) {
          DJ_BOT_USER.voiceState.channelId = null;
          DJ_BOT_USER.voiceState.isSpeaking = false;
        }
        io.emit('members-updated', getAllMembers());
      }
      persistence.saveChannels(channels);
      io.emit('channels-updated', channels);
      io.emit('channel-deleted', channelId);
      console.log(`[Channel Deleted] ${removed.name} (${channelId})`);
    }
  });

  socket.on('rename-channel', ({ channelId, newName }) => {
    if (!newName || !newName.trim()) return;
    const ch = channels.find(c => c.id === channelId);
    if (ch) {
      const clean = newName.trim();
      ch.name = (ch.type === 'voice' && !clean.startsWith('🔊') && !clean.startsWith('🎮') && !clean.startsWith('🍿'))
        ? `🔊 ${clean}`
        : clean;
      persistence.saveChannels(channels);
      io.emit('channels-updated', channels);
      console.log(`[Channel Renamed] ${ch.id} -> ${ch.name}`);
    }
  });

  // --- WATCH TOGETHER (Birlikte YouTube İzle - 0 Delay Senkronizasyon) ---
  socket.on('watch-together-start', ({ channelId, videoId, videoTitle }) => {
    const sender = users.get(socket.id);
    const state = {
      channelId,
      videoId: videoId || null,
      videoTitle: videoTitle || 'YouTube Videosu',
      type: 'youtube',
      isPlaying: true,
      currentTime: 0,
      startedBy: sender ? sender.username : 'Bir arkadaş',
      updatedAt: Date.now(),
      lastAction: {
        type: 'play',
        by: sender ? sender.username : 'Bir arkadaş',
        time: 0,
        timestamp: Date.now()
      }
    };
    watchTogetherRooms.set(channelId, state);
    io.emit('watch-together-updated', { channelId, state });
    console.log(`[WatchTogether Started] YouTube: ${videoTitle || videoId} in ${channelId}`);
  });

  socket.on('watch-together-action', ({ channelId, action, currentTime, senderName }) => {
    const current = watchTogetherRooms.get(channelId);
    if (!current) return;
    const sender = users.get(socket.id);
    const username = senderName || (sender ? sender.username : 'Bir arkadaş');

    // Calculate true elapsed room timestamp
    const elapsed = current.isPlaying && current.updatedAt 
      ? (Date.now() - current.updatedAt) / 1000 
      : 0;
    const currentRoomTime = (current.currentTime || 0) + elapsed;

    if (action === 'play') {
      current.isPlaying = true;
      // Prevent spurious client 0s from rewinding an already playing video
      if (typeof currentTime === 'number' && (currentTime > 0 || currentRoomTime < 2.0)) {
        current.currentTime = currentTime;
      } else {
        current.currentTime = currentRoomTime;
      }
    } else if (action === 'pause') {
      current.isPlaying = false;
      if (typeof currentTime === 'number' && (currentTime > 0 || currentRoomTime < 2.0)) {
        current.currentTime = currentTime;
      } else {
        current.currentTime = currentRoomTime;
      }
    } else if (action === 'seek') {
      if (typeof currentTime === 'number') {
        current.currentTime = Math.max(0, currentTime);
      }
    }

    current.lastAction = {
      type: action,
      by: username,
      time: current.currentTime,
      timestamp: Date.now()
    };
    current.updatedAt = Date.now();
    io.emit('watch-together-updated', { channelId, state: current });
    console.log(`[WatchTogether 0-Delay Action] ${username} -> ${action} (${Math.round(current.currentTime)}s) in ${channelId}`);
  });

  socket.on('watch-together-close', (channelId) => {
    watchTogetherRooms.delete(channelId);
    io.emit('watch-together-updated', { channelId, state: null });
  });

  // --- ENTRANCE SOUNDS (Odaya Giriş Sesleri) ---
  socket.on('user-join-voice-channel', ({ channelId, soundUrl, username }) => {
    if (soundUrl) {
      io.emit('entrance-sound-played', { channelId, soundUrl, username, senderSocketId: socket.id });
    }
  });

  // --- GAME DETECTION & RICH PRESENCE ---
  socket.on('scan-active-game', async () => {
    const user = users.get(socket.id);
    if (!user) return;
    try {
      const detected = await scanWindowsGames();
      if (detected) {
        user.activity = detected.name;
        user.activityIcon = detected.icon;
        user.activityDetail = detected.detail;
        user.activityStartTime = user.activityStartTime || Date.now();
        socket.emit('game-scan-result', { detected: true, game: detected });
        io.emit('members-updated', getAllMembers());
        console.log(`[Game Detected] ${user.username} is playing ${detected.name}`);
      } else {
        socket.emit('game-scan-result', { detected: false });
      }
    } catch (e) {
      console.warn('[Game Scan Error]', e);
      socket.emit('game-scan-result', { detected: false, error: e.message });
    }
  });

  socket.on('set-activity', ({ activity, icon, detail }) => {
    const user = users.get(socket.id);
    if (!user) return;
    user.activity = activity ? activity.trim() : '';
    user.activityIcon = icon || '🎮';
    user.activityDetail = detail ? detail.trim() : '';
    user.activityStartTime = activity ? Date.now() : null;
    io.emit('members-updated', getAllMembers());
    console.log(`[Activity Updated] ${user.username} -> ${user.activity}`);
  });

  socket.on('clear-activity', () => {
    const user = users.get(socket.id);
    if (!user) return;
    user.activity = '';
    user.activityIcon = '🎮';
    user.activityDetail = '';
    user.activityStartTime = null;
    io.emit('members-updated', getAllMembers());
  });

  socket.on('update-profile', (updated) => {
    const user = users.get(socket.id);
    if (!user) return;
    Object.assign(user, updated);
    users.set(socket.id, user);
    saveAccount(user);
    io.emit('members-updated', getAllMembers());
  });

  socket.on('fetch-messages', (channelId) => {
    const msgs = textMessages.get(channelId) || [];
    socket.emit('messages-history', { channelId, messages: msgs });
  });

  socket.on('send-message', ({ channelId, content, file }) => {
    if (!channelId) return;
    const sender = users.get(socket.id);
    if (!sender) return;

    const message = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      channelId,
      sender: {
        id: sender.id,
        username: sender.username,
        avatar: sender.avatar,
        color: sender.color,
        avatarDecoration: sender.avatarDecoration || 'none',
        nameEffect: sender.nameEffect || 'normal',
        badges: sender.badges || [],
        status: sender.status || 'online'
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
    persistence.scheduleSaveMessages(textMessages);

    io.emit('new-message', message);

    // TTS (Text-to-speech) support
    if (content && content.trim().startsWith('/tts ')) {
      const ttsContent = content.trim().slice(5).trim();
      if (ttsContent) {
        message.isTTS = true;
        io.emit('tts-speak', {
          channelId,
          text: ttsContent,
          username: sender.username
        });
      }
    }

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
        stopVoiceChannelMusic(targetVoiceChannelId, 'chat-stop');
        sendBotChatMessage(channelId, `⏹️ **Fivecord DJ**: Müzik durduruldu ve ses odasından ayrıldı.`);
      } else if (cmd === '!pause') {
        const state = channelMusic.get(targetVoiceChannelId);
        if (state) {
          if (state.isPlaying) {
            const elapsed = (Date.now() - (state.updatedAt || state.startedAt || Date.now())) / 1000;
            const maxDur = state.duration > 0 ? state.duration : 999999;
            state.currentTime = Math.min(maxDur, (state.currentTime || 0) + elapsed);
          }
          state.isPlaying = false;
          state.updatedAt = Date.now();
          DJ_BOT_USER.voiceState.isSpeaking = false;
          io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
          io.emit('members-updated', getAllMembers());
          sendBotChatMessage(channelId, `⏸️ **Fivecord DJ**: Müzik duraklatıldı. Devam ettirmek için \`!resume\` yazabilirsiniz.`);
        }
      } else if (cmd === '!resume') {
        const state = channelMusic.get(targetVoiceChannelId);
        if (state && state.currentTrack) {
          state.isPlaying = true;
          state.updatedAt = Date.now();
          DJ_BOT_USER.voiceState.isSpeaking = true;
          io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
          io.emit('members-updated', getAllMembers());
          sendBotChatMessage(channelId, `▶️ **Fivecord DJ**: Müzik devam ediyor: **${state.currentTrack.title || state.currentTrack.name}**`);
        }
      } else if (cmd === '!seek') {
        const state = channelMusic.get(targetVoiceChannelId);
        if (!state || !state.currentTrack) {
          sendBotChatMessage(channelId, `🔇 Şu anda çalan bir şarkı yok.`);
          return;
        }
        if (!arg) {
          sendBotChatMessage(channelId, `❓ **Kullanım:** \`!seek <saniye veya dakika:saniye>\`\nÖrnek: \`!seek 1:30\` veya \`!seek 45\``);
          return;
        }
        const targetSec = parseDurationToSeconds(arg);
        const maxDur = state.duration > 0 ? state.duration : 999999;
        state.currentTime = Math.max(0, Math.min(targetSec, maxDur));
        state.updatedAt = Date.now();
        io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
        sendBotChatMessage(channelId, `⏩ **Fivecord DJ**: Şarkı \`${formatDuration(state.currentTime)}\` konumuna sarıldı.`);
      } else if (cmd === '!forward' || cmd === '!ileri') {
        const state = channelMusic.get(targetVoiceChannelId);
        if (!state || !state.currentTrack) {
          sendBotChatMessage(channelId, `🔇 Şu anda çalan bir şarkı yok.`);
          return;
        }
        const delta = parseInt(arg, 10) || 10;
        const elapsed = state.isPlaying ? (Date.now() - (state.updatedAt || state.startedAt || Date.now())) / 1000 : 0;
        const currentPos = (state.currentTime || 0) + elapsed;
        const maxDur = state.duration > 0 ? state.duration : 999999;
        state.currentTime = Math.min(maxDur, currentPos + delta);
        state.updatedAt = Date.now();
        io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
        const durStr = state.duration > 0 ? ` / ${formatDuration(state.duration)}` : '';
        sendBotChatMessage(channelId, `⏩ **Fivecord DJ**: Şarkı \`+${delta}s\` ileri sarıldı (\`${formatDuration(state.currentTime)}${durStr}\`).`);
      } else if (cmd === '!rewind' || cmd === '!geri') {
        const state = channelMusic.get(targetVoiceChannelId);
        if (!state || !state.currentTrack) {
          sendBotChatMessage(channelId, `🔇 Şu anda çalan bir şarkı yok.`);
          return;
        }
        const delta = parseInt(arg, 10) || 10;
        const elapsed = state.isPlaying ? (Date.now() - (state.updatedAt || state.startedAt || Date.now())) / 1000 : 0;
        const currentPos = (state.currentTime || 0) + elapsed;
        state.currentTime = Math.max(0, currentPos - delta);
        state.updatedAt = Date.now();
        io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
        const durStr = state.duration > 0 ? ` / ${formatDuration(state.duration)}` : '';
        sendBotChatMessage(channelId, `⏪ **Fivecord DJ**: Şarkı \`-${delta}s\` geri sarıldı (\`${formatDuration(state.currentTime)}${durStr}\`).`);
      } else if (cmd === '!np' || cmd === '!nowplaying') {
        const state = channelMusic.get(targetVoiceChannelId);
        if (state && state.isPlaying && state.currentTrack) {
          const elapsed = (Date.now() - (state.updatedAt || state.startedAt || Date.now())) / 1000;
          const currentPos = Math.floor((state.currentTime || 0) + elapsed);
          const timeStr = state.duration > 0 
            ? `${formatDuration(currentPos)} / ${formatDuration(state.duration)}`
            : `${formatDuration(currentPos)} (Canlı)`;
          sendBotChatMessage(
            channelId,
            `🎶 **Şu An Çalan:** **${state.currentTrack.title || state.currentTrack.name}**\n⏱️ **Süre:** \`${timeStr}\` | 👤 **İsteyen:** @${state.currentTrack.requestedBy || 'Bilinmiyor'}\n⏩ **İleri/Geri Sar:** \`!ileri 15\` veya \`!geri 10\``
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
          `• \`!seek <saniye veya dakika:saniye>\` — Şarkıyı istenen süreye sarar (Örn: \`!seek 1:30\`)\n` +
          `• \`!forward\` veya \`!ileri <saniye>\` — Şarkıyı ileri sarar (Örn: \`!ileri 15\`)\n` +
          `• \`!rewind\` veya \`!geri <saniye>\` — Şarkıyı geri sarar (Örn: \`!geri 10\`)\n` +
          `• \`!np\` — Şu an çalan şarkıyı ve süresini gösterir\n` +
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
    persistence.scheduleSaveMessages(textMessages);
  });

  socket.on('delete-message', ({ channelId, messageId }) => {
    const msgs = textMessages.get(channelId) || [];
    const filtered = msgs.filter(m => m.id !== messageId);
    textMessages.set(channelId, filtered);
    persistence.scheduleSaveMessages(textMessages);
    io.emit('message-deleted', { channelId, messageId });
  });

  socket.on('pin-message', ({ channelId, messageId }) => {
    const msgs = textMessages.get(channelId) || [];
    const msg = msgs.find(m => m.id === messageId);
    if (msg) {
      msg.isPinned = !msg.isPinned;
      persistence.scheduleSaveMessages(textMessages);
      io.emit('message-pinned', { channelId, messageId, isPinned: msg.isPinned });
    }
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

    // Broadcast VIP entrance sound
    const soundPreset = user.entranceSound || 'mvp';
    if (soundPreset !== 'none') {
      io.emit('entrance-sound-played', {
        channelId,
        soundPreset,
        username: user.username,
        senderSocketId: socket.id
      });
    }

    // Immediately sync current channel music to the joining user
    const currentMusic = channelMusic.get(channelId);
    if (currentMusic) {
      socket.emit('music-state-updated', { channelId, state: currentMusic });
    }
  });

  socket.on('leave-voice-channel', () => {
    const user = users.get(socket.id);
    if (!user || !user.voiceState.channelId) return;

    const channelId = user.voiceState.channelId;
    const channelUsers = voiceChannels.get(channelId);
    if (channelUsers) {
      channelUsers.delete(socket.id);
      const humanMembers = Array.from(channelUsers).filter(id => id !== DJ_BOT_USER.id);
      if (humanMembers.length === 0 && channelMusic.has(channelId)) {
        stopVoiceChannelMusic(channelId, 'empty-room-leave');
      }
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

  socket.on('signal', ({ targetSocketId, signal, streamType, screenStreamId }) => {
    io.to(targetSocketId).emit('signal', {
      senderSocketId: socket.id,
      signal,
      streamType: streamType || 'user',
      screenStreamId: screenStreamId || null
    });
  });

  // Real-time Voice Relay via WebSocket (Guaranteed audio delivery across CGNAT / Firewalls)
  socket.on('voice-pcm-chunk', ({ channelId, sampleRate, buffer }) => {
    const user = users.get(socket.id);
    if (!user || user.voiceState?.isMuted) return;
    socket.to(`voice-${channelId}`).emit('voice-pcm-chunk', {
      senderSocketId: socket.id,
      userId: user.id,
      username: user.username,
      sampleRate,
      buffer
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

  socket.on('music-seek', ({ channelId, currentTime }) => {
    const state = channelMusic.get(channelId);
    if (state && state.currentTrack) {
      const maxDur = state.duration > 0 ? state.duration : 999999;
      state.currentTime = Math.max(0, Math.min(Number(currentTime) || 0, maxDur));
      state.updatedAt = Date.now();
      io.emit('music-state-updated', { channelId, state });
    }
  });

  socket.on('music-pause', ({ channelId }) => {
    const state = channelMusic.get(channelId);
    if (state) {
      if (state.isPlaying) {
        const elapsed = (Date.now() - (state.updatedAt || state.startedAt || Date.now())) / 1000;
        const maxDur = state.duration > 0 ? state.duration : 999999;
        state.currentTime = Math.min(maxDur, (state.currentTime || 0) + elapsed);
      }
      state.isPlaying = false;
      state.updatedAt = Date.now();
      DJ_BOT_USER.voiceState.isSpeaking = false;
      io.emit('music-state-updated', { channelId, state });
      io.emit('members-updated', getAllMembers());
    }
  });

  socket.on('music-resume', ({ channelId }) => {
    const state = channelMusic.get(channelId);
    if (state && state.currentTrack) {
      state.isPlaying = true;
      state.updatedAt = Date.now();
      DJ_BOT_USER.voiceState.isSpeaking = true;
      io.emit('music-state-updated', { channelId, state });
      io.emit('members-updated', getAllMembers());
    }
  });

  socket.on('music-stop', ({ channelId }) => {
    stopVoiceChannelMusic(channelId, 'user-stop');
  });

  socket.on('music-ended', ({ channelId, trackId }) => {
    const state = channelMusic.get(channelId);
    if (!state || !state.currentTrack) return;
    if (state.currentTrack.source === 'station') return;
    if (trackId && state.currentTrack.id !== trackId) return;

    stopVoiceChannelMusic(channelId, 'track-ended');
  });

  socket.on('music-synced-start', ({ channelId, trackId, currentTime = 0 }) => {
    const state = channelMusic.get(channelId);
    if (!state || !state.currentTrack) return;
    if (trackId && state.currentTrack.id !== trackId) return;

    if (state.isBuffering) {
      state.isBuffering = false;
      state.startedAt = Date.now() - (currentTime * 1000);
      state.updatedAt = Date.now();
      state.currentTime = currentTime;
      io.emit('music-state-updated', { channelId, state });
      console.log(`[Music Synced Start] Audio officially playing at 0:00 for ${state.currentTrack.title || state.currentTrack.name} in ${channelId}`);
    }
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
        const vChId = user.voiceState.channelId;
        const ch = voiceChannels.get(vChId);
        if (ch) {
          ch.delete(socket.id);
          const humanMembers = Array.from(ch).filter(id => id !== DJ_BOT_USER.id);
          if (humanMembers.length === 0 && channelMusic.has(vChId)) {
            stopVoiceChannelMusic(vChId, 'empty-room-disconnect');
          }
        }
        socket.to(`voice-${vChId}`).emit('user-left-voice', {
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
