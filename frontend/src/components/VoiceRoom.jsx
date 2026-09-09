import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  Monitor, MonitorOff, Video, VideoOff, Mic, MicOff, Headphones, 
  PhoneOff, Maximize, Maximize2, Sparkles, Volume2, VolumeX, Radio, Check, Disc3, Music, Pause, Play, Tv, Download,
  RotateCcw, RotateCw, LayoutGrid, Loader2, Users
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';
import { webrtc } from '../services/webrtc';
import SharedCinemaPlayer from './SharedCinemaPlayer';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Standalone bulletproof Stream Player that guarantees NO black screen
function StreamPlayer({ streamItem, isFocused = false, onFocus, onRetry }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadSeconds, setLoadSeconds] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamItem?.stream) return;

    setIsPlaying(false);
    setLoadSeconds(0);

    // Set muted on DOM properties directly before srcObject (bypasses browser autoplay policy)
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('autoplay', 'true');

    video.srcObject = streamItem.stream;

    const markPlaying = () => {
      setIsPlaying(true);
    };

    const tryPlay = () => {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          if (video.videoWidth > 0 || video.currentTime > 0) {
            markPlaying();
          }
        }).catch(() => {});
      }
    };

    tryPlay();

    const onLoadedMetadata = () => { tryPlay(); if (video.videoWidth > 0) markPlaying(); };
    const onCanPlay = () => { tryPlay(); if (video.videoWidth > 0) markPlaying(); };
    const onPlaying = () => markPlaying();
    const onResize = () => { if (video.videoWidth > 0) markPlaying(); };
    const onTimeUpdate = () => { if (video.videoWidth > 0 || video.currentTime > 0) markPlaying(); };

    video.addEventListener('loadeddata', markPlaying);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('resize', onResize);
    video.addEventListener('timeupdate', onTimeUpdate);

    // Watch video track unmute (when first UDP RTP video packet arrives)
    const vTrack = streamItem.stream.getVideoTracks()[0];
    const onUnmute = () => {
      tryPlay();
      markPlaying();
    };
    if (vTrack) {
      if (!vTrack.muted && vTrack.readyState === 'live') {
        markPlaying();
      }
      vTrack.addEventListener('unmute', onUnmute);
    }

    // High frequency watchdog interval to detect first frame immediately
    const checkInterval = setInterval(() => {
      setLoadSeconds(prev => prev + 0.25);
      if (video.videoWidth > 0 || video.currentTime > 0) {
        markPlaying();
      } else {
        tryPlay();
      }
    }, 250);

    return () => {
      clearInterval(checkInterval);
      video.removeEventListener('loadeddata', markPlaying);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('resize', onResize);
      video.removeEventListener('timeupdate', onTimeUpdate);
      if (vTrack) {
        vTrack.removeEventListener('unmute', onUnmute);
      }
    };
  }, [streamItem?.stream, streamItem?.id]);

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden border border-[#3f4147] shadow-xl flex items-center justify-center group select-none">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />

      {/* Top Left: Streamer Badges */}
      <div className="absolute top-3.5 left-3.5 flex items-center gap-2 z-10">
        <span className="flex items-center gap-1.5 text-xs font-bold bg-[#f23f43] text-white px-2.5 py-1 rounded-md shadow-md">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          CANLI YAYIN
        </span>
        <span className="text-xs font-semibold bg-black/75 backdrop-blur-xs text-white px-2.5 py-1 rounded-md border border-white/10">
          {streamItem.username} {streamItem.isLocal ? '(Senin Ekranın)' : 'ekranı'}
        </span>
        <span className="text-xs font-semibold bg-[#5865f2] text-white px-2.5 py-1 rounded-md">
          60 FPS HD
        </span>
      </div>

      {/* Top Right: Actions */}
      <div className="absolute top-3.5 right-3.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {onFocus && (
          <button
            onClick={onFocus}
            className="p-2 rounded-xl bg-black/75 hover:bg-[#5865f2] text-white backdrop-blur-xs transition-colors shadow cursor-pointer"
            title="Sahneye Büyüt / Odaklan"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-black/75 hover:bg-black text-white backdrop-blur-xs transition-colors shadow cursor-pointer"
          title="Tam Ekran"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Loading overlay if video hasn't rendered first frame */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 text-white z-0">
          <Loader2 className="w-9 h-9 text-[#5865f2] animate-spin" />
          <span className="text-xs font-medium text-[#dbdee1]">Yayın yükleniyor ve senkronize ediliyor...</span>
          {loadSeconds > 3.0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
                if (onRetry) onRetry(streamItem.socketId);
              }}
              className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 pointer-events-auto"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Yeniden Senkronize Et</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

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
  onReconnectVoice,
  musicState,
  onOpenMusicModal,
  onToggleMusicPlay,
  onStopMusic,
  onSeekMusic,
  userMusicVolume = 80,
  onSetMusicVolume,
  watchTogetherState,
  onOpenWatchTogether,
  onStopWatchTogether,
  onWatchTogetherAction,
  isAppInstalled,
  onOpenDownload
}) {
  const [sliderVal, setSliderVal] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isNoiseSuppressed, setIsNoiseSuppressed] = useState(() => {
    try {
      return localStorage.getItem('fivecord_noise_suppressed') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [selectedStreamId, setSelectedStreamId] = useState(null);
  const [layoutMode, setLayoutMode] = useState(() => {
    try {
      return localStorage.getItem('fivecord_layout_mode') || 'auto';
    } catch (e) {
      return 'auto';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('fivecord_noise_suppressed', isNoiseSuppressed ? 'true' : 'false');
    } catch (e) {}
  }, [isNoiseSuppressed]);

  useEffect(() => {
    try {
      localStorage.setItem('fivecord_layout_mode', layoutMode);
    } catch (e) {}
  }, [layoutMode]);

  const channelMembers = useMemo(() => {
    return members.filter(m => m.voiceState?.channelId === channel.id);
  }, [members, channel.id]);

  // Collect ALL active screen streams (both local and all remote streams)
  const activeScreenStreams = useMemo(() => {
    const list = [];

    // 1. Remote members who are actively sharing screen with a confirmed live video stream
    channelMembers.forEach(member => {
      if (member.id !== currentUser?.id && member.voiceState?.isScreenSharing) {
        const stream = remoteScreenStreams?.get(member.socketId);
        const liveVideo = stream && stream.getVideoTracks().find(t => t.readyState === 'live');
        if (stream && liveVideo) {
          list.push({
            id: `${member.socketId}-${liveVideo.id}`,
            socketId: member.socketId,
            username: member.username,
            avatar: member.avatar,
            stream,
            isLocal: false
          });
        }
      }
    });

    // 2. Any additional remote screen streams with verified active screen share
    if (remoteScreenStreams) {
      for (const [socketId, stream] of remoteScreenStreams.entries()) {
        const peer = members.find(m => m.socketId === socketId);
        const isSharing = peer?.voiceState?.isScreenSharing;
        const liveVideo = stream && stream.getVideoTracks().find(t => t.readyState === 'live');
        if (isSharing && liveVideo && !list.some(s => s.socketId === socketId)) {
          list.push({
            id: `${socketId}-${liveVideo.id}`,
            socketId,
            username: peer?.username || 'Arkadaşın',
            avatar: peer?.avatar,
            stream,
            isLocal: false
          });
        }
      }
    }

    // 3. Local screen share
    if (isScreenSharing && screenStream) {
      const liveLocalVideo = screenStream.getVideoTracks().find(t => t.readyState === 'live');
      if (liveLocalVideo) {
        list.push({
          id: 'local',
          socketId: 'local',
          username: currentUser?.username || 'Sen',
          avatar: currentUser?.avatar,
          stream: screenStream,
          isLocal: true
        });
      }
    }

    return list;
  }, [channelMembers, remoteScreenStreams, isScreenSharing, screenStream, currentUser, members]);

  // Current focused stream (for focus / theater mode)
  const focusedStream = useMemo(() => {
    if (activeScreenStreams.length === 0) return null;
    if (selectedStreamId) {
      const match = activeScreenStreams.find(s => s.id === selectedStreamId);
      if (match) return match;
    }
    // Default to the first remote stream, or local if only local exists
    return activeScreenStreams.find(s => !s.isLocal) || activeScreenStreams[0];
  }, [activeScreenStreams, selectedStreamId]);

  // Effective layout mode: If only 1 stream, focus mode is natural; if >= 2, auto defaults to grid
  const isGridView = (layoutMode === 'grid') || (layoutMode === 'auto' && activeScreenStreams.length >= 2 && !selectedStreamId);

  // Music slider handling
  const durationSec = musicState?.duration || (musicState?.currentTrack?.durationSec) || 0;
  const isLive = !durationSec || durationSec <= 0 || musicState?.currentTrack?.source === 'station';

  useEffect(() => {
    if (!musicState || !musicState.isPlaying || isDragging || isLive) {
      if (!isDragging && musicState) {
        setSliderVal(musicState.currentTime || 0);
      }
      return;
    }

    const updateCurrent = () => {
      if (musicState.isBuffering || !musicState.startedAt) {
        setSliderVal(0);
        return;
      }
      const elapsed = (Date.now() - (musicState.updatedAt || musicState.startedAt)) / 1000;
      const current = Math.min(durationSec, (musicState.currentTime || 0) + elapsed);
      setSliderVal(Math.max(0, current));
    };

    updateCurrent();
    const interval = setInterval(updateCurrent, 250);
    return () => clearInterval(interval);
  }, [musicState, isDragging, durationSec, isLive]);

  const handleQuickJump = (delta) => {
    if (isLive || !onSeekMusic) return;
    const newTime = Math.max(0, Math.min(durationSec, sliderVal + delta));
    setSliderVal(newTime);
    onSeekMusic(newTime);
  };

  const handleSliderCommit = () => {
    setIsDragging(false);
    if (onSeekMusic) onSeekMusic(sliderVal);
  };

  const toggleNoiseSuppression = () => {
    const next = !isNoiseSuppressed;
    webrtc.setNoiseSuppression(next);
    setIsNoiseSuppressed(next);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1f22] overflow-hidden relative select-none">
      {/* Top channel header */}
      <div className="h-12 border-b border-[#1f2023] px-6 flex items-center justify-between shrink-0 bg-[#1e1f22]">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <span>🔊</span>
          <span>{channel.name}</span>
          <span className="text-xs font-normal text-[#949ba4] bg-[#2b2d31] px-2 py-0.5 rounded ml-2">
            {channelMembers.length} Kişi Bağlı
          </span>
          {activeScreenStreams.length > 0 && (
            <span className="text-xs font-bold text-[#f23f43] bg-[#f23f43]/15 px-2.5 py-0.5 rounded-full border border-[#f23f43]/30 flex items-center gap-1.5 ml-1">
              <Radio className="w-3 h-3 animate-pulse" />
              {activeScreenStreams.length} Yayın Canlı
            </span>
          )}
        </div>

        {/* Windows App Download Button */}
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
        <div className="bg-[#2b2d31] border-b border-[#383a40] px-4 md:px-6 py-2 flex items-center justify-between text-xs shadow-inner flex-wrap gap-2">
          {/* Track Info */}
          <div className="flex items-center gap-3 overflow-hidden min-w-0 max-w-full sm:max-w-xs md:max-w-md">
            <div className="flex items-center gap-1.5 text-[#5865f2] font-black shrink-0">
              <Disc3 className={`w-4 h-4 ${musicState.isPlaying ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Fivecord DJ:</span>
            </div>
            <span className="text-white font-bold truncate">
              {musicState.currentTrack.title || musicState.currentTrack.name}
            </span>
            <span className="text-[10px] text-[#949ba4] px-1.5 py-0.2 rounded bg-[#1e1f22] shrink-0">
              {musicState.currentTrack.artist || musicState.currentTrack.genre || 'Müzik'}
            </span>
          </div>

          {/* Timeline & Scrubber */}
          {!isLive ? (
            <div className="flex items-center gap-2 shrink-0 bg-[#232428] px-3 py-1 rounded-lg border border-[#383a40]">
              <button
                onClick={() => handleQuickJump(-10)}
                className="p-1 rounded hover:bg-[#35373c] text-[#949ba4] hover:text-white transition-colors cursor-pointer"
                title="10 Saniye Geri Sar"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#5865f2]" />
              </button>
              <span className="text-[11px] font-mono text-[#949ba4] w-9 text-right">
                {formatTime(sliderVal)}
              </span>
              <input
                type="range"
                min="0"
                max={durationSec}
                step="1"
                value={Math.floor(sliderVal)}
                onChange={(e) => {
                  setIsDragging(true);
                  setSliderVal(Number(e.target.value));
                }}
                onMouseUp={handleSliderCommit}
                onTouchEnd={handleSliderCommit}
                className="w-16 sm:w-28 md:w-36 h-1.5 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                style={{
                  background: `linear-gradient(to right, #5865f2 ${(sliderVal / Math.max(durationSec, 1)) * 100}%, #1e1f22 ${(sliderVal / Math.max(durationSec, 1)) * 100}%)`
                }}
              />
              <span className="text-[11px] font-mono text-[#949ba4] w-9 text-left">
                {formatTime(durationSec)}
              </span>
              <button
                onClick={() => handleQuickJump(10)}
                className="p-1 rounded hover:bg-[#35373c] text-[#949ba4] hover:text-white transition-colors cursor-pointer"
                title="10 Saniye İleri Sar"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#5865f2]" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#23a55a] font-bold bg-[#1e1f22] px-2.5 py-0.5 rounded-full border border-[#23a55a]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-ping" />
              7/24 Kesintisiz Canlı Yayın
            </div>
          )}

          {/* Personal Music Volume Slider */}
          <div 
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[#949ba4] shrink-0 transition-colors ${
              userMusicVolume === 0 && musicState.isPlaying
                ? 'bg-[#f23f43]/20 border-[#f23f43]/60 animate-pulse'
                : 'bg-[#232428] border-[#383a40]'
            }`} 
            title="Kişisel Müzik Ses Seviyen (Sadece senin için değişir)"
          >
            <button
              onClick={() => onSetMusicVolume && onSetMusicVolume(userMusicVolume > 0 ? 0 : 80)}
              className="hover:text-white transition-colors cursor-pointer"
              title={userMusicVolume === 0 ? "Sesi Aç (%80 yap)" : "Kişisel Sesi Sustur"}
            >
              {userMusicVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-[#f23f43]" /> : <Volume2 className="w-3.5 h-3.5 text-[#23a55a]" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={userMusicVolume}
              onChange={(e) => onSetMusicVolume && onSetMusicVolume(Number(e.target.value))}
              className="w-14 sm:w-20 h-1.5 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#23a55a]"
            />
            <span className={`text-[10px] font-mono font-bold w-6 text-right ${userMusicVolume === 0 ? 'text-[#f23f43]' : 'text-[#23a55a]'}`}>
              %{userMusicVolume}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleMusicPlay}
              className="px-3 py-1 rounded-lg bg-[#383a40] hover:bg-[#4e5058] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {musicState.isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{musicState.isPlaying ? 'Duraklat' : 'Oynat'}</span>
            </button>
            <button
              onClick={onOpenMusicModal}
              className="px-3 py-1 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              🔍 Şarkı Ara / Ayar
            </button>
            <button
              onClick={onStopMusic}
              className="px-2.5 py-1 rounded-lg bg-[#f23f43]/20 hover:bg-[#f23f43] text-[#f23f43] hover:text-white text-xs font-bold transition-all cursor-pointer"
              title="Müziği Kapat"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Stage */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col justify-center">
        {/* 1. WATCH TOGETHER YOUTUBE CINEMA STAGE */}
        {watchTogetherState?.videoId && activeScreenStreams.length === 0 ? (
          <div className="space-y-4 max-w-6xl mx-auto w-full">
            <SharedCinemaPlayer
              watchTogetherState={watchTogetherState}
              onAction={onWatchTogetherAction}
              onOpenModal={onOpenWatchTogether}
              onClose={onStopWatchTogether}
              currentUser={currentUser}
            />
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
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.username || 'user')}`;
                      }}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-bold text-white">{member.username}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeScreenStreams.length > 0 ? (
          /* 2. MULTI-STREAM STAGE (DISCORD-STYLE) */
          <div className="space-y-4 max-w-7xl mx-auto w-full">
            {/* Stream Switcher Bar & Layout Controls (if multiple streams or focus mode) */}
            {activeScreenStreams.length > 1 && (
              <div className="flex items-center justify-between bg-[#2b2d31]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-[#383a40] flex-wrap gap-2">
                {/* Active streams tabs */}
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-xs font-bold text-[#949ba4] mr-1 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#f23f43] animate-pulse" />
                    Yayınlar:
                  </span>
                  {activeScreenStreams.map(s => {
                    const isSelected = focusedStream?.id === s.id && !isGridView;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedStreamId(s.id);
                          setLayoutMode('focus');
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#5865f2] text-white shadow'
                            : 'bg-[#1e1f22] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
                        }`}
                      >
                        <span>{s.username}</span>
                        {s.isLocal ? <span className="text-[10px] text-[#949ba4]">(Sen)</span> : null}
                        <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-ping" />
                      </button>
                    );
                  })}
                </div>

                {/* View Mode Switcher Button */}
                <button
                  onClick={() => {
                    if (isGridView) {
                      setLayoutMode('focus');
                    } else {
                      setLayoutMode('grid');
                      setSelectedStreamId(null);
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-[#383a40] hover:bg-[#4e5058] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-[#5865f2]" />
                  <span>{isGridView ? 'Tek Yayına Odaklan' : 'Yan Yana Göster (Izgara)'}</span>
                </button>
              </div>
            )}

            {/* VIDEO CONTAINER: GRID or FOCUS */}
            {isGridView ? (
              /* GRID VIEW: All active streams side-by-side */
              <div className={`grid gap-4 w-full ${
                activeScreenStreams.length === 1 ? 'grid-cols-1 max-w-5xl mx-auto' :
                activeScreenStreams.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
                {activeScreenStreams.map(streamItem => (
                  <div key={streamItem.id} className="aspect-video w-full">
                    <StreamPlayer
                      streamItem={streamItem}
                      onRetry={onReconnectVoice}
                      onFocus={() => {
                        setSelectedStreamId(streamItem.id);
                        setLayoutMode('focus');
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* FOCUS VIEW: Single large stream */
              focusedStream && (
                <div className="relative w-full aspect-video max-w-6xl mx-auto">
                  <StreamPlayer
                    streamItem={focusedStream}
                    isFocused={true}
                    onRetry={onReconnectVoice}
                  />
                </div>
              )
            )}

            {/* Members Strip below streams */}
            <div className="flex items-center justify-center gap-2.5 overflow-x-auto py-2">
              {channelMembers.map((member) => {
                const isSpeaking = member.voiceState?.isSpeaking;
                const isStreaming = activeScreenStreams.some(s => s.socketId === member.socketId || (s.isLocal && member.id === currentUser?.id));
                return (
                  <div
                    key={member.socketId}
                    onClick={() => {
                      if (isStreaming) {
                        const targetStream = activeScreenStreams.find(s => s.socketId === member.socketId || (s.isLocal && member.id === currentUser?.id));
                        if (targetStream) {
                          setSelectedStreamId(targetStream.id);
                          setLayoutMode('focus');
                        }
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#2b2d31] border transition-all ${
                      isStreaming ? 'cursor-pointer hover:border-[#5865f2]' : ''
                    } ${
                      isSpeaking ? 'border-[#23a55a] shadow-md shadow-[#23a55a]/20 scale-105' : 'border-[#383a40]'
                    }`}
                    title={isStreaming ? `${member.username} yayınına odaklan` : member.username}
                  >
                    <div className="relative">
                      <img
                        src={member.avatar}
                        alt={member.username}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.username || 'user')}`;
                        }}
                        className={`w-7 h-7 rounded-full object-cover border-2 ${
                          isSpeaking ? 'border-[#23a55a]' : 'border-transparent'
                        }`}
                      />
                      {isStreaming && (
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#f23f43] border-2 border-[#2b2d31] animate-pulse" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-white truncate max-w-[100px]">
                      {member.username}
                    </span>
                    {isStreaming && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#f23f43] text-white">
                        CANLI
                      </span>
                    )}
                    {member.voiceState?.isMuted && <MicOff className="w-3 h-3 text-[#f23f43]" />}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* 3. DISCORD USER TILES GRID (When no screens are sharing) */
          <div className="max-w-5xl mx-auto w-full">
            <div className={`grid gap-4 ${
              channelMembers.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
              channelMembers.length === 2 ? 'grid-cols-2' :
              channelMembers.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
            }`}>
              {channelMembers.map((member) => {
                const isLocal = member.id === currentUser?.id;
                const isSpeaking = member.voiceState?.isSpeaking;
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
                              musicState.isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
                            }`}>
                              <img
                                src={musicState.currentTrack.thumbnail}
                                alt="Albüm Kapağı"
                                className="w-full h-full rounded-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#5865f2] to-[#eb459e] flex items-center justify-center shadow-2xl">
                              <Music className="w-10 h-10 text-white animate-bounce" />
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#5865f2] text-white shadow-md">
                            <Radio className="w-3.5 h-3.5 animate-pulse" />
                          </div>
                        </div>

                        <div className="text-center w-full max-w-[180px]">
                          <p className="text-xs font-black text-white truncate">
                            {musicState?.currentTrack?.title || 'Fivecord DJ'}
                          </p>
                          <p className="text-[10px] text-[#949ba4] truncate mt-0.5">
                            {musicState?.currentTrack?.artist || '7/24 Kesintisiz Müzik'}
                          </p>
                        </div>
                      </div>
                    ) : hasCamera ? (
                      /* Live Camera Video */
                      <video
                        ref={(el) => {
                          const stream = isLocal 
                            ? localStream 
                            : remoteStreams?.get(member.socketId);
                          if (el) {
                            el.muted = true;
                            el.defaultMuted = true;
                            if (stream && el.srcObject !== stream) {
                              el.srcObject = stream;
                            }
                            el.play().catch(() => {});
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      /* Centered Large Avatar */
                      <div className="relative mb-2">
                        <img
                          src={member.avatar}
                          alt={member.username}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.username || 'user')}`;
                          }}
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

            {/* Screen Share Button - ALWAYS AVAILABLE (Multi-stream supported!) */}
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
                watchTogetherState?.videoId 
                  ? 'bg-[#f23f43] text-white shadow-lg shadow-[#f23f43]/30 animate-pulse' 
                  : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
              }`}
              title={watchTogetherState?.videoId ? 'Birlikte YouTube İzle (Açık)' : 'Birlikte YouTube İzle'}
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
    </div>
  );
}
