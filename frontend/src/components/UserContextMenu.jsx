import React, { useEffect, useRef, useState } from 'react';
import { 
  User, MessageSquare, Volume2, Shield, ShieldCheck, UserMinus, 
  Ban, MicOff, Mic, Tv, Check, ChevronRight, X, UserX, Trash2
} from 'lucide-react';
import { socket } from '../services/socket';
import { voiceRelay } from '../services/voiceRelay';

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

  const hasAdminPerm = isFounder || roles.some(r => 
    currentUserRoles.includes(r.id) && (r.permissions?.includes('admin') || r.permissions?.includes('kick') || r.permissions?.includes('ban') || r.permissions?.includes('manage_roles'))
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
    const hasRole = targetMember?.roles?.includes(roleId);
    socket.emit('assign-role', {
      targetUserId: targetMember.id,
      roleId,
      action: hasRole ? 'remove' : 'add'
    });
  };

  const handleKick = () => {
    const reason = prompt(`${targetMember.username} adlı kullanıcıyı sunucudan atmak için sebep girin:`, 'Sunucu kurallarına uymama');
    if (reason !== null) {
      socket.emit('kick-member', { targetUserId: targetMember.id, reason });
      onClose();
    }
  };

  const handleBan = () => {
    const reason = prompt(`${targetMember.username} adlı kullanıcıyı sunucudan kalıcı YASAKLAMAK için sebep:`, 'Kural ihlali');
    if (reason !== null) {
      socket.emit('ban-member', { targetUserId: targetMember.id, reason });
      onClose();
    }
  };

  const handleServerMute = () => {
    const nextMute = !targetMember?.voiceState?.isMuted;
    socket.emit('server-mute-member', { targetUserId: targetMember.id, isMuted: nextMute });
    onClose();
  };

  const handleRemoveMember = () => {
    const confirmed = window.confirm(`"${targetMember.username}" adlı kullanıcının sunucu üyelik kaydını kalıcı olarak silmek istediğinize emin misiniz?`);
    if (confirmed) {
      socket.emit('remove-member', { targetUserId: targetMember.id });
      onClose();
    }
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

      {/* Volume Controls (for other users) */}
      {!isSelf && !isBot && (
        <div className="p-2 my-1 bg-[#1e1f22]/70 rounded-lg space-y-2 border border-white/5">
          {/* Mic Volume */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="flex items-center gap-1 text-[#949ba4]">
                <Volume2 className="w-3.5 h-3.5 text-[#5865f2]" />
                <span>Kullanıcı Sesi</span>
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
            />
          </div>

          {/* Stream Volume (if streaming) */}
          {targetMember.voiceState?.isScreenSharing && (
            <div className="pt-1 border-t border-white/5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1 text-[#949ba4]">
                  <Tv className="w-3.5 h-3.5 text-[#23a55a]" />
                  <span>Yayın/Oyun Sesi</span>
                </span>
                <span className="font-mono font-bold text-white">{streamVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={streamVolume}
                onChange={(e) => handleStreamVolumeChange(Number(e.target.value))}
                className="w-full accent-[#23a55a] h-1.5 bg-[#2b2d31] rounded-lg cursor-pointer"
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
              {roles.map(r => {
                const hasRole = targetMember?.roles?.includes(r.id);
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
            onClick={handleKick}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#f23f43] hover:text-white text-[#f23f43] transition-colors cursor-pointer text-left font-medium"
          >
            <UserMinus className="w-3.5 h-3.5" />
            <span>Sunucudan At (Kick)</span>
          </button>
          <button
            onClick={handleBan}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#da373c] hover:text-white text-[#da373c] transition-colors cursor-pointer text-left font-medium"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Sunucudan Yasakla (Ban)</span>
          </button>
          <button
            onClick={handleRemoveMember}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#c93b2b] hover:text-white text-[#f07167] transition-colors cursor-pointer text-left font-medium border-t border-white/5 mt-0.5"
            title="Kullanıcının sunucu üyelik kaydını kalıcı olarak siler"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Sunucudan Kaldır / Kaydı Sil</span>
          </button>
        </div>
      )}
    </div>
  );
}
