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
    <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0 select-none border-r border-[#1f2023] z-10 shadow-sm">
      {/* Search Header */}
      <div className="h-12 border-b border-[#1f2023] px-3 flex items-center shadow-xs">
        <div className="w-full bg-[#1e1f22] rounded-md px-2 py-1.5 flex items-center gap-2 text-xs text-[#949ba4] border border-[#383a40]">
          <Search className="w-3.5 h-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Konuşma bul veya başlat"
            className="w-full bg-transparent text-white text-xs focus:outline-hidden placeholder-[#80848e]"
          />
        </div>
      </div>

      {/* DM List Content */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {/* Friends Item */}
        <button
          onClick={() => {
            if (otherMembers.length > 0) {
              onSelectDmUser(otherMembers[0]);
            }
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#dbdee1] hover:bg-[#35373c] hover:text-white transition-all group"
        >
          <div className="p-1 rounded-lg bg-[#313338] text-[#dbdee1] group-hover:bg-[#5865f2] group-hover:text-white transition-colors">
            <Users className="w-4 h-4" />
          </div>
          <span>Arkadaşlar ({otherMembers.length})</span>
        </button>

        {/* Separator */}
        <div className="h-[1px] bg-[#383a40] mx-2" />

        {/* DIRECT MESSAGES CATEGORY */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4]">
              Direkt Mesajlar
            </span>
          </div>

          <div className="space-y-0.5">
            {filteredMembers.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[#949ba4]">
                {otherMembers.length === 0 
                  ? 'Diğer arkadaşlarınız henüz bağlanmadı. Bağlandıklarında burada özel mesajlaşabilirsiniz.'
                  : (searchTerm ? 'Aramanıza uygun arkadaş bulunamadı.' : 'Açık direkt mesajınız yok. Yukarıdaki "Arkadaşlar" butonundan bir sohbet başlatabilirsiniz.')}
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
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-sm transition-all cursor-pointer group relative ${
                      isActive 
                        ? 'bg-[#35373c] text-white font-semibold shadow-xs' 
                        : 'text-[#949ba4] hover:bg-[#313338] hover:text-[#dbdee1]'
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
                          className="w-8 h-8 rounded-full bg-[#1e1f22] object-cover border border-[#383a40]"
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${
                          isBlocked ? 'bg-[#da373c]' : 'bg-[#23a55a]'
                        }`} />
                      </div>

                      <div className="truncate text-left">
                        <div 
                          className="text-xs font-bold truncate group-hover:underline flex items-center gap-1.5"
                          style={{ color: member.color || '#dbdee1' }}
                        >
                          <span className="truncate">{member.username}</span>
                          {isBlocked && (
                            <span className="text-[9px] bg-[#da373c]/20 text-[#f23f43] px-1 py-0.2 rounded font-bold shrink-0">
                              Engellendi
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#949ba4] truncate">
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