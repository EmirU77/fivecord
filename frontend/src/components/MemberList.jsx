import React, { useState } from 'react';
import { Crown, Gamepad2, Volume2, MicOff, Monitor, Sparkles, MessageCircle, Zap } from 'lucide-react';
import { AvatarDecorationRenderer, StatusDotRenderer, getNameEffectStyle } from './UserControlBar';

const DEFAULT_VIP_ROLES = [
  { role: '👑 KURUCU', color: '#f0b232', bg: 'rgba(240,178,50,0.15)', border: 'rgba(240,178,50,0.3)' },
  { role: '⚡ VIP PRO', color: '#5865f2', bg: 'rgba(88,101,242,0.15)', border: 'rgba(88,101,242,0.3)' },
  { role: '🎮 GAMER', color: '#23a55a', bg: 'rgba(35,165,90,0.15)', border: 'rgba(35,165,90,0.3)' },
  { role: '💎 VIP ÜYE', color: '#eb459e', bg: 'rgba(235,69,158,0.15)', border: 'rgba(235,69,158,0.3)' },
  { role: '⭐ VIP ÜYE', color: '#00b0f4', bg: 'rgba(0,176,244,0.15)', border: 'rgba(0,176,244,0.3)' }
];

export default function MemberList({ members, currentUser, onOpenDM }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [userVolumes, setUserVolumes] = useState({});

  const humanMembers = members.filter(m => !m.isBot);
  const botMembers = members.filter(m => m.isBot);

  const handleVolumeChange = (socketId, vol) => {
    setUserVolumes(prev => ({ ...prev, [socketId]: vol }));
    const safeVol = Math.min(1.0, Math.max(0, vol > 1 ? 1.0 : vol));
    const audioEl = document.getElementById(`audio-${socketId}`);
    if (audioEl) {
      audioEl.volume = safeVol;
    }
    const screenAudioEl = document.getElementById(`audio-screen-${socketId}`);
    if (screenAudioEl) {
      screenAudioEl.volume = safeVol;
    }
  };

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0 select-none border-l border-[#1f2023] p-3 overflow-y-auto">
      {/* Human Members Category header */}
      <div className="flex items-center justify-between px-2 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>VIP Ekip — {humanMembers.length}/5</span>
        </span>
        <span className="text-[10px] font-mono text-[#23a55a] font-bold">ONLINE</span>
      </div>

      <div className="space-y-1.5">
        {humanMembers.map((member, idx) => {
          const roleInfo = DEFAULT_VIP_ROLES[idx] || DEFAULT_VIP_ROLES[0];
          const isCurrent = member.id === currentUser?.id;
          const isSpeaking = member.voiceState?.isSpeaking;
          const volume = userVolumes[member.socketId] ?? 1.0;

          return (
            <div key={member.socketId || idx} className="space-y-1">
              <div
                onClick={() => setSelectedMember(selectedMember === member.socketId ? null : member.socketId)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#35373c] cursor-pointer transition-all duration-150 group border border-transparent hover:border-[#383a40]"
              >
                {/* Avatar with Decoration & Status */}
                <div className="relative shrink-0 w-9 h-9">
                  <img
                    src={member.avatar}
                    alt={member.username}
                    className={`w-9 h-9 rounded-full bg-[#1e1f22] object-cover border-2 transition-all ${
                      isSpeaking ? 'speaking-indicator border-[#23a55a] scale-105' : 'border-[#383a40]'
                    }`}
                  />
                  <AvatarDecorationRenderer decoration={member.avatarDecoration} size="sm" />
                  <StatusDotRenderer status={member.status || 'online'} className="w-3.5 h-3.5" />
                </div>

                {/* Info */}
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="text-xs font-bold truncate group-hover:underline"
                      style={getNameEffectStyle(member.nameEffect, member.color || roleInfo.color)}
                    >
                      {member.username}
                    </span>
                    {member.badges?.includes('owner') && <span className="text-[10px]">👑</span>}
                    {isCurrent && <span className="text-[9px] text-[#949ba4] font-normal">(Sen)</span>}
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span 
                      className="text-[9px] px-1.5 py-0.2 rounded font-semibold border"
                      style={{ 
                        color: roleInfo.color, 
                        backgroundColor: roleInfo.bg,
                        borderColor: roleInfo.border
                      }}
                    >
                      {roleInfo.role}
                    </span>
                  </div>

                  <div className="text-[10px] text-[#949ba4] truncate mt-0.5 flex items-center gap-1">
                    {member.statusEmoji && <span>{member.statusEmoji}</span>}
                    <span>{member.customStatus || 'Çevrimiçi'}</span>
                  </div>

                  {/* DISCORD RICH PRESENCE GAMING BADGE */}
                  {member.activity && (
                    <div className="mt-1 px-2 py-0.5 rounded-md bg-[#23a55a]/15 border border-[#23a55a]/30 flex items-center gap-1.5 shadow-xs">
                      <span className="text-xs shrink-0 animate-pulse">{member.activityIcon || '🎮'}</span>
                      <div className="truncate min-w-0">
                        <span className="text-[10px] font-black text-[#23a55a] truncate block leading-tight">
                          {member.activity}
                        </span>
                        {member.activityDetail && (
                          <span className="text-[8px] text-[#b5bac1] font-medium truncate block leading-tight">
                            {member.activityDetail}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* State badges */}
                <div className="flex items-center gap-1 text-[#949ba4] shrink-0">
                  {member.voiceState?.isScreenSharing && (
                    <span className="p-1 rounded-md bg-[#5865f2] text-white shadow-xs" title="Ekran Paylaşıyor">
                      <Monitor className="w-3 h-3" />
                    </span>
                  )}
                  {member.voiceState?.isMuted && (
                    <span className="p-1 rounded-md bg-[#f23f43]/15 text-[#f23f43]">
                      <MicOff className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>

              {/* Expandable options when clicked */}
              {selectedMember === member.socketId && !isCurrent && (
                <div className="bg-[#1e1f22] p-2.5 rounded-xl mx-1 text-xs space-y-2.5 animate-in fade-in border border-[#383a40] shadow-md">
                  {/* Mini Banner / Bio if present */}
                  {member.banner && (
                    <div 
                      className="h-12 w-full rounded-lg overflow-hidden bg-cover bg-center border border-white/10"
                      style={{ backgroundImage: `url(${member.banner})` }}
                    />
                  )}

                  {/* GAMING ACTIVITY (RICH PRESENCE) */}
                  {member.activity && (
                    <div className="bg-[#23a55a]/10 border border-[#23a55a]/30 p-2.5 rounded-xl space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#23a55a] flex items-center gap-1">
                        <span>{member.activityIcon || '🎮'}</span>
                        <span>OYNUYOR (CANLI)</span>
                      </span>
                      <div className="text-xs font-black text-white truncate">
                        {member.activity}
                      </div>
                      {member.activityDetail && (
                        <div className="text-[10px] text-[#dbdee1] font-medium truncate">
                          {member.activityDetail}
                        </div>
                      )}
                      <div className="text-[9px] text-[#949ba4] font-mono">
                        {member.activityStartTime 
                          ? `⏱️ ${Math.max(1, Math.floor((Date.now() - member.activityStartTime) / 60000))} dakikadır oynuyor`
                          : '⏱️ Az önce başladı'}
                      </div>
                    </div>
                  )}

                  {member.bio && (
                    <div className="bg-[#111214]/60 p-2 rounded-lg border border-[#2b2d31]">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#949ba4] block mb-0.5">HAKKIMDA</span>
                      <p className="text-[11px] text-[#dbdee1] break-words whitespace-pre-wrap leading-relaxed">{member.bio}</p>
                    </div>
                  )}

                  {/* SEND DM BUTTON */}
                  <button
                    onClick={() => onOpenDM(member)}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Özel Mesaj Gönder</span>
                  </button>

                  {/* Volume Slider */}
                  <div className="space-y-1 pt-1 border-t border-[#2b2d31]">
                    <div className="flex items-center justify-between text-[#949ba4] text-[10px] font-semibold">
                      <span className="flex items-center gap-1 text-white">
                        <Volume2 className="w-3 h-3 text-[#5865f2]" /> Ses Seviyesi
                      </span>
                      <span className="text-white font-mono">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={volume}
                      onChange={(e) => handleVolumeChange(member.socketId, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#2b2d31] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty slots for 5 people (Never blocked by bots) */}
        {Array.from({ length: Math.max(0, 5 - humanMembers.length) }).map((_, i) => (
          <div 
            key={'empty-' + i} 
            className="flex items-center gap-3 p-2 rounded-xl border border-dashed border-[#3f4147] opacity-40 hover:opacity-75 transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-[#1e1f22] border border-dashed border-[#4e5058] flex items-center justify-center text-xs font-bold text-[#949ba4]">
              {humanMembers.length + i + 1}
            </div>
            <div className="text-xs text-[#949ba4]">
              <div className="font-semibold text-[#80848e]">Boş VIP Slot</div>
              <div className="text-[10px] text-[#6b6f7b]">{humanMembers.length + i + 1}. Arkadaşını Bekliyor</div>
            </div>
          </div>
        ))}

        {/* Dedicated BOT SECTION (Doesn't count towards human limit) */}
        {botMembers.length > 0 && (
          <div className="pt-3 mt-3 border-t border-[#383a40]/60 space-y-2">
            <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#949ba4] flex items-center justify-between">
              <span>BOTLAR — {botMembers.length}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#5865f2]/20 text-[#5865f2] font-semibold">MÜZİK</span>
            </div>

            {botMembers.map((bot) => (
              <div
                key={bot.id}
                className="flex items-center gap-3 p-2 rounded-xl bg-[#232428]/60 border border-[#383a40] hover:border-[#5865f2]/50 transition-all group"
              >
                <div className="relative shrink-0">
                  <img
                    src={bot.avatar}
                    alt={bot.username}
                    className={`w-9 h-9 rounded-full object-cover border-2 transition-all ${
                      bot.voiceState?.isSpeaking ? 'speaking-indicator border-[#5865f2] animate-pulse' : 'border-[#383a40]'
                    }`}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#5865f2] border-2 border-[#2b2d31] flex items-center justify-center text-[7px] text-white font-bold">
                    ✓
                  </div>
                </div>

                <div className="overflow-hidden flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold truncate text-[#5865f2]">
                      {bot.username}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#5865f2] text-white font-black tracking-wider">
                      BOT
                    </span>
                  </div>
                  <div className="text-[10px] text-[#949ba4] truncate mt-0.5">
                    {bot.customStatus || '🎵 7/24 Müzik Botu'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}