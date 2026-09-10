import React, { useState } from 'react';
import { Users, Plus, MessageCircle, X, Search, Sparkles, Ban } from 'lucide-react';
import UserControlBar from './UserControlBar';
import DMUserContextMenu from './DMUserContextMenu';

export default function DMSidebar({
  members,
  currentUser,
  activeDmUser,
  onSelectDmUser,
  onUpdateProfile,
  onLogout,
  onOpenLogin,
  isMuted,
  setIsMuted,
  isDeafened,
  setIsDeafened,
  unreadDms,
  closedDms = new Set(),
  blockedUsers = new Set(),
  onCloseDM,
  onClearHistory,
  onToggleBlock
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dmContextMenu, setDmContextMenu] = useState(null); // { x, y, targetUser }

  // Other human members excluding current user and bots
  const otherMembers = members.filter(m => m.id !== currentUser?.id && !m.isBot);
  // Filter other members: show search results, or if no search, filter out closed unless active/unread
  const filteredMembers = otherMembers.filter(m => {
    const matchesSearch = m.username.toLowerCase().includes(searchTerm.toLowerCase());
    if (searchTerm.trim()) return matchesSearch;
    const isClosed = closedDms.has(m.id);
    const isCurrentActive = activeDmUser?.id === m.id;
    const hasUnread = unreadDms?.has(m.id);
    return matchesSearch && (!isClosed || isCurrentActive || hasUnread);
  });

  const handleUserContextMenu = (e, member) => {
    e.preventDefault();
    e.stopPropagation();
    setDmContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetUser: member
    });
  };

  return (
    <div className="w-64 bg-[#0f1322]/95 backdrop-blur-2xl flex flex-col shrink-0 select-none border-r border-white/5 z-10 shadow-2xl">
      {/* Search Header */}
      <div className="h-13 border-b border-white/5 px-3 flex items-center">
        <div className="w-full bg-[#161a2c] rounded-xl px-2.5 py-1.5 flex items-center gap-2 text-xs text-[#94a3b8] border border-white/5 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
          <Search className="w-3.5 h-3.5 text-indigo-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Konuşma bul veya başlat..."
            className="w-full bg-transparent text-white text-xs focus:outline-hidden placeholder-[#64748b]"
          />
        </div>
      </div>

      {/* DM List Content */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3 custom-scrollbar">
        {/* Friends Item */}
        <button
          onClick={() => {
            if (otherMembers.length > 0) {
              onSelectDmUser(otherMembers[0]);
            }
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-[#e2e8f0] bg-white/[0.03] hover:bg-gradient-to-r hover:from-indigo-600/20 hover:to-purple-600/10 border border-white/5 hover:border-indigo-500/20 transition-all group cursor-pointer"
        >
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 group-hover:text-white group-hover:bg-indigo-600 transition-colors">
            <Users className="w-4 h-4" />
          </div>
          <span>Arkadaşlar ({otherMembers.length})</span>
        </button>

        {/* Separator */}
        <div className="h-[1px] bg-white/5 mx-2" />

        {/* DIRECT MESSAGES CATEGORY */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748b]">
              Direkt Mesajlar
            </span>
          </div>

          <div className="space-y-0.5">
            {filteredMembers.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[#64748b]">
                {otherMembers.length === 0 
                  ? 'Diğer arkadaşlarınız henüz bağlanmadı.'
                  : (searchTerm ? 'Aramanıza uygun arkadaş bulunamadı.' : 'Açık direkt mesajınız yok.')}
              </div>
            ) : (
              filteredMembers.map(member => {
                const isActive = activeDmUser?.id === member.id;
                const isBlocked = blockedUsers.has(member.id);
                return (
                  <div
                    key={member.id}
                    onClick={() => onSelectDmUser(member)}
                    onContextMenu={(e) => handleUserContextMenu(e, member)}
                    className={`flex items-center justify-between px-2.5 py-2 text-xs transition-all cursor-pointer group relative ${
                      isActive 
                        ? 'bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-transparent text-white font-bold border-l-2 border-indigo-400 shadow-sm rounded-r-xl rounded-l-md' 
                        : 'text-[#94a3b8] hover:bg-white/[0.04] hover:text-[#f1f5f9] rounded-xl'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="relative shrink-0">
                        <img
                          src={member.avatar}
                          alt={member.username}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.username || 'user')}`;
                          }}
                          className="w-8 h-8 rounded-full bg-[#141829] object-cover border border-white/10"
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f1322] ${
                          isBlocked ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                        }`} />
                      </div>

                      <div className="truncate text-left">
                        <div 
                          className="text-xs font-bold truncate group-hover:underline flex items-center gap-1.5"
                          style={{ color: member.color || '#e2e8f0' }}
                        >
                          <span className="truncate">{member.username}</span>
                          {isBlocked && (
                            <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1 py-0.2 rounded font-bold shrink-0">
                              Engellendi
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#64748b] truncate">
                          {isBlocked ? 'Engellendi' : (member.customStatus || 'Çevrimiçi')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {unreadDms?.has(member.id) && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#f23f43] text-white text-[9px] font-black animate-pulse shadow-xs">
                          YENİ
                        </span>
                      )}
                      
                      {/* Close DM quick button on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseDM?.(member);
                        }}
                        className="p-1 rounded-md text-[#949ba4] hover:text-white hover:bg-[#2b2d31] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Sohbeti Kapat"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* User profile dock at bottom */}
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

      {/* Right-click Context Menu for DM Users */}
      {dmContextMenu && (
        <DMUserContextMenu
          x={dmContextMenu.x}
          y={dmContextMenu.y}
          targetUser={dmContextMenu.targetUser}
          currentUser={currentUser}
          isBlocked={blockedUsers.has(dmContextMenu.targetUser?.id)}
          onClose={() => setDmContextMenu(null)}
          onSelectDM={onSelectDmUser}
          onCloseDM={onCloseDM}
          onClearHistory={onClearHistory}
          onToggleBlock={onToggleBlock}
        />
      )}
    </div>
  );
}