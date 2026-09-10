import React, { useState } from 'react';
import { 
  Crown, Gamepad2, Volume2, MicOff, Monitor, Sparkles, 
  MessageCircle, Zap, Shield, Radio, ShieldCheck, Settings
} from 'lucide-react';
import { AvatarDecorationRenderer, StatusDotRenderer, getNameEffectStyle } from './UserControlBar';
import { voiceRelay } from '../services/voiceRelay';
import { DEFAULT_ROLES } from '../App';

export default function MemberList({ 
  members = [], 
  currentUser, 
  roles = [], 
  onOpenDM, 
  onContextMenu,
  onOpenRoleManager 
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [userVolumes, setUserVolumes] = useState({});

  const activeRoles = Array.isArray(roles) && roles.length > 0 ? roles : DEFAULT_ROLES;

  const myMemberObj = members?.find(m => 
    (currentUser?.id && m.id === currentUser.id) || 
    (currentUser?.username && m.username?.toLowerCase() === currentUser.username.toLowerCase())
  );
  const currentUserRoles = (myMemberObj?.roles && myMemberObj.roles.length > 0) 
    ? myMemberObj.roles 
    : (currentUser?.roles || []);

  const isFounder = 
    currentUser?.id === 'user-emir' ||
    currentUser?.username?.toLowerCase() === 'emir' ||
    currentUserRoles.includes('role-founder') ||
    myMemberObj?.highestRole?.id === 'role-founder';

  const canManageRoles = isFounder || activeRoles.some(r => 
    currentUserRoles.includes(r.id) && (r.permissions?.includes('admin') || r.permissions?.includes('manage_roles'))
  );

  // Group members into categories:
  // 1. Roles with hoist: true (Kurucu, Moderatör, VIP, etc.)
  // 2. Çevrimiçi (Online users without a hoisted role)
  // 3. Çevrimdışı (Offline users)
  // 4. Botlar (DJ Bot etc.)

  const onlineMembers = members.filter(m => !m.isBot && m.isOnline);
  const offlineMembers = members.filter(m => !m.isBot && !m.isOnline);
  const botMembers = members.filter(m => m.isBot);

  // Build role groups from sorted roles
  const sortedRoles = [...activeRoles].sort((a, b) => a.position - b.position);
  const hoistedRoles = sortedRoles.filter(r => r.hoist);

  const groups = [];
  const placedMemberIds = new Set();

  // Hoisted role groups
  hoistedRoles.forEach(role => {
    const roleMembers = onlineMembers.filter(m => {
      if (placedMemberIds.has(m.id)) return false;
      const mRoles = Array.isArray(m.roles) ? m.roles : [];
      return mRoles.includes(role.id);
    });

    if (roleMembers.length > 0) {
      groups.push({
        id: role.id,
        name: role.name,
        color: role.color,
        count: roleMembers.length,
        members: roleMembers
      });
      roleMembers.forEach(m => placedMemberIds.add(m.id));
    }
  });

  // Remaining online members
  const unplacedOnline = onlineMembers.filter(m => !placedMemberIds.has(m.id));
  if (unplacedOnline.length > 0) {
    groups.push({
      id: 'online',
      name: 'Çevrimiçi',
      color: '#23a55a',
      count: unplacedOnline.length,
      members: unplacedOnline
    });
  }

  // Bots group
  if (botMembers.length > 0) {
    groups.push({
      id: 'bots',
      name: 'Botlar',
      color: '#5865f2',
      count: botMembers.length,
      members: botMembers
    });
  }

  // Offline members group
  if (offlineMembers.length > 0) {
    groups.push({
      id: 'offline',
      name: 'Çevrimdışı',
      color: '#949ba4',
      count: offlineMembers.length,
      members: offlineMembers
    });
  }

  return (
    <div className="w-60 bg-[#0f1322]/90 backdrop-blur-2xl flex flex-col shrink-0 select-none border-l border-white/5 p-3 overflow-y-auto font-sans custom-scrollbar">
      {/* Top Header with Role Manager Button for Admins */}
      {canManageRoles && onOpenRoleManager && (
        <button
          onClick={onOpenRoleManager}
          className="mb-3 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-[#e2e8f0] border border-white/10 cursor-pointer transition-all shadow-sm hover:scale-[1.02]"
        >
          <span className="flex items-center gap-1.5 text-amber-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Rolleri Yönet</span>
          </span>
          <Settings className="w-3.5 h-3.5 text-[#94a3b8]" />
        </button>
      )}

      {/* Member Category Groups */}
      <div className="space-y-4">
        {groups.map(group => (
          <div key={group.id} className="space-y-1">
            {/* Category Header */}
            <div className="flex items-center justify-between px-2 py-0.5">
              <span 
                className="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5"
                style={{ color: group.color || '#94a3b8' }}
              >
                <span>{group.name}</span>
                <span className="opacity-70 font-mono">— {group.count}</span>
              </span>
            </div>

            {/* Members in group */}
            <div className="space-y-0.5">
              {group.members.map(member => {
                const isCurrent = member.id === currentUser?.id;
                const isSpeaking = member.voiceState?.isSpeaking;
                const isStreaming = member.voiceState?.isScreenSharing;
                const isOffline = !member.isOnline && !member.isBot;

                return (
                  <div
                    key={member.id || member.socketId}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (onContextMenu) {
                        onContextMenu(e, member);
                      }
                    }}
                    onClick={() => {
                      if (!isCurrent && onOpenDM) {
                        onOpenDM(member);
                      }
                    }}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-all duration-150 group border border-transparent hover:border-white/5 ${
                      isOffline ? 'opacity-40 hover:opacity-100' : ''
                    }`}
                    title={isOffline ? `${member.username} (Çevrimdışı)` : `${member.username} (Sağ tıkla seçenekler)`}
                  >
                    {/* Avatar with Decoration & Status Dot */}
                    <div className="relative shrink-0 w-8 h-8">
                      <img
                        src={member.avatar}
                        alt={member.username}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.username || 'user')}`;
                        }}
                        className={`w-8 h-8 rounded-full bg-[#141829] object-cover border transition-all ${
                          isSpeaking ? 'border-emerald-400 scale-105 shadow-[0_0_10px_rgba(16,185,129,0.7)]' : 'border-white/10 group-hover:border-indigo-500/40'
                        }`}
                      />
                      <AvatarDecorationRenderer decoration={member.avatarDecoration} size="sm" />
                      <StatusDotRenderer status={member.isOnline ? (member.status || 'online') : 'offline'} className="w-3 h-3" />
                    </div>

                    {/* Member Details */}
                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 leading-tight">
                        <span 
                          className="text-xs font-bold truncate group-hover:underline"
                          style={getNameEffectStyle(member.nameEffect, member.color || member.highestRole?.color)}
                        >
                          {member.username}
                        </span>

                        {member.badges?.includes('owner') && <span className="text-[10px]">👑</span>}
                        {isCurrent && <span className="text-[9px] text-[#64748b] font-normal shrink-0">(Sen)</span>}
                        {member.isBot && (
                          <span className="text-[9px] bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-1.5 py-0.2 rounded font-black shrink-0 tracking-wider shadow-[0_0_6px_rgba(99,102,241,0.5)]">
                            BOT
                          </span>
                        )}
                      </div>

                      {/* Status / Activity or Live stream badge */}
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#64748b] truncate">
                        {isStreaming ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.2 rounded-md">
                            <Radio className="w-2.5 h-2.5 animate-pulse" />
                            <span>YAYINDA</span>
                          </span>
                        ) : member.gameActivity ? (
                          <span className="flex items-center gap-1 truncate text-[10px] text-emerald-400 font-medium">
                            <Gamepad2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{member.gameActivity}</span>
                          </span>
                        ) : member.customStatus ? (
                          <span className="truncate text-[10px] text-[#64748b]">
                            {member.statusEmoji} {member.customStatus}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}