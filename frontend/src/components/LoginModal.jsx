import React, { useState, useEffect } from 'react';
import { User, Sparkles, Check, ArrowRight, Dices, Shield, LogIn } from 'lucide-react';

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

export default function LoginModal({ isOpen, onLogin, currentUsername = '' }) {
  const [username, setUsername] = useState(currentUsername || '');
  const [selectedColor, setSelectedColor] = useState('#5865f2');
  const [avatarSeed, setAvatarSeed] = useState(() => currentUsername || 'gamer-' + Math.floor(Math.random() * 9000));
  const [avatarType, setAvatarType] = useState('bottts');
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
    if (acc.avatar) {
      setAvatarSeed(acc.username);
    }
  };

  const handleRandomizeAvatar = () => {
    const types = ['bottts', 'adventurer', 'pixel-art', 'lorelei'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomSeed = 'avatar-' + Math.random().toString(36).substring(2, 8);
    setAvatarType(randomType);
    setAvatarSeed(randomSeed);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = username.trim();
    if (!clean) return;

    const user = {
      id: 'user-' + clean.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
      username: clean,
      avatar: currentAvatarUrl,
      color: selectedColor,
      customStatus: 'Fivecord kullanıyor',
      entranceSound: 'mvp'
    };

    onLogin(user);
  };

  const handleGuestLogin = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const guestName = `Gamer-${randomNum}`;
    const user = {
      id: 'user-' + guestName.toLowerCase(),
      username: guestName,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestName}`,
      color: '#5865f2',
      customStatus: 'Fivecord kullanıyor',
      entranceSound: 'mvp'
    };
    onLogin(user);
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
        <div className="p-6 border-b border-[#232428] text-center" style={{ backgroundColor: '#2b2d31' }}>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#5865f2]/15 border border-[#5865f2]/30 flex items-center justify-center text-[#5865f2] mb-3 shadow-inner">
            <LogIn className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Fivecord'a Giriş Yap</h2>
          <p className="text-xs text-[#949ba4] mt-1">
            Farklı bir yerden (Google Chrome, sekme vb.) girdin. Profilini seç veya adını yazarak bağlan!
          </p>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Quick Click Existing Accounts */}
          {savedAccounts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2 flex items-center justify-between">
                <span>Kayıtlı Profillerden Seç (Tek Tıkla Giriş)</span>
                <span className="text-[10px] text-[#23a55a] font-mono font-bold">HIZLI</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {savedAccounts.slice(0, 6).map((acc) => {
                  const isSelected = username.toLowerCase() === acc.username.toLowerCase();
                  return (
                    <div
                      key={acc.id || acc.username}
                      onClick={() => handleSelectAccount(acc)}
                      className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#5865f2]/20 border-[#5865f2] text-white shadow-md' 
                          : 'bg-[#2b2d31] border-[#383a40] hover:bg-[#35373c] text-[#dbdee1]'
                      }`}
                    >
                      <img 
                        src={acc.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${acc.username}`}
                        alt={acc.username}
                        className="w-8 h-8 rounded-full bg-[#1e1f22] object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{acc.username}</div>
                        <div className="text-[10px] text-[#949ba4] truncate">Tek tıkla bağlan</div>
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

            {/* Info pill about single slot (+1 yer kaplamaz) */}
            <div className="p-3 rounded-xl bg-[#23a55a]/10 border border-[#23a55a]/20 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#23a55a] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#23a55a] leading-relaxed font-medium">
                <strong>+1 Yer Kaplamaz:</strong> Aynı isimle başka sekmede veya cihazda açıksa eski oturum temizlenir, sunucuda fazladan yer kaplamazsınız.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!username.trim()}
              className="w-full py-3 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-40 text-white text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
            >
              <span>Giriş Yap ve Sunucuya Katıl</span>
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
