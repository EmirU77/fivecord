import React from 'react';
import { Trash2, Hash, Volume2 } from 'lucide-react';

export default function DeleteChannelModal({ isOpen, channel, onClose, onConfirm }) {
  if (!isOpen || !channel) return null;

  const isVoice = channel.type === 'voice';

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center p-4 select-none"
      style={{
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-xl shadow-2xl overflow-hidden border border-[#3f4147]"
        style={{
          backgroundColor: '#313338',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.75)'
        }}
      >
        {/* Header & Body */}
        <div className="p-6" style={{ backgroundColor: '#313338' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#f23f43]/15 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-[#f23f43]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-snug">Kanalı Sil</h3>
              <div className="flex items-center gap-1.5 text-xs text-[#949ba4] mt-0.5">
                {isVoice ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#23a55a]" />
                ) : (
                  <Hash className="w-3.5 h-3.5 text-[#5865f2]" />
                )}
                <span className="font-semibold text-[#dbdee1]">{channel.name}</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-[#dbdee1] leading-relaxed mt-4">
            <strong className="text-white">#{channel.name}</strong> kanalını silmek istediğinden emin misin? Bu işlem geri alınamaz ve bu kanaldaki tüm geçmiş kalıcı olarak silinir.
          </p>
        </div>

        {/* Discord Standard Modal Footer */}
        <div 
          className="px-6 py-4 flex items-center justify-end gap-4 border-t border-[#232428]"
          style={{ backgroundColor: '#2b2d31' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-white hover:underline font-medium cursor-pointer transition-all px-2 py-1"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(channel.id);
              onClose();
            }}
            className="px-6 py-2.5 rounded-lg bg-[#da373c] hover:bg-[#a1282c] active:scale-95 text-white text-sm font-semibold transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Kanalı Sil
          </button>
        </div>
      </div>
    </div>
  );
}
