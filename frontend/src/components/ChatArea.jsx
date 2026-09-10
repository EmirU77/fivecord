import React, { useState, useEffect, useRef } from 'react';
import { 
  Hash, Send, PlusCircle, Smile, Image as ImageIcon, 
  FileText, Download, Heart, Flame, ThumbsUp, Laugh,
  Monitor, MonitorOff, Video, Sparkles, Volume2, Radio,
  Bell, Pin, Users, Search, Disc3, Mic, X, Check, Copy,
  Trash2, ExternalLink, Dices, Gift, MessageSquare, Zap, Upload, Ban
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
  onOpenWheel,
  isBlocked = false,
  onUnblock
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

  // Auto-restore draft for the current channel
  useEffect(() => {
    try {
      const draft = localStorage.getItem(`fivecord_draft_${channel.id}`) || '';
      setInputText(draft);
    } catch (e) {}
  }, [channel.id]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    try {
      if (val.trim()) {
        localStorage.setItem(`fivecord_draft_${channel.id}`, val);
        socket.emit('typing', { channelId: channel.id, isTyping: true });
      } else {
        localStorage.removeItem(`fivecord_draft_${channel.id}`);
        socket.emit('typing', { channelId: channel.id, isTyping: false });
      }
    } catch (err) {}
  };

  const handleSend = (e) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    try {
      localStorage.removeItem(`fivecord_draft_${channel.id}`);
    } catch (err) {}

    // Check for wheel shortcut
    if (trimmed === '/cark' || trimmed === '/wheel' || trimmed === '!cark' || trimmed === '!wheel') {
      onOpenWheel && onOpenWheel();
      setInputText('');
      return;
    }

    onSendMessage(trimmed, null, channel.id);
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
    }, channel.id);
    setShowGifPicker(false);
  };

  const handleSendQuickGreeting = () => {
    onSendMessage('👋 Selam beyler, Fivecord VIP odasındayım! Oyuna kimler geliyor? 🎮', null, channel.id);
  };

  const handleInsertCommand = (cmd) => {
    setInputText(cmd + ' ');
    inputRef.current?.focus();
  };

  const handleRollDice = () => {
    const roll = Math.floor(Math.random() * 100) + 1;
    onSendMessage(`🎲 **Zar Atıldı (1-100):** Sonuç **${roll}**!`, null, channel.id);
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
        }, channel.id);
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
    <div className="flex-1 flex flex-col bg-[#131728] overflow-hidden relative select-text">
      {/* Ambient background glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* 1. ULTRA-POLISHED SYNAPSE TOP BAR */}
      <div className="h-13 bg-[#0f1322]/80 backdrop-blur-2xl border-b border-white/5 px-4 flex items-center justify-between shadow-lg z-20 shrink-0 select-none">
        
        {/* Channel Info */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              {channel.type === 'dm' ? '@' : <Hash className="w-4 h-4 stroke-[2.5]" />}
            </div>
            <span className="font-extrabold text-sm text-white tracking-tight">
              {channel.name}
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <span className="text-xs text-[#94a3b8] font-medium hidden md:inline truncate max-w-xs">
            {channel.topic || 'Topluluk ana sohbet alanı'}
          </span>

          {/* Badges */}
          <div className="hidden xl:flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(99,102,241,0.2)]">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Sınırsız Topluluk
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
              <Zap className="w-3 h-3 text-emerald-400" /> 60 FPS Ultra HQ
            </span>
          </div>
        </div>

        {/* Action Controls on Right */}
        <div className="flex items-center gap-1.5 text-[#94a3b8]">
          
          {/* Windows Download button (Only on Web) */}
          {!isAppInstalled && (
            <button
              onClick={onOpenDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-md hover:scale-105 cursor-pointer"
              title="Windows Masaüstü Uygulamasını İndir (.zip)"
            >
              <Download className="w-4 h-4 animate-bounce" />
              <span className="hidden sm:inline">Windows İndir</span>
            </button>
          )}

          {/* Universal Music Bot Button */}
          <button
            onClick={onOpenMusicModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-emerald-500/20 hover:from-indigo-600 hover:to-emerald-600 text-white text-xs font-bold transition-all shadow-md border border-indigo-500/30 hover:border-transparent hover:scale-105 cursor-pointer"
            title="Fivecord DJ - Müzik Çaları Aç"
          >
            <Disc3 className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="hidden sm:inline">Fivecord DJ</span>
          </button>

          {/* Active Voice Stage Switcher */}
          {currentVoiceChannel && (
            <button
              onClick={() => onSwitchToVoiceStage?.(currentVoiceChannel)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-bold transition-all shadow-md border border-emerald-500/30 hover:border-transparent hover:scale-105 cursor-pointer"
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
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              showSearch ? 'bg-white/10 text-white' : 'hover:text-white hover:bg-white/10'
            }`} 
            title="Mesajlarda Ara"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Pinned Messages Toggle */}
          <button 
            onClick={() => setShowPinsDrawer(!showPinsDrawer)}
            className={`p-2 rounded-xl transition-all cursor-pointer relative ${
              showPinsDrawer ? 'bg-white/10 text-amber-400' : 'hover:text-white hover:bg-white/10'
            }`} 
            title="Sabitlenen Mesajlar"
          >
            <Pin className="w-4 h-4" />
            {pinnedMessages.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 text-black text-[9px] font-black flex items-center justify-center">
                {pinnedMessages.length}
              </span>
            )}
          </button>

          {/* Notification Bell */}
          <button className="p-2 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer" title="Bildirimler">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SEARCH BAR POPDOWN */}
      {showSearch && (
        <div className="px-4 py-2.5 bg-[#0f1322]/90 backdrop-blur-xl border-b border-white/5 flex items-center gap-2 animate-in slide-in-from-top duration-150 select-none">
          <Search className="w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Bu kanaldaki mesajlarda veya kullanıcılarda ara..."
            className="flex-1 bg-transparent text-white text-xs focus:outline-hidden placeholder-[#64748b]"
            autoFocus
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#94a3b8] hover:text-white px-2 py-0.5 rounded-lg bg-white/10"
            >
              Temizle
            </button>
          )}
          <button 
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            className="text-xs text-[#94a3b8] hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. MAIN CHAT AREA (HERO HUB + MESSAGES) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
        
        {/* NATIVE SYNAPSE-STYLE MODERN CHANNEL START */}
        {channel.id === 'dm-empty' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none my-auto">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Henüz Bir Arkadaş Seçilmedi</h2>
            <p className="text-sm text-[#94a3b8] max-w-md">
              Özel mesajlaşmak için sol taraftaki listeden bir arkadaşını seç.
            </p>
          </div>
        ) : channel.type === 'dm' ? (
          <div className="pt-6 pb-4 px-2 select-none">
            <div className="relative inline-block mb-3">
              <img
                src={channel.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${channel.name}`}
                alt={channel.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(channel.name || 'chat')}`;
                }}
                className="w-20 h-20 rounded-full bg-[#141829] object-cover border-4 border-[#141829] shadow-2xl"
              />
              <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-3 border-[#141829] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              @{channel.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#94a3b8] mt-1 max-w-xl leading-relaxed">
              Bu, <strong>@{channel.name}</strong> ile olan doğrudan özel mesajlaşma geçmişinizin başlangıcıdır.
            </p>
          </div>
        ) : (
          /* FUTURISTIC SYNAPSE CHANNEL WELCOME HUB */
          <div className="pt-8 pb-4 px-4 select-none rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 shadow-xl mb-4">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-500 to-cyan-400 blur-xl opacity-35 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 border border-white/25 shadow-2xl flex items-center justify-center text-white">
                <Hash className="w-8 h-8 stroke-[2.5]" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-white via-[#f1f5f9] to-indigo-200 bg-clip-text text-transparent">
              #{channel.name} kanalına hoş geldiniz!
            </h1>
            <p className="text-xs sm:text-sm text-[#94a3b8] mt-1.5 max-w-xl leading-relaxed">
              Burası <strong>#{channel.name}</strong> kanalının başlangıcıdır. Mesaj gönderin, dosya paylaşın veya ses odalarına bağlanın.
            </p>

            {/* Quick Action Chips */}
            <div className="flex items-center gap-2 pt-4 flex-wrap">
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>İlk Mesajı Yaz</span>
              </button>
              
              <button
                type="button"
                onClick={onOpenMusicModal}
                className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105"
              >
                <Disc3 className="w-3.5 h-3.5 text-purple-400" />
                <span>Fivecord DJ Müzik Aç</span>
              </button>

              <button
                type="button"
                onClick={onOpenWheel}
                className="px-3 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-105"
              >
                <Dices className="w-3.5 h-3.5 text-pink-400" />
                <span>Karar Çarkını Çevir</span>
              </button>
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
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(msg.sender?.username || 'user')}`;
                  }}
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
                      <img 
                        src={pin.sender?.avatar} 
                        alt="" 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(pin.sender?.username || 'user')}`;
                        }}
                        className="w-5 h-5 rounded-full object-cover" 
                      />
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
        {isBlocked ? (
          <div className="bg-[#111214]/85 border border-[#da373c]/40 rounded-2xl px-5 py-3.5 flex items-center justify-between text-xs text-[#f23f43] shadow-lg">
            <div className="flex items-center gap-2.5">
              <Ban className="w-5 h-5 text-[#da373c] shrink-0" />
              <span className="font-medium text-[#dbdee1]">
                Bu kullanıcıyı engellediniz. Kendisine özel mesaj gönderemez ve kendisinden mesaj alamazsınız.
              </span>
            </div>
            <button
              type="button"
              onClick={onUnblock}
              className="px-3.5 py-1.5 bg-[#23a55a] hover:bg-[#23a55a]/80 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-sm shrink-0"
            >
              Engeli Kaldır
            </button>
          </div>
        ) : (
          <form 
            onSubmit={handleSend}
            className="bg-[#161a2e]/90 backdrop-blur-2xl rounded-2xl px-4 py-2.5 flex items-center gap-2.5 border border-white/10 focus-within:border-indigo-500/60 focus-within:shadow-[0_0_25px_rgba(99,102,241,0.25)] shadow-xl transition-all relative"
          >
          {/* Plus Action Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                showPlusMenu 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rotate-45 shadow-md' 
                  : 'bg-white/10 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 text-[#cbd5e1] hover:text-white'
              }`}
              title="Ek Seçenekler & Dosya Gönder"
            >
              <PlusCircle className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />
            </button>

            {/* Plus Action Dropdown */}
            {showPlusMenu && (
              <div className="absolute bottom-12 left-0 w-64 rounded-2xl bg-[#13172a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-2 z-30 space-y-1 animate-in slide-in-from-bottom-2 duration-150">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-left flex items-center gap-3 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Dosya / Fotoğraf Gönder</div>
                    <div className="text-[10px] text-[#94a3b8] font-normal">100MB Limitsiz Paylaşım</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleInsertCommand('!play');
                    setShowPlusMenu(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-left flex items-center gap-3 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Disc3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Müzik Çal Komutu</div>
                    <div className="text-[10px] text-[#94a3b8] font-normal">!play &lt;şarkı adı&gt;</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleRollDice}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-left flex items-center gap-3 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Dices className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Zar At (1-100)</div>
                    <div className="text-[10px] text-[#94a3b8] font-normal">Rastgele şans oyunu</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenWheel && onOpenWheel();
                    setShowPlusMenu(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-white/10 text-left flex items-center gap-3 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                    <Dices className="w-4 h-4" />
                  </div>
                  <div>
                    <div>Karar Çarkı ("Ne Oynuyoruz?")</div>
                    <div className="text-[10px] text-[#94a3b8] font-normal">Ekip için oyun & yemek çarkı</div>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={
              channel.type === 'dm'
                ? `@${channel.name} kullanıcısına özel mesaj gönder...`
                : `#${channel.name} kanalına mesaj gönder... (/tts veya /cark yazabilirsin)`
            }
            className="flex-1 bg-transparent text-white text-sm focus:outline-hidden placeholder-[#64748b] font-normal"
          />

          {/* Quick Decision Wheel Button */}
          <button
            type="button"
            onClick={onOpenWheel}
            className="p-2 text-[#94a3b8] hover:text-pink-400 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
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
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                showGifPicker ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'bg-white/10 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 text-[#cbd5e1] hover:text-white'
              }`}
              title="Popüler Gamer GIF'i Gönder"
            >
              GIF
            </button>

            {/* GIF Picker Popup */}
            {showGifPicker && (
              <div className="absolute bottom-12 right-0 w-80 bg-[#13172a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl z-30 space-y-2 animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🎬 Popüler Gamer GIF'leri</span>
                  </span>
                  <button onClick={() => setShowGifPicker(false)} className="text-[#94a3b8] hover:text-white p-1 rounded-lg hover:bg-white/10">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {PRESET_GIFS.map(gif => (
                    <div
                      key={gif.name}
                      onClick={() => handleSendGif(gif.url)}
                      className="relative h-24 rounded-xl overflow-hidden border border-white/10 hover:border-indigo-500 cursor-pointer group transition-all"
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
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                showEmojiPicker ? 'text-amber-400 bg-white/10' : 'text-[#94a3b8] hover:text-amber-400 hover:bg-white/10'
              }`}
              title="Emoji Seçici"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Categorized Emoji Picker Popup */}
            {showEmojiPicker && (
              <div className="absolute bottom-12 right-0 w-72 bg-[#13172a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl z-30 space-y-2.5 animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                  <span className="text-xs font-bold text-white">Emojiler</span>
                  <button onClick={() => setShowEmojiPicker(false)} className="text-[#94a3b8] hover:text-white p-1 rounded-lg hover:bg-white/10">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {EMOJI_CATEGORIES.map(cat => (
                    <div key={cat.category} className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">{cat.category}</div>
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
                            className="p-1.5 hover:bg-white/10 rounded-xl text-lg hover:scale-125 transition-transform flex items-center justify-center cursor-pointer"
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
            className="p-2.5 text-white bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 disabled:opacity-30 rounded-xl transition-all hover:scale-105 shrink-0 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.4)]"
            title="Gönder (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
