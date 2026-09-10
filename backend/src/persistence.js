import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');
export const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
export const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
export const ROOM_STATES_FILE = path.join(DATA_DIR, 'room_states.json');
export const ROLES_FILE = path.join(DATA_DIR, 'roles.json');
export const BANS_FILE = path.join(DATA_DIR, 'bans.json');
export const SERVERS_FILE = path.join(DATA_DIR, 'servers.json');

export const DEFAULT_ROLES = [
  {
    id: 'role-founder',
    name: '👑 Kurucu',
    color: '#f1c40f',
    position: 1,
    hoist: true,
    permissions: ['admin', 'kick', 'ban', 'manage_roles', 'manage_channels', 'mute_members']
  },
  {
    id: 'role-mod',
    name: '🛡️ Moderatör',
    color: '#3498db',
    position: 2,
    hoist: true,
    permissions: ['kick', 'ban', 'mute_members']
  },
  {
    id: 'role-vip',
    name: '⭐ VIP',
    color: '#9b59b6',
    position: 3,
    hoist: true,
    permissions: ['priority_speaker']
  },
  {
    id: 'role-member',
    name: 'Üye',
    color: '#99aab5',
    position: 4,
    hoist: false,
    permissions: []
  }
];

export const DEFAULT_CHANNELS = [
  { id: 'text-genel', name: 'genel-sohbet', type: 'text', topic: 'Topluluk ana sohbet alanı' },
  { id: 'text-oyun', name: 'oyun-odası', type: 'text', topic: 'Oyun içi paylaşımlar ve taktikler' },
  { id: 'text-medya', name: 'klipler-ve-ss', type: 'text', topic: 'Ekran görüntüleri ve videolar' },
  { id: 'voice-genel', name: '🔊 Ses Odası - Genel', type: 'voice', bitrate: '128kbps' },
  { id: 'voice-oyun', name: '🎮 Ses Odası - Oyun & Pro', type: 'voice', bitrate: '256kbps' },
  { id: 'voice-sinema', name: '🍿 4K Ekran / Sinema', type: 'voice', bitrate: 'Ultra HQ' }
];

export function safeWriteJSON(filePath, data) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, jsonStr, 'utf8');
    try {
      fs.renameSync(tempPath, filePath);
    } catch (renameErr) {
      // Fallback direct write if atomic rename fails on Windows/container filesystem
      fs.writeFileSync(filePath, jsonStr, 'utf8');
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
    }
  } catch (err) {
    console.error('[Persistence] Error writing ' + path.basename(filePath) + ':', err.message);
  }
}

export function loadChannels() {
  try {
    if (fs.existsSync(CHANNELS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Persistence] Could not read channels.json:', e.message);
  }
  safeWriteJSON(CHANNELS_FILE, DEFAULT_CHANNELS);
  return [...DEFAULT_CHANNELS];
}

export function saveChannels(channels) {
  safeWriteJSON(CHANNELS_FILE, channels);
}

let saveMessagesTimeout = null;

export function loadMessages() {
  const map = new Map();
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const obj = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
      if (obj && typeof obj === 'object') {
        for (const [chId, list] of Object.entries(obj)) {
          if (Array.isArray(list)) {
            map.set(chId, list);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Persistence] Could not read messages.json:', e.message);
  }
  return map;
}

export function saveMessagesNow(messagesMap) {
  try {
    const obj = {};
    for (const [chId, list] of messagesMap.entries()) {
      obj[chId] = list.slice(-500);
    }
    safeWriteJSON(MESSAGES_FILE, obj);
  } catch (e) {
    console.error('[Persistence] Failed saving messages immediately:', e.message);
  }
}

export function scheduleSaveMessages(messagesMap) {
  if (saveMessagesTimeout) clearTimeout(saveMessagesTimeout);
  saveMessagesTimeout = setTimeout(() => {
    saveMessagesNow(messagesMap);
  }, 100);
}

export function loadAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[Persistence] Could not read accounts.json:', e.message);
  }
  return [];
}

export function getAccount(identifier) {
  if (!identifier) return null;
  const accounts = loadAccounts();
  const clean = String(identifier).trim().toLowerCase();
  return accounts.find(a => 
    (a.id && a.id.toLowerCase() === clean) || 
    (a.username && a.username.toLowerCase() === clean)
  ) || null;
}

export function saveAccount(userData) {
  try {
    let accounts = loadAccounts();
    const cleanName = (userData.username || '').trim();
    if (!cleanName) return null;

    const idx = accounts.findIndex(a => 
      (userData.id && a.id === userData.id) || 
      (a.username && a.username.toLowerCase() === cleanName.toLowerCase())
    );
    const existing = idx !== -1 ? accounts[idx] : null;

    let roles = Array.isArray(userData.roles) && userData.roles.length > 0 
      ? userData.roles 
      : (existing?.roles || []);
      
    // If no roles assigned yet and this is the first user (or Emir), make them founder, otherwise member
    if (!roles || roles.length === 0) {
      const isFounderCandidate = cleanName.toLowerCase().includes('emir') || idx === 0 || accounts.length === 0;
      roles = isFounderCandidate ? ['role-founder'] : ['role-member'];
    }

    const acc = {
      id: userData.id || existing?.id || ('user-' + cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '')),
      username: cleanName,
      avatar: userData.avatar || existing?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(cleanName),
      avatarDecoration: userData.avatarDecoration !== undefined ? userData.avatarDecoration : (existing?.avatarDecoration || 'none'),
      banner: userData.banner !== undefined ? userData.banner : (existing?.banner || null),
      bio: userData.bio !== undefined ? userData.bio : (existing?.bio || ''),
      color: userData.color || existing?.color || '#5865F2',
      nameEffect: userData.nameEffect !== undefined ? userData.nameEffect : (existing?.nameEffect || 'normal'),
      badges: Array.isArray(userData.badges) && userData.badges.length > 0 ? userData.badges : (existing?.badges || []),
      customStatus: userData.customStatus !== undefined ? userData.customStatus : (existing?.customStatus || 'Synapse kullanıyor'),
      statusEmoji: userData.statusEmoji !== undefined ? userData.statusEmoji : (existing?.statusEmoji || ''),
      status: userData.status || existing?.status || 'online',
      entranceSound: userData.entranceSound || existing?.entranceSound || 'mvp',
      gameActivity: userData.gameActivity !== undefined ? userData.gameActivity : (existing?.gameActivity || null),
      roles,
      lastSeen: Date.now()
    };

    if (idx !== -1) {
      accounts[idx] = { ...accounts[idx], ...acc };
    } else {
      accounts.push(acc);
    }
    safeWriteJSON(ACCOUNTS_FILE, accounts);
    return acc;
  } catch (e) {
    console.error('[Persistence] Failed saving account:', e.message);
    return null;
  }
}

export function loadRoles() {
  try {
    if (fs.existsSync(ROLES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ROLES_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Persistence] Could not read roles.json:', e.message);
  }
  safeWriteJSON(ROLES_FILE, DEFAULT_ROLES);
  return [...DEFAULT_ROLES];
}

export function saveRoles(roles) {
  safeWriteJSON(ROLES_FILE, roles);
}

export function loadBans() {
  try {
    if (fs.existsSync(BANS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(BANS_FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Persistence] Could not read bans.json:', e.message);
  }
  return [];
}

export function saveBans(bans) {
  safeWriteJSON(BANS_FILE, bans);
}

export function isBanned(userId, username) {
  const bans = loadBans();
  return bans.some(b => 
    (userId && b.userId === userId) || 
    (username && b.username?.toLowerCase() === username.toLowerCase())
  );
}

export function loadRoomStates() {
  try {
    if (fs.existsSync(ROOM_STATES_FILE)) {
      return JSON.parse(fs.readFileSync(ROOM_STATES_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('[Persistence] Could not read room_states.json:', e.message);
  }
  return { music: {}, watchTogether: {} };
}

export function saveRoomStates(musicMap, watchTogetherMap) {
  try {
    const states = {
      music: Object.fromEntries(musicMap),
      watchTogether: Object.fromEntries(watchTogetherMap)
    };
    safeWriteJSON(ROOM_STATES_FILE, states);
  } catch (e) {
    console.error('[Persistence] Failed saving room states:', e.message);
  }
}

export const DEFAULT_SERVERS = [
  {
    id: 'server-main',
    name: 'Synapse Topluluğu',
    icon: 'S',
    avatar: null,
    ownerId: 'user-emir',
    description: 'Resmi Synapse Ana Topluluk Sunucusu',
    isPublic: true,
    channels: DEFAULT_CHANNELS,
    roles: DEFAULT_ROLES,
    members: [],
    createdAt: 1700000000000
  }
];

export function loadServers() {
  try {
    if (fs.existsSync(SERVERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SERVERS_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure server-main has latest channels from channels.json
        const currentChannels = loadChannels();
        const mainIdx = parsed.findIndex(s => s.id === 'server-main');
        if (mainIdx !== -1) {
          parsed[mainIdx].channels = currentChannels;
        } else {
          parsed.unshift({
            ...DEFAULT_SERVERS[0],
            channels: currentChannels,
            roles: loadRoles()
          });
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Persistence] Could not read servers.json:', e.message);
  }
  const initial = [
    {
      ...DEFAULT_SERVERS[0],
      channels: loadChannels(),
      roles: loadRoles()
    }
  ];
  safeWriteJSON(SERVERS_FILE, initial);
  return initial;
}

export function saveServers(servers) {
  safeWriteJSON(SERVERS_FILE, servers);
}

export function createServer({ name, icon, ownerId, description, isPublic = true }) {
  const servers = loadServers();
  const cleanName = (name || 'Yeni Sunucu').trim();
  const serverId = 'server-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  
  const defaultServerChannels = [
    { id: `text-genel-${serverId}`, name: 'genel-sohbet', type: 'text', topic: 'Sunucu ana sohbet alanı' },
    { id: `text-medya-${serverId}`, name: 'medya-paylasim', type: 'text', topic: 'Fotoğraf, video ve klipler' },
    { id: `voice-genel-${serverId}`, name: '🔊 Ses Odası', type: 'voice', bitrate: '128kbps' },
    { id: `voice-oyun-${serverId}`, name: '🎮 Oyun & Pro', type: 'voice', bitrate: '256kbps' }
  ];

  const newServer = {
    id: serverId,
    name: cleanName,
    icon: (icon && icon.trim()) ? icon.trim() : cleanName.slice(0, 2).toUpperCase(),
    avatar: null,
    ownerId: ownerId || null,
    description: description || `${cleanName} resmi sunucusu`,
    isPublic: isPublic !== false,
    channels: defaultServerChannels,
    roles: DEFAULT_ROLES,
    members: ownerId ? [ownerId] : [],
    createdAt: Date.now()
  };

  servers.push(newServer);
  saveServers(servers);
  return newServer;
}

export function deleteServer(serverId, requesterId) {
  if (serverId === 'server-main') return false; // Cannot delete primary server
  let servers = loadServers();
  const target = servers.find(s => s.id === serverId);
  if (!target) return false;

  // Only owner or admin can delete
  if (target.ownerId && requesterId && target.ownerId !== requesterId && requesterId !== 'user-emir') {
    return false;
  }

  servers = servers.filter(s => s.id !== serverId);
  saveServers(servers);
  return true;
}
