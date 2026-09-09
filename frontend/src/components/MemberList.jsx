import React, { useState } from 'react';
import { 
  Crown, Gamepad2, Volume2, MicOff, Monitor, Sparkles, 
  MessageCircle, Zap, Shield, Radio, ShieldCheck, Settings
} from 'lucide-react';
import { AvatarDecorationRenderer, StatusDotRenderer, getNameEffectStyle } from './UserControlBar';
import { voiceRelay } from '../services/voiceRelay';

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

  const canManageRoles = isFounder || roles.some(r => 
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
  const sortedRoles = [...roles].sort((a, b) => a.position - b.position);
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
    <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0 select-none border-l border-[#1f2023] p-2.5 overflow-y-auto font-sans">
      {/* Top Header with Role Manager Button for Admins */}
      {canManageRoles && onOpenRoleManager && (
        <button
          onClick={onOpenRoleManager}
          className="mb-2 w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#1e1f22] hover:bg-[#35373c] text-xs font-bold text-[#dbdee1] border border-white/5 cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-1.5 text-amber-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Rolleri Yönet</span>
          </span>
          <Settings className="w-3.5 h-3.5 text-[#949ba4]" />
        </button>
      )}

      {/* Member Category Groups */}
      <div className="space-y-4">
        {groups.map(group => (
          <div key={group.id} className="space-y-1">
            {/* Category Header */}
            <div className="flex items-center justify-between px-2 py-0.5">
              <span 
                className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: group.color || '#949ba4' }}
              >
                <span>{group.name}</span>
                <span className="opacity-70">— {group.count}</span>
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
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#35373c] cursor-pointer transition-all duration-150 group border border-transparent hover:border-[#383a40] ${
                      isOffline ? 'opacity-50 hover:opacity-100' : ''
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
                        className={`w-8 h-8 rounded-full bg-[#1e1f22] object-cover border transition-all ${
                          isSpeaking ? 'border-[#23a55a] scale-105 shadow-md shadow-[#23a55a]/40' : 'border-[#383a40]'
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
                        {isCurrent && <span className="text-[9px] text-[#949ba4] font-normal shrink-0">(Sen)</span>}
                        {member.isBot && (
                          <span className="text-[9px] bg-[#5865f2] text-white px-1 py-0.2 rounded font-bold shrink-0">
                            BOT
                          </span>
                        )}
                      </div>

                      {/* Status / Activity or Live stream badge */}
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#949ba4] truncate">
                        {isStreaming ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[#f23f43] bg-[#f23f43]/15 px-1.5 py-0.2 rounded">
                            <Radio className="w-2.5 h-2.5 animate-pulse" />
                            <span>YAYINDA</span>
                          </span>
                        ) : member.gameActivity ? (
                          <span className="flex items-center gap-1 truncate text-[10px] text-[#23a55a]">
                            <Gamepad2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{member.gameActivity}</span>
                          </span>
                        ) : member.customStatus ? (
                          <span className="truncate text-[10px] text-[#949ba4]">
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