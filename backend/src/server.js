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
    channels
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
    io.emit('members-updated', Array.from(users.values()));
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
    io.emit('members-updated', Array.from(users.values()));
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

    io.emit('members-updated', Array.from(users.values()));
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

    io.emit('members-updated', Array.from(users.values()));
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
    io.emit('members-updated', Array.from(users.values()));
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
      io.emit('members-updated', Array.from(users.values()));
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
