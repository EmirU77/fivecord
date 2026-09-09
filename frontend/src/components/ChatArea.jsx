import React, { useState, useEffect, useRef } from 'react';
import { 
  Hash, Send, PlusCircle, Smile, Image as ImageIcon, 
  FileText, Download, Heart, Flame, ThumbsUp, Laugh,
  Monitor, MonitorOff, Video, Sparkles, Volume2, Radio,
  Bell, Pin, Users, Search, Disc3, Mic, X, Check, Copy,
  Trash2, ExternalLink, Dices, Gift, MessageSquare, Zap
} from 'lucide-react';
import { socket } from '../services/socket';
import { soundEffects } from '../services/soundEffects';
import { AvatarDecorationRenderer, getNameEffectStyle, StatusDotRenderer } from './UserControlBar';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '💀', '🎉', '🚀', '👑'];

const PRESET_GIFS = [
  { name: 'GG & Zafer', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { name: 'Gamer Cat', url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif' },
  { name: 'Kahkaha / Haha', url: 'https://media.giphy.com/media/ltIFdjNAasOwVvKhvx/giphy.gif' },
  { name: 'Party / Dans', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif' },
  { name: 'Let\'s Go!', url: 'https://media.giphy.com/media/MeIucajzTK2kydvRDT/giphy.gif' },
  { name: 'Gaming Hype', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif' },
  { name: 'Popcorn / İzliyorum', url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif' },
  { name: 'Beyin Yandı', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' }
];

const EMOJI_CATEGORIES = [
  {
    category: 'Gamer & VIP',
    emojis: ['🎮', '👑', '⚡', '🔥', '💎', '🏆', '🎯', '👾', '🚀', '🎧']
  },
  {
    category: 'Tepkiler',
    emojis: ['👍', '❤️', '😂', '💀', '🎉', '👏', '👀', '😎', '🥳', '💯']
  },
  {
    category: 'Ruh Hali',
    emojis: ['😴', '☕', '🍕', '🍔', '✨', '⭐', '🤝', '💪', '🛡️', '⚔️']
  }
];

export default function ChatArea({ 
  channel, 
  currentUser, 
  messages = [], 
  onSendMessage,
  onDeleteMessage,
  onPinMessage,
  currentVoiceChannel,
  onSwitchToVoiceStage,
  isScreenSharing,
  onOpenScreenModal,
  onStopScreenShare,
  onOpenDownload,
  onOpenMusicModal,
  onJoinVoice,
  voiceChannels = [],
  members = [],
  isAppInstalled,
  onOpenWheel
}) {
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinsDrawer, setShowPinsDrawer] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing status listener
  useEffect(() => {
    const handleTyping = ({ channelId, user, isTyping }) => {
      if (channelId === channel.id && user !== currentUser?.username) {
        setTypingUsers(prev => {
          if (isTyping && !prev.includes(user)) return [...prev, user];
          if (!isTyping) return prev.filter(u => u !== user);
          return prev;
        });
      }
    };

    socket.on('user-typing', handleTyping);
    return () => socket.off('user-typing', handleTyping);
  }, [channel.id, currentUser?.username]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (e.target.value.length > 0) {
      socket.emit('typing', { channelId: channel.id, isTyping: true });
    } else {
      socket.emit('typing', { channelId: channel.id, isTyping: false });
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Check for wheel shortcut
    if (trimmed === '/cark' || trimmed === '/wheel' || trimmed === '!cark' || trimmed === '!wheel') {
      onOpenWheel && onOpenWheel();
      setInputText('');
      return;
    }

    onSendMessage(trimmed);
    setInputText('');
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setShowPlusMenu(false);
    socket.emit('typing', { channelId: channel.id, isTyping: false });
    inputRef.current?.focus();
  };

  const handleSendGif = (gifUrl) => {
    onSendMessage('', {
      name: 'GIF',
      url: gifUrl,
      mimetype: 'image/gif'
    });
    setShowGifPicker(false);
  };

  const handleSendQuickGreeting = () => {
    onSendMessage('👋 Selam beyler, Fivecord VIP odasındayım! Oyuna kimler geliyor? 🎮');
  };

  const handleInsertCommand = (cmd) => {
    setInputText(cmd + ' ');
    inputRef.current?.focus();
  };

  const handleRollDice = () => {
    const roll = Math.floor(Math.random() * 100) + 1;
    onSendMessage(`🎲 **Zar Atıldı (1-100):** Sonuç **${roll}**!`);
    setShowPlusMenu(false);
  };

  // Upload file handler
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
        onSendMessage('', {
          name: file.name,
          url: data.url,
          mimetype: file.type,
          size: file.size
        });
      }
    } catch (err) {
      alert('Dosya yüklenemedi: ' + err.message);
    } finally {
      setIsUploading(false);
      setShowPlusMenu(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReaction = (messageId, emoji) => {
    socket.emit('message-reaction', {
      channelId: channel.id,
      messageId,
      emoji
    });
  };

  const handleCopyMessageText = (msg) => {
    if (msg.content) {
      navigator.clipboard.writeText(msg.content);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    }
  };

  // Filter messages based on search query
  const displayedMessages = searchQuery.trim()
    ? messages.filter(m => (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()) || m.sender?.username?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const pinnedMessages = messages.filter(m => m.isPinned);
  const firstVoice = voiceChannels[0] || { id: 'voice-genel', name: 'Ses Odası - Genel' };

  return (
    <div className="flex-1 flex flex-col bg-[#313338] overflow-hidden relative select-text">
      
      {/* 1. ULTRA-POLISHED DISCORD TOP BAR */}
      <div className="h-13 bg-[#313338] border-b border-[#232428] px-4 flex items-center justify-between shadow-xs z-20 shrink-0 select-none">
        
        {/* Channel Info */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#5865f2]/15 flex items-center justify-center text-[#5865f2] border border-[#5865f2]/30 font-bold text-sm">
              {channel.type === 'dm' ? '@' : <Hash className="w-4 h-4 stroke-[2.5]" />}
            </div>
            <span className="font-black text-sm text-white tracking-tight">
              {channel.name}
            </span>
          </div>

          <div className="h-4 w-px bg-[#3f4147] hidden sm:block" />

          <span className="text-xs text-[#949ba4] font-medium hidden md:inline truncate max-w-xs">
            {channel.topic || '5 kişilik özel VIP ana sohbet alanı'}
          </span>

          {/* VIP Badges */}
          <div className="hidden xl:flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-[#5865f2]/15 border border-[#5865f2]/30 text-[#5865f2] text-[10px] font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 5 Kişilik Özel VIP
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#23a55a]/15 border border-[#23a55a]/30 text-[#23a55a] text-[10px] font-bold flex items-center gap-1">
              <Zap className="w-3 h-3" /> 60 FPS Ultra HQ
            </span>
          </div>
        </div>

        {/* Action Controls on Right */}
        <div className="flex items-center gap-2 text-[#b5bac1]">
          
          {/* Windows Download button (Only on Web) */}
          {!isAppInstalled && (
            <button
              onClick={onOpenDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold transition-all shadow-xs hover:scale-105 cursor-pointer"
              title="Windows Masaüstü Uygulamasını İndir (.zip)"
            >
              <Download className="w-4 h-4 animate-bounce" />
              <span className="hidden sm:inline">Windows İndir</span>
            </button>
          )}

          {/* Universal Music Bot Button */}
          <button
            onClick={onOpenMusicModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#5865f2]/20 via-[#1db954]/20 to-[#fc3c44]/20 hover:from-[#5865f2] hover:to-[#1db954] text-white text-xs font-bold transition-all shadow-xs border border-[#5865f2]/40 hover:border-transparent hover:scale-105 cursor-pointer"
            title="Fivecord DJ - Müzik Çaları Aç"
          >
            <Disc3 className="w-4 h-4 text-[#1db954] animate-spin" />
            <span className="hidden sm:inline">Fivecord DJ</span>
          </button>

          {/* Active Voice Stage Switcher */}
          {currentVoiceChannel && (
            <button
              onClick={() => onSwitchToVoiceStage?.(currentVoiceChannel)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#23a55a]/20 hover:bg-[#23a55a] text-[#23a55a] hover:text-white text-xs font-bold transition-all shadow-xs border border-[#23a55a]/40 hover:border-transparent hover:scale-105 cursor-pointer"
              title="Aktif Ses Sahnesine Dön"
            >
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">Ses Sahnesi</span>
            </button>
          )}

          {/* Search Toggle */}
          <button 
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery('');
            }}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              showSearch ? 'bg-[#35373c] text-white' : 'hover:text-white hover:bg-[#35373c]'
            }`} 
            title="Mesajlarda Ara"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Pinned Messages Toggle */}
          <button 
            onClick={() => setShowPinsDrawer(!showPinsDrawer)}
            className={`p-2 rounded-lg transition-colors cursor-pointer relative ${
              showPinsDrawer ? 'bg-[#35373c] text-[#f0b232]' : 'hover:text-white hover:bg-[#35373c]'
            }`} 
            title="Sabitlenen Mesajlar"
          >
            <Pin className="w-4 h-4" />
            {pinnedMessages.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#f0b232] text-black text-[9px] font-black flex items-center justify-center">
                {pinnedMessages.length}
              </span>
            )}
          </button>

          {/* Notification Bell */}
          <button className="p-2 hover:text-white rounded-lg hover:bg-[#35373c] transition-colors cursor-pointer" title="Bildirimler">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SEARCH BAR POPDOWN */}
      {showSearch && (
        <div className="px-4 py-2 bg-[#2b2d31] border-b border-[#383a40] flex items-center gap-2 animate-in slide-in-from-top duration-150 select-none">
          <Search className="w-4 h-4 text-[#949ba4]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Bu kanaldaki mesajlarda veya kullanıcılarda ara..."
            className="flex-1 bg-transparent text-white text-xs focus:outline-hidden placeholder-[#80848e]"
            autoFocus
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#949ba4] hover:text-white px-2 py-0.5 rounded bg-[#1e1f22]"
            >
              Temizle
            </button>
          )}
          <button 
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            className="text-xs text-[#949ba4] hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. MAIN CHAT AREA (HERO HUB + MESSAGES) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        
        {/* HERO WELCOME & ACTION HUB */}
        {channel.id === 'dm-empty' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none my-auto">
            <div className="w-16 h-16 rounded-3xl bg-[#5865f2]/20 flex items-center justify-center text-[#5865f2] mb-4 shadow-lg shadow-[#5865f2]/20">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Henüz Bir Arkadaş Seçilmedi</h2>
            <p className="text-sm text-[#949ba4] max-w-md">
              Özel mesajlaşmak için sol taraftaki direkt mesaj listesinden bir arkadaşınızı seçin veya genel sohbette arkadaşınızın profiline tıklayın.
            </p>
          </div>
        ) : channel.type === 'dm' ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#2b2d31] via-[#232428] to-[#1e1f22] border border-[#3f4147] shadow-xl relative overflow-hidden select-none mb-6">
            <div className="relative z-10 flex flex-col items-start gap-4">
              <div className="relative">
                <img
                  src={channel.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${channel.name}`}
                  alt={channel.name}
                  className="w-18 h-18 rounded-full bg-[#1e1f22] object-cover border-4 border-[#5865f2] shadow-xl"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#23a55a] border-3 border-[#2b2d31]" />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  @{channel.name}
                </h1>
                <p className="text-xs sm:text-sm text-[#949ba4] mt-1.5 max-w-xl leading-relaxed">
                  Bu sizin <strong>@{channel.name}</strong> ile olan doğrudan özel mesajlaşma geçmişinizin başlangıcıdır.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onSendMessage('👋 Selam! Nasılsın?')}
                  className="px-4 py-2 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105"
                >
                  👋 Selam Ver
                </button>
                <button
                  type="button"
                  onClick={() => onSendMessage('🎮 Akşam Fivecord\'da oyuna geliyor musun?')}
                  className="px-4 py-2 rounded-xl bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-bold border border-[#3f4147] transition-all cursor-pointer hover:scale-105"
                >
                  🎮 Oyuna Çağır
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#2b2d31] via-[#232428] to-[#1e1f22] border border-[#3f4147] shadow-xl relative overflow-hidden select-none mb-6">
            {/* Subtle Ambient Glow */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#5865f2]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#eb459e]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Hero Header */}
          <div className="relative z-10 flex flex-col items-start gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5865f2] to-[#eb459e] flex items-center justify-center text-white shadow-lg shadow-[#5865f2]/25 ring-4 ring-white/10">
              <Hash className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  #{channel.name} Odasına Hoş Geldiniz!
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#5865f2]/20 border border-[#5865f2]/40 text-[#5865f2] text-xs font-bold">
                  VIP ODA
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#949ba4] mt-1.5 max-w-xl leading-relaxed">
                Burası 5 kişilik özel arkadaş grubunuzun ana toplanma merkezidir. Spotify, YouTube ve SoundCloud'dan müzik dinleyebilir, 60 FPS ekran paylaşabilir ve dilediğiniz dosyayı paylaşabilirsiniz.
              </p>
            </div>
          </div>

          {/* 4 INTERACTIVE QUICK ACTION CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 relative z-10">
            
            {/* Card 1: Music Player */}
            <div 
              onClick={onOpenMusicModal}
              className="p-3.5 rounded-2xl bg-[#2b2d31]/80 hover:bg-[#35373c] border border-[#3f4147] hover:border-[#1db954]/50 transition-all cursor-pointer group shadow-sm flex flex-col justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1db954]/15 border border-[#1db954]/30 flex items-center justify-center text-[#1db954] shrink-0 group-hover:scale-110 transition-transform">
                  <Disc3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#1db954] transition-colors">
                    Fivecord DJ'i Aç
                  </h4>
                  <p className="text-[11px] text-[#949ba4] mt-0.5 leading-snug">
                    Spotify & YouTube'dan şarkı ara ve odada çal.
                  </p>
                </div>
              </div>
              <button className="w-full py-1.5 rounded-lg bg-[#1db954]/20 hover:bg-[#1db954] text-[#1db954] hover:text-white text-xs font-bold transition-colors">
                Müziği Başlat ▶
              </button>
            </div>

            {/* Card 2: Voice Channel Join */}
            <div 
              onClick={() => onJoinVoice?.(firstVoice)}
              className="p-3.5 rounded-2xl bg-[#2b2d31]/80 hover:bg-[#35373c] border border-[#3f4147] hover:border-[#23a55a]/50 transition-all cursor-pointer group shadow-sm flex flex-col justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#23a55a]/15 border border-[#23a55a]/30 flex items-center justify-center text-[#23a55a] shrink-0 group-hover:scale-110 transition-transform">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#23a55a] transition-colors">
                    Ses Odasına Gir
                  </h4>
                  <p className="text-[11px] text-[#949ba4] mt-0.5 leading-snug">
                    Düşük gecikmeli, kristal netliğinde ses odasına bağlan.
                  </p>
                </div>
              </div>
              <button className="w-full py-1.5 rounded-lg bg-[#23a55a]/20 hover:bg-[#23a55a] text-[#23a55a] hover:text-white text-xs font-bold transition-colors">
                Odaya Katıl 🔊
              </button>
            </div>

            {/* Card 3: Screen Share */}
            <div 
              onClick={isScreenSharing ? onStopScreenShare : onOpenScreenModal}
              className="p-3.5 rounded-2xl bg-[#2b2d31]/80 hover:bg-[#35373c] border border-[#3f4147] hover:border-[#5865f2]/50 transition-all cursor-pointer group shadow-sm flex flex-col justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#5865f2]/15 border border-[#5865f2]/30 flex items-center justify-center text-[#5865f2] shrink-0 group-hover:scale-110 transition-transform">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#5865f2] transition-colors">
                    60 FPS Canlı Yayın
                  </h4>
                  <p className="text-[11px] text-[#949ba4] mt-0.5 leading-snug">
                    Oyununu veya masaüstünü arkadaşlarına canlı yayınla.
                  </p>
                </div>
              </div>
              <button className="w-full py-1.5 rounded-lg bg-[#5865f2]/20 hover:bg-[#5865f2] text-[#5865f2] hover:text-white text-xs font-bold transition-colors">
                Yayın Başlat 📺
              </button>
            </div>

            {/* Card 4: Quick Greeting */}
            <div 
              onClick={handleSendQuickGreeting}
              className="p-3.5 rounded-2xl bg-[#2b2d31]/80 hover:bg-[#35373c] border border-[#3f4147] hover:border-[#f0b232]/50 transition-all cursor-pointer group shadow-sm flex flex-col justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f0b232]/15 border border-[#f0b232]/30 flex items-center justify-center text-[#f0b232] shrink-0 group-hover:scale-110 transition-transform">
                  <Smile className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#f0b232] transition-colors">
                    Hızlı Selam Gönder
                  </h4>
                  <p className="text-[11px] text-[#949ba4] mt-0.5 leading-snug">
                    Sohbete tek tıkla VIP açılış selamı gönder.
                  </p>
                </div>
              </div>
              <button className="w-full py-1.5 rounded-lg bg-[#f0b232]/20 hover:bg-[#f0b232] text-[#f0b232] hover:text-black text-xs font-bold transition-colors">
                Selam Ver 👋
              </button>
            </div>

          </div>

          {/* QUICK COMMANDS CHEAT SHEET BAR */}
          <div className="mt-5 pt-4 border-t border-[#3f4147]/60 flex items-center justify-between flex-wrap gap-2 text-xs relative z-10">
            <span className="text-white font-bold flex items-center gap-1.5">
              <span>💡 Hızlı Komutlar (Tıkla ve Gönder):</span>
            </span>

            <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
              <button 
                type="button"
                onClick={() => handleInsertCommand('!play')}
                className="px-2.5 py-1 rounded-lg bg-[#1e1f22] hover:bg-[#5865f2] text-[#5865f2] hover:text-white border border-[#383a40] transition-colors cursor-pointer"
              >
                !play [şarkı]
              </button>
              <button 
                type="button"
                onClick={() => handleInsertCommand('!pause')}
                className="px-2.5 py-1 rounded-lg bg-[#1e1f22] hover:bg-[#5865f2] text-[#5865f2] hover:text-white border border-[#383a40] transition-colors cursor-pointer"
              >
                !pause
              </button>
              <button 
                type="button"
                onClick={() => handleInsertCommand('!resume')}
                className="px-2.5 py-1 rounded-lg bg-[#1e1f22] hover:bg-[#5865f2] text-[#5865f2] hover:text-white border border-[#383a40] transition-colors cursor-pointer"
              >
                !resume
              </button>
              <button 
                type="button"
                onClick={() => handleInsertCommand('!stop')}
                className="px-2.5 py-1 rounded-lg bg-[#1e1f22] hover:bg-[#5865f2] text-[#5865f2] hover:text-white border border-[#383a40] transition-colors cursor-pointer"
              >
                !stop
              </button>
              <button 
                type="button"
                onClick={() => handleInsertCommand('!volume 100')}
                className="px-2.5 py-1 rounded-lg bg-[#1e1f22] hover:bg-[#5865f2] text-[#5865f2] hover:text-white border border-[#383a40] transition-colors cursor-pointer"
              >
                !volume 100
              </button>
              <button 
                type="button"
                onClick={() => handleInsertCommand('!np')}
                className="px-2.5 py-1 rounded-lg bg-[#1e1f22] hover:bg-[#5865f2] text-[#5865f2] hover:text-white border border-[#383a40] transition-colors cursor-pointer"
              >
                !np
              </button>
            </div>
          </div>
        </div>
        )}

        {/* 3. MESSAGES STREAM */}
        {displayedMessages.map((msg) => {
          const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const isOwn = msg.sender?.id === currentUser?.id || msg.sender?.username === currentUser?.username;
          const isBot = msg.sender?.id === 'bot-fivecord-dj' || msg.sender?.username?.toLowerCase().includes('bot');

          return (
            <div 
              key={msg.id} 
              className={`group relative flex gap-3.5 p-2 -mx-2 rounded-2xl transition-all ${
                msg.isPinned ? 'bg-[#f0b232]/5 border-l-2 border-[#f0b232]' : 'hover:bg-[#2e3035]/70'
              }`}
            >
              {/* Avatar with Active Decoration */}
              <div className="relative shrink-0 w-10 h-10 mt-0.5">
                <img 
                  src={msg.sender.avatar} 
                  alt={msg.sender.username}
                  className="w-10 h-10 rounded-full bg-[#1e1f22] object-cover shadow-md border border-transparent group-hover:border-[#3f4147] transition-all" 
                />
                <AvatarDecorationRenderer decoration={msg.sender.avatarDecoration} size="sm" />
                {msg.sender.status && (
                  <StatusDotRenderer status={msg.sender.status} className="w-3 h-3" />
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1 overflow-hidden">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span 
                    className="font-bold text-sm hover:underline cursor-pointer tracking-tight"
                    style={getNameEffectStyle(msg.sender.nameEffect, msg.sender.color || '#5865f2')}
                  >
                    {msg.sender.username}
                  </span>

                  {/* Owner / Bot Badges */}
                  {isBot && (
                    <span className="px-1.5 py-0.2 rounded bg-[#5865f2] text-[10px] font-black uppercase text-white tracking-wider">
                      BOT
                    </span>
                  )}
                  {msg.sender.badges?.includes('owner') && (
                    <span title="Sunucu Kurucusu" className="text-xs select-none">👑</span>
                  )}
                  {msg.sender.badges?.includes('nitro') && (
                    <span title="VIP Nitro Booster" className="text-xs select-none">⚡</span>
                  )}

                  <span className="text-[10px] text-[#949ba4] font-medium font-mono">{time}</span>

                  {msg.isTTS && (
                    <span className="text-[10px] text-[#23a55a] font-bold bg-[#23a55a]/15 px-1.5 py-0.2 rounded border border-[#23a55a]/30 flex items-center gap-1 shadow-xs">
                      <Volume2 className="w-2.5 h-2.5 animate-pulse" /> TTS
                    </span>
                  )}

                  {msg.isPinned && (
                    <span className="text-[10px] text-[#f0b232] font-semibold bg-[#f0b232]/10 px-2 py-0.2 rounded flex items-center gap-1">
                      <Pin className="w-2.5 h-2.5" /> Sabitlendi
                    </span>
                  )}
                </div>

                {/* Text Content */}
                {msg.content && (
                  <div className="text-sm text-[#dbdee1] mt-1 whitespace-pre-wrap break-words leading-relaxed select-text font-normal">
                    {msg.content}
                  </div>
                )}

                {/* Attached Media / File */}
                {msg.file && (
                  <div className="mt-2.5 max-w-lg">
                    {msg.file.mimetype?.startsWith('image/') ? (
                      <div 
                        onClick={() => setSelectedImageModal(msg.file.url)}
                        className="rounded-2xl overflow-hidden border border-[#3f4147] shadow-lg hover:border-[#5865f2] transition-all cursor-pointer group/img relative max-h-80"
                      >
                        <img 
                          src={msg.file.url} 
                          alt={msg.file.name} 
                          className="w-full h-full object-cover group-hover/img:scale-102 transition-transform" 
                        />
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ) : msg.file.mimetype?.startsWith('video/') ? (
                      <video 
                        controls 
                        src={msg.file.url} 
                        className="rounded-2xl max-h-80 border border-[#3f4147] shadow-lg w-full" 
                      />
                    ) : msg.file.mimetype?.startsWith('audio/') ? (
                      <audio 
                        controls 
                        src={msg.file.url} 
                        className="w-full mt-1 accent-[#5865f2]" 
                      />
                    ) : (
                      <a 
                        href={msg.file.url} 
                        download 
                        className="flex items-center gap-3 p-3 rounded-2xl bg-[#2b2d31] border border-[#3f4147] hover:border-[#5865f2] transition-all shadow-sm group/file"
                      >
                        <FileText className="w-7 h-7 text-[#5865f2] group-hover/file:scale-110 transition-transform" />
                        <div className="truncate flex-1">
                          <div className="text-xs font-bold text-white truncate">{msg.file.name}</div>
                          <div className="text-[10px] text-[#949ba4]">
                            {msg.file.size ? (msg.file.size / (1024 * 1024)).toFixed(2) + ' MB' : 'Ek Dosya'}
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-[#949ba4] group-hover/file:text-white" />
                      </a>
                    )}
                  </div>
                )}

                {/* Emoji Reactions List */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {Object.entries(msg.reactions).map(([emoji, users]) => {
                      const hasReacted = users.includes(currentUser?.username);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs border transition-all cursor-pointer ${
                            hasReacted 
                              ? 'bg-[#5865f2]/25 border-[#5865f2] text-[#5865f2] font-bold shadow-xs' 
                              : 'bg-[#2b2d31] border-[#383a40] text-[#949ba4] hover:bg-[#35373c]'
                          }`}
                          title={users.join(', ')}
                        >
                          <span>{emoji}</span>
                          <span className="text-[11px] font-bold">{users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DISCORD FLOATING ACTION TOOLBAR ON HOVER */}
              <div className="absolute top-1 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 p-1 rounded-xl bg-[#232428] border border-[#3f4147] shadow-xl z-10 select-none">
                {/* Quick Reax */}
                {QUICK_EMOJIS.slice(0, 4).map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(msg.id, emoji)}
                    className="p-1 hover:bg-[#35373c] rounded-lg text-xs transition-transform hover:scale-125 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}

                <div className="w-px h-3.5 bg-[#3f4147] mx-1" />

                {/* Copy Text */}
                <button
                  onClick={() => handleCopyMessageText(msg)}
                  className="p-1.5 hover:bg-[#35373c] rounded-lg text-[#949ba4] hover:text-white transition-colors cursor-pointer"
                  title="Metni Kopyala"
                >
                  {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-[#23a55a]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Pin Message */}
                <button
                  onClick={() => onPinMessage?.(msg.id)}
                  className={`p-1.5 hover:bg-[#35373c] rounded-lg transition-colors cursor-pointer ${
                    msg.isPinned ? 'text-[#f0b232]' : 'text-[#949ba4] hover:text-white'
                  }`}
                  title={msg.isPinned ? 'Sabitlemeyi Kaldır' : 'Mesajı Sabitle'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>

                {/* Delete Message (if sender is own) */}
                {isOwn && (
                  <button
                    onClick={() => onDeleteMessage?.(msg.id)}
                    className="p-1.5 hover:bg-[#f23f43]/20 rounded-lg text-[#949ba4] hover:text-[#f23f43] transition-colors cursor-pointer"
                    title="Mesajı Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. PINNED MESSAGES DRAWER */}
      {showPinsDrawer && (
        <div className="absolute top-13 right-0 bottom-0 w-80 bg-[#2b2d31] border-l border-[#383a40] shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-[#383a40] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-[#f0b232]" />
              <h3 className="text-sm font-black text-white">Sabitlenen Mesajlar</h3>
              <span className="px-2 py-0.2 rounded-full bg-[#f0b232]/20 text-[#f0b232] text-xs font-bold font-mono">
                {pinnedMessages.length}
              </span>
            </div>
            <button 
              onClick={() => setShowPinsDrawer(false)}
              className="p-1.5 text-[#949ba4] hover:text-white rounded-lg hover:bg-[#35373c]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {pinnedMessages.length === 0 ? (
              <div className="text-center py-12 text-[#949ba4] space-y-2">
                <Pin className="w-8 h-8 text-[#949ba4]/40 mx-auto" />
                <p className="text-xs font-semibold text-white">Henüz sabitlenen mesaj yok</p>
                <p className="text-[11px] text-[#80848e]">Mesajların üzerine gelerek raptiye simgesiyle sabitleyebilirsiniz.</p>
              </div>
            ) : (
              pinnedMessages.map(pin => (
                <div key={pin.id} className="p-3 rounded-xl bg-[#232428] border border-[#383a40] space-y-2 group/pin">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={pin.sender?.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                      <span className="text-xs font-bold text-white">{pin.sender?.username}</span>
                    </div>
                    <button
                      onClick={() => onPinMessage?.(pin.id)}
                      className="text-[10px] text-[#949ba4] hover:text-[#f23f43] opacity-0 group-pin:opacity-100 transition-opacity"
                    >
                      Kaldır
                    </button>
                  </div>
                  <p className="text-xs text-[#dbdee1] leading-relaxed break-words">{pin.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. FULL IMAGE LIGHTBOX MODAL */}
      {selectedImageModal && (
        <div 
          onClick={() => setSelectedImageModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-150 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={selectedImageModal} alt="Enlarged" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10" />
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute -top-4 -right-4 p-2 rounded-full bg-black/80 hover:bg-black text-white border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-[#949ba4] flex items-center gap-2 select-none shrink-0 animate-pulse">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5865f2] animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#5865f2] animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#5865f2] animate-bounce [animation-delay:0.4s]" />
          </div>
          <span className="font-semibold text-white">{typingUsers.join(', ')}</span> yazıyor...
        </div>
      )}

      {/* 6. ADVANCED DISCORD MESSAGE INPUT BAR */}
      <div className="px-4 pb-4 pt-1 shrink-0 select-none">
        <form 
          onSubmit={handleSend}
          className="bg-[#383a40] rounded-2xl px-4 py-2.5 flex items-center gap-2.5 border border-transparent focus-within:border-[#5865f2]/50 shadow-lg transition-all relative"
        >
          {/* Plus Action Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                showPlusMenu 
                  ? 'bg-[#5865f2] text-white rotate-45' 
                  : 'bg-[#4e5058] hover:bg-[#5865f2] text-[#dbdee1] hover:text-white'
              }`}
              title="Ek Seçenekler & Dosya Gönder"
            >
              <PlusCircle className={`w-5 h-5 ${isUploading ? 'animate-spin' : ''}`} />
            </button>

            {/* Plus Action Dropdown */}
            {showPlusMenu && (
              <div className="absolute bottom-12 left-0 w-64 rounded-2xl bg-[#2b2d31] border border-[#3f4147] shadow-2xl p-2 z-30 space-y-1 animate-in slide-in-from-bottom-2 duration-150">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-2.5 rounded-xl hover:bg-[#35373c] text-left flex items-center gap-3 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#5865f2]/20 text-[#5865f2] flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Dosya / Fotoğraf Gönder</div>
                    <div className="text-[10px] text-[#949ba4] font-normal">100MB Limitsiz Paylaşım</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleInsertCommand('!play');
                    setShowPlusMenu(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-[#35373c] text-left flex items-center gap-3 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1db954]/20 text-[#1db954] flex items-center justify-center">
                    <Disc3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Müzik Çal Komutu</div>
                    <div className="text-[10px] text-[#949ba4] font-normal">!play &lt;şarkı adı&gt;</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleRollDice}
                  className="w-full p-2.5 rounded-xl hover:bg-[#35373c] text-left flex items-center gap-3 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Dices className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Zar At (1-100)</div>
                    <div className="text-[10px] text-[#949ba4] font-normal">Rastgele şans oyunu</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenWheel && onOpenWheel();
                    setShowPlusMenu(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-[#35373c] text-left flex items-center gap-3 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#eb459e]/20 text-[#eb459e] flex items-center justify-center">
                    <Dices className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Karar Çarkı ("Ne Oynuyoruz?")</div>
                    <div className="text-[10px] text-[#949ba4] font-normal">Ekip için oyun & yemek çarkı</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />

          {/* Main Text Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={
              channel.type === 'dm'
                ? `@${channel.name} kullanıcısına özel mesaj gönder...`
                : `#${channel.name} kanalına mesaj gönder... (/tts veya /cark yazabilirsin)`
            }
            className="flex-1 bg-transparent text-white text-sm focus:outline-hidden placeholder-[#80848e] font-normal"
          />

          {/* Quick Decision Wheel Button */}
          <button
            type="button"
            onClick={onOpenWheel}
            className="p-1.5 text-[#b5bac1] hover:text-[#eb459e] hover:bg-[#35373c] rounded-lg transition-all cursor-pointer"
            title="🎯 Karar Çarkı ('Ne Oynuyoruz?')"
          >
            <Dices className="w-5 h-5" />
          </button>

          {/* GIF Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowGifPicker(!showGifPicker);
                setShowEmojiPicker(false);
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer ${
                showGifPicker ? 'bg-[#5865f2] text-white' : 'bg-[#4e5058]/80 hover:bg-[#5865f2] text-[#dbdee1] hover:text-white'
              }`}
              title="Popüler Gamer GIF'i Gönder"
            >
              GIF
            </button>

            {/* GIF Picker Popup */}
            {showGifPicker && (
              <div className="absolute bottom-12 right-0 w-80 bg-[#2b2d31] border border-[#3f4147] rounded-2xl p-3 shadow-2xl z-30 space-y-2 animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-[#383a40]">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🎬 Popüler Gamer GIF'leri</span>
                  </span>
                  <button onClick={() => setShowGifPicker(false)} className="text-[#949ba4] hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {PRESET_GIFS.map(gif => (
                    <div
                      key={gif.name}
                      onClick={() => handleSendGif(gif.url)}
                      className="relative h-24 rounded-xl overflow-hidden border border-[#383a40] hover:border-[#5865f2] cursor-pointer group transition-all"
                    >
                      <img src={gif.url} alt={gif.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                        <span className="text-[10px] font-bold text-white drop-shadow">{gif.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Emoji Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowGifPicker(false);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                showEmojiPicker ? 'text-[#f0b232]' : 'text-[#b5bac1] hover:text-[#f0b232]'
              }`}
              title="Emoji Seçici"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Categorized Emoji Picker Popup */}
            {showEmojiPicker && (
              <div className="absolute bottom-12 right-0 w-72 bg-[#2b2d31] border border-[#3f4147] rounded-2xl p-3 shadow-2xl z-30 space-y-2.5 animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-[#383a40]">
                  <span className="text-xs font-bold text-white">Emojiler</span>
                  <button onClick={() => setShowEmojiPicker(false)} className="text-[#949ba4] hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {EMOJI_CATEGORIES.map(cat => (
                    <div key={cat.category} className="space-y-1">
                      <div className="text-[10px] font-bold uppercase text-[#949ba4]">{cat.category}</div>
                      <div className="grid grid-cols-5 gap-1">
                        {cat.emojis.map(em => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              setInputText(prev => prev + em);
                              setShowEmojiPicker(false);
                              inputRef.current?.focus();
                            }}
                            className="p-1.5 hover:bg-[#35373c] rounded-lg text-lg hover:scale-125 transition-transform flex items-center justify-center cursor-pointer"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 text-white bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-30 rounded-xl transition-all hover:scale-105 shrink-0 cursor-pointer shadow-sm"
            title="Gönder (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
