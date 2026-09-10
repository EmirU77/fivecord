import React, { useState, useEffect, useRef } from 'react';
import ServerRail from './components/ServerRail';
import Sidebar from './components/Sidebar';
import DMSidebar from './components/DMSidebar';
import ChatArea from './components/ChatArea';
import VoiceRoom from './components/VoiceRoom';
import MemberList from './components/MemberList';
import ScreenShareModal from './components/ScreenShareModal';
import CreateChannelModal from './components/CreateChannelModal';
import DeleteChannelModal from './components/DeleteChannelModal';
import RenameChannelModal from './components/RenameChannelModal';
import ServerInfoModal from './components/ServerInfoModal';
import CreateServerModal from './components/CreateServerModal';
import DownloadModal from './components/DownloadModal';
import MusicPlayerModal from './components/MusicPlayerModal';
import BackgroundMusicPlayer, { loadYouTubeApi } from './components/BackgroundMusicPlayer';
import DecisionWheelModal from './components/DecisionWheelModal';
import WatchTogetherModal from './components/WatchTogetherModal';
import LoginModal from './components/LoginModal';
import UserContextMenu from './components/UserContextMenu';
import MiniPlayer from './components/MiniPlayer';
import RoleManagementModal from './components/RoleManagementModal';
import { socket } from './services/socket';
import { webrtc } from './services/webrtc';
import { voiceRelay } from './services/voiceRelay';
import { screenRelay } from './services/screenRelay';
import { soundEffects } from './services/soundEffects';

const DEFAULT_USER = {
  id: 'user-' + Math.random().toString(36).substring(2, 9),
  username: 'Gamer-' + Math.floor(1000 + Math.random() * 9000),
  avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`,
  color: '#5865f2',
  customStatus: 'Synapse kullanıyor'
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('fivecord_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(() => {
    const remember = localStorage.getItem('fivecord_remember_me');
    const saved = localStorage.getItem('fivecord_user');
    // If user has not explicitly checked "remember me", show login modal on start!
    return !(remember === 'true' && saved);
  });

  // Views: 'server' (Fivecord VIP) | 'dm' (Direct Messages / Özel Mesajlar)
  const [activeView, setActiveView] = useState('server');
  const [activeDmUser, setActiveDmUser] = useState(null);

  // Multi-Server Architecture
  const [servers, setServers] = useState([]);
  const [currentServerId, setCurrentServerId] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const srv = params.get('server') || params.get('invite');
        if (srv) return srv;
      } catch (e) {}
    }
    return localStorage.getItem('synapse_current_server_id') || 'server-main';
  });
  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);

  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [unreadDms, setUnreadDms] = useState(new Set());
  const [closedDms, setClosedDms] = useState(() => {
    try {
      const saved = localStorage.getItem('synapse_closed_dms');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });
  const [blockedUsers, setBlockedUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('synapse_blocked_users');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });
  const [currentVoiceChannel, setCurrentVoiceChannel] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    currentChannelRef.current = currentChannel;
  }, [currentChannel]);

  // Voice & Video States
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);

  // Modals
  const [isScreenModalOpen, setIsScreenModalOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [createChannelType, setCreateChannelType] = useState('text');
  const [channelToDelete, setChannelToDelete] = useState(null);
  const [channelToRename, setChannelToRename] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isAppInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator?.userAgent || '';
    const isElectron = /electron/i.test(ua) || ua.includes('FivecordDesktop') || ua.includes('Fivecord') || !!window.process?.versions?.electron;
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator?.standalone === true;
    const isQueryParam = window.location.search.includes('desktop') || window.location.search.includes('client=desktop');
    return isElectron || isStandalone || isQueryParam || !!window.isFivecordDesktop;
  });
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [musicStates, setMusicStates] = useState(new Map());
  const [musicStations, setMusicStations] = useState([]);
  const [isWheelOpen, setIsWheelOpen] = useState(false);
  const [isWatchTogetherOpen, setIsWatchTogetherOpen] = useState(false);
  const [watchTogetherRooms, setWatchTogetherRooms] = useState(new Map());

  // Remote WebRTC streams
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState(new Map());
  const [roles, setRoles] = useState([]);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, targetMember }

  const audioContainerRef = useRef(null);
  const peerSpeakingTimers = useRef(new Map());
  const activeMusicState = currentVoiceChannel ? musicStates.get(currentVoiceChannel.id) : null;
  const activeWatchTogether = currentVoiceChannel ? watchTogetherRooms.get(currentVoiceChannel.id) : null;

  // Preload YouTube API globally so music starts instantly without delay
  useEffect(() => {
    loadYouTubeApi().catch(() => {});
  }, []);

  // Personal Music Volume (Individual per user - stored locally, not broadcasted)
  const [userMusicVolume, setUserMusicVolume] = useState(() => {
    const saved = localStorage.getItem('fivecord_user_music_volume');
    return saved !== null ? Number(saved) : 80;
  });

  const handleSetUserMusicVolume = (vol) => {
    const safe = Math.max(0, Math.min(100, Number(vol) || 0));
    setUserMusicVolume(safe);
    localStorage.setItem('fivecord_user_music_volume', safe);
  };


  const handleLogin = (userData) => {
    localStorage.setItem('fivecord_user', JSON.stringify(userData));
    setCurrentUser(userData);
    setIsLoginModalOpen(false);
    socket.emit('user-join', userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('fivecord_user');
    if (currentVoiceChannel) {
      socket.emit('leave-voice-channel');
      setCurrentVoiceChannel(null);
    }
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  };

  const handleUpdateProfile = (updated) => {
    const newUser = { ...currentUser, ...updated };
    setCurrentUser(newUser);
    localStorage.setItem('fivecord_user', JSON.stringify(newUser));
    socket.emit('update-profile', newUser);
  };

  // --- SOCKET.IO INITIALIZATION ---
  useEffect(() => {
    socket.on('connect', () => {
      if (currentUser) {
        socket.emit('user-join', currentUser);
      }
    });

    socket.on('session-replaced', ({ message }) => {
      alert(message || 'Hesabınıza başka bir sekmeden veya cihazdan giriş yapıldı.');
    });

    socket.on('initial-data', ({ servers: initServers, channels, stations, watchTogether, music, roles }) => {
      if (initServers && initServers.length > 0) {
        setServers(initServers);
      }
      setChannels(channels);
      if (stations) setMusicStations(stations);
      if (roles) setRoles(roles);
      if (watchTogether) {
        setWatchTogetherRooms(new Map(Object.entries(watchTogether)));
      }
      if (music) {
        setMusicStates(new Map(Object.entries(music)));
      }
      const lastChId = localStorage.getItem('fivecord_last_channel_id');
      const targetChannel = (lastChId && channels.find(c => c.id === lastChId)) || channels.find(c => c.type === 'text') || channels[0];
      if (targetChannel && activeView === 'server') {
        setCurrentChannel(targetChannel);
        currentChannelRef.current = targetChannel;
        socket.emit('fetch-messages', targetChannel.id);
      }
    });

    socket.on('servers-updated', (updatedServers) => {
      setServers(updatedServers);
    });

    socket.on('server-created', (newServer) => {
      setServers(prev => {
        if (prev.some(s => s.id === newServer.id)) return prev;
        return [...prev, newServer];
      });
      if (newServer.ownerId === currentUser?.id) {
        setCurrentServerId(newServer.id);
        try { localStorage.setItem('synapse_current_server_id', newServer.id); } catch (e) {}
        setActiveView('server');
        if (newServer.channels && newServer.channels[0]) {
          setCurrentChannel(newServer.channels[0]);
          currentChannelRef.current = newServer.channels[0];
          socket.emit('fetch-messages', newServer.channels[0].id);
        }
      }
    });

    socket.on('server-deleted', (deletedServerId) => {
      setServers(prev => prev.filter(s => s.id !== deletedServerId));
      if (currentServerId === deletedServerId) {
        setCurrentServerId('server-main');
        try { localStorage.setItem('synapse_current_server_id', 'server-main'); } catch (e) {}
      }
    });

    socket.on('server-error', ({ message }) => {
      alert(message || 'Sunucu işleminde hata oluştu.');
    });

    socket.on('roles-updated', (updatedRoles) => {
      setRoles(updatedRoles);
    });

    socket.on('kicked-from-server', ({ reason }) => {
      alert(`[Sunucudan Atıldınız]\n${reason || 'Sunucu yetkilisi tarafından sunucudan atıldınız.'}`);
      window.location.reload();
    });

    socket.on('banned-from-server', ({ reason }) => {
      alert(`[Sunucudan Yasaklandınız]\n${reason || 'Sunucudan kalıcı olarak yasaklandınız.'}`);
      window.location.reload();
    });

    socket.on('channels-updated', (updatedChannels) => {
      setChannels(updatedChannels);
    });

    socket.on('channel-deleted', (deletedChannelId) => {
      setChannels(prev => {
        const updated = prev.filter(c => c.id !== deletedChannelId);
        if (currentChannel?.id === deletedChannelId) {
          const fallback = updated.find(c => c.type === 'text') || updated[0];
          if (fallback) {
            setCurrentChannel(fallback);
            socket.emit('fetch-messages', fallback.id);
          }
        }
        return updated;
      });
    });

    socket.on('members-updated', (updatedMembers) => {
      setMembers(updatedMembers);
      if (currentUser) {
        const me = updatedMembers.find(m => 
          m.id === currentUser.id || 
          (m.username && currentUser.username && m.username.toLowerCase() === currentUser.username.toLowerCase())
        );
        if (me && JSON.stringify(me.roles) !== JSON.stringify(currentUser.roles)) {
          setCurrentUser(prev => {
            const updated = { ...prev, roles: me.roles, highestRole: me.highestRole };
            try { localStorage.setItem('fivecord_user', JSON.stringify(updated)); } catch (e) {}
            return updated;
          });
        }
      }
    });

    socket.on('messages-history', ({ channelId, messages }) => {
      if (currentChannelRef.current?.id === channelId) {
        setMessages(messages);
      }
    });

    socket.on('new-message', (msg) => {
      const isViewingThisChannel = currentChannelRef.current?.id === msg.channelId;
      if (isViewingThisChannel) {
        setMessages(prev => [...prev, msg]);
      } else if (msg.channelId && msg.channelId.startsWith('dm-')) {
        // Incoming DM for a chat that is not currently open
        setUnreadDms(prev => new Set(prev).add(msg.sender.id));
        setClosedDms(prev => {
          if (prev.has(msg.sender.id)) {
            const next = new Set(prev);
            next.delete(msg.sender.id);
            try { localStorage.setItem('synapse_closed_dms', JSON.stringify(Array.from(next))); } catch (e) {}
            return next;
          }
          return prev;
        });
      }

      if (msg.sender.id !== currentUser?.id) {
        soundEffects.playMessage();
      }
    });

    socket.on('message-reaction-updated', ({ channelId, messageId, reactions }) => {
      if (currentChannelRef.current?.id === channelId) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
      }
    });

    socket.on('message-deleted', ({ channelId, messageId }) => {
      if (currentChannelRef.current?.id === channelId) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    });

    socket.on('message-pinned', ({ channelId, messageId, isPinned }) => {
      if (currentChannelRef.current?.id === channelId) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isPinned } : m));
      }
    });

    socket.on('voice-room-peers', ({ channelId, peers }) => {
      webrtc.connectToRoom(peers);
    });

    socket.on('user-joined-voice', async ({ socketId, user }) => {
      console.log(`[Voice Room] ${user?.username || 'User'} joined voice channel (${socketId})`);
      // When a user joins our voice channel, ensure our local audio stream is ready
      await webrtc.initLocalAudio();
    });

    socket.on('user-left-voice', ({ socketId }) => {
      webrtc.removePeer(socketId);
      setRemoteScreenStreams(prev => {
        if (!prev.has(socketId)) return prev;
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    socket.on('peer-voice-state-updated', ({ socketId, voiceState }) => {
      setMembers(prev => prev.map(m => m.socketId === socketId ? { ...m, voiceState } : m));
      if (voiceState.isScreenSharing === false) {
        webrtc.remoteScreenStreams.delete(socketId);
        setRemoteScreenStreams(prev => {
          if (!prev.has(socketId)) return prev;
          const next = new Map(prev);
          next.delete(socketId);
          return next;
        });
      }
    });

    socket.on('music-state-updated', ({ channelId, state }) => {
      setMusicStates(prev => {
        const next = new Map(prev);
        if (state) next.set(channelId, state);
        else next.delete(channelId);
        return next;
      });
    });

    socket.on('watch-together-updated', ({ channelId, state }) => {
      setWatchTogetherRooms(prev => {
        const next = new Map(prev);
        if (state) next.set(channelId, state);
        else next.delete(channelId);
        return next;
      });
    });

    socket.on('entrance-sound-played', ({ channelId, soundPreset, username }) => {
      if (soundPreset && soundPreset !== 'none') {
        soundEffects.playEntrancePreset(soundPreset);
      }
    });

    socket.on('tts-speak', ({ channelId, text, username }) => {
      soundEffects.speakTTS(text);
    });

    socket.on('game-scan-result', ({ detected, game }) => {
      if (detected && game) {
        setCurrentUser(prev => {
          if (prev.activity !== game.name) {
            const updated = {
              ...prev,
              activity: game.name,
              activityIcon: game.icon,
              activityDetail: game.detail,
              activityStartTime: prev.activity === game.name ? prev.activityStartTime : Date.now()
            };
            localStorage.setItem('fivecord_user', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
    });

    // Auto scan for games running on Windows
    socket.emit('scan-active-game');
    const gameScanInterval = setInterval(() => {
      socket.emit('scan-active-game');
    }, 25000);

    webrtc.onScreenStreamAdded = (socketId, stream) => {
      console.log(`[WebRTC] Screen stream added for ${socketId}`);
      setRemoteScreenStreams(prev => {
        const next = new Map(prev);
        next.set(socketId, stream);
        return next;
      });
    };

    webrtc.onScreenStreamRemoved = (socketId) => {
      console.log(`[WebRTC] Screen stream removed for ${socketId}`);
      setRemoteScreenStreams(prev => {
        if (!prev.has(socketId)) return prev;
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      const screenEl = document.getElementById(`audio-screen-${socketId}`);
      if (screenEl) {
        screenEl.srcObject = null;
        screenEl.pause();
      }
    };

    webrtc.onRemoteStreamAdded = (socketId, stream, isScreen) => {
      if (socketId === socket.id || socketId === currentUser?.id || socketId === 'local') {
        // Never play our own stream back into our own ears
        return;
      }

      console.log(`[Audio Debug] Remote stream added for ${socketId}:`, {
        isScreen,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      });

      if (isScreen) {
        setRemoteScreenStreams(prev => {
          const next = new Map(prev);
          next.set(socketId, stream);
          return next;
        });
      } else {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.set(socketId, stream);
          return next;
        });
      }

      // If stream has audio tracks, ensure it is played actively and unmuted
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        let container = audioContainerRef.current || document.getElementById('fivecord-audio-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'fivecord-audio-container';
          container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.001;pointer-events:none;';
          document.body.appendChild(container);
        }

        const audioId = isScreen ? `audio-screen-${socketId}` : `audio-${socketId}`;
        let audioEl = document.getElementById(audioId);
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = audioId;
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          audioEl.setAttribute('autoplay', 'true');
          audioEl.setAttribute('playsinline', 'true');
          container.appendChild(audioEl);
        }

        if (audioEl.srcObject !== stream) {
          audioEl.srcObject = stream;
        }

        // Screen audio and microphone audio both stay unmuted for high-fidelity Opus playback.
        // (voiceRelay coordinates via suppressPeer to prevent duplicate echo when WebRTC connects).
        audioEl.muted = false;
        if (isScreen) {
          const savedStreamVol = localStorage.getItem(`stream_vol_${socketId}`);
          const streamVolumeFactor = savedStreamVol !== null ? Number(savedStreamVol) / 100 : 1.0;
          audioEl.volume = Math.max(0, Math.min(1, streamVolumeFactor));
        } else {
          const userVol = voiceRelay.getUserVolume(socketId);
          const masterVol = voiceRelay.getMasterOutputVolume() / 100;
          audioEl.volume = Math.max(0, Math.min(1, userVol * masterVol));
        }

        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn(`[Autoplay Policy] Play blocked for ${audioId}:`, err);
            const unlockAudio = () => {
              audioEl.play().catch(() => {});
              document.removeEventListener('click', unlockAudio);
              document.removeEventListener('keydown', unlockAudio);
            };
            document.addEventListener('click', unlockAudio, { once: true });
            document.addEventListener('keydown', unlockAudio, { once: true });
          });
        }
      }
    };

    webrtc.onRemoteStreamRemoved = (socketId) => {
      setRemoteStreams(prev => {
        if (!prev.has(socketId)) return prev;
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      const el = document.getElementById(`audio-${socketId}`);
      if (el) {
        el.srcObject = null;
        el.pause();
      }
    };

    webrtc.onSpeakingChanged = (speaking) => {
      setMembers(prev => prev.map(m => m.id === currentUser?.id ? {
        ...m,
        voiceState: { ...m.voiceState, isSpeaking: speaking }
      } : m));

      // Anti-Echo Self-Voice Protection:
      // When local user speaks, duck incoming screen streams by 85% to eliminate own voice echo
      const screenAudios = document.querySelectorAll('[id^="audio-screen-"]');
      screenAudios.forEach(el => {
        const peerSocketId = el.id.replace('audio-screen-', '');
        const savedStreamVol = localStorage.getItem(`stream_vol_${peerSocketId}`);
        const normalVol = savedStreamVol !== null ? Number(savedStreamVol) / 100 : 1.0;
        if (speaking) {
          el.volume = Math.max(0, normalVol * 0.15);
        } else {
          el.volume = Math.max(0, Math.min(1.0, normalVol));
        }
      });
    };

    webrtc.onScreenShareEnded = () => {
      setIsScreenSharing(false);
      setScreenStream(null);
    };

    voiceRelay.onPeerSpeaking = (socketId) => {
      setMembers(prev => prev.map(m => m.socketId === socketId ? {
        ...m,
        voiceState: { ...m.voiceState, isSpeaking: true }
      } : m));

      const existingTimer = peerSpeakingTimers.current.get(socketId);
      if (existingTimer) clearTimeout(existingTimer);

      peerSpeakingTimers.current.set(socketId, setTimeout(() => {
        setMembers(prev => prev.map(m => m.socketId === socketId ? {
          ...m,
          voiceState: { ...m.voiceState, isSpeaking: false }
        } : m));
      }, 600));
    };

    return () => {
      socket.off('connect');
      socket.off('initial-data');
      socket.off('servers-updated');
      socket.off('server-created');
      socket.off('server-deleted');
      socket.off('server-error');
      socket.off('channels-updated');
      socket.off('channel-deleted');
      socket.off('members-updated');
      socket.off('messages-history');
      socket.off('new-message');
      socket.off('message-reaction-updated');
      socket.off('voice-room-peers');
      socket.off('user-joined-voice');
      socket.off('user-left-voice');
      socket.off('peer-voice-state-updated');
      socket.off('music-state-updated');
      socket.off('watch-together-updated');
      socket.off('session-replaced');
      socket.off('entrance-sound-played');
      socket.off('tts-speak');
      socket.off('game-scan-result');
      clearInterval(gameScanInterval);
      voiceRelay.onPeerSpeaking = null;
      peerSpeakingTimers.current.forEach(t => clearTimeout(t));
      peerSpeakingTimers.current.clear();
    };
  }, [currentUser, currentChannel, activeView]);

  useEffect(() => {
    webrtc.setMicrophoneMuted(isMuted);
    voiceRelay.setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    webrtc.setDeafened(isDeafened);
    voiceRelay.setDeafened(isDeafened);
  }, [isDeafened]);

  // Global unlock for browser media autoplay policy on any user gesture
  useEffect(() => {
    const unlockAllMedia = () => {
      voiceRelay.resumeContexts();
      if (webrtc.audioContext && webrtc.audioContext.state === 'suspended') {
        webrtc.audioContext.resume().catch(() => {});
      }
      document.querySelectorAll('audio').forEach(el => {
        if (el.srcObject && el.paused) {
          el.play().catch(() => {});
        }
      });
    };
    window.addEventListener('click', unlockAllMedia);
    window.addEventListener('keydown', unlockAllMedia);
    return () => {
      window.removeEventListener('click', unlockAllMedia);
      window.removeEventListener('keydown', unlockAllMedia);
    };
  }, []);

  const handleReconnectVoice = async () => {
    if (!currentVoiceChannel) return;
    console.log('[Voice] Reconnecting voice channel:', currentVoiceChannel.name);
    voiceRelay.stop();
    webrtc.leaveVoice();
    soundEffects.playJoin();
    await voiceRelay.resumeContexts();
    const stream = await webrtc.initLocalAudio();
    socket.emit('join-voice-channel', { channelId: currentVoiceChannel.id });
    if (stream) {
      voiceRelay.startBroadcasting(currentVoiceChannel.id, stream);
    }
  };

  // --- MULTI-SERVER & CHANNELS CALCULATION ---
  const currentServer = servers.find(s => s.id === currentServerId) || servers.find(s => s.id === 'server-main') || servers[0] || {
    id: 'server-main',
    name: 'Synapse Topluluğu',
    icon: 'S',
    channels: channels
  };

  const activeChannels = (currentServer && Array.isArray(currentServer.channels) && currentServer.channels.length > 0)
    ? currentServer.channels
    : channels;

  const handleSelectServer = (serverId) => {
    setCurrentServerId(serverId);
    try { localStorage.setItem('synapse_current_server_id', serverId); } catch (e) {}
    setActiveView('server');

    const targetSrv = servers.find(s => s.id === serverId);
    const targetChannels = (targetSrv && Array.isArray(targetSrv.channels) && targetSrv.channels.length > 0)
      ? targetSrv.channels
      : (serverId === 'server-main' ? channels : []);

    const firstText = targetChannels.find(c => c.type === 'text') || targetChannels[0];
    if (firstText) {
      handleSelectChannel(firstText);
    }
  };

  const handleCreateServer = (serverData) => {
    socket.emit('create-server', {
      name: serverData.name,
      icon: serverData.icon,
      description: serverData.description,
      isPublic: serverData.isPublic,
      userId: currentUser?.id,
      userName: currentUser?.username
    });
  };

  const handleJoinServer = (targetServerId) => {
    socket.emit('join-server', {
      serverId: targetServerId,
      userId: currentUser?.id,
      userName: currentUser?.username
    });
    setCurrentServerId(targetServerId);
    try { localStorage.setItem('synapse_current_server_id', targetServerId); } catch (e) {}
    setActiveView('server');
    const srv = servers.find(s => s.id === targetServerId);
    if (srv && Array.isArray(srv.channels) && srv.channels[0]) {
      handleSelectChannel(srv.channels[0]);
    }
  };

  const handleDeleteServer = (targetServerId) => {
    socket.emit('delete-server', {
      serverId: targetServerId,
      userId: currentUser?.id
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const srv = params.get('server') || params.get('invite');
        if (srv && srv !== currentServerId) {
          handleJoinServer(srv);
        }
      } catch (e) {}
    }
  }, [currentUser]);

  // --- CHANNEL & DM ACTIONS ---
  const handleSelectChannel = (channel) => {
    setCurrentChannel(channel);
    currentChannelRef.current = channel;
    try {
      localStorage.setItem('fivecord_last_channel_id', channel.id);
    } catch (e) {}
    if (channel.type === 'text') {
      socket.emit('fetch-messages', channel.id);
    }
  };

  const handleOpenCreateChannel = (type = 'text') => {
    setCreateChannelType(type);
    setIsCreateChannelOpen(true);
  };

  const handleDeleteChannel = (channelId) => {
    socket.emit('delete-channel', { channelId, serverId: currentServerId });
    soundEffects.playLeave();
  };

  const handleRenameChannel = (channelId, newName) => {
    socket.emit('rename-channel', { channelId, newName, serverId: currentServerId });
  };

  // Switch to a 1-on-1 private DM with a friend
  const handleSelectDmUser = (targetFriend) => {
    if (!targetFriend) return;
    setActiveDmUser(targetFriend);
    setActiveView('dm');
    setUnreadDms(prev => {
      const next = new Set(prev);
      next.delete(targetFriend.id);
      return next;
    });

    // Automatically unclose DM if it was previously closed
    setClosedDms(prev => {
      if (prev.has(targetFriend.id)) {
        const next = new Set(prev);
        next.delete(targetFriend.id);
        try { localStorage.setItem('synapse_closed_dms', JSON.stringify(Array.from(next))); } catch (e) {}
        return next;
      }
      return prev;
    });

    const dmChannelId = 'dm-' + [(currentUser?.id || 'me'), targetFriend.id].sort().join('-');
    const dmChannel = {
      id: dmChannelId,
      name: targetFriend.username,
      type: 'dm',
      topic: `@${targetFriend.username} ile özel mesajlaşma`,
      avatar: targetFriend.avatar
    };
    setCurrentChannel(dmChannel);
    currentChannelRef.current = dmChannel;
    setMessages([]);
    socket.emit('fetch-messages', dmChannelId);
  };

  const handleCloseDM = (targetFriend) => {
    if (!targetFriend) return;
    setClosedDms(prev => {
      const next = new Set(prev).add(targetFriend.id);
      try { localStorage.setItem('synapse_closed_dms', JSON.stringify(Array.from(next))); } catch (e) {}
      return next;
    });

    if (activeDmUser?.id === targetFriend.id) {
      const nextFriend = members.find(m => m.id !== currentUser?.id && !m.isBot && !closedDms.has(m.id) && m.id !== targetFriend.id);
      if (nextFriend) {
        handleSelectDmUser(nextFriend);
      } else {
        setActiveDmUser(null);
        const emptyCh = { id: 'dm-empty', name: 'Arkadaşlar', type: 'dm', topic: 'Özel Mesajlar' };
        setCurrentChannel(emptyCh);
        currentChannelRef.current = emptyCh;
        setMessages([]);
      }
    }
  };

  const handleClearDMHistory = (targetFriend) => {
    if (!targetFriend) return;
    const dmChannelId = 'dm-' + [(currentUser?.id || 'me'), targetFriend.id].sort().join('-');
    socket.emit('clear-dm-history', { channelId: dmChannelId });
    if (currentChannelRef.current?.id === dmChannelId) {
      setMessages([]);
    }
  };

  const handleToggleBlock = (targetFriend) => {
    if (!targetFriend) return;
    setBlockedUsers(prev => {
      const next = new Set(prev);
      if (next.has(targetFriend.id)) {
        next.delete(targetFriend.id);
      } else {
        next.add(targetFriend.id);
      }
      try { localStorage.setItem('synapse_blocked_users', JSON.stringify(Array.from(next))); } catch (e) {}
      return next;
    });
  };

  const handleOpenContextMenu = (e, targetMember) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetMember
    });
  };

  const handleJoinVoice = async (channel) => {
    soundEffects.playJoin();
    await voiceRelay.resumeContexts();
    const stream = await webrtc.initLocalAudio();
    setCurrentVoiceChannel(channel);
    setCurrentChannel(channel);
    socket.emit('join-voice-channel', { channelId: channel.id });
    socket.emit('fetch-music-state', channel.id);
    if (stream) {
      voiceRelay.startBroadcasting(channel.id, stream);
    }
  };

  const handleLeaveVoice = () => {
    soundEffects.playLeave();
    voiceRelay.stop();
    screenRelay.stopAll();
    webrtc.leaveVoice();
    setIsScreenSharing(false);
    setScreenStream(null);
    setIsCameraOn(false);
    setCurrentVoiceChannel(null);
    socket.emit('leave-voice-channel');
    if (currentChannel?.type === 'voice') {
      const defaultText = channels.find(c => c.type === 'text');
      if (defaultText) {
        setCurrentChannel(defaultText);
      }
    }
  };

  const handleStartScreenShare = async (presetKey, withAudio = true) => {
    const res = await webrtc.startScreenShare(presetKey, withAudio);
    if (res.success) {
      setIsScreenSharing(true);
      setScreenStream(res.stream);
      if (currentVoiceChannel) {
        setCurrentChannel(currentVoiceChannel);
        screenRelay.startBroadcasting(currentVoiceChannel.id, res.stream);
      }
    } else {
      alert('Ekran paylaşımı başlatılamadı: ' + (res.error || 'İzin verilmedi'));
    }
  };

  const handleStopScreenShare = () => {
    webrtc.stopScreenShare();
    if (currentVoiceChannel) {
      screenRelay.stopBroadcasting(currentVoiceChannel.id);
    }
    setIsScreenSharing(false);
    setScreenStream(null);
  };

  const handleToggleCamera = async () => {
    const nextState = !isCameraOn;
    const res = await webrtc.toggleCamera(nextState);
    if (res && res.success) {
      setIsCameraOn(res.enabled);
    }
  };

  const handleSendMessage = (contentOrObj, maybeFile, explicitChannelId) => {
    let content = '';
    let file = null;
    let chId = explicitChannelId || currentChannelRef.current?.id || currentChannel?.id;

    if (typeof contentOrObj === 'object' && contentOrObj !== null && !contentOrObj.url) {
      chId = contentOrObj.channelId || explicitChannelId || chId;
      content = contentOrObj.content || '';
      file = contentOrObj.file || null;
    } else {
      content = typeof contentOrObj === 'string' ? contentOrObj : '';
      file = maybeFile || null;
    }

    if (!chId || chId === 'dm-empty') {
      console.warn('[Chat] Mesaj gönderilemedi: Geçerli bir kanal veya arkadaş seçili değil.');
      return;
    }

    if (activeView === 'dm' && activeDmUser && blockedUsers.has(activeDmUser.id)) {
      alert('Bu kullanıcıyı engellediniz. Mesaj göndermek için kullanıcıya sağ tıklayıp "Engeli Kaldır" seçeneğini kullanın.');
      return;
    }

    socket.emit('send-message', { channelId: chId, content, file });
  };

  // Watch Together (Birlikte İzle) Handlers
  const handleStartWatchTogether = (videoId, videoTitle) => {
    const targetChannelId = currentVoiceChannel?.id || 'voice-sinema';
    socket.emit('watch-together-start', {
      channelId: targetChannelId,
      videoId,
      videoTitle: videoTitle || 'YouTube Videosu'
    });
  };

  const handleStopWatchTogether = () => {
    const targetChannelId = currentVoiceChannel?.id || 'voice-sinema';
    socket.emit('watch-together-close', targetChannelId);
  };

  const handleWatchTogetherAction = (action, currentTime) => {
    const targetChannelId = currentVoiceChannel?.id || 'voice-sinema';
    socket.emit('watch-together-action', {
      channelId: targetChannelId,
      action,
      currentTime,
      senderName: currentUser?.username
    });
  };

  // Karar Çarkı Share Handler
  const handleShareWheelResult = (winner) => {
    const targetTextChannelId = currentChannel?.type === 'text' 
      ? currentChannel.id 
      : (channels.find(c => c.type === 'text')?.id || 'text-genel');
    socket.emit('send-message', {
      channelId: targetTextChannelId,
      content: `🎯 **Karar Çarkı Döndü!** Ekip için çıkan karar: **${winner}** 🎲🔥`,
      file: null
    });
  };

  // Music bot controls
  const handlePlayStation = (stationId) => {
    const chId = currentVoiceChannel?.id || 'voice-genel';
    socket.emit('music-play', { channelId: chId, stationId });
  };

  const handlePlayTrack = (track) => {
    const chId = currentVoiceChannel?.id || 'voice-genel';
    socket.emit('music-play', { channelId: chId, track });
  };

  const handlePlayCustom = (customUrl, customName) => {
    const chId = currentVoiceChannel?.id || 'voice-genel';
    socket.emit('music-play', { channelId: chId, customUrl, customName });
  };

  const handlePauseMusic = () => {
    const chId = currentVoiceChannel?.id || 'voice-genel';
    socket.emit('music-pause', { channelId: chId });
  };

  const handleResumeMusic = () => {
    const chId = currentVoiceChannel?.id || 'voice-genel';
    socket.emit('music-resume', { channelId: chId });
  };

  const handleStopMusic = () => {
    const chId = currentVoiceChannel?.id || 'voice-genel';
    socket.emit('music-stop', { channelId: chId });
  };

  const handleSetMusicVolume = (volume) => {
    handleSetUserMusicVolume(volume);
  };

  const handleSeekMusic = (currentTime) => {
    const chId = currentVoiceChannel?.id || 'voice-genel';
    socket.emit('music-seek', { channelId: chId, currentTime });
  };

  const isViewingVoice = Boolean(currentVoiceChannel && currentChannel?.id === currentVoiceChannel.id);
  const voiceMembers = members.filter(m => m.voiceState?.channelId === currentVoiceChannel?.id);
  const activeScreenStreams = [];
  voiceMembers.forEach(m => {
    if (m.id !== currentUser?.id && m.voiceState?.isScreenSharing) {
      activeScreenStreams.push({
        id: m.socketId,
        socketId: m.socketId,
        username: m.username,
        avatar: m.avatar,
        stream: remoteScreenStreams?.get(m.socketId) || null,
        isLocal: false
      });
    }
  });
  if (isScreenSharing && screenStream) {
    activeScreenStreams.push({
      id: 'local',
      socketId: 'local',
      username: currentUser?.username || 'Sen',
      avatar: currentUser?.avatar,
      stream: screenStream,
      isLocal: true
    });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1f22]">
      {/* Declarative global voice audio players for all active remote peers */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.001, pointerEvents: 'none' }}>
        <div ref={audioContainerRef} />
        {Array.from(remoteStreams.entries()).map(([peerSocketId, stream]) => (
          <audio
            key={peerSocketId}
            id={`audio-${peerSocketId}`}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && el.srcObject !== stream) {
                el.srcObject = stream;
                el.volume = 1.0;
                el.play().catch(() => {});
              }
            }}
          />
        ))}
        {Array.from(remoteScreenStreams.entries()).map(([peerSocketId, stream]) => (
          <audio
            key={`screen-${peerSocketId}`}
            id={`audio-screen-${peerSocketId}`}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && el.srcObject !== stream) {
                el.srcObject = stream;
                el.volume = 1.0;
                el.play().catch(() => {});
              }
            }}
          />
        ))}
      </div>
      <BackgroundMusicPlayer 
        musicState={activeMusicState} 
        userVolume={userMusicVolume}
        onTrackEnd={(trackId) => {
          if (currentVoiceChannel) {
            socket.emit('music-ended', { 
              channelId: currentVoiceChannel.id, 
              trackId 
            });
          }
        }}
        onSyncedStart={(trackId, currentTime) => {
          if (currentVoiceChannel) {
            socket.emit('music-synced-start', {
              channelId: currentVoiceChannel.id,
              trackId,
              currentTime
            });
          }
        }}
      />

      {/* DISCORD SERVER RAIL (72px) */}
      <ServerRail 
        activeView={activeView}
        servers={servers}
        currentServerId={currentServerId}
        onSelectServer={handleSelectServer}
        onOpenCreateServer={() => setIsCreateServerOpen(true)}
        onSelectDM={() => {
          setActiveView('dm');
          if (activeDmUser) {
            handleSelectDmUser(activeDmUser);
            return;
          }
          const other = members.find(m => m.id !== currentUser?.id && !m.isBot);
          if (other) {
            handleSelectDmUser(other);
          } else {
            const emptyCh = {
              id: 'dm-empty',
              name: 'Arkadaşlar',
              type: 'dm',
              topic: 'Özel Mesajlar'
            };
            setCurrentChannel(emptyCh);
            currentChannelRef.current = emptyCh;
            setMessages([]);
          }
        }}
        onOpenInfo={() => setIsInfoModalOpen(true)}
        unreadCount={unreadDms.size}
      />

      {/* LEFT SIDEBAR (Changes based on activeView) */}
      {activeView === 'dm' ? (
        <DMSidebar
          members={members}
          currentUser={currentUser}
          activeDmUser={activeDmUser}
          onSelectDmUser={handleSelectDmUser}
          onUpdateProfile={handleUpdateProfile}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          isDeafened={isDeafened}
          setIsDeafened={setIsDeafened}
          unreadDms={unreadDms}
          closedDms={closedDms}
          blockedUsers={blockedUsers}
          onCloseDM={handleCloseDM}
          onClearHistory={handleClearDMHistory}
          onToggleBlock={handleToggleBlock}
        />
      ) : (
        <Sidebar
          serverName={currentServer?.name}
          server={currentServer}
          channels={activeChannels}
          currentChannel={currentChannel}
          onSelectChannel={handleSelectChannel}
          currentVoiceChannel={currentVoiceChannel}
          onJoinVoice={handleJoinVoice}
          onLeaveVoice={handleLeaveVoice}
          onReconnectVoice={handleReconnectVoice}
          members={members}
          currentUser={currentUser}
          onUpdateProfile={handleUpdateProfile}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          isDeafened={isDeafened}
          setIsDeafened={setIsDeafened}
          isScreenSharing={isScreenSharing}
          onOpenScreenModal={() => setIsScreenModalOpen(true)}
          onStopScreenShare={handleStopScreenShare}
          isCameraOn={isCameraOn}
          onToggleCamera={handleToggleCamera}
          onOpenDownload={() => setIsDownloadModalOpen(true)}
          isAppInstalled={isAppInstalled}
          onOpenCreateChannel={handleOpenCreateChannel}
          onRequestDeleteChannel={(ch) => setChannelToDelete(ch)}
          onRequestRenameChannel={(ch) => setChannelToRename(ch)}
          onOpenInfo={() => setIsInfoModalOpen(true)}
        />
      )}

      {/* CENTER MAIN AREA */}
      {currentVoiceChannel && (
        <div className={`flex-1 flex-col h-full ${isViewingVoice ? 'flex' : 'hidden'}`}>
          <VoiceRoom
            channel={currentVoiceChannel}
            members={members}
            currentUser={currentUser}
            localStream={webrtc.localStream}
            screenStream={screenStream}
            remoteStreams={remoteStreams}
            remoteScreenStreams={remoteScreenStreams}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            isDeafened={isDeafened}
            setIsDeafened={setIsDeafened}
            isCameraOn={isCameraOn}
            onToggleCamera={handleToggleCamera}
            isScreenSharing={isScreenSharing}
            onOpenScreenModal={() => setIsScreenModalOpen(true)}
            onStopScreenShare={handleStopScreenShare}
            onLeaveVoice={handleLeaveVoice}
            onReconnectVoice={handleReconnectVoice}
            musicState={currentVoiceChannel ? musicStates.get(currentVoiceChannel.id) : null}
            onOpenMusicModal={() => setIsMusicModalOpen(true)}
            onToggleMusicPlay={() => {
              const s = currentVoiceChannel ? musicStates.get(currentVoiceChannel.id) : null;
              if (s?.isPlaying) handlePauseMusic();
              else handleResumeMusic();
            }}
            onStopMusic={handleStopMusic}
            onSeekMusic={handleSeekMusic}
            userMusicVolume={userMusicVolume}
            onSetMusicVolume={handleSetUserMusicVolume}
            watchTogetherState={activeWatchTogether}
            onOpenWatchTogether={() => setIsWatchTogetherOpen(true)}
            onStopWatchTogether={handleStopWatchTogether}
            onWatchTogetherAction={handleWatchTogetherAction}
            isAppInstalled={isAppInstalled}
            onOpenDownload={() => setIsDownloadModalOpen(true)}
          />
        </div>
      )}

      {!isViewingVoice && (currentChannel ? (
        <ChatArea
          channel={currentChannel}
          currentUser={currentUser}
          messages={messages}
          onSendMessage={handleSendMessage}
          onDeleteMessage={(messageId) => socket.emit('delete-message', { channelId: currentChannel.id, messageId })}
          onPinMessage={(messageId) => socket.emit('pin-message', { channelId: currentChannel.id, messageId })}
          currentVoiceChannel={currentVoiceChannel}
          onSwitchToVoiceStage={(vc) => setCurrentChannel(vc)}
          isScreenSharing={isScreenSharing}
          onOpenScreenModal={() => setIsScreenModalOpen(true)}
          onStopScreenShare={handleStopScreenShare}
          onOpenDownload={() => setIsDownloadModalOpen(true)}
          onOpenMusicModal={() => setIsMusicModalOpen(true)}
          onJoinVoice={handleJoinVoice}
          voiceChannels={activeChannels.filter(c => c.type === 'voice')}
          members={members}
          isAppInstalled={isAppInstalled}
          onOpenWheel={() => setIsWheelOpen(true)}
          isBlocked={currentChannel?.type === 'dm' && activeDmUser ? blockedUsers.has(activeDmUser.id) : false}
          onUnblock={() => activeDmUser && handleToggleBlock(activeDmUser)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#949ba4]">
          Bir kanal veya arkadaş seçin
        </div>
      ))}

      {/* RIGHT MEMBER LIST (Only in server view) */}
      {activeView === 'server' && (
        <MemberList
          members={members}
          currentUser={currentUser}
          roles={roles}
          onOpenDM={handleSelectDmUser}
          onContextMenu={handleOpenContextMenu}
          onOpenRoleManager={() => setShowRoleManager(true)}
        />
      )}

      {/* MODALS */}
      <ScreenShareModal
        isOpen={isScreenModalOpen}
        onClose={() => setIsScreenModalOpen(false)}
        onStartShare={handleStartScreenShare}
      />

      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        defaultType={createChannelType}
        serverId={currentServerId}
      />

      <DeleteChannelModal
        isOpen={!!channelToDelete}
        channel={channelToDelete}
        onClose={() => setChannelToDelete(null)}
        onConfirm={handleDeleteChannel}
      />

      <RenameChannelModal
        isOpen={!!channelToRename}
        channel={channelToRename}
        onClose={() => setChannelToRename(null)}
        onConfirm={handleRenameChannel}
      />

      <ServerInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        currentServer={currentServer}
        currentUser={currentUser}
        onDeleteServer={handleDeleteServer}
      />

      <CreateServerModal
        isOpen={isCreateServerOpen}
        onClose={() => setIsCreateServerOpen(false)}
        onCreateServer={handleCreateServer}
        onJoinServer={handleJoinServer}
        servers={servers}
        currentServerId={currentServerId}
      />

      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      <MusicPlayerModal
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
        currentVoiceChannel={currentVoiceChannel}
        musicState={currentVoiceChannel ? musicStates.get(currentVoiceChannel.id) : null}
        stations={musicStations}
        onPlayStation={handlePlayStation}
        onPlayTrack={handlePlayTrack}
        onPlayCustom={handlePlayCustom}
        onPause={handlePauseMusic}
        onResume={handleResumeMusic}
        onStop={handleStopMusic}
        onSeek={handleSeekMusic}
        userVolume={userMusicVolume}
        onSetVolume={handleSetUserMusicVolume}
      />

      {/* KARAR ÇARKI (DECISION WHEEL) MODAL */}
      <DecisionWheelModal
        isOpen={isWheelOpen}
        onClose={() => setIsWheelOpen(false)}
        onShareResult={handleShareWheelResult}
      />

      {/* WATCH TOGETHER (BİRLİKTE İZLE) MODAL */}
      <WatchTogetherModal
        isOpen={isWatchTogetherOpen}
        onClose={() => setIsWatchTogetherOpen(false)}
        onStart={handleStartWatchTogether}
      />

      {/* QUICK LOGIN MODAL */}
      <LoginModal
        isOpen={isLoginModalOpen || !currentUser}
        onLogin={handleLogin}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
      />

      {/* PICTURE-IN-PICTURE (PiP) MINIPLAYER */}
      {currentVoiceChannel && currentChannel?.id !== currentVoiceChannel.id && (
        <MiniPlayer
          voiceChannel={currentVoiceChannel}
          activeScreenStreams={activeScreenStreams}
          channelMembers={voiceMembers}
          currentUser={currentUser}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isDeafened={isDeafened}
          onToggleDeafen={handleToggleDeafen}
          onLeaveVoice={handleLeaveVoice}
          onReturnToVoice={() => setCurrentChannel(currentVoiceChannel)}
        />
      )}

      {/* USER RIGHT-CLICK CONTEXT MENU */}
      {contextMenu && (
        <UserContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetMember={contextMenu.targetMember}
          currentUser={currentUser}
          roles={roles}
          members={members}
          onClose={() => setContextMenu(null)}
          onOpenDM={handleSelectDmUser}
        />
      )}

      {/* ROLE MANAGEMENT MODAL */}
      {showRoleManager && (
        <RoleManagementModal
          roles={roles}
          onClose={() => setShowRoleManager(false)}
        />
      )}
    </div>
  );
}