import React, { useRef, useEffect, useState } from 'react';
import { 
  Monitor, MonitorOff, Video, VideoOff, Mic, MicOff, Headphones, 
  PhoneOff, Maximize, Sparkles, Volume2, Radio, Check, Disc3, Music, Pause, Play, Tv, Download,
  Globe, Search, ExternalLink, RefreshCw
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';
import { webrtc } from '../services/webrtc';
import SharedCinemaPlayer from './SharedCinemaPlayer';

export default function VoiceRoom({
  channel,
  members,
  currentUser,
  localStream,
  screenStream,
  remoteStreams,
  remoteScreenStreams,
  isMuted,
  setIsMuted,
  isDeafened,
  setIsDeafened,
  isCameraOn,
  onToggleCamera,
  isScreenSharing,
  onOpenScreenModal,
  onStopScreenShare,
  onLeaveVoice,
  musicState,
  onOpenMusicModal,
  onToggleMusicPlay,
  onStopMusic,
  watchTogetherState,
  onOpenWatchTogether,
  onStopWatchTogether,
  onNavigateWatchTogether,
  onWatchTogetherAction,
  isAppInstalled,
  onOpenDownload
}) {
  const [activeScreenUser, setActiveScreenUser] = useState(null);
  const [isNoiseSuppressed, setIsNoiseSuppressed] = useState(webrtc.isNoiseSuppressionOn);
  const [browserInput, setBrowserInput] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const mainVideoRef = useRef(null);
  const musicAudioRef = useRef(null);

  useEffect(() => {
    if (watchTogetherState?.url) {
      setBrowserInput(watchTogetherState.url);
    }
  }, [watchTogetherState?.url]);

  const toggleNoiseSuppression = () => {
    const next = !isNoiseSuppressed;
    webrtc.setNoiseSuppression(next);
    setIsNoiseSuppressed(next);
  };

  // Synchronized background music stream player
  useEffect(() => {
    if (!musicAudioRef.current) return;
    if (musicState?.isPlaying && musicState?.currentTrack?.url) {
      if (musicAudioRef.current.src !== musicState.currentTrack.url) {
        musicAudioRef.current.src = musicState.currentTrack.url;
      }
      musicAudioRef.current.volume = Math.min(Math.max((musicState.volume ?? 80) / 100, 0), 1);
      musicAudioRef.current.play().catch(e => console.warn('Music audio play error:', e));
    } else {
      musicAudioRef.current.pause();
    }
  }, [musicState]);

  // Determine if anyone (local or remote) is sharing screen
  useEffect(() => {
    if (isScreenSharing && screenStream) {
      setActiveScreenUser({ isLocal: true, stream: screenStream, username: currentUser?.username });
    } else if (remoteScreenStreams && remoteScreenStreams.size > 0) {
      const [peerId, stream] = remoteScreenStreams.entries().next().value;
      const peer = members.find(m => m.socketId === peerId);
      setActiveScreenUser({ isLocal: false, stream, username: peer?.username || 'Arkadaşın' });
    } else {
      setActiveScreenUser(null);
    }
  }, [isScreenSharing, screenStream, remoteScreenStreams, members, currentUser]);

  useEffect(() => {
    if (mainVideoRef.current && activeScreenUser?.stream) {
      mainVideoRef.current.srcObject = activeScreenUser.stream;
    }
  }, [activeScreenUser]);

  const channelMembers = members.filter(m => m.voiceState?.channelId === channel.id);

  const toggleFullscreen = () => {
    if (mainVideoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        mainVideoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex-1 bg-[#1e1f22] flex flex-col overflow-hidden relative">
      {/* Voice Top Header */}
      <div className="h-12 border-b border-[#2b2d31] px-6 flex items-center justify-between bg-[#2b2d31]/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-[#23a55a]" />
            <span className="text-white font-bold text-base">{channel.name}</span>
          </div>
          <span className="text-xs bg-[#23a55a]/15 text-[#23a55a] px-2.5 py-0.5 rounded-full font-semibold border border-[#23a55a]/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse" />
            {channelMembers.length} Kişi Bağlı
          </span>
          <span className="text-[11px] text-[#949ba4] font-mono hidden md:inline">
            Opus HQ 60FPS
          </span>
        </div>

        {/* Windows Download button (Only on Web) */}
        {!isAppInstalled && (
          <button
            onClick={onOpenDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold transition-all shadow-xs hover:scale-105 cursor-pointer"
            title="Windows Masaüstü Uygulamasını İndir (.zip)"
          >
            <Download className="w-3.5 h-3.5 animate-bounce" />
            <span>Windows İndir</span>
          </button>
        )}
      </div>

      {/* 24/7 MUSIC BOT ACTIVE BAR */}
      {musicState?.currentTrack && (
        <div className="bg-[#2b2d31] border-b border-[#383a40] px-6 py-2 flex items-center justify-between text-xs shadow-inner">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center gap-1.5 text-[#5865f2] font-black shrink-0">
              <Disc3 className={`w-4 h-4 ${musicState.isPlaying ? 'animate-spin' : ''}`} />
              <span>Fivecord DJ:</span>
            </div>
            <span className="text-white font-bold truncate max-w-xs sm:max-w-md">
              {musicState.currentTrack.title || musicState.currentTrack.name}
            </span>
            <span className="text-[10px] text-[#949ba4] px-1.5 py-0.2 rounded bg-[#1e1f22] shrink-0">
              {musicState.currentTrack.duration || musicState.currentTrack.artist || musicState.currentTrack.genre || 'Müzik'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleMusicPlay}
              className="px-3 py-1 rounded-lg bg-[#383a40] hover:bg-[#4e5058] text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              {musicState.isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{musicState.isPlaying ? 'Duraklat' : 'Oynat'}</span>
            </button>
            <button
              onClick={onOpenMusicModal}
              className="px-3 py-1 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all"
            >
              🔍 Şarkı Ara / Ayar
            </button>
            <button
              onClick={onStopMusic}
              className="px-2.5 py-1 rounded-lg bg-[#f23f43]/20 hover:bg-[#f23f43] text-[#f23f43] hover:text-white text-xs font-bold transition-all"
              title="Müziği Kapat"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Stage */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-center">
        {/* WATCH TOGETHER STAGE (GOOGLE OR SYNCHRONIZED CINEMA) */}
        {(watchTogetherState?.videoId || watchTogetherState?.url || watchTogetherState?.type === 'google') && !activeScreenUser ? (
          <div className="space-y-4 max-w-6xl mx-auto w-full">
            {watchTogetherState?.type === 'google' ? (
              <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#3f4147] shadow-2xl flex flex-col">
                {/* Google Web Browser Header */}
                <div className="bg-[#1e1f22] px-4 py-2.5 flex items-center justify-between border-b border-[#383a40] gap-3 shrink-0">
                  {/* Left: Google Branding */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-[#4285f4]/15 border border-[#4285f4]/30 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-[#4285f4]" />
                    </div>
                    <div className="hidden sm:flex flex-col">
                      <div className="flex items-center gap-1 font-black text-xs">
                        <span className="text-[#4285f4]">G</span>
                        <span className="text-[#ea4335]">o</span>
                        <span className="text-[#fbbc05]">o</span>
                        <span className="text-[#4285f4]">g</span>
                        <span className="text-[#34a853]">l</span>
                        <span className="text-[#ea4335]">e</span>
                        <span className="text-[10px] bg-[#4285f4]/20 text-[#4285f4] px-1.5 py-0.2 rounded-full font-bold ml-1">WEB</span>
                      </div>
                      <span className="text-[10px] text-[#949ba4] truncate max-w-40">
                        {watchTogetherState.startedBy || 'Arkadaşın'} başlattı
                      </span>
                    </div>
                  </div>

                  {/* Center: Interactive Synchronized URL & Search Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const clean = browserInput.trim();
                      if (!clean) return;
                      let targetUrl = clean;
                      let targetTitle = clean;
                      if (clean.startsWith('http://') || clean.startsWith('https://')) {
                        targetUrl = clean;
                      } else if (clean.includes('.') && !clean.includes(' ')) {
                        targetUrl = `https://${clean}`;
                      } else {
                        targetUrl = `https://www.google.com/search?igu=1&q=${encodeURIComponent(clean)}`;
                        targetTitle = `Google: ${clean}`;
                      }
                      onNavigateWatchTogether && onNavigateWatchTogether(targetUrl, targetTitle);
                    }}
                    className="flex-1 max-w-xl flex items-center gap-2 bg-[#111214] border border-[#383a40] focus-within:border-[#4285f4] rounded-xl px-3 py-1.5 transition-all shadow-inner"
                  >
                    <button
                      type="button"
                      onClick={() => setIframeKey(k => k + 1)}
                      className="p-1 text-[#949ba4] hover:text-white rounded-md transition-colors cursor-pointer"
                      title="Sayfayı Yenile"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <Search className="w-3.5 h-3.5 text-[#949ba4] shrink-0" />
                    <input
                      type="text"
                      value={browserInput}
                      onChange={(e) => setBrowserInput(e.target.value)}
                      placeholder="Google'da ara veya URL yaz... (Enter ile tüm odaya yansıt)"
                      className="flex-1 bg-transparent text-xs text-white placeholder-[#80848e] focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-0.5 rounded-lg bg-[#4285f4] hover:bg-[#3367d6] text-white text-[11px] font-bold transition-all cursor-pointer shrink-0"
                    >
                      Ara
                    </button>
                  </form>

                  {/* Right Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => window.open(watchTogetherState.url || 'https://www.google.com', '_blank')}
                      className="p-1.5 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white transition-all cursor-pointer"
                      title="Yeni Sekmede Aç"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onOpenWatchTogether}
                      className="px-3 py-1 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Değiştir
                    </button>
                    <button
                      onClick={onStopWatchTogether}
                      className="px-3 py-1 rounded-lg bg-[#f23f43]/20 hover:bg-[#f23f43] text-[#f23f43] hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Kapat
                    </button>
                  </div>
                </div>

                {/* Google Web Iframe */}
                <iframe
                  key={iframeKey + (watchTogetherState.url || '')}
                  src={watchTogetherState.url || 'https://www.google.com/webhp?igu=1'}
                  title={watchTogetherState.videoTitle || 'Google Birlikte Gezin'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; geolocation; camera; microphone"
                  allowFullScreen
                  className="w-full flex-1 border-0 bg-white"
                />
              </div>
            ) : (
              <SharedCinemaPlayer
                watchTogetherState={watchTogetherState}
                onAction={onWatchTogetherAction}
                onOpenModal={onOpenWatchTogether}
                onClose={onStopWatchTogether}
                currentUser={currentUser}
              />
            )}

            {/* Stage members strip */}
            <div className="flex items-center justify-center gap-3 overflow-x-auto py-2">
              {channelMembers.map((member) => {
                const isSpeaking = member.voiceState?.isSpeaking;
                return (
                  <div
                    key={member.socketId}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#2b2d31] border transition-all ${
                      isSpeaking ? 'border-[#23a55a] shadow-md shadow-[#23a55a]/20 scale-105' : 'border-[#383a40]'
                    }`}
                  >
                    <img
                      src={member.avatar}
                      alt={member.username}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-bold text-white">{member.username}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeScreenUser ? (
          <div className="space-y-4 max-w-6xl mx-auto w-full">
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-[#3f4147] shadow-2xl flex items-center justify-center group">
              <video
                ref={mainVideoRef}
                autoPlay
                playsInline
                muted={activeScreenUser.isLocal}
                className="w-full h-full object-contain"
              />

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold bg-[#f23f43] text-white px-3 py-1 rounded-md shadow-md">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  CANLI YAYIN
                </span>
                <span className="text-xs font-semibold bg-black/70 backdrop-blur-xs text-white px-3 py-1 rounded-md border border-white/10">
                  {activeScreenUser.username} ekranı
                </span>
                <span className="text-xs font-semibold bg-[#5865f2] text-white px-2.5 py-1 rounded-md">
                  60 FPS HD
                </span>
              </div>

              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={toggleFullscreen}
                  className="p-2.5 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-xs transition-all shadow-lg"
                  title="Tam Ekran"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 overflow-x-auto py-2">
              {channelMembers.map((member) => {
                const isSpeaking = member.voiceState?.isSpeaking;
                return (
                  <div
                    key={member.socketId}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-[#2b2d31] border transition-all ${
                      isSpeaking ? 'border-[#23a55a] shadow-md shadow-[#23a55a]/20 scale-105' : 'border-[#383a40]'
                    }`}
                  >
                    <img
                      src={member.avatar}
                      alt={member.username}
                      className={`w-7 h-7 rounded-full object-cover border-2 ${
                        isSpeaking ? 'border-[#23a55a]' : 'border-transparent'
                      }`}
                    />
                    <span className="text-xs font-medium text-white truncate max-w-[100px]">
                      {member.username}
                    </span>
                    {member.voiceState?.isMuted && <MicOff className="w-3 h-3 text-[#f23f43]" />}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* DISCORD USER TILES GRID */
          <div className="max-w-5xl mx-auto w-full">
            <div className={`grid gap-4 ${
              channelMembers.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
              channelMembers.length === 2 ? 'grid-cols-2' :
              channelMembers.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
            }`}>
              {channelMembers.map((member) => {
                const isLocal = member.id === currentUser?.id;
                const isSpeaking = member.voiceState?.isSpeaking;
                const hasScreen = member.voiceState?.isScreenSharing;
                const hasCamera = member.voiceState?.isCameraOn;

                return (
                  <div
                    key={member.socketId}
                    className={`relative aspect-4/3 rounded-2xl bg-[#2b2d31] border-2 overflow-hidden flex flex-col items-center justify-center p-6 transition-all duration-150 shadow-xl ${
                      isSpeaking 
                        ? 'border-[#23a55a] shadow-[0_0_25px_rgba(35,165,90,0.35)] scale-[1.02]' 
                        : 'border-[#383a40] hover:border-[#4e5058]'
                    }`}
                  >
                    {/* BOT TILE / VINYL VISUALIZER */}
                    {member.isBot ? (
                      <div className="flex flex-col items-center justify-center space-y-2.5 w-full px-2">
                        <div className="relative">
                          {musicState?.currentTrack?.thumbnail ? (
                            <div className={`w-24 h-24 rounded-full p-1 bg-[#1e1f22] border-2 border-[#5865f2] shadow-2xl overflow-hidden flex items-center justify-center ${
                              member.voiceState?.isSpeaking ? 'animate-spin' : ''
                            }`}>
                              <img 
                                src={musicState.currentTrack.thumbnail} 
                                alt={musicState.currentTrack.title || 'Müzik'} 
                                className="w-full h-full object-cover rounded-full" 
                              />
                            </div>
                          ) : (
                            <div className={`w-24 h-24 rounded-full bg-gradient-to-tr from-[#5865f2] to-[#eb459e] flex items-center justify-center text-white shadow-2xl ${
                              member.voiceState?.isSpeaking ? 'animate-spin' : ''
                            }`}>
                              <Disc3 className="w-14 h-14" />
                            </div>
                          )}
                          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#23a55a] border-2 border-[#2b2d31] flex items-center justify-center text-white text-[10px] font-bold shadow">
                            ✓
                          </div>
                        </div>

                        <div className="text-center w-full overflow-hidden">
                          <h4 className="text-xs font-black text-white truncate px-2">
                            {musicState?.currentTrack ? (musicState.currentTrack.title || musicState.currentTrack.name) : 'Fivecord DJ'}
                          </h4>
                          <p className="text-[11px] text-[#949ba4] truncate mt-0.5">
                            {musicState?.currentTrack ? (musicState.currentTrack.artist || musicState.currentTrack.genre || 'YouTube Müzik') : 'Müzik Botu'}
                          </p>
                          <div className="mt-1 flex items-center justify-center gap-1.5">
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#5865f2]/20 text-[#5865f2] font-black tracking-wider uppercase">
                              {member.voiceState?.isSpeaking ? '🎵 ÇALIYOR' : 'HAZIR'}
                            </span>
                            {musicState?.currentTrack?.duration && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e1f22] text-[#dbdee1] font-mono">
                                {musicState.currentTrack.duration}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : hasCamera ? (
                      <div className="absolute inset-0 w-full h-full bg-black">
                        {isLocal ? (
                          <video
                            ref={(el) => {
                              if (el && webrtc.cameraStream) {
                                el.srcObject = webrtc.cameraStream;
                              }
                            }}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            ref={(el) => {
                              const stream = remoteStreams?.get(member.socketId);
                              if (el && stream) {
                                el.srcObject = stream;
                              }
                            }}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ) : (
                      /* Centered Large Avatar (If Camera is OFF) */
                      <div className="relative mb-2">
                        <img
                          src={member.avatar}
                          alt={member.username}
                          className={`w-28 h-28 rounded-full object-cover bg-[#1e1f22] border-4 transition-all duration-150 ${
                            isSpeaking 
                              ? 'border-[#23a55a] scale-105 shadow-2xl' 
                              : 'border-[#1e1f22]'
                          }`}
                        />
                        <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#23a55a] border-3 border-[#2b2d31] flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </div>
                      </div>
                    )}

                    {/* Discord-style bottom nameplate */}
                    <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-[85%] border border-white/10 z-10">
                      <span className="text-xs font-bold text-white truncate">
                        {member.username}
                        {isLocal && <span className="text-[#949ba4] font-normal ml-1">(Sen)</span>}
                        {member.isBot && <span className="ml-1 px-1.5 py-0.2 rounded bg-[#5865f2] text-[9px] font-black text-white">BOT</span>}
                      </span>
                      {member.voiceState?.isMuted && (
                        <MicOff className="w-3.5 h-3.5 text-[#f23f43] shrink-0" />
                      )}
                      {member.voiceState?.isDeafened && (
                        <Headphones className="w-3.5 h-3.5 text-[#f23f43] shrink-0" />
                      )}
                      {hasCamera && (
                        <Video className="w-3.5 h-3.5 text-[#23a55a] shrink-0" />
                      )}
                    </div>

                    {/* Top right badges */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      {hasScreen && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-[#5865f2] text-white px-2 py-0.5 rounded shadow">
                          <Monitor className="w-3 h-3" /> CANLI
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        )}
      </div>

      {/* DISCORD SLEEK MINIMAL FLOATING CONTROL BAR (BOTTOM) */}
      <div className="h-20 bg-[#111214] border-t border-[#1f2023] px-4 flex items-center justify-center shrink-0 select-none">
        <div className="flex items-center gap-3 bg-[#1e1f22] px-5 py-2.5 rounded-2xl border border-[#2b2d31]/80 shadow-2xl">

          {/* GROUP 1: MEDIA CONTROLS */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Camera Button */}
            <button
              onClick={onToggleCamera}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 hover:scale-105 ${
                isCameraOn 
                  ? 'bg-[#23a55a] text-white shadow-lg shadow-[#23a55a]/30' 
                  : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
              }`}
              title={isCameraOn ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
            >
              {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* Screen Share Button */}
            <button
              onClick={isScreenSharing ? onStopScreenShare : onOpenScreenModal}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 hover:scale-105 ${
                isScreenSharing 
                  ? 'bg-[#f23f43] text-white shadow-lg shadow-[#f23f43]/30 animate-pulse' 
                  : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#5865f2] hover:text-white'
              }`}
              title={isScreenSharing ? 'Ekran Paylaşımını Durdur' : 'Ekranını Paylaş (60 FPS)'}
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </button>

            {/* Watch Together Button */}
            <button
              onClick={onOpenWatchTogether}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 hover:scale-105 ${
                (watchTogetherState?.videoId || watchTogetherState?.url) 
                  ? 'bg-[#4285f4] text-white shadow-lg shadow-[#4285f4]/30' 
                  : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
              }`}
              title={(watchTogetherState?.videoId || watchTogetherState?.url) ? 'Birlikte İzle & Gezin (Açık)' : 'Birlikte Google & YouTube'}
            >
              <Tv className="w-5 h-5" />
            </button>

            {/* Music Bot (Fivecord DJ) Button */}
            <button
              onClick={onOpenMusicModal}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 hover:scale-105 ${
                musicState?.isPlaying 
                  ? 'bg-[#5865f2] text-white shadow-lg shadow-[#5865f2]/40' 
                  : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
              }`}
              title={musicState?.isPlaying ? 'DJ Müzik Botu (Çalıyor)' : 'DJ Müzik Botu'}
            >
              <Music className="w-5 h-5" />
            </button>

            {/* Krisp Noise Suppression Button */}
            <button
              onClick={toggleNoiseSuppression}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 hover:scale-105 ${
                isNoiseSuppressed 
                  ? 'bg-[#23a55a] text-white shadow-lg shadow-[#23a55a]/30' 
                  : 'bg-[#2b2d31] text-[#949ba4] hover:bg-[#35373c] hover:text-white'
              }`}
              title={isNoiseSuppressed ? 'Krisp Gürültü Engelleme (Açık)' : 'Krisp Gürültü Engelleme (Kapalı)'}
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>

          {/* DIVIDER */}
          <div className="h-6 w-px bg-[#35373c] shrink-0" />

          {/* GROUP 2: AUDIO INPUTS */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mute Mic Button */}
            <button
              onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                if (next) soundEffects.playMute();
                else soundEffects.playUnmute();
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 hover:scale-105 ${
                isMuted 
                  ? 'bg-[#f23f43] text-white shadow-lg shadow-[#f23f43]/30' 
                  : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
              }`}
              title={isMuted ? 'Mikrofonun Kapalı' : 'Mikrofonu Sustur'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Deafen Button */}
            <button
              onClick={() => {
                const next = !isDeafened;
                setIsDeafened(next);
                if (next) soundEffects.playMute();
                else soundEffects.playUnmute();
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 hover:scale-105 ${
                isDeafened 
                  ? 'bg-[#f23f43] text-white shadow-lg shadow-[#f23f43]/30' 
                  : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
              }`}
              title={isDeafened ? 'Sağırlaştırmayı Kaldır' : 'Kulaklığı Kapat'}
            >
              <Headphones className="w-5 h-5" />
            </button>
          </div>

          {/* DIVIDER */}
          <div className="h-6 w-px bg-[#35373c] shrink-0" />

          {/* GROUP 3: DISCONNECT */}
          <button
            onClick={onLeaveVoice}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-[#f23f43] hover:bg-[#d83a3e] text-white transition-all duration-150 shadow-lg shadow-[#f23f43]/30 cursor-pointer shrink-0 hover:scale-105"
            title="Odadan Ayrıl"
          >
            <PhoneOff className="w-5 h-5" />
          </button>

        </div>
      </div>

      {/* SYNCHRONIZED HTML5 AUDIO ELEMENT FOR MUSIC BOT */}
      <audio ref={musicAudioRef} autoPlay playsInline />
    </div>
  );
}