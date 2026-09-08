import React, { useState } from 'react';
import { 
  Music, Play, Pause, Square, Volume2, Radio, Sparkles, 
  X, Check, ExternalLink, Disc3, Flame, Headphones
} from 'lucide-react';

export default function MusicPlayerModal({
  isOpen,
  onClose,
  currentVoiceChannel,
  musicState,
  stations = [],
  onPlayStation,
  onPlayCustom,
  onPause,
  onResume,
  onStop,
  onSetVolume
}) {
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const isPlaying = musicState?.isPlaying;
  const currentTrack = musicState?.currentTrack;
  const volume = musicState?.volume ?? 80;

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onPlayCustom(customUrl.trim(), customName.trim() || 'Özel Radyo Akışı');
    setCustomUrl('');
    setCustomName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-[#313338] shadow-2xl border border-[#3f4147] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#5865f2] via-[#4752c4] to-[#3c45a5] px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-bold tracking-wide uppercase flex items-center gap-1">
              <Disc3 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} /> Fivecord DJ
            </span>
            <span className="px-1.5 py-0.2 rounded bg-[#23a55a] text-[10px] font-black tracking-wider uppercase text-white">
              BOT
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight">7/24 Yüksek Kalite Müzik Botu</h2>
          <p className="text-xs text-white/80 mt-0.5">
            Odadaki tüm arkadaşlarınıza eş zamanlı ve kesintisiz stüdyo kalitesinde müzik yayını.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* NOW PLAYING CARD */}
          <div className="p-4 rounded-xl bg-[#232428] border border-[#383a40] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#5865f2]" />
                <span>Şu An Çalıyor</span>
              </span>
              {currentTrack && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#23a55a]/20 text-[#23a55a] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-ping" />
                  {isPlaying ? 'CANLI YAYIN' : 'DURAKLATILDI'}
                </span>
              )}
            </div>

            {currentTrack ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#5865f2] to-[#eb459e] flex items-center justify-center text-white text-xl shadow-md shrink-0">
                    {currentTrack.icon || '🎵'}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <h3 className="text-sm font-black text-white truncate">{currentTrack.name}</h3>
                    <p className="text-xs text-[#949ba4] truncate mt-0.5">{currentTrack.genre || 'Canlı Müzik'}</p>
                  </div>
                </div>

                {/* Player Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-[#383a40]/60">
                  <div className="flex items-center gap-2">
                    {isPlaying ? (
                      <button
                        onClick={onPause}
                        className="px-4 py-1.5 rounded-lg bg-[#f0b232] hover:bg-[#d99f2b] text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Duraklat</span>
                      </button>
                    ) : (
                      <button
                        onClick={onResume}
                        className="px-4 py-1.5 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Devam Et</span>
                      </button>
                    )}

                    <button
                      onClick={onStop}
                      className="px-3 py-1.5 rounded-lg bg-[#f23f43]/15 hover:bg-[#f23f43] text-[#f23f43] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Durdur</span>
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#949ba4]" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => onSetVolume(parseInt(e.target.value))}
                      className="w-24 h-1.5 bg-[#383a40] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                    />
                    <span className="text-[11px] font-mono text-[#949ba4] w-7 text-right">{volume}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-[#949ba4] space-y-1">
                <Disc3 className="w-8 h-8 text-[#5865f2]/40 mx-auto animate-pulse" />
                <p className="font-semibold text-[#dbdee1]">Müzik botu şu an boşta</p>
                <p className="text-[11px] text-[#80848e]">Aşağıdaki 7/24 istasyonlardan birini seçerek anında başlatabilirsiniz.</p>
              </div>
            )}
          </div>

          {/* PRESET STATIONS */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] block">
              7/24 Kesintisiz İstasyonlar
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stations.map((st) => {
                const isThisPlaying = currentTrack?.id === st.id && isPlaying;
                return (
                  <div
                    key={st.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      isThisPlaying
                        ? 'bg-[#5865f2]/15 border-[#5865f2] shadow-sm'
                        : 'bg-[#2b2d31] border-[#383a40] hover:border-[#4e5058]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-xl shrink-0">{st.icon || '📻'}</span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-white truncate">{st.name}</div>
                        <div className="text-[10px] text-[#949ba4] truncate">{st.genre}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => onPlayStation(st.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1 shadow-sm ${
                        isThisPlaying
                          ? 'bg-[#23a55a] text-white'
                          : 'bg-[#5865f2] hover:bg-[#4752c4] text-white hover:scale-105'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isThisPlaying ? 'Çalıyor' : 'Başlat'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CUSTOM URL STREAM */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] block">
              Özel Radyo / MP3 Bağlantısı Çal
            </span>
            <form onSubmit={handleCustomSubmit} className="space-y-2">
              <input
                type="url"
                placeholder="https://... (Doğrudan radyo yayını veya MP3 linki)"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1e1f22] border border-[#383a40] text-xs text-white placeholder-[#80848e] focus:outline-none focus:border-[#5865f2]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Yayın İsmi (İsteğe bağlı)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#1e1f22] border border-[#383a40] text-xs text-white placeholder-[#80848e] focus:outline-none focus:border-[#5865f2]"
                />
                <button
                  type="submit"
                  disabled={!customUrl.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Çal</span>
                </button>
              </div>
            </form>
          </div>

          {/* CHAT COMMANDS HELP */}
          <div className="p-3 rounded-lg bg-[#1e1f22]/70 border border-[#2e3035] text-[11px] text-[#949ba4] space-y-1">
            <span className="font-bold text-white block">💬 Metin Sohbeti Komutları:</span>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
              <div><code className="text-[#5865f2]">!play lofi</code> - Lofi radyosu</div>
              <div><code className="text-[#5865f2]">!play gaming</code> - Oyun phonk</div>
              <div><code className="text-[#5865f2]">!pause</code> - Duraklat</div>
              <div><code className="text-[#5865f2]">!resume</code> - Devam et</div>
              <div><code className="text-[#5865f2]">!stop</code> - Botu durdur</div>
              <div><code className="text-[#5865f2]">!radio</code> - Tüm istasyonlar</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#2b2d31] border-t border-[#383a40] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#383a40] hover:bg-[#4e5058] text-white text-xs font-semibold transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}