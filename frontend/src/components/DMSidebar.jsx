import React, { useState } from 'react';
import { Users, Plus, MessageCircle, X, Search, Sparkles } from 'lucide-react';
import UserControlBar from './UserControlBar';

export default function DMSidebar({
  members,
  currentUser,
  activeDmUser,
  onSelectDmUser,
  onUpdateProfile,
  onLogout,
  isMuted,
  setIsMuted,
  isDeafened,
  setIsDeafened,
  unreadDms
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Other human members excluding current user and bots
  const otherMembers = members.filter(m => m.id !== currentUser?.id && !m.isBot);
  const filteredMembers = otherMembers.filter(m => 
    m.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  ? 'Diğer 4 arkadaşınız henüz bağlanmadı. Bağlandıklarında burada özel mesajlaşabilirsiniz.'
                  : 'Aramanıza uygun arkadaş bulunamadı.'}
              </div>
            ) : (
              filteredMembers.map(member => {
                const isActive = activeDmUser?.id === member.id;
                return (
                  <div
                    key={member.id}
                    onClick={() => onSelectDmUser(member)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-sm transition-all cursor-pointer group ${
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
                          className="w-8 h-8 rounded-full bg-[#1e1f22] object-cover border border-[#383a40]"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23a55a] border-2 border-[#2b2d31]" />
                      </div>

                      <div className="truncate text-left">
                        <div 
                          className="text-xs font-bold truncate group-hover:underline"
                          style={{ color: member.color || '#dbdee1' }}
                        >
                          {member.username}
                        </div>
                        <div className="text-[10px] text-[#949ba4] truncate">
                          {member.customStatus || 'Çevrimiçi'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {unreadDms?.has(member.id) && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#f23f43] text-white text-[9px] font-black animate-pulse shadow-xs">
                          YENİ
                        </span>
                      )}
                      <MessageCircle className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 ${isActive ? 'text-[#5865f2] opacity-100' : 'text-[#949ba4]'}`} />
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
      />
    </div>
  );
}