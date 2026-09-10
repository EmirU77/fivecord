import React, { useEffect, useRef, useState } from 'react';
import { 
  MessageSquare, X, Trash2, Ban, ShieldAlert, ShieldCheck, 
  UserCheck, AlertTriangle, Check
} from 'lucide-react';

export default function DMUserContextMenu({
  x,
  y,
  targetUser,
  currentUser,
  isBlocked = false,
  onClose,
  onSelectDM,
  onCloseDM,
  onClearHistory,
  onToggleBlock
}) {
  const menuRef = useRef(null);
  const [confirmDeleteHistory, setConfirmDeleteHistory] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Viewport bounds checking
  const menuWidth = 230;
  const menuHeight = 260;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);

  const handleOpenChat = () => {
    onSelectDM?.(targetUser);
    onClose();
  };

  const handleCloseChat = () => {
    onCloseDM?.(targetUser);
    onClose();
  };

  const handleClearHistoryAction = () => {
    onClearHistory?.(targetUser);
    onClose();
  };

  const handleToggleBlockAction = () => {
    onToggleBlock?.(targetUser);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-56 bg-[#111214] border border-[#2b2d31] rounded-xl shadow-2xl p-1.5 text-xs text-[#dbdee1] select-none animate-in fade-in zoom-in-95 duration-100 font-sans"
    >
      {/* Header Profile Summary */}
      <div className="flex items-center gap-2.5 p-2 bg-[#1e1f22] rounded-lg mb-1 border border-white/5">
        <div className="relative shrink-0">
          <img
            src={targetUser?.avatar}
            alt={targetUser?.username}
            className="w-8 h-8 rounded-full bg-black object-cover border border-[#383a40]"
          />
          {isBlocked && (
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#da373c] text-white flex items-center justify-center text-[9px] font-black shadow">
              !
            </div>
          )}
        </div>
        <div className="overflow-hidden flex-1">
          <div className="font-bold text-white truncate text-xs flex items-center gap-1">
            <span className="truncate" style={{ color: targetUser?.color || '#fff' }}>
              {targetUser?.username}
            </span>
            {isBlocked && (
              <span className="text-[9px] bg-[#da373c]/20 text-[#f23f43] px-1 py-0.2 rounded font-bold shrink-0">
                Engellendi
              </span>
            )}
          </div>
          <div className="text-[10px] text-[#949ba4] truncate">
            {targetUser?.customStatus || 'Özel Mesaj'}
          </div>
        </div>
      </div>

      {/* Confirmation State for Clear History */}
      {confirmDeleteHistory ? (
        <div className="p-2.5 bg-[#1e1f22] rounded-lg space-y-2 border border-white/5 animate-in fade-in duration-100">
          <div className="flex items-center gap-1.5 text-white font-bold text-xs">
            <Trash2 className="w-3.5 h-3.5 text-[#f23f43]" />
            <span>Sohbet Temizlensin mi?</span>
          </div>
          <p className="text-[11px] text-[#949ba4] leading-relaxed">
            @{targetUser?.username} ile olan tüm özel mesajlaşma geçmişiniz kalıcı olarak silinecek.
          </p>
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              onClick={() => setConfirmDeleteHistory(false)}
              className="px-2.5 py-1 rounded-md bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] text-xs font-semibold cursor-pointer transition-colors"
            >
              Vazgeç
            </button>
            <button
              onClick={handleClearHistoryAction}
              className="px-2.5 py-1 rounded-md bg-[#da373c] hover:bg-[#f23f43] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
            >
              Temizle
            </button>
          </div>
        </div>
      ) : confirmBlock ? (
        <div className="p-2.5 bg-[#1e1f22] rounded-lg space-y-2 border border-white/5 animate-in fade-in duration-100">
          <div className="flex items-center gap-1.5 text-white font-bold text-xs">
            <Ban className="w-3.5 h-3.5 text-[#f23f43]" />
            <span>Kullanıcıyı Engelle?</span>
          </div>
          <p className="text-[11px] text-[#949ba4] leading-relaxed">
            @{targetUser?.username} artık size özel mesaj gönderemez. Dilediğiniz zaman engeli kaldırabilirsiniz.
          </p>
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              onClick={() => setConfirmBlock(false)}
              className="px-2.5 py-1 rounded-md bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] text-xs font-semibold cursor-pointer transition-colors"
            >
              Vazgeç
            </button>
            <button
              onClick={handleToggleBlockAction}
              className="px-2.5 py-1 rounded-md bg-[#da373c] hover:bg-[#f23f43] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
            >
              Engelle
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-0.5">
          {/* Mesaj Gönder */}
          <button
            onClick={handleOpenChat}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-[#5865f2] hover:text-white transition-colors cursor-pointer text-left"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Mesaj Gönder</span>
          </button>

          {/* Sohbeti Kapat / Listeden Kaldır */}
          <button
            onClick={handleCloseChat}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-[#35373c] text-[#dbdee1] hover:text-white transition-colors cursor-pointer text-left"
            title="Sohbeti yan panel listesinden gizler/kapatır"
          >
            <X className="w-3.5 h-3.5 text-[#949ba4]" />
            <span>Sohbeti Kapat</span>
          </button>

          {/* Sohbet Geçmişini Temizle */}
          <button
            onClick={() => setConfirmDeleteHistory(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-[#da373c]/15 text-[#f23f43] hover:text-white hover:bg-[#da373c] transition-colors cursor-pointer text-left font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Sohbet Geçmişini Temizle</span>
          </button>

          <div className="h-[1px] bg-[#2b2d31] my-1" />

          {/* Engelle / Engeli Kaldır */}
          {isBlocked ? (
            <button
              onClick={handleToggleBlockAction}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-[#23a55a] text-[#23a55a] hover:text-white transition-colors cursor-pointer text-left font-semibold"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Engeli Kaldır (Unblock)</span>
            </button>
          ) : (
            <button
              onClick={() => setConfirmBlock(true)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-[#da373c] text-[#f23f43] hover:text-white transition-colors cursor-pointer text-left font-medium"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Kullanıcıyı Engelle</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
