import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, X, Sparkles, Monitor, Users, Trash2, Hash } from 'lucide-react';

export default function ServerInfoModal({ 
  isOpen, 
  onClose, 
  currentServer, 
  currentUser,
  onDeleteServer 
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const serverId = currentServer?.id || 'server-main';
  const serverName = currentServer?.name || 'Synapse Topluluğu';
  const serverIcon = currentServer?.icon || 'S';
  const isMainServer = serverId === 'server-main';
  const isOwner = currentServer?.ownerId === currentUser?.id || currentUser?.id === 'user-emir';

  const inviteUrl = `${window.location.origin}/?server=${serverId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (isMainServer) {
      alert('Ana Synapse topluluk sunucusu silinemez.');
      return;
    }
    const confirmed = window.confirm(`"${serverName}" adlı sunucuyu ve tüm kanallarını kalıcı olarak silmek istediğinize emin misiniz?`);
    if (confirmed) {
      onDeleteServer?.(serverId);
      onClose();
    }
  };

  const channelCount = currentServer?.channels?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#313338] shadow-2xl border border-[#3f4147] overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2d31]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5865f2] to-[#7950f2] flex items-center justify-center text-white font-black text-sm shadow-md">
              {serverIcon}
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight truncate max-w-[240px]">
                {serverName}
              </h2>
              <span className="text-[11px] text-[#949ba4] block truncate">
                {isMainServer ? 'Resmi Ana Sunucu' : 'Özel Topluluk Sunucusu'}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-[#949ba4] hover:text-white rounded-lg hover:bg-[#35373c] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Invite Link Card */}
          <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-[#b5bac1]">Sunucu Davet Bağlantısı</span>
              <span className="text-[10px] bg-[#5865f2]/20 text-[#5865f2] px-2 py-0.5 rounded font-bold border border-[#5865f2]/30">
                SINIRSIZ DAVET
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#1e1f22] p-2 rounded-lg border border-[#3f4147]">
              <span className="text-xs text-white truncate flex-1 font-mono select-all">{inviteUrl}</span>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-md bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
              </button>
            </div>
            <p className="text-[11px] text-[#949ba4]">
              Bu bağlantıyı arkadaşlarınıza göndererek anında bu sunucuya katılmalarını sağlayabilirsiniz.
            </p>
          </div>

          {/* Server Stats & Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-[#2b2d31] border border-[#383a40] flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#5865f2]/20 text-[#5865f2]">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-[#949ba4] font-medium">Kanal Sayısı</div>
                <div className="text-sm font-bold text-white">{channelCount} Kanal</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#2b2d31] border border-[#383a40] flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#23a55a]/20 text-[#23a55a]">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-[#949ba4] font-medium">Sunucu Durumu</div>
                <div className="text-sm font-bold text-white">Çevrimiçi</div>
              </div>
            </div>
          </div>

          {/* Active Features */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase text-[#b5bac1] block">Aktif Sunucu Özellikleri</span>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#dbdee1]">
              <div className="p-2.5 rounded-lg bg-[#2b2d31] flex items-center gap-2 border border-[#383a40]">
                <Monitor className="w-4 h-4 text-[#5865f2]" />
                <span>60 FPS 4K Ekran</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#2b2d31] flex items-center gap-2 border border-[#383a40]">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Opus HQ Düşük Gecikme</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#2b2d31] flex items-center gap-2 border border-[#383a40]">
                <Users className="w-4 h-4 text-[#23a55a]" />
                <span>1-e-1 Özel Mesaj (DM)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#2b2d31] flex items-center gap-2 border border-[#383a40]">
                <ShieldCheck className="w-4 h-4 text-[#00b0f4]" />
                <span>Limitsiz Dosya & GIF</span>
              </div>
            </div>
          </div>

          {/* Delete Server Option (If owner and not main server) */}
          {isOwner && !isMainServer && (
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={handleDelete}
                className="w-full py-2 px-3 rounded-lg bg-[#f23f43]/15 hover:bg-[#f23f43] text-[#f23f43] hover:text-white border border-[#f23f43]/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bu Sunucuyu Kalıcı Olarak Sil</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#2b2d31] border-t border-[#383a40] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#383a40] hover:bg-[#4e5058] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}