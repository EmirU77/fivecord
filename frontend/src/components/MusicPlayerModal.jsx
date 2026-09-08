import React, { useState } from 'react';
import { 
  Music, Play, Pause, Square, Volume2, Sparkles, 
  X, Check, ExternalLink, Disc3, Search, Loader2, Clock, User,
  Globe, Radio
} from 'lucide-react';

export default function MusicPlayerModal({
  isOpen,
  onClose,
  currentVoiceChannel,
  musicState,
  onPlayTrack,
  onPause,
  onResume,
  onStop,
  onSetVolume
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  if (!isOpen) return null;

  const isPlaying = musicState?.isPlaying;
  const currentTrack = musicState?.currentTrack;
  const volume = musicState?.volume ?? 80;

  const handleSearchSubmit = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(searchQuery.trim())}&platform=all`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
        setSearchError('Arama sonucu bulunamadı. Lütfen şarkı veya sanatçı adını kontrol edin.');
      }
    } catch (err) {
      setSearchError('Arama yapılırken bir hata oluştu: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const getPlatformBadge = (platform) => {
    switch (platform) {
      case 'spotify':
        return <span className="px-2 py-0.5 rounded-full bg-[#1db954]/20 text-[#1db954] text-[10px] font-bold border border-[#1db954]/30">🟢 Spotify</span>;
      case 'apple':
        return <span className="px-2 py-0.5 rounded-full bg-[#fc3c44]/20 text-[#fc3c44] text-[10px] font-bold border border-[#fc3c44]/30">🍎 Apple Music</span>;
      case 'soundcloud':
        return <span className="px-2 py-0.5 rounded-full bg-[#ff5500]/20 text-[#ff7733] text-[10px] font-bold border border-[#ff5500]/30">🟠 SoundCloud</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-[#ff0000]/20 text-[#ff4d4d] text-[10px] font-bold border border-[#ff0000]/30">🔴 YouTube</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-[#313338] shadow-2xl border border-[#3f4147] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#5865f2] via-[#4752c4] to-[#1db954] px-6 py-4.5 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors cursor-pointer"
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
            {currentVoiceChannel && (
              <span className="px-2 py-0.5 rounded-md bg-black/25 text-[11px] font-semibold text-white/90">
                🔊 {currentVoiceChannel.name}
              </span>
            )}
          </div>
          
          <h2 className="text-xl font-black tracking-tight">Evrensel Müzik Çalar</h2>
          <p className="text-xs text-white/85 mt-0.5">
            Spotify, YouTube, Apple Music ve SoundCloud şarkılarını arkadaşlarınla aynı anda dinle.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* SEARCH SECTION */}
          <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
            {/* Single "Tüm Platformlar" Option */}
            <div className="flex items-center justify-between text-xs pb-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#949ba4] font-semibold shrink-0">Platform:</span>
                <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#5865f2]/20 via-[#1db954]/20 to-[#fc3c44]/20 border border-[#5865f2]/40 text-white text-xs font-bold flex items-center gap-2 shadow-xs">
                  <Globe className="w-3.5 h-3.5 text-[#5865f2]" />
                  <span>Tüm Platformlar</span>
                  <span className="text-[10px] text-[#949ba4] font-normal hidden sm:inline">(Spotify, YouTube, Apple Music, SoundCloud)</span>
                </span>
              </div>
              <span className="text-[11px] text-[#80848e]">Otomatik ortak arama</span>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Şarkı adı, sanatçı veya Spotify/YouTube linki yazın..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[#1e1f22] border border-[#3f4147] text-sm text-white placeholder-[#80848e] focus:outline-none focus:border-[#5865f2] transition-colors"
                />
                <Search className="w-4 h-4 text-[#80848e] absolute left-3 top-3" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-2.5 top-2.5 text-[#80848e] hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 hover:scale-105 shrink-0 cursor-pointer"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Aranıyor</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Ara & Çal</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Message */}
            {searchError && (
              <div className="p-2.5 rounded-lg bg-[#f23f43]/15 border border-[#f23f43]/30 text-xs text-[#f23f43]">
                {searchError}
              </div>
            )}

            {/* SEARCH RESULTS LIST */}
            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#383a40]/60">
                <div className="text-[11px] font-bold text-[#dbdee1] flex items-center justify-between">
                  <span>Arama Sonuçları ({searchResults.length}):</span>
                  <button 
                    onClick={() => setSearchResults([])} 
                    className="text-[10px] text-[#949ba4] hover:text-white cursor-pointer"
                  >
                    Temizle
                  </button>
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {searchResults.map((track) => (
                    <div
                      key={track.id + (track.title || '')}
                      className="p-2.5 rounded-xl bg-[#232428] hover:bg-[#35373c] border border-[#383a40] transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-[#1e1f22]">
                          <img 
                            src={track.thumbnail} 
                            alt={track.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-[#5865f2] transition-colors">
                              {track.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getPlatformBadge(track.platform)}
                            <span className="text-[11px] text-[#949ba4] truncate">
                              {track.artist}
                            </span>
                            {track.duration && (
                              <span className="text-[10px] text-[#80848e] font-mono">
                                • {track.duration}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onPlayTrack(track);
                          setSearchResults([]);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 hover:scale-105 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Oynat</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* NOW PLAYING CARD */}
          <div className="p-4 rounded-xl bg-[#232428] border border-[#383a40] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#5865f2]" />
                <span>Şu An Çalıyor</span>
              </span>
              {currentTrack && (
                <div className="flex items-center gap-2">
                  {getPlatformBadge(currentTrack.platform || 'youtube')}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#23a55a]/20 text-[#23a55a] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-ping" />
                    {isPlaying ? 'CANLI' : 'DURAKLATILDI'}
                  </span>
                </div>
              )}
            </div>

            {currentTrack ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-lg shrink-0 bg-[#1e1f22]">
                    {currentTrack.thumbnail ? (
                      <img src={currentTrack.thumbnail} alt={currentTrack.title || currentTrack.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#5865f2] to-[#eb459e] flex items-center justify-center text-white text-2xl">
                        🎵
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Disc3 className="w-7 h-7 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden flex-1">
                    <h3 className="text-sm font-black text-white truncate">
                      {currentTrack.title || currentTrack.name}
                    </h3>
                    <p className="text-xs text-[#949ba4] truncate mt-0.5">
                      {currentTrack.artist || 'Bilinmeyen Sanatçı'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {currentTrack.duration && (
                        <span className="text-[10px] text-[#dbdee1] bg-[#313338] px-2 py-0.5 rounded font-mono">
                          ⏱️ {currentTrack.duration}
                        </span>
                      )}
                      {currentTrack.requestedBy && (
                        <span className="text-[10px] text-[#5865f2] bg-[#5865f2]/10 px-2 py-0.5 rounded font-semibold">
                          👤 @{currentTrack.requestedBy} istedi
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Player Controls */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[#383a40]/60">
                  <div className="flex items-center gap-2">
                    {isPlaying ? (
                      <button
                        onClick={onPause}
                        className="px-4 py-1.5 rounded-lg bg-[#f0b232] hover:bg-[#d99f2b] text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:scale-105 cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Duraklat</span>
                      </button>
                    ) : (
                      <button
                        onClick={onResume}
                        className="px-4 py-1.5 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:scale-105 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Devam Et</span>
                      </button>
                    )}

                    <button
                      onClick={onStop}
                      className="px-3.5 py-1.5 rounded-lg bg-[#f23f43]/15 hover:bg-[#f23f43] text-[#f23f43] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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
              <div className="text-center py-5 text-xs text-[#949ba4] space-y-1.5">
                <Disc3 className="w-9 h-9 text-[#5865f2]/40 mx-auto animate-pulse" />
                <p className="font-semibold text-white">Şu anda çalan şarkı yok</p>
                <p className="text-[11px] text-[#80848e]">Yukarıdaki arama çubuğundan Spotify veya YouTube'dan dilediğiniz şarkıyı aratabilirsiniz.</p>
              </div>
            )}
          </div>

          {/* CHAT COMMANDS HELPER */}
          <div className="p-3 rounded-xl bg-[#1e1f22]/70 border border-[#2e3035] text-[11px] text-[#949ba4] flex items-center justify-between flex-wrap gap-1">
            <span className="text-white font-semibold flex items-center gap-1">
              💬 Sohbet Komutları:
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap">
              <span className="bg-[#2b2d31] px-1.5 py-0.5 rounded text-[#5865f2]">!play [şarkı]</span>
              <span className="bg-[#2b2d31] px-1.5 py-0.5 rounded text-[#5865f2]">!pause</span>
              <span className="bg-[#2b2d31] px-1.5 py-0.5 rounded text-[#5865f2]">!resume</span>
              <span className="bg-[#2b2d31] px-1.5 py-0.5 rounded text-[#5865f2]">!stop</span>
              <span className="bg-[#2b2d31] px-1.5 py-0.5 rounded text-[#5865f2]">!volume 0-100</span>
              <span className="bg-[#2b2d31] px-1.5 py-0.5 rounded text-[#5865f2]">!np</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#2b2d31] border-t border-[#383a40] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#383a40] hover:bg-[#4e5058] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}