import React from 'react';
import { Compass, Plus, MessageSquare, ShieldCheck, Sparkles, Zap } from 'lucide-react';

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
    <div className="w-[72px] bg-[#0a0c14]/95 backdrop-blur-2xl flex flex-col items-center py-3.5 space-y-2.5 shrink-0 select-none z-20 border-r border-white/5 shadow-2xl">
      {/* SYNAPSE BRAND / DIRECT MESSAGES ICON (Top) */}
      <div className="relative group flex items-center justify-center w-full">
        {/* Active/Hover Neon Glowing Pill */}
        <div className={`absolute left-0 w-1.5 bg-gradient-to-b from-cyan-400 to-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-300 ${
          isDM ? 'h-10' : 'h-0 group-hover:h-5'
        }`} />
        
        <button
          onClick={onSelectDM}
          className={`w-12 h-12 flex items-center justify-center transition-all duration-300 relative cursor-pointer ${
            isDM 
              ? 'rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20 scale-105' 
              : 'rounded-3xl group-hover:rounded-2xl bg-[#141829] hover:bg-gradient-to-br hover:from-indigo-600 hover:to-purple-600 text-[#94a3b8] hover:text-white border border-white/5 shadow-md group-hover:scale-105'
          }`}
          title="Synapse Direkt Mesajlar"
        >
          {/* Futuristic S Logo / Message */}
          <div className="relative flex items-center justify-center">
            <MessageSquare className="w-5 h-5 stroke-[2.2]" />
          </div>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border-2 border-[#0a0c14] animate-bounce shadow-lg">
              {unreadCount}
            </div>
          )}
        </button>
      </div>

      {/* Futuristic Gradient Separator */}
      <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent rounded-full my-0.5" />

      {/* SERVER LIST (Dinamik Sunucular Listesi) */}
      <div className="w-full flex-1 overflow-y-auto space-y-2.5 custom-scrollbar flex flex-col items-center">
        {servers.map((srv) => {
          const isCurrent = activeView === 'server' && currentServerId === srv.id;
          const isMain = srv.id === 'server-main';
          const iconText = srv.icon || (srv.name ? srv.name.slice(0, 2).toUpperCase() : 'S');

          return (
            <div key={srv.id} className="relative group flex items-center justify-center w-full">
              <div className={`absolute left-0 w-1.5 bg-gradient-to-b from-indigo-400 to-purple-500 rounded-r-full shadow-[0_0_10px_rgba(168,85,247,0.8)] transition-all duration-300 ${
                isCurrent ? 'h-10' : 'h-0 group-hover:h-5'
              }`} />

              <button
                onClick={() => onSelectServer(srv.id)}
                className={`w-12 h-12 flex items-center justify-center text-white font-black text-sm transition-all duration-300 relative overflow-hidden cursor-pointer ${
                  isCurrent 
                    ? 'rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20 scale-105' 
                    : 'rounded-3xl group-hover:rounded-2xl bg-[#141829] hover:bg-gradient-to-br hover:from-indigo-600 hover:to-purple-600 text-[#cbd5e1] border border-white/5 shadow-md group-hover:scale-105'
                }`}
                title={srv.name}
              >
                <span className="font-black tracking-wider text-sm drop-shadow">{iconText}</span>
                {isMain && (
                  <div className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.7)]">
                    <ShieldCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            </div>
          );
        })}

        {/* ADD SERVER BUTTON */}
        <div className="relative group flex items-center justify-center w-full pt-1">
          <div className="absolute left-0 w-1.5 bg-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all duration-300 h-0 group-hover:h-5" />
          <button
            onClick={onOpenCreateServer}
            className="w-12 h-12 rounded-3xl group-hover:rounded-2xl bg-[#141829] hover:bg-gradient-to-br hover:from-emerald-500 hover:to-teal-600 flex items-center justify-center text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-transparent transition-all duration-300 group-hover:scale-105 shadow-md hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
            title="Yeni Sunucu Aç veya Katıl"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* EXPLORE / SERVER INFO BUTTON */}
        <div className="relative group flex items-center justify-center w-full">
          <div className="absolute left-0 w-1.5 bg-cyan-400 rounded-r-full shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all duration-300 h-0 group-hover:h-5" />
          <button
            onClick={onOpenInfo}
            className="w-12 h-12 rounded-3xl group-hover:rounded-2xl bg-[#141829] hover:bg-gradient-to-br hover:from-cyan-500 hover:to-blue-600 flex items-center justify-center text-[#94a3b8] hover:text-white border border-white/5 transition-all duration-300 group-hover:scale-105 shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
            title="Sunucu Bilgileri & Davet"
          >
            <Compass className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* VIP NITRO BADGE (Bottom) */}
      <div className="relative group flex items-center justify-center w-full pb-0.5">
        <button
          onClick={onOpenInfo}
          className="w-12 h-12 rounded-3xl group-hover:rounded-2xl bg-[#141829] hover:bg-gradient-to-tr hover:from-amber-500 hover:to-pink-500 flex items-center justify-center text-amber-400 hover:text-white border border-amber-500/20 hover:border-transparent transition-all duration-300 shadow-md group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
          title="Synapse Pro & VIP Avantajları"
        >
          <Sparkles className="w-5 h-5 animate-pulse" />
        </button>
      </div>
    </div>
  );
}