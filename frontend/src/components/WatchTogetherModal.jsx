import React, { useState } from 'react';
import { Film, Play, X, Sparkles, ExternalLink } from 'lucide-react';

function YoutubeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

const PRESET_VIDEOS = [
  {
    title: 'Epic Gaming Moments & Funny Fails',
    id: 'dQw4w9WgXcQ', // classic or gaming
    channel: 'Gaming Squad'
  },
  {
    title: 'Lofi Girl — Beats to relax/study to (Canlı)',
    id: 'jfKfPfyJRdk',
    channel: 'Lofi Girl'
  },
  {
    title: 'Counter-Strike 2 — En İyi Pro Hareketler',
    id: 'n7vaH_ZkF8s',
    channel: 'CS2 Esports'
  },
  {
    title: 'Synthwave Radio — Chill / Gece Sohbeti',
    id: '4xDzrJKXOOY',
    channel: 'Lofi & Synth'
  }
];

export default function WatchTogetherModal({ isOpen, onClose, onStart }) {
  const [url, setUrl] = useState('');

  if (!isOpen) return null;

  const extractYouTubeId = (input) => {
    const clean = input.trim();
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : (clean.length === 11 ? clean : null);
  };

  const handleStartCustom = (e) => {
    e.preventDefault();
    const id = extractYouTubeId(url);
    if (id) {
      onStart(id, 'YouTube Sineması');
      setUrl('');
      onClose();
    } else {
      alert('Geçerli bir YouTube video linki giriniz.');
    }
  };

  const handleStartPreset = (item) => {
    onStart(item.id, item.title);
    onClose();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center p-4 select-none"
      style={{ zIndex: 99999, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)' }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[#3f4147]"
        style={{ backgroundColor: '#313338', boxShadow: '0 24px 70px rgba(0, 0, 0, 0.75)' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#232428]" style={{ backgroundColor: '#2b2d31' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f23f43]/15 flex items-center justify-center text-[#f23f43]">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Birlikte İzle (Watch Together)
                  <span className="text-[10px] bg-[#f23f43]/20 text-[#f23f43] px-2 py-0.5 rounded-full font-bold">
                    SİNEMA
                  </span>
                </h3>
                <p className="text-xs text-[#949ba4] mt-0.5">
                  Videoları odadaki arkadaşlarınla tam senkronize (aynı saniyede) izle!
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5" style={{ backgroundColor: '#313338' }}>
          {/* Custom YouTube URL Form */}
          <form onSubmit={handleStartCustom} className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block">
              YouTube Video Linki Yapıştır
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#1e1f22] border border-[#383a40] text-white text-sm focus:outline-hidden focus:border-[#f23f43]"
                  autoFocus
                />
                <YoutubeIcon className="w-4 h-4 text-[#f23f43] absolute left-3 top-3" />
              </div>
              <button
                type="submit"
                disabled={!url.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#f23f43] hover:bg-[#da373c] disabled:opacity-40 text-white text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                Başlat
              </button>
            </div>
          </form>

          {/* Presets */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#949ba4] mb-2.5">
              Veya Hazır Seçeneklerden Seç
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PRESET_VIDEOS.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => handleStartPreset(vid)}
                  className="p-3 rounded-xl bg-[#2b2d31] hover:bg-[#35373c] border border-[#383a40] hover:border-[#f23f43]/50 cursor-pointer transition-all flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#1e1f22] flex items-center justify-center shrink-0 text-[#f23f43] group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate group-hover:text-[#f23f43] transition-colors">
                      {vid.title}
                    </div>
                    <div className="text-[10px] text-[#949ba4] truncate">{vid.channel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-[#232428] text-[11px] text-[#949ba4] flex items-center justify-between" style={{ backgroundColor: '#2b2d31' }}>
          <span>💡 Biri durdurduğunda veya sardığında tüm odada senkronize olur.</span>
          <button 
            onClick={onClose}
            className="text-xs text-white hover:underline cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
