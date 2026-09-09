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

export const DEFAULT_CHANNELS = [
  { id: 'text-genel', name: 'genel-sohbet', type: 'text', topic: '5 kişilik ana sohbet alanı' },
  { id: 'text-oyun', name: 'oyun-odası', type: 'text', topic: 'Oyun içi paylaşımlar ve taktikler' },
  { id: 'text-medya', name: 'klipler-ve-ss', type: 'text', topic: 'Ekran görüntüleri ve videolar' },
  { id: 'voice-genel', name: '🔊 Ses Odası - Genel', type: 'voice', bitrate: '128kbps' },
  { id: 'voice-oyun', name: '🎮 Ses Odası - Oyun & Pro', type: 'voice', bitrate: '256kbps' },
  { id: 'voice-sinema', name: '🍿 4K Ekran / Sinema', type: 'voice', bitrate: 'Ultra HQ' }
];

export function safeWriteJSON(filePath, data) {
  try {
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error('[Persistence] Error writing ' + path.basename(filePath) + ':', err.message);
  }
}

export function loadChannels() {
  try {
    if (fs.existsSync(CHANNELS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
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

export function scheduleSaveMessages(messagesMap) {
  if (saveMessagesTimeout) clearTimeout(saveMessagesTimeout);
  saveMessagesTimeout = setTimeout(() => {
    try {
      const obj = {};
      for (const [chId, list] of messagesMap.entries()) {
        obj[chId] = list.slice(-500);
      }
      safeWriteJSON(MESSAGES_FILE, obj);
    } catch (e) {
      console.error('[Persistence] Failed saving messages:', e.message);
    }
  }, 500);
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

export function saveAccount(userData) {
  try {
    let accounts = loadAccounts();
    const cleanName = (userData.username || '').trim();
    if (!cleanName) return;

    const idx = accounts.findIndex(a => a.username.toLowerCase() === cleanName.toLowerCase());
    const acc = {
      id: userData.id || ('user-' + cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '')),
      username: cleanName,
      avatar: userData.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(cleanName),
      avatarDecoration: userData.avatarDecoration || 'none',
      banner: userData.banner || null,
      bio: userData.bio || '',
      color: userData.color || '#5865F2',
      nameEffect: userData.nameEffect || 'normal',
      badges: Array.isArray(userData.badges) ? userData.badges : [],
      customStatus: userData.customStatus || 'Fivecord kullanıyor',
      statusEmoji: userData.statusEmoji || '',
      status: userData.status || 'online',
      entranceSound: userData.entranceSound || 'mvp',
      lastSeen: Date.now()
    };

    if (idx !== -1) {
      accounts[idx] = { ...accounts[idx], ...acc };
    } else {
      accounts.push(acc);
    }
    safeWriteJSON(ACCOUNTS_FILE, accounts);
  } catch (e) {
    console.error('[Persistence] Failed saving account:', e.message);
  }
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
