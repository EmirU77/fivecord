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

app.get('/api/music/stations', (req, res) => {
  res.json(MUSIC_STATIONS);
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

    // Bot command check (!play, !stop, !pause, !resume, !radio, !help)
    const trimmed = (content || '').trim();
    if (trimmed.startsWith('!')) {
      const parts = trimmed.split(' ');
      const cmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(' ').trim();
      const targetVoiceChannelId = sender.voiceState?.channelId || 'voice-genel';

      if (cmd === '!play') {
        let station = MUSIC_STATIONS.find(s => s.id === arg.toLowerCase() || s.name.toLowerCase().includes(arg.toLowerCase()));
        let track;
        if (station) {
          track = { id: station.id, name: station.name, url: station.url, genre: station.genre, icon: station.icon };
        } else if (arg.startsWith('http')) {
          track = { id: 'custom-' + Date.now(), name: 'Özel Radyo / Ses Yayını', url: arg, genre: 'Özel URL', icon: '🎵' };
        } else {
          station = MUSIC_STATIONS[0];
          track = { id: station.id, name: station.name, url: station.url, genre: station.genre, icon: station.icon };
        }

        const state = {
          isPlaying: true,
          currentTrack: track,
          volume: 80,
          startedAt: Date.now()
        };
        channelMusic.set(targetVoiceChannelId, state);

        DJ_BOT_USER.voiceState.channelId = targetVoiceChannelId;
        DJ_BOT_USER.voiceState.isSpeaking = true;
        DJ_BOT_USER.customStatus = `🎵 ${track.name}`;

        if (voiceChannels.has(targetVoiceChannelId)) {
          voiceChannels.get(targetVoiceChannelId).add(DJ_BOT_USER.id);
        }

        io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
        io.emit('members-updated', getAllMembers());

        sendBotChatMessage(channelId, `🎶 **Fivecord DJ** odaya katıldı ve çalıyor: **${track.name}** [${track.genre}]`);
      } else if (cmd === '!stop') {
        const state = { isPlaying: false, currentTrack: null, volume: 80, startedAt: 0 };
        channelMusic.set(targetVoiceChannelId, state);

        DJ_BOT_USER.voiceState.channelId = null;
        DJ_BOT_USER.voiceState.isSpeaking = false;
        DJ_BOT_USER.customStatus = '🎵 7/24 Müzik Botu';

        if (voiceChannels.has(targetVoiceChannelId)) {
          voiceChannels.get(targetVoiceChannelId).delete(DJ_BOT_USER.id);
        }

        io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
        io.emit('members-updated', getAllMembers());

        sendBotChatMessage(channelId, `⏹️ **Fivecord DJ**: Müzik durduruldu ve odadan ayrıldı.`);
      } else if (cmd === '!pause') {
        const state = channelMusic.get(targetVoiceChannelId);
        if (state) {
          state.isPlaying = false;
          DJ_BOT_USER.voiceState.isSpeaking = false;
          io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
          io.emit('members-updated', getAllMembers());
          sendBotChatMessage(channelId, `⏸️ **Fivecord DJ**: Müzik duraklatıldı.`);
        }
      } else if (cmd === '!resume') {
        const state = channelMusic.get(targetVoiceChannelId);
        if (state && state.currentTrack) {
          state.isPlaying = true;
          DJ_BOT_USER.voiceState.isSpeaking = true;
          io.emit('music-state-updated', { channelId: targetVoiceChannelId, state });
          io.emit('members-updated', getAllMembers());
          sendBotChatMessage(channelId, `▶️ **Fivecord DJ**: Müzik devam ediyor.`);
        }
      } else if (cmd === '!radio' || cmd === '!help') {
        const list = MUSIC_STATIONS.map(s => `• \`!play ${s.id}\` — ${s.name}`).join('\n');
        sendBotChatMessage(channelId, `📻 **Fivecord DJ 7/24 Müzik İstasyonları:**\n${list}\n\n*Komutlar: \`!play <istasyon/url>\`, \`!pause\`, \`!resume\`, \`!stop\`*`);
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

  socket.on('music-play', ({ channelId, stationId, customUrl, customName }) => {
    let track;
    if (stationId) {
      const station = MUSIC_STATIONS.find(s => s.id === stationId);
      if (station) {
        track = { id: station.id, name: station.name, url: station.url, genre: station.genre, icon: station.icon };
      }
    } else if (customUrl) {
      track = {
        id: 'custom-' + Date.now(),
        name: customName || 'Özel Radyo / Ses Yayını',
        url: customUrl,
        genre: 'Özel Akış',
        icon: '🎵'
      };
    }

    if (!track) return;

    const state = {
      isPlaying: true,
      currentTrack: track,
      volume: 80,
      startedAt: Date.now()
    };
    channelMusic.set(channelId, state);

    DJ_BOT_USER.voiceState.channelId = channelId;
    DJ_BOT_USER.voiceState.isSpeaking = true;
    DJ_BOT_USER.customStatus = `🎵 ${track.name}`;

    if (voiceChannels.has(channelId)) {
      voiceChannels.get(channelId).add(DJ_BOT_USER.id);
    }

    io.emit('music-state-updated', { channelId, state });
    io.emit('members-updated', getAllMembers());
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
