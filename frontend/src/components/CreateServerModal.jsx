import React, { useState } from 'react';
import { X, Plus, Compass, Users, Hash, ShieldCheck, ArrowRight, Sparkles, Check } from 'lucide-react';

export default function CreateServerModal({
  isOpen,
  onClose,
  onCreateServer,
  onJoinServer,
  servers = [],
  currentServerId
}) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  const [serverName, setServerName] = useState('');
  const [serverIcon, setServerIcon] = useState('');
  const [serverDesc, setServerDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [inviteInput, setInviteInput] = useState('');
  const [joinedId, setJoinedId] = useState(null);

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!serverName.trim()) return;
    const cleanName = serverName.trim();
    const cleanIcon = (serverIcon.trim() || cleanName.slice(0, 2).toUpperCase());
    onCreateServer?.({
      name: cleanName,
      icon: cleanIcon,
      description: serverDesc.trim() || `${cleanName} resmi sunucusu`,
      isPublic
    });
    setServerName('');
    setServerIcon('');
    setServerDesc('');
    onClose();
  };

  const handleJoinFromInput = (e) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;
    let sId = inviteInput.trim();
    // Parse URL if user pasted full invite URL
    if (sId.includes('server=')) {
      const match = sId.match(/server=([^&]+)/);
      if (match && match[1]) sId = match[1];
    } else if (sId.includes('/#')) {
      sId = sId.split('/#')[1] || sId;
    }
    onJoinServer?.(sId);
    setInviteInput('');
    onClose();
  };

  const handleJoinDirect = (srv) => {
    onJoinServer?.(srv.id);
    setJoinedId(srv.id);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none font-sans">
      <div className="w-full max-w-lg rounded-2xl bg-[#313338] shadow-2xl border border-[#3f4147] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2d31]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#5865f2]/20 text-[#5865f2]">
              {activeTab === 'create' ? <Plus className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {activeTab === 'create' ? 'Kendi Sunucunu Oluştur' : 'Bir Sunucuya Katıl'}
              </h2>
              <p className="text-xs text-[#949ba4]">
                {activeTab === 'create' 
                  ? 'Arkadaşlarınla konuşup vakit geçirebileceğin bir alan aç' 
                  : 'Mevcut topluluklara katıl veya davet kodu gir'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-[#949ba4] hover:text-white rounded-lg hover:bg-[#35373c] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2b2d31] bg-[#2b2d31]/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'create' 
                ? 'border-[#5865f2] text-white' 
                : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Sunucu Oluştur</span>
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'join' 
                ? 'border-[#5865f2] text-white' 
                : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Sunucuları Keşfet & Katıl</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Server Name & Icon preview */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#2b2d31] border border-[#383a40]">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5865f2] to-[#7950f2] flex items-center justify-center text-white text-xl font-black shadow-lg shrink-0">
                  {serverIcon.trim() || (serverName.trim() ? serverName.trim().slice(0, 2).toUpperCase() : 'S')}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold text-white">Sunucu Simgesi</div>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="Simgesi (Örn: OP, GG)"
                    value={serverIcon}
                    onChange={(e) => setServerIcon(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#1e1f22] border border-[#3f4147] text-xs text-white placeholder-[#949ba4] focus:outline-hidden focus:border-[#5865f2]"
                  />
                </div>
              </div>

              {/* Server Name */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1.5">
                  Sunucu Adı <span className="text-[#f23f43]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Oyun Ekibi, Sohbet Alanı, Pro Gaming"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1e1f22] border border-[#3f4147] text-sm text-white placeholder-[#949ba4] focus:outline-hidden focus:border-[#5865f2] transition-colors"
                />
              </div>

              {/* Server Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-1.5">
                  Sunucu Açıklaması (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Arkadaşlarımızla oyun ve muhabbet sunucusu"
                  value={serverDesc}
                  onChange={(e) => setServerDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#1e1f22] border border-[#3f4147] text-sm text-white placeholder-[#949ba4] focus:outline-hidden focus:border-[#5865f2] transition-colors"
                />
              </div>

              {/* Privacy Setting */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#2b2d31] border border-[#383a40]">
                <div>
                  <div className="text-xs font-bold text-white">Herkese Açık Sunucu</div>
                  <div className="text-[11px] text-[#949ba4]">Diğer kullanıcılar sunucular listesinde görebilir ve katılabilir</div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-[#5865f2] cursor-pointer"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-white hover:underline cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!serverName.trim()}
                  className="px-5 py-2 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sunucuyu Oluştur</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Join via link form */}
              <form onSubmit={handleJoinFromInput} className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block">
                  Bir Davet Kodun mu Var?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://fivecord.onrender.com/?server=... veya sunucu kodu"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#1e1f22] border border-[#3f4147] text-xs text-white placeholder-[#949ba4] focus:outline-hidden focus:border-[#5865f2]"
                  />
                  <button
                    type="submit"
                    disabled={!inviteInput.trim()}
                    className="px-4 py-2 rounded-xl bg-[#23a55a] hover:bg-[#1f934f] disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <span>Katıl</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Public Servers List */}
              <div className="space-y-2 pt-2 border-t border-[#2b2d31]">
                <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block">
                  Herkese Açık Sunucular ({servers.length})
                </label>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {servers.map(srv => {
                    const isCurrent = srv.id === currentServerId;
                    const isJustJoined = joinedId === srv.id;
                    return (
                      <div
                        key={srv.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isCurrent 
                            ? 'bg-[#5865f2]/15 border-[#5865f2]' 
                            : 'bg-[#2b2d31] border-[#383a40] hover:bg-[#35373c]'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5865f2] to-[#7950f2] flex items-center justify-center text-white font-black text-sm shadow shrink-0">
                            {srv.icon || 'S'}
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                              <span>{srv.name}</span>
                              {srv.id === 'server-main' && (
                                <span className="text-[9px] bg-[#5865f2] text-white px-1 rounded font-bold">RESMİ</span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#949ba4] truncate">
                              {srv.description || `${srv.channels?.length || 0} kanal`}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleJoinDirect(srv)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                            isCurrent
                              ? 'bg-[#23a55a] text-white'
                              : isJustJoined
                              ? 'bg-[#23a55a] text-white'
                              : 'bg-[#5865f2] hover:bg-[#4752c4] text-white'
                          }`}
                        >
                          {isCurrent ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Açık</span>
                            </>
                          ) : isJustJoined ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Katıldın</span>
                            </>
                          ) : (
                            <span>Geçiş Yap</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}