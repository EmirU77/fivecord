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
import DownloadModal from './components/DownloadModal';
import MusicPlayerModal from './components/MusicPlayerModal';
import DecisionWheelModal from './components/DecisionWheelModal';
import WatchTogetherModal from './components/WatchTogetherModal';
import { socket } from './services/socket';
import { webrtc } from './services/webrtc';
import { voiceRelay } from './services/voiceRelay';
import { soundEffects } from './services/soundEffects';

const DEFAULT_USER = {
  id: 'user-' + Math.random().toString(36).substring(2, 9),
  username: 'Gamer-' + Math.floor(1000 + Math.random() * 9000),
  avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`,
  color: '#5865f2',
  customStatus: 'Fivecord kullanıyor'
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('fivecord_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  // Views: 'server' (Fivecord VIP) | 'dm' (Direct Messages / Özel Mesajlar)
  const [activeView, setActiveView] = useState('server');
  const [activeDmUser, setActiveDmUser] = useState(null);

  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const currentChannelRef = useRef(null);
  const [unreadDms, setUnreadDms] = useState(new Set());
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

  const audioContainerRef = useRef(null);
  const bgMusicAudioRef = useRef(null);
  const bgYtIframeRef = useRef(null);
  const activeMusicState = currentVoiceChannel ? musicStates.get(currentVoiceChannel.id) : null;
  const activeWatchTogether = currentVoiceChannel ? watchTogetherRooms.get(currentVoiceChannel.id) : null;

  // Background stream playback (Radio / MP3) across all channels
  useEffect(() => {
    if (!bgMusicAudioRef.current) return;
    if (activeMusicState?.isPlaying && activeMusicState?.currentTrack?.url && activeMusicState.currentTrack.source !== 'youtube') {
      if (bgMusicAudioRef.current.src !== activeMusicState.currentTrack.url) {
        bgMusicAudioRef.current.src = activeMusicState.currentTrack.url;
      }
      bgMusicAudioRef.current.volume = Math.min(Math.max((activeMusicState.volume ?? 80) / 100, 0), 1);
      bgMusicAudioRef.current.play().catch(e => console.warn('Music play error:', e));
    } else {
      bgMusicAudioRef.current.pause();
    }
  }, [activeMusicState]);

  // Background YouTube playback across all channels
  useEffect(() => {
    if (!bgYtIframeRef.current) return;
    if (activeMusicState?.isPlaying && activeMusicState?.currentTrack?.source === 'youtube') {
      const videoId = activeMusicState.currentTrack.id;
      const targetSrc = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&playsinline=1`;
      if (!bgYtIframeRef.current.src.includes(videoId)) {
        bgYtIframeRef.current.src = targetSrc;
      } else {
        bgYtIframeRef.current.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      }
      const vol = activeMusicState.volume ?? 80;
      bgYtIframeRef.current.contentWindow?.postMessage(`{"event":"command","func":"setVolume","args":[${vol}]}`, '*');
    } else if (bgYtIframeRef.current) {
      bgYtIframeRef.current.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }
  }, [activeMusicState]);

  const handleUpdateProfile = (updated) => {
    const newUser = { ...currentUser, ...updated };
    setCurrentUser(newUser);
    localStorage.setItem('fivecord_user', JSON.stringify(newUser));
    socket.emit('update-profile', newUser);
  };

  // --- SOCKET.IO INITIALIZATION ---
  useEffect(() => {
    socket.on('connect', () => {
      socket.emit('user-join', currentUser);
    });

    socket.on('initial-data', ({ channels, stations, watchTogether }) => {
      setChannels(channels);
      if (stations) setMusicStations(stations);
      if (watchTogether) {
        setWatchTogetherRooms(new Map(Object.entries(watchTogether)));
      }
      const defaultText = channels.find(c => c.type === 'text');
      if (defaultText && activeView === 'server') {
        setCurrentChannel(defaultText);
        socket.emit('fetch-messages', defaultText.id);
      }
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
      }

      if (msg.sender.id !== currentUser.id) {
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
    });

    socket.on('peer-voice-state-updated', ({ socketId, voiceState }) => {
      setMembers(prev => prev.map(m => m.socketId === socketId ? { ...m, voiceState } : m));
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

    webrtc.onRemoteStreamAdded = (socketId, stream, isScreen) => {
      console.log(`[Audio Debug] Remote stream added for ${socketId}:`, {
        isScreen,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      });

      if (isScreen) {
        setRemoteScreenStreams(prev => new Map(prev).set(socketId, stream));
      } else {
        setRemoteStreams(prev => new Map(prev).set(socketId, stream));
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

        // Screen audio stays unmuted for game/video stream audio.
        // Microphone audio is handled with 100% reliability via voiceRelay WebSocket
        // (mute here to prevent duplicate echo if WebRTC direct audio connects).
        audioEl.muted = !isScreen;
        audioEl.volume = 1.0;

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
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      setRemoteScreenStreams(prev => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      const el = document.getElementById(`audio-${socketId}`);
      if (el) {
        el.srcObject = null;
        el.pause();
      }
      const screenEl = document.getElementById(`audio-screen-${socketId}`);
      if (screenEl) {
        screenEl.srcObject = null;
        screenEl.pause();
      }
    };

    webrtc.onSpeakingChanged = (speaking) => {
      setMembers(prev => prev.map(m => m.id === currentUser.id ? {
        ...m,
        voiceState: { ...m.voiceState, isSpeaking: speaking }
      } : m));
    };

    return () => {
      socket.off('connect');
      socket.off('initial-data');
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
      socket.off('entrance-sound-played');
      socket.off('tts-speak');
      socket.off('game-scan-result');
      clearInterval(gameScanInterval);
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
      voiceRelay.ensurePlaybackContext();
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
    const stream = await webrtc.initLocalAudio();
    socket.emit('join-voice-channel', { channelId: currentVoiceChannel.id });
    if (stream) {
      voiceRelay.startBroadcasting(currentVoiceChannel.id, stream);
    }
  };

  // --- CHANNEL & DM ACTIONS ---
  const handleSelectChannel = (channel) => {
    setCurrentChannel(channel);
    currentChannelRef.current = channel;
    if (channel.type === 'text') {
      socket.emit('fetch-messages', channel.id);
    }
  };

  const handleOpenCreateChannel = (type = 'text') => {
    setCreateChannelType(type);
    setIsCreateChannelOpen(true);
  };

  const handleDeleteChannel = (channelId) => {
    socket.emit('delete-channel', channelId);
    soundEffects.playLeave();
  };

  const handleRenameChannel = (channelId, newName) => {
    socket.emit('rename-channel', { channelId, newName });
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
    const dmChannelId = 'dm-' + [currentUser.id, targetFriend.id].sort().join('-');
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

  const handleJoinVoice = async (channel) => {
    soundEffects.playJoin();
    const stream = await webrtc.initLocalAudio();
    setCurrentVoiceChannel(channel);
    setCurrentChannel(channel);
    socket.emit('join-voice-channel', { channelId: channel.id });
    if (stream) {
      voiceRelay.startBroadcasting(channel.id, stream);
    }
  };

  const handleLeaveVoice = () => {
    soundEffects.playLeave();
    voiceRelay.stop();
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
      }
    } else {
      alert('Ekran paylaşımı başlatılamadı: ' + (res.error || 'İzin verilmedi'));
    }
  };

  const handleStopScreenShare = () => {
    webrtc.stopScreenShare();
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

    socket.emit('send-message', { channelId: chId, content, file });
  };

  // Watch Together (Birlikte İzle) Handlers
  const handleStartWatchTogether = (videoId, videoTitle, type = 'youtube', url = null) => {
    const targetChannelId = currentVoiceChannel?.id || 'voice-sinema';
    socket.emit('watch-together-start', {
      channelId: targetChannelId,
      videoId,
      videoTitle,
      type,
      url
    });
  };

  const handleStopWatchTogether = () => {
    const targetChannelId = currentVoiceChannel?.id || 'voice-sinema';
    socket.emit('watch-together-close', targetChannelId);
  };

  const handleNavigateWatchTogether = (newUrl, newTitle) => {
    const targetChannelId = currentVoiceChannel?.id || 'voice-sinema';
    socket.emit('watch-together-navigate', {
      channelId: targetChannelId,
      url: newUrl,
      title: newTitle
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
    const chId = currentVoiceChannel?.id || 'voice-genel';
    socket.emit('music-volume', { channelId: chId, volume });
  };

  const isViewingVoice = currentChannel?.type === 'voice';

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
      <audio ref={bgMusicAudioRef} className="hidden" />
      {activeMusicState?.currentTrack?.source === 'youtube' && (
        <div className="fixed -top-96 -left-96 pointer-events-none opacity-0 w-1 h-1 overflow-hidden">
          <iframe
            ref={bgYtIframeRef}
            title="Fivecord YouTube Stream"
            allow="autoplay; encrypted-media"
            className="w-full h-full"
          />
        </div>
      )}

      {/* DISCORD SERVER RAIL (72px) */}
      <ServerRail 
        activeView={activeView}
        onSelectServer={() => {
          setActiveView('server');
          const defaultText = channels.find(c => c.type === 'text');
          if (defaultText) {
            setCurrentChannel(defaultText);
            socket.emit('fetch-messages', defaultText.id);
          }
        }}
        onSelectDM={() => {
          setActiveView('dm');
          if (activeDmUser) {
            handleSelectDmUser(activeDmUser);
            return;
          }
          const other = members.find(m => m.id !== currentUser.id && !m.isBot);
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
        />
      ) : (
        <Sidebar
          channels={channels}
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
      {isViewingVoice && currentVoiceChannel ? (
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
          watchTogetherState={activeWatchTogether}
          onOpenWatchTogether={() => setIsWatchTogetherOpen(true)}
          onStopWatchTogether={handleStopWatchTogether}
          onNavigateWatchTogether={handleNavigateWatchTogether}
          isAppInstalled={isAppInstalled}
          onOpenDownload={() => setIsDownloadModalOpen(true)}
        />
      ) : currentChannel ? (
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
          voiceChannels={channels.filter(c => c.type === 'voice')}
          members={members}
          isAppInstalled={isAppInstalled}
          onOpenWheel={() => setIsWheelOpen(true)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#949ba4]">
          Bir kanal veya arkadaş seçin
        </div>
      )}

      {/* RIGHT MEMBER LIST (Only in server view) */}
      {activeView === 'server' && (
        <MemberList
          members={members}
          currentUser={currentUser}
          onOpenDM={handleSelectDmUser}
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
        onSetVolume={handleSetMusicVolume}
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
    </div>
  );
}