import React, { useEffect, useRef, useState } from 'react';
import { 
  User, MessageSquare, Volume2, Shield, ShieldCheck, UserMinus, 
  Ban, MicOff, Mic, Tv, Check, ChevronRight, X, UserX, Trash2, AlertTriangle
} from 'lucide-react';
import { socket } from '../services/socket';
import { voiceRelay } from '../services/voiceRelay';
import { DEFAULT_ROLES } from '../App';

export default function UserContextMenu({
  x,
  y,
  targetMember,
  currentUser,
  roles = [],
  members = [],
  onClose,
  onOpenDM,
  onOpenProfile
}) {
  const menuRef = useRef(null);
  const [showRoleSubmenu, setShowRoleSubmenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // null | { type, title, description, confirmBtnText }
  const [actionReason, setActionReason] = useState('');
  const [userVolume, setUserVolume] = useState(() => {
    return Math.round((voiceRelay.getUserVolume(targetMember?.socketId) ?? 1.0) * 100);
  });
  const [streamVolume, setStreamVolume] = useState(() => {
    try {
      const saved = localStorage.getItem(`stream_vol_${targetMember?.socketId || targetMember?.id}`);
      return saved !== null ? Number(saved) : 100;
    } catch (e) {
      return 100;
    }
  });

  const activeRoles = Array.isArray(roles) && roles.length > 0 ? roles : DEFAULT_ROLES;

  const liveTarget = members?.find(m => 
    (targetMember?.id && m.id === targetMember.id) ||
    (targetMember?.username && m.username?.toLowerCase() === targetMember.username.toLowerCase())
  ) || targetMember;

  const [currentRoles, setCurrentRoles] = useState(() => {
    return Array.isArray(liveTarget?.roles) && liveTarget.roles.length > 0 
      ? liveTarget.roles 
      : ['role-member'];
  });

  useEffect(() => {
    if (liveTarget && Array.isArray(liveTarget.roles)) {
      setCurrentRoles(liveTarget.roles);
    }
  }, [liveTarget]);

  const isSelf = targetMember?.id === currentUser?.id || (currentUser?.username && targetMember?.username?.toLowerCase() === currentUser?.username?.toLowerCase());
  const isBot = targetMember?.isBot;

  // Permissions check: find current user in members list or fallback to currentUser.roles
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

  const hasAdminPerm = isFounder || activeRoles.some(r => 
    currentUserRoles.includes(r.id) && (
      r.permissions?.includes('admin') || 
      r.permissions?.includes('kick') || 
      r.permissions?.includes('ban') || 
      r.permissions?.includes('manage_roles')
    )
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust coordinates so menu doesn't go offscreen
  const menuWidth = 240;
  const menuHeight = 360;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);

  const handleMicVolumeChange = (newVal) => {
    setUserVolume(newVal);
    if (targetMember?.socketId) {
      const normalized = newVal / 100;
      voiceRelay.setUserVolume(targetMember.socketId, normalized);
      const audioEl = document.getElementById(`audio-${targetMember.socketId}`);
      if (audioEl) {
        audioEl.volume = Math.min(1.0, Math.max(0, normalized));
      }
    }
  };

  const handleStreamVolumeChange = (newVal) => {
    setStreamVolume(newVal);
    try {
      localStorage.setItem(`stream_vol_${targetMember?.socketId || targetMember?.id}`, newVal);
    } catch (e) {}
    if (targetMember?.socketId) {
      const streamEl = document.getElementById(`audio-screen-${targetMember.socketId}`);
      if (streamEl) {
        streamEl.volume = Math.min(1.0, Math.max(0, newVal / 100));
      }
    }
  };

  const handleToggleRole = (roleId) => {
    const hasRole = currentRoles.includes(roleId);
    let nextRoles;
    if (hasRole) {
      nextRoles = currentRoles.filter(id => id !== roleId);
      if (nextRoles.length === 0) nextRoles = ['role-member'];
    } else {
      nextRoles = [...currentRoles.filter(id => id !== 'role-member'), roleId];
    }
    setCurrentRoles(nextRoles);

    socket.emit('assign-role', {
      targetUserId: liveTarget?.id || targetMember?.id,
      targetUsername: liveTarget?.username || targetMember?.username,
      roleId,
      action: hasRole ? 'remove' : 'add'
    });
  };

  const handleStartKick = () => {
    setConfirmAction({
      type: 'kick',
      title: `${targetMember.username} Sunucudan Atılsın mı?`,
      description: 'Kullanıcı mevcut oturumundan çıkarılır. Davet linki ile sunucuya tekrar katılabilir.',
      confirmBtnText: 'Sunucudan At (Kick)'
    });
    setActionReason('Sunucu kurallarına uymama');
  };

  const handleStartBan = () => {
    setConfirmAction({
      type: 'ban',
      title: `${targetMember.username} Kalıcı Olarak Yasaklansın mı?`,
      description: 'Kullanıcının bağlantısı kesilir ve sunucuya tekrar girmesi kalıcı olarak engellenir.',
      confirmBtnText: 'Sunucudan Yasakla (Ban)'
    });
    setActionReason('Kural ihlali');
  };

  const handleStartRemove = () => {
    setConfirmAction({
      type: 'remove',
      title: `${targetMember.username} Kaydı Silinsin mi?`,
      description: 'Kullanıcının sunucu üyelik kaydı veritabanından kalıcı olarak silinir.',
      confirmBtnText: 'Kaydı Sil'
    });
    setActionReason('');
  };

  const handleExecuteAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'kick') {
      socket.emit('kick-member', {
        targetUserId: targetMember.id,
        targetUsername: targetMember.username,
        reason: actionReason.trim() || 'Sunucu kurallarına uymama'
      });
    } else if (confirmAction.type === 'ban') {
      socket.emit('ban-member', {
        targetUserId: targetMember.id,
        targetUsername: targetMember.username,
        reason: actionReason.trim() || 'Kural ihlali'
      });
    } else if (confirmAction.type === 'remove') {
      socket.emit('remove-member', {
        targetUserId: targetMember.id,
        targetUsername: targetMember.username
      });
    }
    onClose();
  };

  const handleServerMute = () => {
    const nextMute = !targetMember?.voiceState?.isMuted;
    socket.emit('server-mute-member', { targetUserId: targetMember.id, isMuted: nextMute });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-60 bg-[#111214] border border-[#2b2d31] rounded-xl shadow-2xl p-1.5 text-xs text-[#dbdee1] select-none animate-in fade-in zoom-in-95 duration-100 font-sans"
    >
      {/* Header Profile Summary */}
      <div className="flex items-center gap-2.5 p-2 bg-[#1e1f22] rounded-lg mb-1 border border-white/5">
        <img
          src={targetMember.avatar}
          alt={targetMember.username}
          className="w-8 h-8 rounded-full bg-black object-cover"
        />
        <div className="overflow-hidden flex-1">
          <div className="font-bold text-white truncate text-xs" style={{ color: targetMember.color || '#fff' }}>
            {targetMember.username}
          </div>
          <div className="text-[10px] text-[#949ba4] truncate">
            {targetMember.highestRole?.name || 'Üye'}
          </div>
        </div>
      </div>

      {confirmAction ? (
        <div className="p-2.5 bg-[#1e1f22] rounded-lg space-y-2.5 border border-white/5 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            {confirmAction.type === 'kick' && <UserMinus className="w-4 h-4 text-[#f23f43] shrink-0" />}
            {confirmAction.type === 'ban' && <Ban className="w-4 h-4 text-[#f23f43] shrink-0" />}
            {confirmAction.type === 'remove' && <UserX className="w-4 h-4 text-[#f23f43] shrink-0" />}
            <span className="truncate">{confirmAction.title}</span>
          </div>

          <p className="text-[11px] text-[#949ba4] leading-relaxed">
            {confirmAction.description}
          </p>

          {confirmAction.type !== 'remove' && (
            <div>
              <label className="text-[10px] font-bold uppercase text-[#b5bac1] block mb-1">
                Sebep:
              </label>
              <input
                type="text"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Sebep girin..."
                className="w-full bg-[#111214] border border-[#383a40] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-[#5865f2]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecuteAction();
                  if (e.key === 'Escape') setConfirmAction(null);
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#2b2d31]">
            <button
              onClick={() => setConfirmAction(null)}
              className="px-2.5 py-1.5 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              Vazgeç
            </button>
            <button
              onClick={handleExecuteAction}
              className="px-2.5 py-1.5 rounded-lg bg-[#da373c] hover:bg-[#f23f43] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
            >
              {confirmAction.confirmBtnText}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Direct Message & Profile */}
          {!isSelf && (
            <button
              onClick={() => {
                if (onOpenDM) onOpenDM(targetMember);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-[#5865f2] hover:text-white transition-colors cursor-pointer text-left"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Mesaj Gönder</span>
            </button>
          )}

          {/* Volume Controls (Separated Microphone vs System/Stream Audio) */}
          {!isSelf && !isBot && (
            <div className="p-2 my-1 bg-[#1e1f22]/70 rounded-lg space-y-2.5 border border-white/5">
              {/* Mic Volume */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1.5 text-[#949ba4] font-medium">
                    <Mic className="w-3.5 h-3.5 text-[#5865f2]" />
                    <span>Mikrofon Sesi</span>
                  </span>
                  <span className="font-mono font-bold text-white">{userVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={userVolume}
                  onChange={(e) => handleMicVolumeChange(Number(e.target.value))}
                  className="w-full accent-[#5865f2] h-1.5 bg-[#2b2d31] rounded-lg cursor-pointer"
                  title="Kullanıcı Mikrofon Sesi Seviyesi"
                />
              </div>

              {/* Stream / Game Audio Volume (if streaming) */}
              {targetMember.voiceState?.isScreenSharing && (
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="flex items-center gap-1.5 text-[#949ba4] font-medium">
                      <Tv className="w-3.5 h-3.5 text-[#23a55a]" />
                      <span>Sistem / Oyun Sesi</span>
                    </span>
                    <span className="font-mono font-bold text-[#23a55a]">{streamVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={streamVolume}
                    onChange={(e) => handleStreamVolumeChange(Number(e.target.value))}
                    className="w-full accent-[#23a55a] h-1.5 bg-[#2b2d31] rounded-lg cursor-pointer"
                    title="Ekran Yayını Oyun & Sistem Sesi Seviyesi"
                  />
                </div>
              )}
            </div>
          )}

          {/* Role Management (Admin/Mods) */}
          {hasAdminPerm && !isBot && (
            <div className="relative my-1">
              <button
                onClick={() => setShowRoleSubmenu(!showRoleSubmenu)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#35373c] transition-colors cursor-pointer text-left"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Roller</span>
                </span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showRoleSubmenu ? 'rotate-90' : ''}`} />
              </button>

              {showRoleSubmenu && (
                <div className="mt-1 p-1 bg-[#1e1f22] rounded-lg border border-[#383a40] space-y-1">
                  {activeRoles.map(r => {
                    const hasRole = currentRoles.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleToggleRole(r.id)}
                        className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#2b2d31] cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-1.5 truncate" style={{ color: r.color }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                          <span className="font-medium text-[11px]">{r.name}</span>
                        </span>
                        {hasRole && <Check className="w-3.5 h-3.5 text-[#23a55a]" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Server Mute */}
          {hasAdminPerm && targetMember?.voiceState?.channelId && !isSelf && (
            <button
              onClick={handleServerMute}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-[#35373c] text-amber-400 transition-colors cursor-pointer text-left"
            >
              {targetMember?.voiceState?.isMuted ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{targetMember?.voiceState?.isMuted ? 'Sunucu Susturmasını Kaldır' : 'Sunucuda Sustur'}</span>
            </button>
          )}

          {/* Moderation: Kick & Ban */}
          {hasAdminPerm && !isSelf && !isBot && (
            <div className="pt-1 mt-1 border-t border-[#2b2d31] space-y-0.5">
              <button
                onClick={handleStartKick}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#f23f43] hover:text-white text-[#f23f43] transition-colors cursor-pointer text-left font-medium"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Sunucudan At (Kick)</span>
              </button>
              <button
                onClick={handleStartBan}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#da373c] hover:text-white text-[#da373c] transition-colors cursor-pointer text-left font-medium"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Sunucudan Yasakla (Ban)</span>
              </button>
              <button
                onClick={handleStartRemove}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#c93b2b] hover:text-white text-[#f07167] transition-colors cursor-pointer text-left font-medium border-t border-white/5 mt-0.5"
                title="Kullanıcının sunucu üyelik kaydını kalıcı olarak siler"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Sunucudan Kaldır / Kaydı Sil</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
