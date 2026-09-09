import React, { useState } from 'react';
import { Film, Play, X, Sparkles, ExternalLink, Globe, Search, Compass } from 'lucide-react';

function YoutubeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

const PRESET_VIDEOS = [
  {
    title: 'Epic Gaming Moments & Funny Fails',
    id: 'dQw4w9WgXcQ',
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

const PRESET_GOOGLE_SEARCHES = [
  {
    title: 'Google Ana Sayfası',
    desc: 'Birlikte doğrudan Google ana sayfasını açın',
    url: 'https://www.google.com/webhp?igu=1',
    icon: '🔍'
  },
  {
    title: 'Steam İndirimleri & Trendler',
    desc: 'Steam indirimlerini ve popüler oyunları birlikte inceleyin',
    url: 'https://www.google.com/search?igu=1&q=steam+indirimleri',
    icon: '🎮'
  },
  {
    title: 'Google Haritalar (Maps)',
    desc: 'Haritalarda yerleri birlikte keşfedin',
    url: 'https://www.google.com/search?igu=1&q=google+haritalar',
    icon: '🗺️'
  },
  {
    title: 'Günün Haberleri & Gündem',
    desc: 'Son dakika haber başlıklarını birlikte okuyun',
    url: 'https://www.google.com/search?igu=1&q=g%C3%BCncel+haberler',
    icon: '📰'
  },
  {
    title: 'Vikipedi (Türkçe)',
    desc: 'Ansiklopedik bilgi ve makaleleri araştırın',
    url: 'https://www.google.com/search?igu=1&q=vikipedi+t%C3%BCrk%C3%A7e',
    icon: '📖'
  },
  {
    title: 'Süper Lig & Maç Sonuçları',
    desc: 'Puan durumu, fikstür ve futbol canlı skorları',
    url: 'https://www.google.com/search?igu=1&q=s%C3%BCper+lig+puan+durumu',
    icon: '🏆'
  }
];

export default function WatchTogetherModal({ isOpen, onClose, onStart }) {
  const [activeTab, setActiveTab] = useState('google');
  const [url, setUrl] = useState('');
  const [googleQuery, setGoogleQuery] = useState('');

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
      onStart(id, 'YouTube Sineması', 'youtube', null);
      setUrl('');
      onClose();
    } else {
      alert('Geçerli bir YouTube video linki giriniz.');
    }
  };

  const handleStartGoogle = (e) => {
    e.preventDefault();
    const clean = googleQuery.trim();
    if (!clean) {
      onStart(null, 'Google Ana Sayfası', 'google', 'https://www.google.com/webhp?igu=1');
    } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
      onStart(null, clean, 'google', clean);
    } else if (clean.includes('.') && !clean.includes(' ')) {
      onStart(null, clean, 'google', `https://${clean}`);
    } else {
      onStart(null, `Google: ${clean}`, 'google', `https://www.google.com/search?igu=1&q=${encodeURIComponent(clean)}`);
    }
    setGoogleQuery('');
    onClose();
  };

  const handleStartPreset = (item) => {
    onStart(item.id, item.title, 'youtube', null);
    onClose();
  };

  const handleStartPresetGoogle = (item) => {
    onStart(null, item.title, 'google', item.url);
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
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-[#3f4147] flex flex-col max-h-[90vh]"
        style={{ backgroundColor: '#313338', boxShadow: '0 24px 70px rgba(0, 0, 0, 0.75)' }}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#232428]" style={{ backgroundColor: '#2b2d31' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5865f2]/15 flex items-center justify-center text-[#5865f2] shrink-0">
                <Globe className="w-5 h-5 text-[#5865f2]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Birlikte İzle & Gezin
                  <span className="text-[10px] bg-[#23a55a]/20 text-[#23a55a] px-2 py-0.5 rounded-full font-bold">
                    CANLI SENKRONİZE
                  </span>
                </h3>
                <p className="text-xs text-[#949ba4] mt-0.5">
                  Arkadaşlarınla birlikte Google'da araştırma yap veya YouTube izle!
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

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 bg-[#1e1f22] p-1 rounded-xl border border-[#383a40]">
            <button
              type="button"
              onClick={() => setActiveTab('google')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'google'
                  ? 'bg-[#4285f4] text-white shadow-md'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <GoogleIcon className="w-4 h-4" />
              <span>Google & Web'de Gezin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('youtube')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'youtube'
                  ? 'bg-[#f23f43] text-white shadow-md'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#2b2d31]'
              }`}
            >
              <YoutubeIcon className="w-4 h-4 text-white" />
              <span>YouTube Sineması</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1" style={{ backgroundColor: '#313338' }}>
          
          {/* TAB 1: GOOGLE SEARCH & WEB */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              {/* Google Search Form */}
              <form onSubmit={handleStartGoogle} className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] flex items-center justify-between">
                  <span>Google'da Birlikte Ara veya Web Adresi Gir</span>
                  <span className="text-[10px] text-[#23a55a] font-normal lowercase">tüm odada senkronize</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={googleQuery}
                      onChange={(e) => setGoogleQuery(e.target.value)}
                      placeholder="Örn: steam indirimleri, hava durumu, vikipedi veya link..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#1e1f22] border border-[#383a40] text-white text-sm focus:outline-hidden focus:border-[#4285F4]"
                      autoFocus
                    />
                    <Search className="w-4 h-4 text-[#4285F4] absolute left-3 top-3" />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#4285F4] hover:bg-[#3367d6] text-white text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    <Search className="w-4 h-4" />
                    Ara
                  </button>
                </div>
              </form>

              {/* Quick Google Shortcuts */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#949ba4] mb-2.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#4285F4]" />
                  <span>Popüler Google Aramaları & Kısayollar</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_GOOGLE_SEARCHES.map((item) => (
                    <div
                      key={item.title}
                      onClick={() => handleStartPresetGoogle(item)}
                      className="p-3 rounded-xl bg-[#2b2d31] hover:bg-[#35373c] border border-[#383a40] hover:border-[#4285F4]/60 cursor-pointer transition-all flex items-center gap-3 group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#1e1f22] flex items-center justify-center shrink-0 text-lg group-hover:scale-110 transition-transform border border-[#383a40]">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate group-hover:text-[#4285F4] transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-[#949ba4] truncate">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: YOUTUBE */}
          {activeTab === 'youtube' && (
            <div className="space-y-4">
              {/* Custom YouTube URL Form */}
              <form onSubmit={handleStartYouTube} className="space-y-2">
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
                    className="px-5 py-2.5 rounded-xl bg-[#f23f43] hover:bg-[#da373c] disabled:opacity-40 text-white text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Başlat
                  </button>
                </div>
              </form>

              {/* Presets */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#949ba4] mb-2.5">
                  Veya Hazır Videolardan Seç
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#232428] text-[11px] text-[#949ba4] flex items-center justify-between" style={{ backgroundColor: '#2b2d31' }}>
          <span>💡 Odadaki herkes aynı sayfayı veya videoyu senkronize olarak görüntüler.</span>
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
