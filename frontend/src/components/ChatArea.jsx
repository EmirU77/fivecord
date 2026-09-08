import React, { useState, useEffect, useRef } from 'react';
import { 
  Hash, Send, PlusCircle, Smile, Image as ImageIcon, 
  FileText, Download, Heart, Flame, ThumbsUp, Laugh,
  Monitor, MonitorOff, Video, Sparkles, Volume2, Radio,
  Bell, Pin, Users, Search
} from 'lucide-react';
import { socket } from '../services/socket';
import { soundEffects } from '../services/soundEffects';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '💀', '🎉'];

export default function ChatArea({ 
  channel, 
  currentUser, 
  messages, 
  onSendMessage,
  currentVoiceChannel,
  onSwitchToVoiceStage,
  isScreenSharing,
  onOpenScreenModal,
  onStopScreenShare
}) {
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleTyping = ({ channelId, user, isTyping }) => {
      if (channelId !== channel.id) return;
      if (isTyping) {
        setTypingUsers(prev => prev.includes(user) ? prev : [...prev, user]);
      } else {
        setTypingUsers(prev => prev.filter(u => u !== user));
      }
    };

    socket.on('user-typing', handleTyping);
    return () => socket.off('user-typing', handleTyping);
  }, [channel]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    socket.emit('typing', { channelId: channel.id, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { channelId: channel.id, isTyping: false });
    }, 1500);
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage({
      channelId: channel.id,
      content: inputText,
      file: null
    });

    setInputText('');
    socket.emit('typing', { channelId: channel.id, isTyping: false });
  };

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
      const fileData = await res.json();

      onSendMessage({
        channelId: channel.id,
        content: inputText,
        file: fileData
      });
      setInputText('');
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReaction = (messageId, emoji) => {
    socket.emit('toggle-reaction', {
      channelId: channel.id,
      messageId,
      emoji
    });
  };

  return (
    <div className="flex-1 bg-[#313338] flex flex-col overflow-hidden">
      {/* Modern Channel Top Bar */}
      <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shadow-xs bg-[#313338]">
        <div className="flex items-center gap-2 truncate">
          <Hash className="w-5 h-5 text-[#80848e] shrink-0" />
          <span className="font-bold text-sm text-white truncate">{channel.name}</span>
          <span className="text-xs text-[#949ba4] border-l border-[#3f4147] pl-3 ml-2 truncate hidden sm:inline">
            {channel.topic}
          </span>
        </div>

        {/* Right side utility icons & voice actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Active Voice Bar if in voice room */}
          {currentVoiceChannel && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSwitchToVoiceStage(currentVoiceChannel)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-semibold border border-[#3f4147] transition-all hover:scale-105"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#23a55a]" />
                <span>Yayın Sahnesini Aç</span>
              </button>

              <button
                onClick={isScreenSharing ? onStopScreenShare : onOpenScreenModal}
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${
                  isScreenSharing 
                    ? 'bg-[#f23f43] text-white animate-pulse' 
                    : 'bg-[#5865f2] hover:bg-[#4752c4] text-white hover:scale-105'
                }`}
              >
                {isScreenSharing ? (
                  <>
                    <MonitorOff className="w-3.5 h-3.5" />
                    <span>Durdur</span>
                  </>
                ) : (
                  <>
                    <Monitor className="w-3.5 h-3.5" />
                    <span>60 FPS Yayın</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[#b5bac1]">
            <button className="p-1.5 hover:text-white rounded hover:bg-[#35373c] transition-colors" title="Bildirimler">
              <Bell className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:text-white rounded hover:bg-[#35373c] transition-colors" title="Sabitlenen Mesajlar">
              <Pin className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#949ba4] space-y-3">
            <div className="w-18 h-18 rounded-3xl bg-[#2b2d31] flex items-center justify-center text-white mb-1 shadow-lg ring-1 ring-white/5">
              <Hash className="w-10 h-10 text-[#5865f2]" />
            </div>
            <h3 className="text-2xl font-black text-white">#{channel.name} kanalına hoş geldin!</h3>
            <p className="text-xs text-[#949ba4] max-w-sm leading-relaxed">
              Burası 5 kişilik özel VIP grubunuzun metin kanalı. Mesaj yazarak, resim, video veya dosya paylaşarak sohbete başlayabilirsiniz!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div 
                key={msg.id} 
                className="group relative flex gap-3.5 p-1.5 -mx-2 rounded-xl hover:bg-[#2e3035] transition-colors"
              >
                {/* Avatar */}
                <img 
                  src={msg.sender.avatar} 
                  alt={msg.sender.username}
                  className="w-10 h-10 rounded-full bg-[#1e1f22] object-cover shrink-0 mt-0.5 shadow-sm border border-transparent group-hover:border-[#3f4147] transition-all" 
                />

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-baseline gap-2">
                    <span 
                      className="font-bold text-sm hover:underline cursor-pointer tracking-tight"
                      style={{ color: msg.sender.color || '#5865f2' }}
                    >
                      {msg.sender.username}
                    </span>
                    <span className="text-[10px] text-[#949ba4] font-medium">{time}</span>
                  </div>

                  {msg.content && (
                    <div className="text-sm text-[#dbdee1] mt-0.5 whitespace-pre-wrap break-words leading-relaxed select-text">
                      {msg.content}
                    </div>
                  )}

                  {msg.file && (
                    <div className="mt-2 max-w-md">
                      {msg.file.mimetype?.startsWith('image/') ? (
                        <a href={msg.file.url} target="_blank" rel="noreferrer">
                          <img 
                            src={msg.file.url} 
                            alt={msg.file.name} 
                            className="rounded-xl max-h-72 object-cover border border-[#3f4147] hover:opacity-95 shadow-md transition-opacity" 
                          />
                        </a>
                      ) : msg.file.mimetype?.startsWith('video/') ? (
                        <video 
                          controls 
                          src={msg.file.url} 
                          className="rounded-xl max-h-72 border border-[#3f4147] shadow-md" 
                        />
                      ) : (
                        <a 
                          href={msg.file.url} 
                          download 
                          className="flex items-center gap-3 p-3 rounded-xl bg-[#2b2d31] border border-[#3f4147] hover:border-[#5865f2] transition-colors shadow-sm"
                        >
                          <FileText className="w-6 h-6 text-[#5865f2]" />
                          <div className="truncate flex-1">
                            <div className="text-xs font-semibold text-white truncate">{msg.file.name}</div>
                            <div className="text-[10px] text-[#949ba4]">
                              {(msg.file.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                          </div>
                          <Download className="w-4 h-4 text-[#949ba4]" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Emoji Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {Object.entries(msg.reactions).map(([emoji, users]) => {
                        const hasReacted = users.includes(currentUser?.username);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs border transition-colors ${
                              hasReacted 
                                ? 'bg-[#5865f2]/20 border-[#5865f2] text-[#5865f2]' 
                                : 'bg-[#2b2d31] border-[#383a40] text-[#949ba4] hover:bg-[#35373c]'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[11px] font-bold">{users.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Reaction Toolbar */}
                <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 p-1 rounded-xl bg-[#313338] border border-[#3f4147] shadow-xl z-10">
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(msg.id, emoji)}
                      className="p-1 hover:bg-[#35373c] rounded text-xs transition-transform hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing notice */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-[#949ba4] italic flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5865f2]" />
          <span>{typingUsers.join(', ')} yazıyor...</span>
        </div>
      )}

      {/* Modern Message Input Area */}
      <div className="px-4 pb-4 pt-1">
        <form 
          onSubmit={handleSend}
          className="bg-[#383a40] rounded-xl px-4 py-2.5 flex items-center gap-3 border border-transparent focus-within:border-[#5865f2]/50 shadow-md transition-all relative"
        >
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-1 rounded-full bg-[#4e5058] hover:bg-[#5865f2] text-[#dbdee1] hover:text-white transition-colors shrink-0"
            title="Dosya Gönder (100MB Limitsiz)"
          >
            <PlusCircle className={`w-5 h-5 ${isUploading ? 'animate-spin' : ''}`} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`#${channel.name} kanalına mesaj gönder`}
            className="flex-1 bg-transparent text-white text-sm focus:outline-hidden placeholder-[#80848e]"
          />

          {/* Emoji toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-[#b5bac1] hover:text-[#f0b232] transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-11 right-0 bg-[#2b2d31] border border-[#3f4147] rounded-xl p-2 shadow-2xl flex gap-1 z-20">
                {['😀', '😂', '🔥', '❤️', '🎮', '🚀', '💀', '🎉', '👏', '👀'].map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setInputText(prev => prev + e);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1.5 hover:bg-[#35373c] rounded-lg text-base hover:scale-125 transition-transform"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 text-white bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-30 rounded-lg transition-transform hover:scale-105 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}