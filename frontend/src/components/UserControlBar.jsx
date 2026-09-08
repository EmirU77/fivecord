import React, { useState, useRef } from 'react';
import { 
  Mic, MicOff, Headphones, Settings, X, Check, Smile, 
  Upload, Link2, Sparkles, Palette, Image as ImageIcon, Loader2,
  Crown, Zap, Shield, Flame, User, Info, Hash, Circle
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

// --- PRESET DATA ---
const COLOR_PRESETS = [
  { name: 'Discord Blurple', hex: '#5865f2' },
  { name: 'Zümrüt Yeşili', hex: '#23a55a' },
  { name: 'Altın Sarısı', hex: '#f0b232' },
  { name: 'Ateş Kırmızısı', hex: '#f23f43' },
  { name: 'Fuşya / Pembe', hex: '#eb459e' },
  { name: 'Buz Mavisi', hex: '#00b0f4' },
  { name: 'Mor Gece', hex: '#9b59b6' },
  { name: 'Neon Turuncu', hex: '#e67e22' },
  { name: 'Siber Camgöbeği', hex: '#00f0ff' },
  { name: 'Platin Beyaz', hex: '#f8fafc' }
];

const PRESET_AVATARS = [
  { name: 'Gamer Cat', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&auto=format&fit=crop&q=80' },
  { name: 'Cyber Fox', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80' },
  { name: 'Neon Panda', url: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=150&auto=format&fit=crop&q=80' },
  { name: 'Anime Boy', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow&backgroundColor=b6e3f4' },
  { name: 'Anime Girl', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc' },
  { name: 'Pixel Knight', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Warrior' },
  { name: 'Cyber Robot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Optimus' },
  { name: 'Neon Glitch', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyberpunk' },
  { name: 'Ninja Blade', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ninja&backgroundColor=c0aede' },
  { name: 'Wizard Magic', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mage&backgroundColor=ffdfba' }
];

const AVATAR_DECORATIONS = [
  { id: 'none', name: 'Yok (Sade)', icon: '🚫', desc: 'Sade standart avatar' },
  { id: 'fire', name: 'Ateş Halesi', icon: '🔥', desc: 'Alev alev parlayan turuncu aura' },
  { id: 'cyber', name: 'Siber Neon', icon: '⚡', desc: 'Lazer mavi & pembe neon halka' },
  { id: 'crown', name: 'Kral Tacı', icon: '👑', desc: 'Yüzen altın VIP krallık tacı' },
  { id: 'cat', name: 'Kawaii Neko', icon: '🐱', desc: 'Pembe ışıltılı sevimli kedi kulakları' },
  { id: 'magic', name: 'Büyü Çemberi', icon: '🔮', desc: 'Dönen kadim mor rün çemberi' },
  { id: 'rainbow', name: 'RGB Chroma', icon: '🌈', desc: 'Sürekli dönen gökkuşağı gamer RGB' },
  { id: 'pixel', name: 'Retro 8-Bit', icon: '👾', desc: 'Nostaljik arcade piksel halkası' }
];

const PRESET_BANNERS = [
  { 
    name: 'Cyberpunk Şehir', 
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    color: '#06b6d4'
  },
  { 
    name: 'Synthwave Güneş', 
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    color: '#f43f5e'
  },
  { 
    name: 'Yıldızlı Galaksi', 
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80',
    color: '#8b5cf6'
  },
  { 
    name: 'Anime Gece Manzarası', 
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    color: '#3b82f6'
  },
  { 
    name: 'Karanlık Magma', 
    url: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=600&auto=format&fit=crop&q=80',
    color: '#f97316'
  },
  { 
    name: 'Zümrüt Matriks', 
    url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=600&auto=format&fit=crop&q=80',
    color: '#10b981'
  },
  { 
    name: 'Buz Kristali', 
    url: 'https://images.unsplash.com/photo-1491557345352-5929e343eb89?w=600&auto=format&fit=crop&q=80',
    color: '#0ea5e9'
  },
  { 
    name: 'Discord VIP Degrade', 
    url: '',
    color: '#5865f2',
    gradient: 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)'
  }
];

const STATUS_OPTIONS = [
  { id: 'online', name: 'Çevrimiçi', dot: 'bg-[#23a55a]', icon: '🟢', desc: 'Aktif görünür' },
  { id: 'idle', name: 'Boşta (AFK)', dot: 'bg-[#f0b232]', icon: '🌙', desc: 'Uzakta modu' },
  { id: 'dnd', name: 'Rahatsız Etmeyin', dot: 'bg-[#f23f43]', icon: '🔴', desc: 'Oyun / yayında' },
  { id: 'invisible', name: 'Görünmez', dot: 'bg-[#80848e]', icon: '⚪', desc: 'Çevrimdışı görün' }
];

const QUICK_EMOJIS = ['🎮', '🎧', '🔥', '⚡', '💻', '🚀', '☕', '👑', '💎', '😴', '✨', '🏆'];

const AVAILABLE_BADGES = [
  { id: 'owner', name: 'Kurucu', icon: '👑', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'nitro', name: '60 FPS Nitro', icon: '⚡', color: 'bg-[#5865f2]/20 text-[#5865f2] border-[#5865f2]/30' },
  { id: 'dj', name: 'Fivecord DJ', icon: '🎵', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'gamer', name: 'Pro Gamer', icon: '🎮', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { id: 'vip', name: 'VIP Üye', icon: '💎', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { id: 'shield', name: 'VIP Kalkan', icon: '🛡️', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' }
];

const NAME_EFFECTS = [
  { id: 'normal', name: 'Sade', desc: 'Standart renk' },
  { id: 'neon', name: 'Neon Işıltısı', desc: 'Parlayan neon parıltı efekti' },
  { id: 'gold', name: 'Kraliyet Altını', desc: 'Işıltılı altın degrade' },
  { id: 'rainbow', name: 'RGB Gökkuşağı', desc: 'Renkli gamer degrade' }
];

// --- RENDER HELPERS ---
export function AvatarDecorationRenderer({ decoration, size = 'lg' }) {
  if (!decoration || decoration === 'none') return null;

  switch (decoration) {
    case 'fire':
      return (
        <>
          <div className="absolute -inset-1 rounded-full border-2 border-orange-500 shadow-[0_0_15px_#f97316] animate-pulse pointer-events-none" />
          <span className="absolute -top-2 -right-1 text-xs select-none pointer-events-none filter drop-shadow">🔥</span>
        </>
      );
    case 'cyber':
      return (
        <>
          <div className="absolute -inset-1 rounded-full border-2 border-cyan-400 shadow-[0_0_15px_#22d3ee] pointer-events-none" />
          <div className="absolute -inset-1.5 rounded-full border border-fuchsia-500 opacity-60 animate-ping pointer-events-none" />
          <span className="absolute -top-2 -right-1 text-xs select-none pointer-events-none">⚡</span>
        </>
      );
    case 'crown':
      return (
        <>
          <div className="absolute -inset-1 rounded-full border-2 border-amber-400 shadow-[0_0_14px_#fbbf24] pointer-events-none" />
          <span className={`absolute ${size === 'sm' ? '-top-2 text-[10px]' : '-top-3.5 text-sm'} left-1/2 -translate-x-1/2 select-none pointer-events-none anim-float-crown filter drop-shadow-[0_2px_4px_rgba(245,158,11,0.8)]`}>👑</span>
        </>
      );
    case 'cat':
      return (
        <>
          <div className="absolute -inset-1 rounded-full border-2 border-pink-400 shadow-[0_0_12px_#f472b6] pointer-events-none" />
          <span className={`absolute ${size === 'sm' ? '-top-2 text-[9px]' : '-top-3 text-xs'} left-1/2 -translate-x-1/2 select-none pointer-events-none`}>🐱</span>
        </>
      );
    case 'magic':
      return (
        <>
          <div className="absolute -inset-1.5 rounded-full border-2 border-dashed border-purple-400 anim-spin-slow pointer-events-none opacity-90" />
          <div className="absolute -inset-1 rounded-full border border-purple-500 shadow-[0_0_12px_#a855f7] pointer-events-none" />
          <span className="absolute -top-1 -right-1 text-xs select-none pointer-events-none">🔮</span>
        </>
      );
    case 'rainbow':
      return (
        <div className="absolute -inset-1 rounded-full p-[2px] bg-gradient-to-tr from-red-500 via-yellow-400 via-green-400 via-blue-500 to-purple-500 anim-rainbow pointer-events-none shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
      );
    case 'pixel':
      return (
        <>
          <div className="absolute -inset-1 rounded-full border-2 border-dashed border-emerald-400 shadow-[0_0_10px_#10b981] pointer-events-none" />
          <span className="absolute -top-2 -right-1 text-xs select-none pointer-events-none">👾</span>
        </>
      );
    default:
      return null;
  }
}

export function StatusDotRenderer({ status, className = "w-3.5 h-3.5" }) {
  switch (status) {
    case 'idle':
      return (
        <div className={`absolute -bottom-0.5 -right-0.5 ${className} rounded-full bg-[#f0b232] border-2 border-[#111214] flex items-center justify-center text-[7px] text-black font-black select-none shadow-xs`} title="Boşta (AFK)">
          🌙
        </div>
      );
    case 'dnd':
      return (
        <div className={`absolute -bottom-0.5 -right-0.5 ${className} rounded-full bg-[#f23f43] border-2 border-[#111214] flex items-center justify-center select-none shadow-xs`} title="Rahatsız Etmeyin">
          <div className="w-2 h-0.5 bg-white rounded-full" />
        </div>
      );
    case 'invisible':
      return (
        <div className={`absolute -bottom-0.5 -right-0.5 ${className} rounded-full bg-[#80848e] border-2 border-[#111214] select-none shadow-xs`} title="Görünmez / Çevrimdışı" />
      );
    default:
      return (
        <div className={`absolute -bottom-0.5 -right-0.5 ${className} rounded-full bg-[#23a55a] border-2 border-[#111214] select-none shadow-xs`} title="Çevrimiçi" />
      );
  }
}

export function getNameEffectStyle(effect, color) {
  switch (effect) {
    case 'neon':
      return {
        color: color || '#5865f2',
        textShadow: `0 0 10px ${color || '#5865f2'}, 0 0 20px ${color || '#5865f2'}`
      };
    case 'gold':
      return {
        background: 'linear-gradient(135deg, #ffe066 0%, #f59e0b 50%, #d97706 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 12px rgba(245, 158, 11, 0.5)'
      };
    case 'rainbow':
      return {
        background: 'linear-gradient(90deg, #ef4444, #f59e0b, #10b981, #06b6d4, #8b5cf6, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      };
    default:
      return { color: color || '#ffffff' };
  }
}

export default function UserControlBar({ 
  currentUser, 
  onUpdateProfile, 
  isMuted, 
  setIsMuted, 
  isDeafened, 
  setIsDeafened 
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('avatar'); // avatar, banner, status, badges

  // Form states for modal
  const [tempName, setTempName] = useState(currentUser?.username || '');
  const [tempStatus, setTempStatus] = useState(currentUser?.customStatus || '');
  const [tempStatusEmoji, setTempStatusEmoji] = useState(currentUser?.statusEmoji || '🎮');
  const [tempStatusState, setTempStatusState] = useState(currentUser?.status || 'online');
  const [tempBio, setTempBio] = useState(currentUser?.bio || 'Fivecord üyesi 🎮');
  const [tempAvatar, setTempAvatar] = useState(currentUser?.avatar || '');
  const [tempDecoration, setTempDecoration] = useState(currentUser?.avatarDecoration || 'none');
  const [tempBanner, setTempBanner] = useState(currentUser?.banner || '');
  const [tempColor, setTempColor] = useState(currentUser?.color || '#5865f2');
  const [tempNameEffect, setTempNameEffect] = useState(currentUser?.nameEffect || 'normal');
  const [tempBadges, setTempBadges] = useState(currentUser?.badges || ['owner', 'nitro']);

  const [customAvatarUrlInput, setCustomAvatarUrlInput] = useState('');
  const [customBannerUrlInput, setCustomBannerUrlInput] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const avatarFileInputRef = useRef(null);
  const bannerFileInputRef = useRef(null);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (next) soundEffects.playMute();
    else soundEffects.playUnmute();
  };

  const toggleDeafen = () => {
    const next = !isDeafened;
    setIsDeafened(next);
    if (next) soundEffects.playMute();
    else soundEffects.playUnmute();
  };

  const openModal = () => {
    setTempName(currentUser?.username || '');
    setTempStatus(currentUser?.customStatus || '');
    setTempStatusEmoji(currentUser?.statusEmoji || '🎮');
    setTempStatusState(currentUser?.status || 'online');
    setTempBio(currentUser?.bio || 'Fivecord üyesi 🎮 | 60 FPS VIP Deneyimi');
    setTempAvatar(currentUser?.avatar || '');
    setTempDecoration(currentUser?.avatarDecoration || 'none');
    setTempBanner(currentUser?.banner || '');
    setTempColor(currentUser?.color || '#5865f2');
    setTempNameEffect(currentUser?.nameEffect || 'normal');
    setTempBadges(currentUser?.badges || ['owner', 'nitro']);
    setCustomAvatarUrlInput('');
    setCustomBannerUrlInput('');
    setActiveTab('avatar');
    setIsSettingsOpen(true);
  };

  const handleSaveProfile = () => {
    onUpdateProfile({
      username: tempName.trim() || currentUser?.username || 'Kullanıcı',
      customStatus: tempStatus,
      statusEmoji: tempStatusEmoji,
      status: tempStatusState,
      bio: tempBio,
      avatar: tempAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${tempName}`,
      avatarDecoration: tempDecoration,
      banner: tempBanner,
      color: tempColor,
      nameEffect: tempNameEffect,
      badges: tempBadges
    });
    setIsSettingsOpen(false);
  };

  const toggleBadge = (badgeId) => {
    setTempBadges(prev => 
      prev.includes(badgeId) ? prev.filter(b => b !== badgeId) : [...prev, badgeId]
    );
  };

  // Upload local avatar
  const handleAvatarFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setTempAvatar(data.url);
      }
    } catch (err) {
      alert('Fotoğraf yüklenemedi: ' + err.message);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  // Upload local banner
  const handleBannerFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingBanner(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        setTempBanner(data.url);
      }
    } catch (err) {
      alert('Banner yüklenemedi: ' + err.message);
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    }
  };

  const applyCustomAvatarUrl = () => {
    if (customAvatarUrlInput.trim()) {
      setTempAvatar(customAvatarUrlInput.trim());
      setCustomAvatarUrlInput('');
    }
  };

  const applyCustomBannerUrl = () => {
    if (customBannerUrlInput.trim()) {
      setTempBanner(customBannerUrlInput.trim());
      setCustomBannerUrlInput('');
    }
  };

  return (
    <>
      {/* BOTTOM LEFT DISCORD USER BAR */}
      <div className="h-14 bg-[#111214] px-2 flex items-center justify-between border-t border-[#1f2023] select-none">
        {/* User Info (Clickable to open settings) */}
        <div 
          onClick={openModal}
          className="flex items-center gap-2.5 p-1.5 -ml-1 rounded-md hover:bg-[#232428] cursor-pointer transition-colors max-w-[145px] group"
          title="Profili, Banner'ı ve Fotoğrafı Özelleştir"
        >
          <div className="relative shrink-0 w-8 h-8">
            <img 
              src={currentUser?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'} 
              alt={currentUser?.username}
              className="w-8 h-8 rounded-full bg-[#2b2d31] object-cover border border-[#383a40]"
            />
            {/* Live decoration */}
            <AvatarDecorationRenderer decoration={currentUser?.avatarDecoration} size="sm" />
            {/* Live status dot */}
            <StatusDotRenderer status={currentUser?.status || 'online'} className="w-3 h-3" />
          </div>

          <div className="overflow-hidden">
            <div 
              className="text-xs font-semibold truncate flex items-center gap-1"
              style={getNameEffectStyle(currentUser?.nameEffect, currentUser?.color)}
            >
              <span>{currentUser?.username || 'Kullanıcı'}</span>
              {currentUser?.badges?.includes('owner') && <span className="text-[10px]">👑</span>}
            </div>
            <div className="text-[10px] text-[#949ba4] truncate flex items-center gap-1">
              {currentUser?.statusEmoji && <span>{currentUser.statusEmoji}</span>}
              <span>{currentUser?.customStatus || 'Çevrimiçi'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 text-[#b5bac1]">
          <button
            onClick={toggleMute}
            title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            className={`p-1.5 rounded hover:bg-[#232428] hover:text-white transition-colors cursor-pointer ${
              isMuted ? 'text-[#f23f43] hover:text-[#f23f43]' : ''
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleDeafen}
            title={isDeafened ? 'Sağırlaştırmayı Kaldır' : 'Kulaklığı Kapat'}
            className={`p-1.5 rounded hover:bg-[#232428] hover:text-white transition-colors cursor-pointer ${
              isDeafened ? 'text-[#f23f43] hover:text-[#f23f43]' : ''
            }`}
          >
            <Headphones className="w-4 h-4" />
          </button>

          <button
            onClick={openModal}
            title="Kullanıcı Ayarları & Profil Stüdyosu"
            className="p-1.5 rounded hover:bg-[#232428] hover:text-white transition-colors cursor-pointer group-hover:rotate-45"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ULTRA-RICH DISCORD NITRO STYLE CUSTOMIZATION MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl rounded-2xl bg-[#313338] shadow-2xl border border-[#3f4147] overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="relative bg-gradient-to-r from-[#5865f2] via-[#4752c4] to-[#eb459e] px-6 py-4 text-white shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 shadow-xs">
                  <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-white">Profil & VIP Stüdyosu</h2>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-wider">
                      NITRO VIP
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-0.5">
                    Avatarını, hareketli çerçevelerini, özel banner'ını ve biyografini özelleştir.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 text-white/80 hover:text-white rounded-full bg-black/20 hover:bg-black/40 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 bg-[#2b2d31] border-b border-[#383a40] overflow-x-auto text-xs shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('avatar')}
                className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'avatar'
                    ? 'border-[#5865f2] text-white bg-[#35373c]/50 rounded-t-lg'
                    : 'border-transparent text-[#949ba4] hover:text-white hover:bg-[#35373c]/30 rounded-t-lg'
                }`}
              >
                <span>👤</span>
                <span>Avatar & Çerçeve</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('banner')}
                className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'banner'
                    ? 'border-[#5865f2] text-white bg-[#35373c]/50 rounded-t-lg'
                    : 'border-transparent text-[#949ba4] hover:text-white hover:bg-[#35373c]/30 rounded-t-lg'
                }`}
              >
                <span>🖼️</span>
                <span>Banner & Tema</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'status'
                    ? 'border-[#5865f2] text-white bg-[#35373c]/50 rounded-t-lg'
                    : 'border-transparent text-[#949ba4] hover:text-white hover:bg-[#35373c]/30 rounded-t-lg'
                }`}
              >
                <span>💬</span>
                <span>Durum & Biyografi</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('badges')}
                className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'badges'
                    ? 'border-[#5865f2] text-white bg-[#35373c]/50 rounded-t-lg'
                    : 'border-transparent text-[#949ba4] hover:text-white hover:bg-[#35373c]/30 rounded-t-lg'
                }`}
              >
                <span>✨</span>
                <span>Rozetler & İsim Stili</span>
              </button>
            </div>

            {/* Modal Body: Two Column Layout */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#313338]">
              
              {/* LEFT COLUMN: Controls for Active Tab (7 cols) */}
              <div className="lg:col-span-7 space-y-5">

                {/* TAB 1: AVATAR & DECORATION */}
                {activeTab === 'avatar' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    
                    {/* 1. Upload & Generator */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-[#5865f2]" />
                        <span>1. Avatar Yükle veya Üret</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => avatarFileInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                          className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[#5865f2] bg-[#5865f2]/10 hover:bg-[#5865f2]/20 text-white text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          {isUploadingAvatar ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#5865f2]" />
                          ) : (
                            <Upload className="w-4 h-4 text-[#5865f2]" />
                          )}
                          <span>Dosya Seç (.png, .gif, .jpg)</span>
                        </button>
                        <input 
                          type="file" 
                          ref={avatarFileInputRef} 
                          onChange={handleAvatarFileUpload} 
                          accept="image/png, image/jpeg, image/gif, image/webp" 
                          className="hidden" 
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const seed = 'avatar-' + Math.random().toString(36).substring(2, 8);
                            setTempAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
                          }}
                          className="flex items-center justify-center gap-2 p-3 rounded-xl border border-[#3f4147] bg-[#1e1f22] hover:bg-[#35373c] text-white text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Rastgele Robot Üret</span>
                        </button>
                      </div>

                      {/* URL input */}
                      <div className="flex gap-2 pt-1">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={customAvatarUrlInput}
                            onChange={(e) => setCustomAvatarUrlInput(e.target.value)}
                            placeholder="Veya doğrudan resim/GIF linki yapıştır..."
                            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#1e1f22] border border-[#383a40] text-white text-xs focus:outline-hidden focus:border-[#5865f2]"
                          />
                          <Link2 className="w-3.5 h-3.5 text-[#949ba4] absolute left-2.5 top-2.5" />
                        </div>
                        <button
                          type="button"
                          onClick={applyCustomAvatarUrl}
                          disabled={!customAvatarUrlInput.trim()}
                          className="px-3.5 py-2 rounded-lg bg-[#5865f2] disabled:opacity-40 hover:bg-[#4752c4] text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
                        >
                          Uygula
                        </button>
                      </div>
                    </div>

                    {/* 2. Avatar Decorations (Nitro Style) */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>2. Hareketli Avatar Çerçeveleri</span>
                        </div>
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                          Discord Nitro Efekti
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {AVATAR_DECORATIONS.map((dec) => {
                          const isSelected = tempDecoration === dec.id;
                          return (
                            <div
                              key={dec.id}
                              onClick={() => setTempDecoration(dec.id)}
                              className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center gap-1.5 group ${
                                isSelected
                                  ? 'border-[#5865f2] bg-[#5865f2]/20 shadow-md scale-105'
                                  : 'border-[#383a40] bg-[#1e1f22] hover:bg-[#35373c] hover:border-[#4e5058]'
                              }`}
                            >
                              <span className="text-xl group-hover:scale-110 transition-transform">{dec.icon}</span>
                              <span className="text-xs font-bold text-white leading-tight">{dec.name}</span>
                              <span className="text-[9px] text-[#949ba4] leading-none line-clamp-1">{dec.desc}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Preset Avatars */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                        3. Hazır Popüler Koleksiyondan Seç
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        {PRESET_AVATARS.map((av) => {
                          const isSelected = tempAvatar === av.url;
                          return (
                            <div
                              key={av.name}
                              onClick={() => setTempAvatar(av.url)}
                              className={`flex flex-col items-center p-1.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-[#5865f2] bg-[#5865f2]/25 scale-105 shadow-md'
                                  : 'border-[#383a40] bg-[#1e1f22] hover:bg-[#35373c]'
                              }`}
                              title={av.name}
                            >
                              <img 
                                src={av.url} 
                                alt={av.name} 
                                className="w-11 h-11 rounded-full object-cover bg-[#1e1f22]" 
                              />
                              <span className="text-[9px] font-semibold text-white mt-1 truncate max-w-full">
                                {av.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 2: BANNER & THEME */}
                {activeTab === 'banner' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    
                    {/* 1. Upload Banner */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-[#5865f2]" />
                        <span>1. Özel Banner Resmi veya GIF Yükle</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        disabled={isUploadingBanner}
                        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-[#5865f2] bg-[#5865f2]/10 hover:bg-[#5865f2]/20 text-white text-xs font-bold transition-all hover:scale-[1.01] cursor-pointer"
                      >
                        {isUploadingBanner ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#5865f2]" />
                        ) : (
                          <Upload className="w-4 h-4 text-[#5865f2]" />
                        )}
                        <span>Bilgisayardan Banner / GIF Seç (Geniş Format)</span>
                      </button>
                      <input 
                        type="file" 
                        ref={bannerFileInputRef} 
                        onChange={handleBannerFileUpload} 
                        accept="image/png, image/jpeg, image/gif, image/webp" 
                        className="hidden" 
                      />

                      {/* URL input */}
                      <div className="flex gap-2 pt-1">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={customBannerUrlInput}
                            onChange={(e) => setCustomBannerUrlInput(e.target.value)}
                            placeholder="Veya doğrudan banner resim/GIF linki yapıştır..."
                            className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#1e1f22] border border-[#383a40] text-white text-xs focus:outline-hidden focus:border-[#5865f2]"
                          />
                          <Link2 className="w-3.5 h-3.5 text-[#949ba4] absolute left-2.5 top-2.5" />
                        </div>
                        <button
                          type="button"
                          onClick={applyCustomBannerUrl}
                          disabled={!customBannerUrlInput.trim()}
                          className="px-3.5 py-2 rounded-lg bg-[#5865f2] disabled:opacity-40 hover:bg-[#4752c4] text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
                        >
                          Uygula
                        </button>
                      </div>
                    </div>

                    {/* 2. Preset Banners */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                        2. Hazır Tematik Banner Koleksiyonu
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {PRESET_BANNERS.map((b) => {
                          const isSelected = tempBanner === b.url || (!tempBanner && b.gradient);
                          return (
                            <div
                              key={b.name}
                              onClick={() => {
                                setTempBanner(b.url);
                                if (b.color) setTempColor(b.color);
                              }}
                              className={`relative h-20 rounded-xl overflow-hidden border cursor-pointer transition-all group ${
                                isSelected
                                  ? 'border-[#5865f2] ring-2 ring-[#5865f2] scale-[1.02]'
                                  : 'border-[#383a40] hover:border-white/40'
                              }`}
                            >
                              {b.url ? (
                                <img src={b.url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full" style={{ background: b.gradient }} />
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                                <span className="text-xs font-bold text-white drop-shadow">
                                  {b.name}
                                </span>
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#5865f2] flex items-center justify-center text-white">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Theme Colors */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-[#5865f2]" />
                        <span>3. Profil Tema & Vurgu Rengi</span>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        {COLOR_PRESETS.map((col) => {
                          const isSelected = tempColor === col.hex;
                          return (
                            <button
                              key={col.hex}
                              type="button"
                              onClick={() => setTempColor(col.hex)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-115 border-2 cursor-pointer ${
                                isSelected ? 'border-white scale-110 shadow-md ring-2 ring-white/30' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: col.hex }}
                              title={col.name}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 3: STATUS & BIO */}
                {activeTab === 'status' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    
                    {/* 1. Online Status State */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                        1. Çevrimiçi Durumu
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {STATUS_OPTIONS.map((st) => {
                          const isSelected = tempStatusState === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setTempStatusState(st.id)}
                              className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-[#5865f2] bg-[#5865f2]/20 shadow-xs'
                                  : 'border-[#383a40] bg-[#1e1f22] hover:bg-[#35373c]'
                              }`}
                            >
                              <span className="text-base">{st.icon}</span>
                              <div>
                                <div className="text-xs font-bold text-white">{st.name}</div>
                                <div className="text-[10px] text-[#949ba4]">{st.desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Status Emoji & Message */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] flex items-center gap-1.5">
                        <Smile className="w-3.5 h-3.5 text-amber-400" />
                        <span>2. Özel Durum & Emoji</span>
                      </div>

                      {/* Quick Emojis */}
                      <div className="flex items-center gap-1.5 flex-wrap pb-1">
                        <span className="text-[11px] text-[#949ba4] font-semibold mr-1">Hızlı Emoji:</span>
                        {QUICK_EMOJIS.map(em => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setTempStatusEmoji(em)}
                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                              tempStatusEmoji === em ? 'bg-[#5865f2] scale-110 shadow-xs' : 'bg-[#1e1f22] hover:bg-[#35373c]'
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>

                      {/* Status Input */}
                      <div className="relative">
                        <div className="absolute left-3 top-2.5 text-sm select-none">
                          {tempStatusEmoji || '💬'}
                        </div>
                        <input
                          type="text"
                          value={tempStatus}
                          onChange={(e) => setTempStatus(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1e1f22] border border-[#383a40] text-white text-xs focus:outline-hidden focus:border-[#5865f2]"
                          placeholder="Özel durum mesajınız (örn: CS2 oynuyor, Müzik dinliyor...)"
                        />
                      </div>
                    </div>

                    {/* 3. About Me Bio */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#5865f2]" />
                        <span>3. Hakkımda (Biyografi)</span>
                      </div>

                      <textarea
                        rows={3}
                        value={tempBio}
                        onChange={(e) => setTempBio(e.target.value)}
                        placeholder="Kendin hakkında bir şeyler yaz..."
                        className="w-full p-3 rounded-xl bg-[#1e1f22] border border-[#383a40] text-white text-xs focus:outline-hidden focus:border-[#5865f2] resize-none leading-relaxed"
                      />
                      <span className="text-[10px] text-[#80848e]">Arkadaşların profiline tıkladığında bu biyografi görünür.</span>
                    </div>

                  </div>
                )}

                {/* TAB 4: BADGES & NAME STYLE */}
                {activeTab === 'badges' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    
                    {/* 1. Username */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                        1. Kullanıcı Adı
                      </div>
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder="Kullanıcı adınız..."
                        className="w-full px-3 py-2 rounded-xl bg-[#1e1f22] border border-[#383a40] text-white text-sm focus:outline-hidden focus:border-[#5865f2] font-semibold"
                      />
                    </div>

                    {/* 2. Name Effects */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>2. İsim Parıltı & Efekt Stili</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {NAME_EFFECTS.map((ef) => {
                          const isSelected = tempNameEffect === ef.id;
                          return (
                            <button
                              key={ef.id}
                              type="button"
                              onClick={() => setTempNameEffect(ef.id)}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-[#5865f2] bg-[#5865f2]/20 shadow-xs'
                                  : 'border-[#383a40] bg-[#1e1f22] hover:bg-[#35373c]'
                              }`}
                            >
                              <div 
                                className="text-xs font-bold truncate"
                                style={getNameEffectStyle(ef.id, tempColor)}
                              >
                                {tempName || 'Kullanıcı Adı'}
                              </div>
                              <div className="text-[10px] text-[#949ba4] mt-0.5">{ef.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Badges Showcase */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>3. Profil Rozetleri (Vitrin)</span>
                        </div>
                        <span className="text-[10px] text-[#949ba4]">Tıklayarak aç/kapat</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {AVAILABLE_BADGES.map((b) => {
                          const isActive = tempBadges.includes(b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => toggleBadge(b.id)}
                              className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                                isActive
                                  ? `${b.color} border-current shadow-xs scale-102`
                                  : 'bg-[#1e1f22] border-[#383a40] text-[#949ba4] opacity-50 hover:opacity-100'
                              }`}
                            >
                              <span className="text-sm">{b.icon}</span>
                              <span className="text-xs font-bold truncate">{b.name}</span>
                              {isActive && <Check className="w-3 h-3 ml-auto stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: REALISTIC STICKY DISCORD PROFILE PREVIEW (5 cols) */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="sticky top-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#949ba4] flex items-center gap-1.5">
                      <span>👁️</span>
                      <span>Canlı Discord Önizlemesi</span>
                    </span>
                    <span className="text-[10px] text-[#23a55a] font-mono font-bold bg-[#23a55a]/15 px-2 py-0.5 rounded-full">
                      CANLI SENKRON
                    </span>
                  </div>

                  {/* REALISTIC DISCORD PROFILE POPOUT CARD */}
                  <div className="w-full rounded-2xl overflow-hidden bg-[#232428] border border-[#383a40] shadow-2xl transition-all">
                    
                    {/* Top Banner */}
                    <div 
                      className="h-28 w-full relative transition-all bg-[#1e1f22]"
                      style={{ 
                        backgroundColor: tempColor,
                        backgroundImage: tempBanner ? `url(${tempBanner})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60 pointer-events-none" />
                      
                      {/* VIP Badge on Banner */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white/90 border border-white/10 flex items-center gap-1 shadow-sm">
                          <Zap className="w-3 h-3 text-[#5865f2] fill-current" />
                          <span>FIVECORD VIP</span>
                        </span>
                      </div>
                    </div>

                    {/* Avatar Overlap Area */}
                    <div className="px-4 pb-4 -mt-12">
                      <div className="flex items-end justify-between">
                        
                        {/* Avatar with Decoration & Status */}
                        <div className="relative shrink-0 w-20 h-20">
                          <img 
                            src={tempAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${tempName}`} 
                            alt="Preview"
                            className="w-20 h-20 rounded-full bg-[#1e1f22] border-4 border-[#232428] object-cover shadow-xl" 
                          />
                          {/* Active Decoration */}
                          <AvatarDecorationRenderer decoration={tempDecoration} size="lg" />
                          {/* Active Status */}
                          <StatusDotRenderer status={tempStatusState} className="w-5 h-5" />
                        </div>

                        {/* Badges Bar */}
                        <div className="flex items-center gap-1 bg-[#111214]/80 backdrop-blur-xs p-1.5 rounded-xl border border-[#383a40] shadow-sm mb-1">
                          {tempBadges.map(bId => {
                            const b = AVAILABLE_BADGES.find(x => x.id === bId);
                            if (!b) return null;
                            return (
                              <span key={b.id} title={b.name} className="text-sm cursor-default hover:scale-125 transition-transform">
                                {b.icon}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* User Names & Status */}
                      <div className="mt-3 bg-[#111214]/60 p-3 rounded-xl border border-[#2e3035] space-y-2.5">
                        <div>
                          <h3 
                            className="text-base font-black truncate tracking-tight"
                            style={getNameEffectStyle(tempNameEffect, tempColor)}
                          >
                            {tempName || 'Kullanıcı Adı'}
                          </h3>
                          <p className="text-[11px] text-[#949ba4] font-medium font-mono">
                            @{tempName ? tempName.toLowerCase().replace(/\s+/g, '') : 'kullanici'}
                          </p>
                        </div>

                        {/* Custom Status Pill */}
                        {(tempStatus || tempStatusEmoji) && (
                          <div className="flex items-center gap-1.5 text-xs text-white bg-[#1e1f22] px-2.5 py-1.5 rounded-lg border border-[#2b2d31]">
                            <span>{tempStatusEmoji || '💬'}</span>
                            <span className="truncate">{tempStatus || 'Özel durum...'}</span>
                          </div>
                        )}

                        <div className="h-px bg-[#2e3035] my-1" />

                        {/* About Me */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#949ba4] block">
                            HAKKIMDA
                          </span>
                          <p className="text-xs text-[#dbdee1] leading-relaxed break-words whitespace-pre-wrap">
                            {tempBio || 'Bu kullanıcı henüz bir biyografi eklemedi.'}
                          </p>
                        </div>

                        <div className="h-px bg-[#2e3035] my-1" />

                        {/* Membership info */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#949ba4] block">
                            FIVECORD ÜYELİĞİ
                          </span>
                          <div className="flex items-center gap-2 text-xs text-[#dbdee1]">
                            <span className="w-2 h-2 rounded-full bg-[#5865f2]" />
                            <span>Özel VIP Grup Üyesi (1/5)</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  <p className="text-[11px] text-[#80848e] text-center">
                    Kaydettiğin anda bu kart odadaki tüm arkadaşlarına senkronize aktarılır.
                  </p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-[#2b2d31] border-t border-[#383a40] flex items-center justify-between shrink-0">
              <div className="text-xs text-[#949ba4] hidden sm:block">
                ✨ İstediğin zaman profili değiştirebilirsin
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#949ba4] hover:text-white transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5865f2] to-[#4752c4] hover:from-[#4752c4] hover:to-[#3c45a5] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:scale-105 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Kaydet ve Uygula</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
