import React, { useState, useEffect } from 'react';
import { Download, Monitor, Sparkles, X, Check, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

export default function DownloadModal({ isOpen, onClose, onDownloaded }) {
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        onDownloaded?.();
      }
      setDeferredPrompt(null);
    } else {
      alert('Tarayıcınızın adres çubuğunun sağındaki "Uygulamayı Yükle" (monitör simgesi) butonuna basarak anında masaüstüne ekleyebilirsiniz!');
      onDownloaded?.();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-[#313338] shadow-2xl border border-[#3f4147] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#5865f2] to-[#4752c4] px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-bold tracking-wide uppercase">
              Windows Masaüstü
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#23a55a]/80 text-[11px] font-bold tracking-wide uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 inline" /> 60 FPS VIP
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight">Synapse Masaüstü Uygulaması</h2>
          <p className="text-xs text-white/80 mt-1">
            Yüksek kaliteli ses ve 60 FPS ultra düşük gecikmeli yayın platformu.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* OPTION 1: 1-Click PWA Install */}
          <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] hover:border-[#5865f2]/50 transition-all group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#5865f2]/10 border border-[#5865f2]/20 flex items-center justify-center text-[#5865f2] shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Hızlı Masaüstü Kurulumu (0 MB)
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#23a55a]/20 text-[#23a55a] font-semibold">Tavsiye Edilen</span>
                  </h4>
                  <p className="text-xs text-[#949ba4] mt-0.5 leading-relaxed">
                    Hiç dosya indirmeden Chrome veya Edge ile 1 saniyede masaüstünüze bağımsız Discord penceresi olarak ekleyin.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#383a40]/60 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#949ba4]">Otomatik güncellenir, diskte yer kaplamaz</span>
              <button
                onClick={handleInstallPWA}
                className="px-4 py-2 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 hover:scale-105"
              >
                <Monitor className="w-4 h-4" />
                <span>{isInstalled ? 'Kuruldu!' : 'Uygulamayı Masaüstüne Ekle'}</span>
              </button>
            </div>
          </div>

          {/* OPTION 2: Standalone .exe / .zip Package */}
          <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#383a40] hover:border-[#23a55a]/50 transition-all group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#23a55a]/10 border border-[#23a55a]/20 flex items-center justify-center text-[#23a55a] shrink-0 group-hover:scale-105 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Taşınabilir Windows Paketi (.zip)</h4>
                  <p className="text-xs text-[#949ba4] mt-0.5 leading-relaxed">
                    İçerisinde doğrudan çalışan <code className="text-[#dbdee1] bg-[#1e1f22] px-1 py-0.5 rounded">Fivecord.exe</code> bulunur. Zipten çıkarıp çift tıklayarak çalıştırabilirsiniz.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#383a40]/60 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#949ba4]">Tüm Windows sürümleriyle uyumlu (150 MB)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-[#383a40] hover:bg-[#4e5058] text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                  title="İndirme Linkini Kopyala"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#23a55a]" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Kopyalandı!' : 'Linki Kopyala'}</span>
                </button>
                <a
                  href="https://github.com/EmirU77/fivecord/releases/download/v1.0.0/Fivecord-Masaustu-Uygulamasi.zip"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onDownloaded?.()}
                  className="px-4 py-1.5 rounded-lg bg-[#23a55a] hover:bg-[#1f934f] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 hover:scale-105"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Fivecord İndir (.zip)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Info Features */}
          <div className="grid grid-cols-2 gap-2 text-xs text-[#dbdee1] pt-1">
            <div className="p-2.5 rounded-lg bg-[#232428] flex items-center gap-2 border border-[#2e3035]">
              <ShieldCheck className="w-4 h-4 text-[#23a55a]" />
              <span>7/24 Kesintisiz Aktif</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#232428] flex items-center gap-2 border border-[#2e3035]">
              <Monitor className="w-4 h-4 text-[#5865f2]" />
              <span>60 FPS 4K Ekran Yayını</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#2b2d31] border-t border-[#383a40] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#383a40] hover:bg-[#4e5058] text-white text-xs font-semibold transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}