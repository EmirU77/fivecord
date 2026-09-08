import React, { useState, useEffect } from 'react';
import { Edit3, Hash, Volume2, X } from 'lucide-react';

export default function RenameChannelModal({ isOpen, channel, onClose, onConfirm }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (channel) {
      setName(channel.name.replace(/^🔊\s*/, ''));
    }
  }, [channel]);

  if (!isOpen || !channel) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(channel.id, name.trim());
      onClose();
    }
  };

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
      <form 
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-xl shadow-2xl overflow-hidden border border-[#3f4147]"
        style={{
          backgroundColor: '#313338',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.75)'
        }}
      >
        <div className="p-6" style={{ backgroundColor: '#313338' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#5865f2]/15 flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-[#5865f2]" />
              </div>
              <h3 className="text-lg font-bold text-white">Kanalı Yeniden Adlandır</h3>
            </div>
            <button 
              type="button" 
              onClick={onClose}
              className="p-1 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-2">
            Kanal Adı
          </label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#5865f2] border border-[#383a40]"
              style={{ backgroundColor: '#1e1f22' }}
              autoFocus
            />
            <span className="text-[#949ba4] absolute left-3 top-2.5 font-mono text-sm">
              {channel.type === 'text' ? '#' : '🔊'}
            </span>
          </div>
        </div>

        <div 
          className="px-6 py-4 flex items-center justify-end gap-3 border-t border-[#232428]"
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
            type="submit"
            disabled={!name.trim()}
            className="px-6 py-2.5 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-40 text-white text-sm font-semibold transition-all shadow-md cursor-pointer"
          >
            Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
