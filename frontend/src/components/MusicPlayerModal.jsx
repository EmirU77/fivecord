import React, { useState } from 'react';
import { 
  Music, Play, Pause, Square, Volume2, Radio, Sparkles, 
  X, Check, ExternalLink, Disc3, Flame, Headphones, Search, Loader2, Clock, User
} from 'lucide-react';

export default function MusicPlayerModal({
  isOpen,
  onClose,
  currentVoiceChannel,
  musicState,
  stations = [],
  onPlayStation,
  onPlayTrack,
  onPlayCustom,
  onPause,
  onResume,
  onStop,
  onSetVolume
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const isPlaying = musicState?.isPlaying;
  const currentTrack = musicState?.currentTrack;
  const volume = musicState?.volume ?? 80;

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
        setSearchError('Şarkı bulunamadı. Lütfen başka bir şarkı veya sanatçı adı deneyin.');
      }
    } catch (err) {
      setSearchError('Arama yapılırken bir hata oluştu: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onPlayCustom(customUrl.trim(), customName.trim() || 'Özel Radyo Akışı');
    setCustomUrl('');
    setCustomName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-[#313338] shadow-2xl border border-[#3f4147] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#5865f2] via-[#4752c4] to-[#eb459e] px-6 py-5 text-white shrink-0">
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
            <span className="px-2 py-0.5 rounded-md bg-black/20 text-[11px] font-semibold text-white/90">
              {currentVoiceChannel ? currentVoiceChannel.name : 'Ses Odası'}
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight">Fivecord Müzik Botu & YouTube Çalar</h2>
          <p className="text-xs text-white/80 mt-0.5">
            İstediğin şarkının adını yazarak arat ve odadaki tüm arkadaşlarınla aynı anda dinle!
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* 1. YOUTUBE SONG SEARCH BAR */}
          <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#5865f2]" />
                <span>Şarkı Ara (YouTube / Müzik)</span>
              </span>
              <span className="text-[10px] text-[#80848e]">
                veya sohbete <code className="text-[#5865f2] bg-[#1e1f22] px-1 py-0.5 rounded">!play [şarkı]</code> yazın
              </span>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Şarkı veya sanatçı adı yazın (Örn: Ceza Suspus, Duman, The Weeknd)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#1e1f22] border border-[#3f4147] text-sm text-white placeholder-[#80848e] focus:outline-none focus:border-[#5865f2] transition-colors"
                />
                <Search className="w-4 h-4 text-[#80848e] absolute left-3 top-3" />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 hover:scale-105"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Aranıyor...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Ara & Çal</span>
                  </>
                )}
              </button>
            </form>

            {/* SEARCH ERROR */}
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
                    className="text-[10px] text-[#949ba4] hover:text-white"
                  >
                    Temizle
                  </button>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {searchResults.map((track) => (
                    <div
                      key={track.id}
                      className="p-2 rounded-xl bg-[#232428] hover:bg-[#35373c] border border-[#383a40] transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="relative w-12 h-10 rounded-lg overflow-hidden shrink-0 bg-[#1e1f22]">
                          <img 
                            src={track.thumbnail} 
                            alt={track.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                          <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[9px] font-mono text-white">
                            {track.duration}
                          </span>
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-[#5865f2] transition-colors">
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-[#949ba4] truncate flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-[#80848e]" />
                            <span>{track.artist}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onPlayTrack(track);
                          setSearchResults([]);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 hover:scale-105"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Oynat</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. NOW PLAYING CARD */}
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
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-md shrink-0 bg-[#1e1f22]">
                    {currentTrack.thumbnail ? (
                      <img src={currentTrack.thumbnail} alt={currentTrack.title || currentTrack.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#5865f2] to-[#eb459e] flex items-center justify-center text-white text-2xl">
                        {currentTrack.icon || '🎵'}
                      </div>
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <Disc3 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <h3 className="text-sm font-black text-white truncate">{currentTrack.title || currentTrack.name}</h3>
                    <p className="text-xs text-[#949ba4] truncate mt-0.5 flex items-center gap-2">
                      <span>{currentTrack.artist || currentTrack.genre || 'YouTube Müzik'}</span>
                      {currentTrack.duration && (
                        <span className="flex items-center gap-0.5 text-[10px] text-[#dbdee1] bg-[#313338] px-1.5 py-0.2 rounded font-mono">
                          <Clock className="w-2.5 h-2.5 inline" /> {currentTrack.duration}
                        </span>
                      )}
                      {currentTrack.requestedBy && (
                        <span className="text-[10px] text-[#5865f2]">@{currentTrack.requestedBy}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Player Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-[#383a40]/60">
                  <div className="flex items-center gap-2">
                    {isPlaying ? (
                      <button
                        onClick={onPause}
                        className="px-4 py-1.5 rounded-lg bg-[#f0b232] hover:bg-[#d99f2b] text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:scale-105"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Duraklat</span>
                      </button>
                    ) : (
                      <button
                        onClick={onResume}
                        className="px-4 py-1.5 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:scale-105"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Devam Et</span>
                      </button>
                    )}

                    <button
                      onClick={onStop}
                      className="px-3.5 py-1.5 rounded-lg bg-[#f23f43]/15 hover:bg-[#f23f43] text-[#f23f43] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
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
                <p className="text-[11px] text-[#80848e]">Yukarıdan bir şarkı aratın veya aşağıdaki 7/24 istasyonlardan birini başlatın.</p>
              </div>
            )}
          </div>

          {/* 3. PRESET 24/7 STATIONS */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] block">
              7/24 Kesintisiz Radyo İstasyonları
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

          {/* 4. CUSTOM URL STREAM */}
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

          {/* 5. CHAT COMMANDS HELP */}
          <div className="p-3.5 rounded-xl bg-[#1e1f22]/70 border border-[#2e3035] text-[11px] text-[#949ba4] space-y-1.5">
            <span className="font-bold text-white block flex items-center gap-1.5">
              💬 Discord Müzik Komutları (Metin Kanalında Kullanım):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] font-mono">
              <div><code className="text-[#5865f2] font-bold">!play [şarkı adı]</code> - YouTube'dan açar (Örn: !play Ceza)</div>
              <div><code className="text-[#5865f2] font-bold">!play [link]</code> - YouTube veya radyo linki çalar</div>
              <div><code className="text-[#5865f2] font-bold">!pause</code> - Müziği duraklatır</div>
              <div><code className="text-[#5865f2] font-bold">!resume</code> - Devam ettirir</div>
              <div><code className="text-[#5865f2] font-bold">!stop</code> - Botu tamamen durdurur</div>
              <div><code className="text-[#5865f2] font-bold">!np</code> - Şu an çalan şarkıyı gösterir</div>
              <div><code className="text-[#5865f2] font-bold">!volume 0-100</code> - Ses düzeyini ayarlar</div>
              <div><code className="text-[#5865f2] font-bold">!radio</code> - 7/24 istasyonları listeler</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#2b2d31] border-t border-[#383a40] flex justify-end shrink-0">
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