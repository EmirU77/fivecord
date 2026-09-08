import React, { useState } from 'react';
import { Hash, Volume2, X, Plus } from 'lucide-react';
import { socket } from '../services/socket';

export default function CreateChannelModal({ isOpen, onClose }) {
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState('text');

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    socket.emit('create-channel', {
      name: channelName.trim(),
      type: channelType
    });

    setChannelName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#313338] shadow-2xl border border-[#3f4147] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2d31]">
          <h2 className="text-lg font-bold text-white">Yeni Kanal Oluştur</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-[#949ba4] hover:text-white rounded-lg hover:bg-[#35373c]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-2">
              Kanal Türü
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <div
                onClick={() => setChannelType('text')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                  channelType === 'text' 
                    ? 'border-[#5865f2] bg-[#5865f2]/15 shadow-sm' 
                    : 'border-[#383a40] bg-[#2b2d31] hover:bg-[#35373c]'
                }`}
              >
                <Hash className="w-5 h-5 text-[#5865f2]" />
                <div>
                  <div className="text-xs font-bold text-white">Metin Kanalı</div>
                  <div className="text-[10px] text-[#949ba4]">Mesaj ve dosya paylaşımı</div>
                </div>
              </div>

              <div
                onClick={() => setChannelType('voice')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                  channelType === 'voice' 
                    ? 'border-[#23a55a] bg-[#23a55a]/15 shadow-sm' 
                    : 'border-[#383a40] bg-[#2b2d31] hover:bg-[#35373c]'
                }`}
              >
                <Volume2 className="w-5 h-5 text-[#23a55a]" />
                <div>
                  <div className="text-xs font-bold text-white">Ses Odası</div>
                  <div className="text-[10px] text-[#949ba4]">Ses, kamera ve 60 FPS yayın</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-2">
              Kanal Adı
            </label>
            <div className="relative">
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder={channelType === 'text' ? 'yeni-kanal' : 'Oyun & Eğlence Odası'}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#1e1f22] border border-[#383a40] text-white text-sm focus:outline-hidden focus:border-[#5865f2]"
                autoFocus
              />
              <span className="text-[#949ba4] absolute left-3 top-2.5 font-mono text-sm">
                {channelType === 'text' ? '#' : '🔊'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#949ba4] hover:text-white transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!channelName.trim()}
              className="px-5 py-2 rounded-xl bg-[#5865f2] disabled:opacity-40 hover:bg-[#4752c4] text-white text-sm font-semibold transition-all shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Kanal Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}