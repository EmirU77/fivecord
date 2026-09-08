import React, { useState } from 'react';
import { 
  Hash, Volume2, Monitor, MonitorOff, Video, VideoOff, 
  PhoneOff, ChevronDown, Plus, BadgeCheck, Wifi, SignalHigh, 
  Radio, Download
} from 'lucide-react';
import UserControlBar from './UserControlBar';

export default function Sidebar({
  channels,
  currentChannel,
  onSelectChannel,
  currentVoiceChannel,
  onJoinVoice,
  onLeaveVoice,
  members,
  currentUser,
  onUpdateProfile,
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
  isAppInstalled
}) {
  const [textCollapsed, setTextCollapsed] = useState(false);
  const [voiceCollapsed, setVoiceCollapsed] = useState(false);

  const textChannels = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0 select-none border-r border-[#1f2023] z-10 shadow-sm">
      {/* Sleek Discord Server Header */}
      <div 
        onClick={!isAppInstalled ? onOpenDownload : undefined}
        className={`h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shadow-xs ${!isAppInstalled ? 'hover:bg-[#35373c] cursor-pointer' : ''} transition-colors group`}
        title={!isAppInstalled ? "Masaüstü Uygulamasını İndir" : "Fivecord VIP"}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
            Fivecord VIP
            <BadgeCheck className="w-4 h-4 text-[#5865f2] inline fill-[#5865f2]/20" />
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {!isAppInstalled && (
            <span className="px-2 py-0.5 rounded bg-[#23a55a]/20 text-[#23a55a] group-hover:bg-[#23a55a] group-hover:text-white transition-all text-[11px] font-bold flex items-center gap-1">
              <Download className="w-3 h-3" />
              <span className="text-[10px]">İndir</span>
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-[#949ba4] group-hover:text-white transition-transform group-hover:translate-y-0.5" />
        </div>
      </div>

      {/* Channel List Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* METİN KANALLARI CATEGORY */}
        <div>
          <div 
            onClick={() => setTextCollapsed(!textCollapsed)}
            className="flex items-center justify-between px-1.5 mb-1 cursor-pointer group"
          >
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#949ba4] group-hover:text-[#dbdee1] transition-colors">
              <ChevronDown className={`w-3 h-3 transition-transform ${textCollapsed ? '-rotate-90' : ''}`} />
              <span>Metin Kanalları</span>
            </div>
            <Plus className="w-3.5 h-3.5 text-[#949ba4] opacity-0 group-hover:opacity-100 hover:text-white transition-opacity" />
          </div>

          {!textCollapsed && (
            <div className="space-y-0.5">
              {textChannels.map(ch => {
                const isActive = currentChannel?.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => onSelectChannel(ch)}
                    className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm transition-all group ${
                      isActive 
                        ? 'bg-[#35373c] text-white font-semibold shadow-xs' 
                        : 'text-[#949ba4] hover:bg-[#313338] hover:text-[#dbdee1]'
                    }`}
                  >
                    <Hash className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-[#80848e] group-hover:text-[#dbdee1]'}`} />
                    <span className="truncate">{ch.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SES ODALARI CATEGORY */}
        <div>
          <div 
            onClick={() => setVoiceCollapsed(!voiceCollapsed)}
            className="flex items-center justify-between px-1.5 mb-1 cursor-pointer group"
          >
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#949ba4] group-hover:text-[#dbdee1] transition-colors">
              <ChevronDown className={`w-3 h-3 transition-transform ${voiceCollapsed ? '-rotate-90' : ''}`} />
              <span>Ses Odaları</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#5865f2]/20 text-[#5865f2] font-mono font-bold">
              60 FPS
            </span>
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
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-all cursor-pointer group ${
                        isViewingThis 
                          ? 'bg-[#35373c] text-white font-semibold shadow-xs' 
                          : 'text-[#949ba4] hover:bg-[#313338] hover:text-[#dbdee1]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Volume2 className={`w-4 h-4 shrink-0 transition-colors ${isInThisVoice ? 'text-[#23a55a]' : 'text-[#80848e] group-hover:text-[#dbdee1]'}`} />
                        <span className="truncate">{ch.name}</span>
                      </div>

                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1f22] text-[#949ba4] font-mono">
                        {ch.bitrate}
                      </span>
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
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#23a55a]">
                <SignalHigh className="w-3.5 h-3.5 text-[#23a55a]" />
                <span>Ses Bağlandı (16ms)</span>
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
      />
    </div>
  );
}