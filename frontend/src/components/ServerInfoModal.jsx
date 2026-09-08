import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, X, Sparkles, Monitor, Users, ExternalLink, Download } from 'lucide-react';

export default function ServerInfoModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = window.location.origin;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#313338] shadow-2xl border border-[#3f4147] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2d31]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#5865f2] flex items-center justify-center text-white font-black text-xs">
              5
            </div>
            <h2 className="text-lg font-bold text-white">Fivecord VIP Sunucusu</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-[#949ba4] hover:text-white rounded-lg hover:bg-[#35373c]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-[#b5bac1]">Arkadaş Davet Bağlantısı</span>
              <span className="text-[10px] bg-[#23a55a]/20 text-[#23a55a] px-2 py-0.5 rounded font-bold border border-[#23a55a]/30">
                5 KİŞİLİK VIP
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#1e1f22] p-2 rounded-lg border border-[#3f4147]">
              <span className="text-xs text-white truncate flex-1 font-mono">{inviteUrl}</span>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-md bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
              </button>
            </div>
            <p className="text-[11px] text-[#949ba4]">
              Bu linki diğer 4 arkadaşınıza göndererek anında odaya katılmalarını sağlayabilirsiniz.
            </p>
          </div>

          {/* Windows Desktop Download Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#23a55a]/15 to-[#1f934f]/15 border border-[#23a55a]/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>💻 Windows Masaüstü Uygulaması</span>
                <span className="text-[10px] bg-[#23a55a] text-white px-1.5 py-0.2 rounded font-bold">150 MB</span>
              </div>
              <p className="text-[11px] text-[#949ba4] mt-0.5">
                Discord gibi bağımsız masaüstü programı olarak kullanın.
              </p>
            </div>
            <a
              href="https://github.com/EmirU77/fivecord/releases/download/v1.0.0/Fivecord-Masaustu-Uygulamasi.zip"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 hover:scale-105"
            >
              <Download className="w-3.5 h-3.5" />
              <span>İndir (.zip)</span>
            </a>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase text-[#b5bac1] block">Aktif VIP Özellikleri</span>
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
        </div>

        <div className="px-6 py-3 bg-[#2b2d31] border-t border-[#383a40] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#383a40] hover:bg-[#4e5058] text-white text-xs font-semibold"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}