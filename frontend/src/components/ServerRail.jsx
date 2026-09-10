import React from 'react';
import { Compass, Plus, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';

export default function ServerRail({ 
  activeView = 'server', 
  servers = [],
  currentServerId = 'server-main',
  onSelectServer, 
  onSelectDM, 
  onOpenCreateServer,
  onOpenInfo,
  unreadCount = 0
}) {
  const isDM = activeView === 'dm';

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

      {/* SERVER LIST (Dinamik Sunucular Listesi) */}
      <div className="w-full flex-1 overflow-y-auto space-y-2 custom-scrollbar flex flex-col items-center">
        {servers.map((srv) => {
          const isCurrent = activeView === 'server' && currentServerId === srv.id;
          const isMain = srv.id === 'server-main';
          const iconText = srv.icon || (srv.name ? srv.name.slice(0, 2).toUpperCase() : 'S');

          return (
            <div key={srv.id} className="relative group flex items-center justify-center w-full">
              <div className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
                isCurrent ? 'h-10' : 'h-0 group-hover:h-5'
              }`} />

              <button
                onClick={() => onSelectServer(srv.id)}
                className={`w-12 h-12 flex items-center justify-center text-white font-black text-sm transition-all duration-200 relative overflow-hidden shadow-md cursor-pointer ${
                  isCurrent 
                    ? 'rounded-2xl bg-gradient-to-br from-[#5865f2] to-[#7950f2] ring-2 ring-[#5865f2]/50 scale-105' 
                    : 'rounded-3xl group-hover:rounded-2xl bg-[#313338] hover:bg-[#5865f2] group-hover:scale-105'
                }`}
                title={srv.name}
              >
                <span className="font-black tracking-tight text-base">{iconText}</span>
                {isMain && (
                  <div className="absolute -bottom-1 -right-1 p-0.5 bg-[#23a55a] rounded-full">
                    <ShieldCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            </div>
          );
        })}

        {/* ADD SERVER BUTTON (Yeşil Discord Tarzı + Butonu) */}
        <div className="relative group flex items-center justify-center w-full pt-1">
          <div className="absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 h-0 group-hover:h-5" />
          <button
            onClick={onOpenCreateServer}
            className="w-12 h-12 rounded-3xl group-hover:rounded-2xl bg-[#313338] hover:bg-[#23a55a] flex items-center justify-center text-[#23a55a] hover:text-white transition-all duration-200 group-hover:scale-105 shadow-md cursor-pointer"
            title="Bir Sunucu Ekle (Yeni Sunucu Aç veya Katıl)"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* EXPLORE / SERVER INFO BUTTON */}
        <div className="relative group flex items-center justify-center w-full">
          <div className="absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 h-0 group-hover:h-5" />
          <button
            onClick={onOpenInfo}
            className="w-12 h-12 rounded-3xl group-hover:rounded-2xl bg-[#313338] hover:bg-[#5865f2] flex items-center justify-center text-[#dbdee1] hover:text-white transition-all duration-200 group-hover:scale-105 shadow-sm cursor-pointer"
            title="Aktif Sunucu Bilgileri & Davet Bağlantısı"
          >
            <Compass className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* VIP NITRO BADGE (Bottom) */}
      <div className="relative group flex items-center justify-center w-full pb-1 pt-1">
        <button
          onClick={onOpenInfo}
          className="w-12 h-12 rounded-3xl group-hover:rounded-2xl bg-[#2b2d31] hover:bg-gradient-to-tr hover:from-[#f47b67] hover:to-[#eb459e] flex items-center justify-center text-amber-400 hover:text-white transition-all duration-200 shadow-md group-hover:scale-105 cursor-pointer"
          title="Synapse VIP Nitro (Tüm Özellikler Aktif)"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
        </button>
      </div>
    </div>
  );
}