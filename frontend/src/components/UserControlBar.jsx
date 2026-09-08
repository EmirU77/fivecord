import React, { useState, useRef } from 'react';
import { 
  Mic, MicOff, Headphones, Settings, X, Check, Smile, 
  Upload, Link2, Sparkles, Palette, Image as ImageIcon, Loader2 
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

const COLOR_PRESETS = [
  { name: 'Discord Blurple', hex: '#5865f2' },
  { name: 'Zümrüt Yeşili', hex: '#23a55a' },
  { name: 'Altın Sarısı', hex: '#f0b232' },
  { name: 'Ateş Kırmızısı', hex: '#f23f43' },
  { name: 'Fuşya / Pembe', hex: '#eb459e' },
  { name: 'Buz Mavisi', hex: '#00b0f4' },
  { name: 'Mor Gece', hex: '#9b59b6' },
  { name: 'Neon Turuncu', hex: '#e67e22' }
];

const PRESET_AVATARS = [
  // Gamer & Cyberpunk
  { name: 'Cyber Fox', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80' },
  { name: 'Gamer Cat', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&auto=format&fit=crop&q=80' },
  { name: 'Neon Panda', url: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=150&auto=format&fit=crop&q=80' },
  { name: 'Anime Boy', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow&backgroundColor=b6e3f4' },
  { name: 'Anime Girl', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc' },
  { name: 'Pixel Knight', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Warrior' },
  { name: 'Cyber Robot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Optimus' },
  { name: 'Neon Glitch', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyberpunk' }
];

export default function UserControlBar({ 
  currentUser, 
  onUpdateProfile, 
  isMuted, 
  setIsMuted, 
  isDeafened, 
  setIsDeafened 
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempName, setTempName] = useState(currentUser?.username || '');
  const [tempStatus, setTempStatus] = useState(currentUser?.customStatus || '');
  const [tempAvatar, setTempAvatar] = useState(currentUser?.avatar || '');
  const [tempColor, setTempColor] = useState(currentUser?.color || '#5865f2');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);

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
    setTempAvatar(currentUser?.avatar || '');
    setTempColor(currentUser?.color || '#5865f2');
    setCustomUrlInput('');
    setIsSettingsOpen(true);
  };

  const handleSaveProfile = () => {
    onUpdateProfile({
      username: tempName,
      customStatus: tempStatus,
      avatar: tempAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${tempName}`,
      color: tempColor
    });
    setIsSettingsOpen(false);
  };

  // Upload local image / gif
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
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
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyCustomUrl = () => {
    if (customUrlInput.trim()) {
      setTempAvatar(customUrlInput.trim());
      setCustomUrlInput('');
    }
  };

  return (
    <>
      <div className="h-14 bg-[#111214] px-2 flex items-center justify-between border-t border-[#1f2023]">
        {/* User Info (Clickable to open settings) */}
        <div 
          onClick={openModal}
          className="flex items-center gap-2 p-1.5 -ml-1 rounded-md hover:bg-[#232428] cursor-pointer transition-colors max-w-[140px]"
          title="Profili ve Fotoğrafı Değiştir"
        >
          <div className="relative shrink-0">
            <img 
              src={currentUser?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'} 
              alt={currentUser?.username}
              className="w-8 h-8 rounded-full bg-[#2b2d31] object-cover border border-[#383a40]"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23a55a] border-2 border-[#111214]" />
          </div>
          <div className="overflow-hidden">
            <div 
              className="text-xs font-semibold truncate"
              style={{ color: currentUser?.color || '#ffffff' }}
            >
              {currentUser?.username || 'Kullanıcı'}
            </div>
            <div className="text-[10px] text-[#949ba4] truncate">
              {currentUser?.customStatus || 'Çevrimiçi'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 text-[#b5bac1]">
          <button
            onClick={toggleMute}
            title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            className={`p-1.5 rounded hover:bg-[#232428] hover:text-white transition-colors ${
              isMuted ? 'text-[#f23f43] hover:text-[#f23f43]' : ''
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleDeafen}
            title={isDeafened ? 'Sağırlaştırmayı Kaldır' : 'Kulaklığı Kapat'}
            className={`p-1.5 rounded hover:bg-[#232428] hover:text-white transition-colors ${
              isDeafened ? 'text-[#f23f43] hover:text-[#f23f43]' : ''
            }`}
          >
            <Headphones className="w-4 h-4" />
          </button>

          <button
            onClick={openModal}
            title="Kullanıcı Ayarları & Profil Fotoğrafı"
            className="p-1.5 rounded hover:bg-[#232428] hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RICH PROFILE CUSTOMIZATION MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#313338] shadow-2xl border border-[#3f4147] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2d31]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#5865f2]/20 text-[#5865f2]">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Profilini & Fotoğrafını Özelleştir</h2>
                  <p className="text-xs text-[#949ba4]">Fotoğraf yükle, GIF ekle, isim rengini ve durumunu belirle</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 text-[#949ba4] hover:text-white rounded-lg hover:bg-[#35373c]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* DISCORD PROFILE CARD PREVIEW */}
              <div className="rounded-xl overflow-hidden bg-[#2b2d31] border border-[#3f4147] shadow-lg">
                {/* Banner */}
                <div 
                  className="h-16 w-full relative transition-colors"
                  style={{ backgroundColor: tempColor }}
                />
                
                {/* Avatar & Name Preview */}
                <div className="px-4 pb-4 -mt-8 flex items-end gap-3">
                  <div className="relative shrink-0">
                    <img 
                      src={tempAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${tempName}`} 
                      alt="Preview"
                      className="w-18 h-18 rounded-full bg-[#1e1f22] border-4 border-[#2b2d31] object-cover shadow-md" 
                    />
                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#23a55a] border-2 border-[#2b2d31]" />
                  </div>
                  <div className="mb-1">
                    <div 
                      className="text-base font-bold truncate"
                      style={{ color: tempColor }}
                    >
                      {tempName || 'Kullanıcı Adı'}
                    </div>
                    <div className="text-xs text-[#949ba4]">
                      {tempStatus || 'Özel durum mesajı...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. FOTOĞRAF YÜKLEME (BİLGİSAYARDAN VEYA GIF) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block">
                  1. Fotoğraf veya GIF Yükle
                </label>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {/* File Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[#5865f2] bg-[#5865f2]/10 hover:bg-[#5865f2]/20 text-white text-xs font-semibold transition-all hover:scale-[1.02]"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#5865f2]" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#5865f2]" />
                    )}
                    <span>Bilgisayardan Seç (.png, .gif, .jpg)</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/png, image/jpeg, image/gif, image/webp" 
                    className="hidden" 
                  />

                  {/* Random dicebear generator */}
                  <button
                    type="button"
                    onClick={() => {
                      const seed = 'avatar-' + Math.random().toString(36).substring(2, 7);
                      setTempAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-[#3f4147] bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white text-xs font-semibold transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Rastgele Robot Üret</span>
                  </button>
                </div>

                {/* Direct URL input */}
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="Veya doğrudan resim/GIF linki yapıştırın..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#1e1f22] border border-[#383a40] text-white text-xs focus:outline-hidden focus:border-[#5865f2]"
                    />
                    <Link2 className="w-3.5 h-3.5 text-[#949ba4] absolute left-2.5 top-2.5" />
                  </div>
                  <button
                    type="button"
                    onClick={applyCustomUrl}
                    disabled={!customUrlInput.trim()}
                    className="px-3 py-2 rounded-lg bg-[#5865f2] disabled:opacity-40 hover:bg-[#4752c4] text-white text-xs font-semibold transition-colors shrink-0"
                  >
                    Uygula
                  </button>
                </div>
              </div>

              {/* 2. HAZIR POPÜLER AVATAR GALERİSİ */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-2">
                  2. Hazır Avatar Koleksiyonundan Seç
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {PRESET_AVATARS.map((av) => {
                    const isSelected = tempAvatar === av.url;
                    return (
                      <div
                        key={av.name}
                        onClick={() => setTempAvatar(av.url)}
                        className={`flex flex-col items-center p-2 rounded-xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-[#5865f2] bg-[#5865f2]/20 scale-105 shadow-md' 
                            : 'border-[#383a40] bg-[#2b2d31] hover:bg-[#35373c] hover:border-[#4e5058]'
                        }`}
                      >
                        <img 
                          src={av.url} 
                          alt={av.name} 
                          className="w-12 h-12 rounded-full object-cover mb-1 bg-[#1e1f22]" 
                        />
                        <span className="text-[10px] font-medium text-white truncate max-w-full">
                          {av.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. İSİM RENGİ SEÇİCİ */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#5865f2]" />
                  <span>3. İsim ve Profil Rengi</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((col) => {
                    const isSelected = tempColor === col.hex;
                    return (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setTempColor(col.hex)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-115 border-2 ${
                          isSelected ? 'border-white scale-110 shadow-md' : 'border-transparent'
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

              {/* 4. KULLANICI ADI & ÖZEL DURUM */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1.5">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#1e1f22] border border-[#383a40] text-white text-sm focus:outline-hidden focus:border-[#5865f2]"
                    placeholder="Adınız..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1.5">
                    Özel Durum
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tempStatus}
                      onChange={(e) => setTempStatus(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#1e1f22] border border-[#383a40] text-white text-sm focus:outline-hidden focus:border-[#5865f2]"
                      placeholder="Örn: CS2 oynuyor..."
                    />
                    <Smile className="w-4 h-4 text-[#949ba4] absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#2b2d31] border-t border-[#383a40]">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm text-[#949ba4] hover:text-white transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-6 py-2 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-md hover:scale-105"
              >
                <Check className="w-4 h-4" />
                Kaydet ve Uygula
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}