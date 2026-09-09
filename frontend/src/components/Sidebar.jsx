import React, { useState, useEffect, useRef } from 'react';
import { 
  Hash, Volume2, Monitor, MonitorOff, Video, VideoOff, 
  PhoneOff, ChevronDown, Plus, BadgeCheck, Wifi, SignalHigh, 
  Radio, Download, Trash2, Edit3, Copy, Check, Info, Settings, MoreVertical, RotateCw
} from 'lucide-react';
import UserControlBar from './UserControlBar';

export default function Sidebar({
  channels,
  currentChannel,
  onSelectChannel,
  currentVoiceChannel,
  onJoinVoice,
  onLeaveVoice,
  onReconnectVoice,
  members,
  currentUser,
  onUpdateProfile,
  onLogout,
  onOpenLogin,
  isMuted,
  setIsMuted,
  isDeafened,
  setIsDeafened,
  isScreenSharing,
  onOpenScreenModal,
  onStopScreenShare,
  isCameraOn,
  onToggleCamera,
  onOpenDownload,
  isAppInstalled,
  onOpenCreateChannel,
  onRequestDeleteChannel,
  onRequestRenameChannel,
  onOpenInfo
}) {
  const [textCollapsed, setTextCollapsed] = useState(false);
  const [voiceCollapsed, setVoiceCollapsed] = useState(false);

  // Right-click Context Menu & Modals
  const [contextMenu, setContextMenu] = useState(null); // { x, y, channel }
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const textChannels = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  // Close context menu & dropdown on outside click or escape
  useEffect(() => {
    const handleOutside = () => {
      setContextMenu(null);
      setIsServerMenuOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setIsServerMenuOpen(false);
      }
    };
    window.addEventListener('click', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleChannelContextMenu = (e, ch) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 220;
    const menuHeight = 220;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    setContextMenu({ x, y, channel: ch });
  };

  const handleCopyLink = (ch) => {
    try {
      const url = `${window.location.origin}/#${ch.name}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch (e) {}
    setContextMenu(null);
  };

  const handleStartRename = (ch) => {
    onRequestRenameChannel?.(ch);
    setContextMenu(null);
  };

  const handleStartDelete = (ch) => {
    onRequestDeleteChannel?.(ch);
    setContextMenu(null);
  };

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0 select-none border-r border-[#1f2023] z-10 shadow-sm relative">
      {/* Sleek Discord Server Header with Dropdown */}
      <div className="relative">
        <div 
          onClick={() => setIsServerMenuOpen(prev => !prev)}
          className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shadow-xs hover:bg-[#35373c]/60 cursor-pointer transition-colors group"
          title="Fivecord VIP Sunucu Menüsü"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
              Fivecord VIP
              <BadgeCheck className="w-4 h-4 text-[#5865f2] inline fill-[#5865f2]/20" />
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ChevronDown className={`w-4 h-4 text-[#949ba4] group-hover:text-white transition-transform ${isServerMenuOpen ? 'rotate-180 text-white' : 'group-hover:translate-y-0.5'}`} />
          </div>
        </div>

        {/* Server Dropdown Menu */}
        {isServerMenuOpen && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute top-13 left-2 right-2 z-40 rounded-xl bg-[#111214] border border-[#232428] shadow-2xl p-1.5 text-xs text-[#dbdee1] animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <button
              onClick={() => {
                setIsServerMenuOpen(false);
                onOpenCreateChannel?.('text');
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#5865f2] hover:text-white transition-colors cursor-pointer group"
            >
              <span className="font-semibold">Kanal Oluştur</span>
              <Plus className="w-4 h-4 text-[#949ba4] group-hover:text-white" />
            </button>

            <button
              onClick={() => {
                setIsServerMenuOpen(false);
                onOpenInfo?.();
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#5865f2] hover:text-white transition-colors cursor-pointer group"
            >
              <span>Sunucu Bilgileri</span>
              <Info className="w-4 h-4 text-[#949ba4] group-hover:text-white" />
            </button>

            <div className="h-[1px] bg-[#232428] my-1" />
            <button
              onClick={() => {
                setIsServerMenuOpen(false);
                onOpenLogin?.();
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#5865f2] hover:text-white transition-colors cursor-pointer text-[#5865f2] font-semibold"
            >
              <span>Hesap Değiştir / Giriş Yap</span>
              <LogIn className="w-4 h-4" />
            </button>

            {!isAppInstalled && (
              <>
                <div className="h-[1px] bg-[#232428] my-1" />
                <button
                  onClick={() => {
                    setIsServerMenuOpen(false);
                    onOpenDownload?.();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#23a55a] hover:text-white transition-colors cursor-pointer text-[#23a55a] font-semibold"
                >
                  <span>Masaüstü Uygulamasını İndir</span>
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Channel List Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* METİN KANALLARI CATEGORY */}
        <div>
          <div className="flex items-center justify-between px-1.5 mb-1 group">
            <div 
              onClick={() => setTextCollapsed(!textCollapsed)}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#949ba4] group-hover:text-[#dbdee1] transition-colors cursor-pointer"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${textCollapsed ? '-rotate-90' : ''}`} />
              <span>Metin Kanalları</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreateChannel?.('text');
              }}
              className="p-1 rounded-md text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-all cursor-pointer"
              title="Metin Kanalı Oluştur"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {!textCollapsed && (
            <div className="space-y-0.5">
              {textChannels.map(ch => {
                const isActive = currentChannel?.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => onSelectChannel(ch)}
                    onContextMenu={(e) => handleChannelContextMenu(e, ch)}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-sm transition-all group cursor-pointer ${
                      isActive 
                        ? 'bg-[#35373c] text-white font-semibold shadow-xs' 
                        : 'text-[#949ba4] hover:bg-[#313338] hover:text-[#dbdee1]'
                    }`}
                    title="Sol tıkla: Kanala gir | Sağ tıkla: Kanal ayarları ve Silme"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Hash className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-[#80848e] group-hover:text-[#dbdee1]'}`} />
                      <span className="truncate">{ch.name}</span>
                    </div>

                    <button
                      onClick={(e) => handleChannelContextMenu(e, ch)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#2b2d31] text-[#949ba4] hover:text-white transition-opacity shrink-0"
                      title="Kanal Seçenekleri (Sağ Tık)"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SES ODALARI CATEGORY */}
        <div>
          <div className="flex items-center justify-between px-1.5 mb-1 group">
            <div 
              onClick={() => setVoiceCollapsed(!voiceCollapsed)}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#949ba4] group-hover:text-[#dbdee1] transition-colors cursor-pointer"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${voiceCollapsed ? '-rotate-90' : ''}`} />
              <span>Ses Odaları</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#5865f2]/20 text-[#5865f2] font-mono font-bold">
                60 FPS
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCreateChannel?.('voice');
                }}
                className="p-1 rounded-md text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-all cursor-pointer"
                title="Ses Odası Oluştur"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!voiceCollapsed && (
            <div className="space-y-0.5">
              {voiceChannels.map(ch => {
                const isInThisVoice = currentVoiceChannel?.id === ch.id;
                const isViewingThis = currentChannel?.id === ch.id;
                const channelMembers = members.filter(m => m.voiceState?.channelId === ch.id);

                return (
                  <div key={ch.id} className="space-y-1">
                    <div
                      onClick={() => {
                        onSelectChannel(ch);
                        if (currentVoiceChannel?.id !== ch.id) {
                          onJoinVoice(ch);
                        }
                      }}
                      onContextMenu={(e) => handleChannelContextMenu(e, ch)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-all cursor-pointer group ${
                        isViewingThis 
                          ? 'bg-[#35373c] text-white font-semibold shadow-xs' 
                          : 'text-[#949ba4] hover:bg-[#313338] hover:text-[#dbdee1]'
                      }`}
                      title="Sol tıkla: Odaya katıl | Sağ tıkla: Oda ayarları ve Silme"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Volume2 className={`w-4 h-4 shrink-0 transition-colors ${isInThisVoice ? 'text-[#23a55a]' : 'text-[#80848e] group-hover:text-[#dbdee1]'}`} />
                        <span className="truncate">{ch.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1f22] text-[#949ba4] font-mono">
                          {ch.bitrate}
                        </span>
                        <button
                          onClick={(e) => handleChannelContextMenu(e, ch)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#2b2d31] text-[#949ba4] hover:text-white transition-opacity"
                          title="Oda Seçenekleri (Sağ Tık)"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Users connected inside this channel */}
                    {channelMembers.length > 0 && (
                      <div className="pl-6 pr-2 py-0.5 space-y-1">
                        {channelMembers.map(m => (
                          <div key={m.socketId} className="flex items-center justify-between text-xs py-0.5 px-1.5 rounded hover:bg-[#313338] transition-colors">
                            <div className="flex items-center gap-2 truncate">
                              <div className="relative">
                                <img 
                                  src={m.avatar} 
                                  alt={m.username}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.username || 'user')}`;
                                  }}
                                  className={`w-5 h-5 rounded-full object-cover border ${
                                    m.voiceState?.isSpeaking 
                                      ? 'speaking-indicator border-[#23a55a]' 
                                      : 'border-transparent'
                                  }`}
                                />
                              </div>
                              <span className={`truncate text-xs ${m.voiceState?.isSpeaking ? 'text-[#23a55a] font-bold' : 'text-[#b5bac1]'}`}>
                                {m.username}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 text-[#949ba4]">
                              {m.voiceState?.isScreenSharing && (
                                <span className="flex items-center gap-0.5 text-[9px] bg-[#5865f2] text-white px-1.5 py-0.2 rounded font-bold animate-pulse shadow-xs">
                                  <Monitor className="w-2.5 h-2.5" /> CANLI
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DISCORD FLOATING RIGHT-CLICK CONTEXT MENU */}
      {contextMenu && (
        <div 
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-52 rounded-xl bg-[#111214] border border-[#232428] shadow-2xl p-1.5 text-xs text-[#dbdee1] animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-bold text-[#949ba4] truncate border-b border-[#232428] mb-1 flex items-center gap-1.5">
            {contextMenu.channel.type === 'text' ? (
              <Hash className="w-3.5 h-3.5 text-[#80848e] shrink-0" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#23a55a] shrink-0" />
            )}
            <span className="truncate">{contextMenu.channel.name}</span>
          </div>

          <button
            onClick={() => handleCopyLink(contextMenu.channel)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#5865f2] hover:text-white transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-[#949ba4] group-hover:text-white" />
              <span>Bağlantıyı Kopyala</span>
            </div>
            {copiedLink && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            onClick={() => handleStartRename(contextMenu.channel)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#5865f2] hover:text-white transition-colors cursor-pointer text-left group"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#949ba4] group-hover:text-white" />
            <span>Kanalı Yeniden Adlandır</span>
          </button>

          <div className="h-[1px] bg-[#232428] my-1" />

          {contextMenu.channel.id === 'text-genel' ? (
            <div className="px-2.5 py-1.5 text-[10px] text-[#80848e] italic">
              🔒 Ana genel sohbet silinemez
            </div>
          ) : (
            <button
              onClick={() => handleStartDelete(contextMenu.channel)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#f23f43] hover:bg-[#da373c] hover:text-white transition-colors cursor-pointer font-semibold text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kanalı Sil</span>
            </button>
          )}
        </div>
      )}


      {/* DISCORD VOICE CONNECTION STATUS PANEL */}
      {currentVoiceChannel && (
        <div className="bg-[#1f2023] border-t border-[#2b2d31] p-2.5 space-y-2">
          {/* Status Row */}
          <div className="flex items-center justify-between px-1">
            <div 
              onClick={() => onSelectChannel(currentVoiceChannel)}
              className="cursor-pointer group flex-1 truncate"
              title="Yayın Sahnesini / Odayı Aç"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#23a55a]">
                  <SignalHigh className="w-3.5 h-3.5 text-[#23a55a]" />
                  <span>Ses Bağlandı (P2P / HQ)</span>
                </div>
                {onReconnectVoice && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onReconnectVoice(); }}
                    className="p-1 rounded hover:bg-[#35373c] text-[#949ba4] hover:text-white transition-colors cursor-pointer"
                    title="Sesi Yeniden Başlat / Yenile"
                  >
                    <RotateCw className="w-3 h-3 hover:rotate-180 transition-transform" />
                  </button>
                )}
              </div>
              <div className="text-[11px] text-[#949ba4] truncate group-hover:text-white transition-colors">
                {currentVoiceChannel.name}
              </div>
            </div>

            <button
              onClick={onLeaveVoice}
              title="Bağlantıyı Kes"
              className="p-1.5 rounded-lg bg-[#f23f43]/15 hover:bg-[#f23f43] text-[#f23f43] hover:text-white transition-colors ml-2 shadow-xs"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Buttons: Camera & Screen */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2b2d31]/50">
            <button
              onClick={onToggleCamera}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                isCameraOn 
                  ? 'bg-[#23a55a] text-white shadow-xs' 
                  : 'bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1]'
              }`}
            >
              {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              <span>Kamera</span>
            </button>

            <button
              onClick={isScreenSharing ? onStopScreenShare : onOpenScreenModal}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                isScreenSharing 
                  ? 'bg-[#f23f43] text-white animate-pulse shadow-md' 
                  : 'bg-[#5865f2] hover:bg-[#4752c4] text-white shadow-sm hover:scale-[1.02]'
              }`}
            >
              {isScreenSharing ? <MonitorOff className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
              <span>{isScreenSharing ? 'Durdur' : 'Ekran'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Download Desktop Banner (Only shown if not running in desktop app and not downloaded) */}
      {!isAppInstalled && (
        <div className="px-3 py-2 border-t border-[#1f2023] bg-[#232428]/80">
          <button
            onClick={onOpenDownload}
            className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#23a55a] to-[#1f934f] hover:from-[#1f934f] hover:to-[#1a7f44] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 group hover:scale-[1.02]"
          >
            <Download className="w-4 h-4 text-white group-hover:animate-bounce" />
            <span>Masaüstü Uygulaması İndir</span>
          </button>
        </div>
      )}

      {/* User Profile Bar at bottom */}
      <UserControlBar
        currentUser={currentUser}
        onUpdateProfile={onUpdateProfile}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        isDeafened={isDeafened}
        setIsDeafened={setIsDeafened}
        onLogout={onLogout}
        onOpenLogin={onOpenLogin}
      />
    </div>
  );
}