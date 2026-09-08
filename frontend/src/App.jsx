import React, { useState, useEffect, useRef } from 'react';
import ServerRail from './components/ServerRail';
import Sidebar from './components/Sidebar';
import DMSidebar from './components/DMSidebar';
import ChatArea from './components/ChatArea';
import VoiceRoom from './components/VoiceRoom';
import MemberList from './components/MemberList';
import ScreenShareModal from './components/ScreenShareModal';
import CreateChannelModal from './components/CreateChannelModal';
import ServerInfoModal from './components/ServerInfoModal';
import { socket } from './services/socket';
import { webrtc } from './services/webrtc';
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
  const [currentVoiceChannel, setCurrentVoiceChannel] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);

  // Voice & Video States
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);

  // Modals
  const [isScreenModalOpen, setIsScreenModalOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Remote WebRTC streams
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState(new Map());

  const audioContainerRef = useRef(null);

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

    socket.on('initial-data', ({ channels }) => {
      setChannels(channels);
      const defaultText = channels.find(c => c.type === 'text');
      if (defaultText && activeView === 'server') {
        setCurrentChannel(defaultText);
        socket.emit('fetch-messages', defaultText.id);
      }
    });

    socket.on('channels-updated', (updatedChannels) => {
      setChannels(updatedChannels);
    });

    socket.on('members-updated', (updatedMembers) => {
      setMembers(updatedMembers);
    });

    socket.on('messages-history', ({ channelId, messages }) => {
      if (currentChannel?.id === channelId) {
        setMessages(messages);
      }
    });

    socket.on('new-message', (msg) => {
      if (currentChannel?.id === msg.channelId) {
        setMessages(prev => [...prev, msg]);
      }
      if (msg.sender.id !== currentUser.id) {
        soundEffects.playMessage();
      }
    });

    socket.on('message-reaction-updated', ({ channelId, messageId, reactions }) => {
      if (currentChannel?.id === channelId) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
      }
    });

    socket.on('voice-room-peers', ({ channelId, peers }) => {
      webrtc.connectToRoom(peers);
    });

    socket.on('peer-voice-state-updated', ({ socketId, voiceState }) => {
      setMembers(prev => prev.map(m => m.socketId === socketId ? { ...m, voiceState } : m));
    });

    webrtc.onRemoteStreamAdded = (socketId, stream, isScreen) => {
      if (isScreen) {
        setRemoteScreenStreams(prev => new Map(prev).set(socketId, stream));
      } else {
        setRemoteStreams(prev => new Map(prev).set(socketId, stream));
        if (audioContainerRef.current) {
          let audioEl = document.getElementById(`audio-${socketId}`);
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = `audio-${socketId}`;
            audioEl.autoplay = true;
            audioEl.playsInline = true;
            audioContainerRef.current.appendChild(audioEl);
          }
          audioEl.srcObject = stream;
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
      if (el) el.remove();
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
      socket.off('members-updated');
      socket.off('messages-history');
      socket.off('new-message');
      socket.off('message-reaction-updated');
      socket.off('voice-room-peers');
      socket.off('peer-voice-state-updated');
    };
  }, [currentUser, currentChannel, activeView]);

  useEffect(() => {
    webrtc.setMicrophoneMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    webrtc.setDeafened(isDeafened);
  }, [isDeafened]);

  // --- CHANNEL & DM ACTIONS ---
  const handleSelectChannel = (channel) => {
    setCurrentChannel(channel);
    if (channel.type === 'text') {
      socket.emit('fetch-messages', channel.id);
    }
  };

  // Switch to a 1-on-1 private DM with a friend
  const handleSelectDmUser = (targetFriend) => {
    setActiveDmUser(targetFriend);
    setActiveView('dm');
    const dmChannelId = 'dm-' + [currentUser.id, targetFriend.id].sort().join('-');
    const dmChannel = {
      id: dmChannelId,
      name: targetFriend.username,
      type: 'dm',
      topic: `${targetFriend.username} ile özel mesajlaşma`,
      avatar: targetFriend.avatar
    };
    setCurrentChannel(dmChannel);
    socket.emit('fetch-messages', dmChannelId);
  };

  const handleJoinVoice = async (channel) => {
    soundEffects.playJoin();
    await webrtc.initLocalAudio();
    setCurrentVoiceChannel(channel);
    setCurrentChannel(channel);
    socket.emit('join-voice-channel', { channelId: channel.id });
  };

  const handleLeaveVoice = () => {
    soundEffects.playLeave();
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

  const handleSendMessage = ({ channelId, content, file }) => {
    socket.emit('send-message', { channelId, content, file });
  };

  const isViewingVoice = currentChannel?.type === 'voice';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1f22]">
      <div ref={audioContainerRef} className="hidden" />

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
          const other = members.find(m => m.id !== currentUser.id);
          if (other) {
            handleSelectDmUser(other);
          } else {
            setCurrentChannel({
              id: 'dm-empty',
              name: 'Arkadaşlar',
              type: 'dm',
              topic: 'Özel Mesajlar'
            });
          }
        }}
        onOpenCreateChannel={() => setIsCreateChannelOpen(true)}
        onOpenInfo={() => setIsInfoModalOpen(true)}
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
        />
      ) : (
        <Sidebar
          channels={channels}
          currentChannel={currentChannel}
          onSelectChannel={handleSelectChannel}
          currentVoiceChannel={currentVoiceChannel}
          onJoinVoice={handleJoinVoice}
          onLeaveVoice={handleLeaveVoice}
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
        />
      ) : currentChannel ? (
        <ChatArea
          channel={currentChannel}
          currentUser={currentUser}
          messages={messages}
          onSendMessage={handleSendMessage}
          currentVoiceChannel={currentVoiceChannel}
          onSwitchToVoiceStage={(vc) => setCurrentChannel(vc)}
          isScreenSharing={isScreenSharing}
          onOpenScreenModal={() => setIsScreenModalOpen(true)}
          onStopScreenShare={handleStopScreenShare}
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
      />

      <ServerInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />
    </div>
  );
}