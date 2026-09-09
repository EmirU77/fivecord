import React, { useState, useEffect } from 'react';
import { User, Sparkles, Check, ArrowRight, Dices, Shield, LogIn, X, Clock } from 'lucide-react';

const PRESET_COLORS = [
  '#5865f2', // Discord Blurple
  '#23a55a', // Green
  '#f23f43', // Red
  '#f0b232', // Yellow
  '#eb459e', // Pink
  '#00b0f4', // Cyan
  '#9b59b6', // Purple
  '#e67e22'  // Orange
];

export default function LoginModal({ isOpen, onLogin, onClose, currentUser = null }) {
  const lastUsername = currentUser?.username || '';
  const [username, setUsername] = useState(lastUsername || '');
  const [selectedColor, setSelectedColor] = useState(currentUser?.color || '#5865f2');
  const [avatarSeed, setAvatarSeed] = useState(() => lastUsername || 'gamer-' + Math.floor(Math.random() * 9000));
  const [avatarType, setAvatarType] = useState('bottts');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('fivecord_remember_me') === 'true');
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  // Fetch registered accounts from server for 1-click login
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.accounts)) {
          setSavedAccounts(data.accounts);
          // If no username typed yet and there are accounts, prefill with first or current
          if (!username && data.accounts.length > 0) {
            const match = data.accounts.find(a => a.username.toLowerCase() === lastUsername.toLowerCase()) || data.accounts[0];
            if (match) {
              setUsername(match.username);
              setSelectedColor(match.color || '#5865f2');
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingAccounts(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const currentAvatarUrl = `https://api.dicebear.com/7.x/${avatarType}/svg?seed=${encodeURIComponent(avatarSeed)}`;

  const handleSelectAccount = (acc) => {
    setUsername(acc.username);
    setSelectedColor(acc.color || '#5865f2');
    setAvatarSeed(acc.username);
  };

  const handleRandomizeAvatar = () => {
    const types = ['bottts', 'adventurer', 'pixel-art', 'lorelei'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomSeed = 'avatar-' + Math.random().toString(36).substring(2, 8);
    setAvatarType(randomType);
    setAvatarSeed(randomSeed);
  };

  const doLogin = (cleanName, avatarUrl, color) => {
    localStorage.setItem('fivecord_remember_me', rememberMe ? 'true' : 'false');
    const user = {
      id: 'user-' + cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
      username: cleanName,
      avatar: avatarUrl || currentAvatarUrl,
      color: color || selectedColor,
      customStatus: 'Fivecord kullanıyor',
      entranceSound: 'mvp'
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
    if (!lastUsername) return;
    doLogin(lastUsername, currentUser?.avatar || currentAvatarUrl, currentUser?.color || selectedColor);
  };

  const handleGuestLogin = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const guestName = `Gamer-${randomNum}`;
    doLogin(guestName, `https://api.dicebear.com/7.x/bottts/svg?seed=${guestName}`, '#5865f2');
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 select-none z-[99999]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div 
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#3f4147] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: '#313338', boxShadow: '0 24px 70px rgba(0, 0, 0, 0.75)' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#232428] relative text-center" style={{ backgroundColor: '#2b2d31' }}>
          {currentUser && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#5865f2]/15 border border-[#5865f2]/30 flex items-center justify-center text-[#5865f2] mb-3 shadow-inner">
            <LogIn className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Fivecord VIP Giriş</h2>
          <p className="text-xs text-[#949ba4] mt-1">
            Profilini seç veya kullanıcı adını yazarak tek tıkla bağlan!
          </p>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Quick Continue with Previous Profile Card */}
          {lastUsername && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#5865f2]/20 to-[#5865f2]/5 border border-[#5865f2]/40 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 overflow-hidden">
                <img 
                  src={currentUser?.avatar || currentAvatarUrl}
                  alt={lastUsername}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(lastUsername || 'user')}`;
                  }}
                  className="w-10 h-10 rounded-full bg-[#1e1f22] object-cover border-2 border-[#5865f2] shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-[10px] text-[#5865f2] font-black uppercase tracking-wider block">
                    Son Oturum
                  </span>
                  <span className="text-sm font-black text-white truncate block">
                    {lastUsername}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickContinue}
                className="px-4 py-2 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105 shrink-0 flex items-center gap-1.5"
              >
                <span>Hızlı Devam Et</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Click Existing Registered Accounts */}
          {savedAccounts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2 flex items-center justify-between">
                <span>Kayıtlı Profillerden Seç</span>
                <span className="text-[10px] text-[#23a55a] font-mono font-bold">TEK TIKLA GİR</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {savedAccounts.slice(0, 6).map((acc) => {
                  const isSelected = username.toLowerCase() === acc.username.toLowerCase();
                  return (
                    <div
                      key={acc.id || acc.username}
                      onClick={() => handleSelectAccount(acc)}
                      onDoubleClick={() => doLogin(acc.username, acc.avatar, acc.color)}
                      className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#5865f2]/20 border-[#5865f2] text-white shadow-md' 
                          : 'bg-[#2b2d31] border-[#383a40] hover:bg-[#35373c] text-[#dbdee1]'
                      }`}
                      title="Tıkla: Seç | Çift tıkla: Hemen Gir"
                    >
                      <img 
                        src={acc.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${acc.username}`}
                        alt={acc.username}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(acc.username || 'user')}`;
                        }}
                        className="w-8 h-8 rounded-full bg-[#1e1f22] object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{acc.username}</div>
                        <div className="text-[10px] text-[#949ba4] truncate">Seçmek için tıkla</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#5865f2] shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Preview & Randomizer */}
            <div className="flex items-center gap-4 bg-[#2b2d31] p-3.5 rounded-xl border border-[#383a40]">
              <div className="relative shrink-0">
                <img 
                  src={currentAvatarUrl} 
                  alt="Avatar Preview" 
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username || 'gamer')}`;
                  }}
                  className="w-14 h-14 rounded-full bg-[#1e1f22] object-cover border-2 shadow-md"
                  style={{ borderColor: selectedColor }}
                />
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Profil Fotoğrafı</span>
                  <button
                    type="button"
                    onClick={handleRandomizeAvatar}
                    className="text-[11px] text-[#5865f2] hover:text-[#7983f5] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Rastgele Değiştir</span>
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
                        selectedColor === c ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-[#2b2d31]' : 'hover:scale-110 opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Username Input */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1.5">
                Kullanıcı Adın
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
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#1e1f22] border border-[#383a40] text-white text-sm focus:outline-hidden focus:border-[#5865f2] font-semibold"
                />
                <User className="w-4 h-4 text-[#949ba4] absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#b5bac1] hover:text-white transition-colors select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#5865f2] cursor-pointer"
                />
                <span>Bu cihazda beni hatırla (Doğrudan aç)</span>
              </label>
            </div>

            {/* Info pill about single slot (+1 yer kaplamaz) */}
            <div className="p-2.5 rounded-xl bg-[#23a55a]/10 border border-[#23a55a]/20 flex items-start gap-2">
              <Shield className="w-4 h-4 text-[#23a55a] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#23a55a] leading-relaxed font-medium">
                <strong>Tek Oturum Güvencesi:</strong> Aynı isimle başka sekmede açıksa eskisini devralır, sunucuda fazladan yer kaplamaz.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!username.trim()}
              className="w-full py-3 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-40 text-white text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
            >
              <span>{username ? `${username} Olarak Giriş Yap` : 'Giriş Yap'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Guest quick option */}
          <div className="text-center pt-1 border-t border-[#2b2d31]">
            <button
              type="button"
              onClick={handleGuestLogin}
              className="text-xs text-[#949ba4] hover:text-white transition-colors cursor-pointer"
            >
              Veya hızlıca misafir olarak gir (Gamer-XXXX)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
