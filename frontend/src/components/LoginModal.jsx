import React, { useState } from 'react';
import { User, Sparkles, Check, ArrowRight, Dices, Shield, LogIn, X, Lock } from 'lucide-react';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#3b82f6'  // Blue
];

export default function LoginModal({ isOpen, onLogin, onClose, currentUser = null }) {
  const lastUsername = currentUser?.username || '';
  const [username, setUsername] = useState(lastUsername || '');
  const [selectedColor, setSelectedColor] = useState(currentUser?.color || '#6366f1');
  const [avatarSeed, setAvatarSeed] = useState(() => lastUsername || 'gamer-' + Math.floor(Math.random() * 9000));
  const [avatarType, setAvatarType] = useState('bottts');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('fivecord_remember_me') !== 'false');
  const [showNewAccountForm, setShowNewAccountForm] = useState(!lastUsername);

  if (!isOpen) return null;

  const currentAvatarUrl = `https://api.dicebear.com/7.x/${avatarType}/svg?seed=${encodeURIComponent(avatarSeed)}`;

  const handleRandomizeAvatar = () => {
    const types = ['bottts', 'adventurer', 'pixel-art', 'lorelei'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomSeed = 'avatar-' + Math.random().toString(36).substring(2, 8);
    setAvatarType(randomType);
    setAvatarSeed(randomSeed);
  };

  const doLogin = (cleanName, avatarUrl, color) => {
    localStorage.setItem('fivecord_remember_me', rememberMe ? 'true' : 'false');
    const isSameAsLast = lastUsername && cleanName.toLowerCase() === lastUsername.toLowerCase();
    const user = {
      ...(isSameAsLast && currentUser ? currentUser : {}),
      id: (isSameAsLast && currentUser?.id) || ('user-' + cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '')),
      username: cleanName,
      avatar: avatarUrl || (isSameAsLast && currentUser?.avatar) || currentAvatarUrl,
      color: color || (isSameAsLast && currentUser?.color) || selectedColor,
      customStatus: (isSameAsLast && currentUser?.customStatus) || 'Synapse kullanıyor',
      entranceSound: (isSameAsLast && currentUser?.entranceSound) || 'mvp'
    };
    onLogin(user);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const clean = username.trim();
    if (!clean) return;
    doLogin(clean, currentAvatarUrl, selectedColor);
  };

  const handleQuickContinue = () => {
    if (!lastUsername || !currentUser) return;
    localStorage.setItem('fivecord_remember_me', 'true');
    onLogin(currentUser);
  };

  const handleGuestLogin = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const guestName = `Gamer-${randomNum}`;
    doLogin(guestName, `https://api.dicebear.com/7.x/bottts/svg?seed=${guestName}`, '#6366f1');
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 select-none z-[99999]"
      style={{ backgroundColor: 'rgba(5, 7, 13, 0.85)', backdropFilter: 'blur(16px)' }}
    >
      <div 
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in fade-in zoom-in-95 duration-200 bg-[#0d101f]/95 text-[#e2e8f0]"
        style={{ boxShadow: '0 24px 70px rgba(0, 0, 0, 0.85)' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 relative text-center bg-white/[0.02]">
          {currentUser && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-[#94a3b8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="relative inline-flex items-center justify-center mb-3">
            <div className="absolute inset-0 rounded-2xl bg-indigo-500 blur-xl opacity-30 animate-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 border border-white/20 flex items-center justify-center text-white shadow-lg">
              <LogIn className="w-7 h-7" />
            </div>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Synapse Giriş</h2>
          <p className="text-xs text-[#94a3b8] mt-1">
            Kendi kullanıcı adınızı belirleyin veya hesabınıza bağlanın.
          </p>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
          {/* Quick Continue with THIS Device's Own Profile */}
          {lastUsername && !showNewAccountForm && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/30 space-y-3 shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img 
                    src={currentUser?.avatar || currentAvatarUrl}
                    alt={lastUsername}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(lastUsername || 'user')}`;
                    }}
                    className="w-11 h-11 rounded-full bg-[#141829] object-cover border-2 border-indigo-400 shrink-0 shadow-md"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider block">
                      Bu Cihazdaki Kayıtlı Profilin
                    </span>
                    <span className="text-sm font-black text-white truncate block">
                      {lastUsername}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQuickContinue}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105 shrink-0 flex items-center gap-1.5"
                >
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowNewAccountForm(true)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition-colors"
                >
                  Farklı bir kullanıcı adıyla gir →
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {(showNewAccountForm || !lastUsername) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {lastUsername && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowNewAccountForm(false)}
                    className="text-[11px] text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                  >
                    ← Kayıtlı profilime dön ({lastUsername})
                  </button>
                </div>
              )}

              {/* Avatar Preview & Randomizer */}
              <div className="flex items-center gap-4 bg-white/[0.03] p-3.5 rounded-2xl border border-white/5">
                <div className="relative shrink-0">
                  <img 
                    src={currentAvatarUrl} 
                    alt="Avatar Preview" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username || 'gamer')}`;
                    }}
                    className="w-14 h-14 rounded-full bg-[#141829] object-cover border-2 shadow-md"
                    style={{ borderColor: selectedColor }}
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Profil Fotoğrafı</span>
                    <button
                      type="button"
                      onClick={handleRandomizeAvatar}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>Rastgele Üret</span>
                    </button>
                  </div>

                  {/* Color presets */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                          selectedColor === c ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-[#0d101f]' : 'hover:scale-110 opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] block mb-1.5">
                  Kullanıcı Adınız
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (!avatarSeed || avatarSeed.startsWith('avatar-') || avatarSeed.startsWith('gamer-')) {
                        setAvatarSeed(e.target.value || 'gamer');
                      }
                    }}
                    placeholder="Örn: Emir"
                    maxLength={24}
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#161a2c] border border-white/10 text-white text-sm focus:outline-hidden focus:border-indigo-500 font-semibold transition-colors"
                  />
                  <User className="w-4 h-4 text-[#94a3b8] absolute right-3.5 top-3.5" />
                </div>
              </div>

              {/* Remember Me Toggle */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#94a3b8] hover:text-white transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                  <span>Bu cihazda beni hatırla (Doğrudan aç)</span>
                </label>
              </div>

              {/* Privacy assurance pill */}
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-300 leading-relaxed font-medium">
                  <strong>Gizlilik ve Cihaz Güvencesi:</strong> Hesabınız sadece bu cihazda korunur. Diğer kullanıcılar sizin oturumunuzu göremez veya seçemez.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!username.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 disabled:opacity-40 text-white text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
              >
                <span>{username ? `${username} Olarak Giriş Yap` : 'Giriş Yap'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Guest quick option */}
          <div className="text-center pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={handleGuestLogin}
              className="text-xs text-[#64748b] hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Veya misafir olarak tek tıkla gir (Gamer-XXXX)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
