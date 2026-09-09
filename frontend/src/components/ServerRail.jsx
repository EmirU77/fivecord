import React from 'react';
import { Compass, Plus, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';

export default function ServerRail({ 
  activeView = 'server', 
  onSelectServer, 
  onSelectDM, 
  onOpenInfo,
  unreadCount = 0
}) {
  const isDM = activeView === 'dm';
  const isServer = activeView === 'server';

  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 space-y-2 shrink-0 select-none z-20 border-r border-[#111214]">
      {/* DIRECT MESSAGES ICON (Top) */}
      <div className="relative group flex items-center justify-center w-full">
        {/* Active/Hover white indicator pill */}
        <div className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
          isDM ? 'h-10' : 'h-0 group-hover:h-5'
        }`} />
        
        <button
          onClick={onSelectDM}
          className={`w-12 h-12 flex items-center justify-center transition-all duration-200 shadow-md relative cursor-pointer ${
            isDM 
              ? 'rounded-2xl bg-[#5865f2] text-white ring-2 ring-[#5865f2]/40 scale-105' 
              : 'rounded-3xl group-hover:rounded-2xl bg-[#313338] hover:bg-[#5865f2] text-[#dbdee1] hover:text-white group-hover:scale-105'
          }`}
          title="Direkt Mesajlar (Özel Mesaj)"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-[#f23f43] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border-2 border-[#1e1f22] animate-bounce shadow">
              {unreadCount}
            </div>
          )}
        </button>
      </div>

      {/* Separator */}
      <div className="w-8 h-[2px] bg-[#35373c] rounded-full my-1" />

      {/* FIVECORD VIP SERVER ICON */}
      <div className="relative group flex items-center justify-center w-full">
        <div className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
          isServer ? 'h-10' : 'h-0 group-hover:h-5'
        }`} />

        <button
          onClick={onSelectServer}
          className={`w-12 h-12 flex items-center justify-center text-white font-black text-lg transition-all duration-200 relative overflow-hidden shadow-lg ${
            isServer 
              ? 'rounded-2xl bg-gradient-to-br from-[#5865f2] to-[#4752c4] ring-2 ring-[#5865f2]/50 scale-105' 
              : 'rounded-3xl group-hover:rounded-2xl bg-[#313338] hover:bg-[#5865f2] group-hover:scale-105'
          }`}
          title="Fivecord VIP Sunucusu"
        >
          <span className="font-extrabold tracking-tighter">5</span>
          <div className="absolute -bottom-1 -right-1 p-0.5 bg-[#23a55a] rounded-full">
            <ShieldCheck className="w-2.5 h-2.5 text-white" />
          </div>
        </button>
      </div>


      {/* EXPLORE / SERVER INFO BUTTON */}
      <div className="relative group flex items-center justify-center w-full">
        <div className="absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 h-0 group-hover:h-5" />
        <button
          onClick={onOpenInfo}
          className="w-12 h-12 rounded-3xl group-hover:rounded-2xl bg-[#313338] hover:bg-[#5865f2] flex items-center justify-center text-[#dbdee1] hover:text-white transition-all duration-200 group-hover:scale-105 shadow-sm"
          title="Sunucu Bilgileri ve Arkadaş Daveti"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1" />

      {/* VIP NITRO BADGE */}
      <div className="relative group flex items-center justify-center w-full pb-1">
        <button
          onClick={onOpenInfo}
          className="w-12 h-12 rounded-3xl group-hover:rounded-2xl bg-[#2b2d31] hover:bg-gradient-to-tr hover:from-[#f47b67] hover:to-[#eb459e] flex items-center justify-center text-amber-400 hover:text-white transition-all duration-200 shadow-md group-hover:scale-105"
          title="Fivecord VIP Nitro (Ücretsiz Özellikler)"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
        </button>
      </div>
    </div>
  );
}