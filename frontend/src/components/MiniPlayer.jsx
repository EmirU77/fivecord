import React, { useRef, useEffect, useState } from 'react';
import { 
  Maximize2, Mic, MicOff, Headphones, PhoneOff, Radio, Tv, X, 
  Volume2, VolumeX, Sparkles, Move
} from 'lucide-react';
import { screenRelay } from '../services/screenRelay';

export default function MiniPlayer({
  voiceChannel,
  activeScreenStreams = [],
  channelMembers = [],
  currentUser,
  isMuted,
  onToggleMute,
  isDeafened,
  onToggleDeafen,
  onLeaveVoice,
  onReturnToVoice
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  // Preferred active screen stream
  const activeStream = activeScreenStreams.find(s => !s.isLocal) || activeScreenStreams[0] || null;

  // WebRTC direct video binding
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeStream?.stream) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.srcObject = activeStream.stream;
    video.play().catch(() => {});
  }, [activeStream?.stream]);

  // Canvas relay fallback
  useEffect(() => {
    if (!activeStream || activeStream.isLocal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderBlob = (blob) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        if (canvas) {
          if (canvas.width !== img.width || canvas.height !== img.height) {
            canvas.width = img.width;
            canvas.height = img.height;
          }
          ctx.drawImage(img, 0, 0);
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    };

    const cached = screenRelay.getLatestFrame(activeStream.socketId);
    if (cached) renderBlob(cached);

    const unsub = screenRelay.onFrame((senderSocketId, blob) => {
      if (senderSocketId === activeStream.socketId) {
        renderBlob(blob);
      }
    });

    return () => unsub();
  }, [activeStream?.socketId, activeStream?.isLocal]);

  if (!voiceChannel) return null;

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-40 bg-[#111214] hover:bg-[#1e1f22] border border-[#3f4147] text-white px-3.5 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 cursor-pointer select-none transition-all duration-200 hover:scale-105"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#23a55a] animate-pulse" />
        <span className="text-xs font-bold">{voiceChannel.name}</span>
        {activeStream && (
          <span className="text-[10px] font-bold bg-[#f23f43] px-1.5 py-0.5 rounded text-white flex items-center gap-1">
            <Radio className="w-2.5 h-2.5" />
            CANLI
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-72 md:w-80 bg-[#111214] border border-[#383a40] rounded-2xl shadow-2xl overflow-hidden select-none transition-all duration-200 animate-in fade-in slide-in-from-bottom-5">
      {/* PiP Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1e1f22] border-b border-[#2b2d31]">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse shrink-0" />
          <span className="text-xs font-bold text-white truncate">{voiceChannel.name}</span>
          {activeStream && (
            <span className="text-[9px] font-bold bg-[#f23f43] text-white px-1.5 py-0.2 rounded shrink-0">
              YAYIN
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onReturnToVoice}
            title="Sahneye Büyüt / Odaya Dön"
            className="p-1 rounded-lg hover:bg-[#35373c] text-[#b5bac1] hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            title="Küçült"
            className="p-1 rounded-lg hover:bg-[#35373c] text-[#b5bac1] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PiP Content View: Live Stream or Speaking Avatars */}
      <div 
        onClick={onReturnToVoice}
        className="relative w-full aspect-video bg-black flex items-center justify-center cursor-pointer group overflow-hidden"
      >
        {activeStream ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            {!activeStream.isLocal && (
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain absolute inset-0 -z-10"
              />
            )}
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] text-white font-medium">
              <span>{activeStream.username} yayını</span>
            </div>
          </>
        ) : (
          /* Voice members grid */
          <div className="w-full h-full flex items-center justify-center p-3 gap-2 flex-wrap bg-[#1a1b1e]">
            {channelMembers.slice(0, 6).map((m) => {
              const isSpeaking = m.voiceState?.isSpeaking;
              return (
                <div key={m.socketId || m.id} className="relative">
                  <img
                    src={m.avatar}
                    alt={m.username}
                    className={`w-10 h-10 rounded-full object-cover bg-black border-2 transition-transform duration-150 ${
                      isSpeaking ? 'border-[#23a55a] scale-110 shadow-lg shadow-[#23a55a]/30' : 'border-[#383a40]'
                    }`}
                  />
                  {m.voiceState?.isMuted && (
                    <div className="absolute -bottom-1 -right-1 bg-[#f23f43] p-0.5 rounded-full text-white">
                      <MicOff className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <span className="text-[11px] font-bold text-white bg-black/70 px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Odaya Dön</span>
          </span>
        </div>
      </div>

      {/* Quick Action Controls */}
      <div className="flex items-center justify-around py-2 px-3 bg-[#1e1f22] border-t border-[#2b2d31]">
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            isMuted ? 'bg-[#f23f43]/20 text-[#f23f43] hover:bg-[#f23f43]/30' : 'bg-[#2b2d31] text-white hover:bg-[#35373c]'
          }`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={onToggleDeafen}
          title={isDeafened ? 'Sağırlaştırmayı Kaldır' : 'Sağırlaştır'}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            isDeafened ? 'bg-[#f23f43]/20 text-[#f23f43] hover:bg-[#f23f43]/30' : 'bg-[#2b2d31] text-white hover:bg-[#35373c]'
          }`}
        >
          <Headphones className="w-4 h-4" />
        </button>

        <button
          onClick={onReturnToVoice}
          title="Ses Odasını Aç"
          className="p-2 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] text-white transition-all cursor-pointer"
        >
          <Tv className="w-4 h-4" />
        </button>

        <button
          onClick={onLeaveVoice}
          title="Ses Bağlantısını Kes"
          className="p-2 rounded-xl bg-[#f23f43] hover:bg-[#da373c] text-white transition-all cursor-pointer shadow-md shadow-[#f23f43]/20"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
