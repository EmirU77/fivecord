import React, { useState } from 'react';
import { Monitor, Zap, Radio, X, Volume2, VolumeX } from 'lucide-react';
import { QUALITY_PRESETS } from '../services/webrtc';

export default function ScreenShareModal({ isOpen, onClose, onStartShare }) {
  const [selectedPreset, setSelectedPreset] = useState('1080p-60');
  const [withAudio, setWithAudio] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#313338] shadow-2xl border border-[#3f4147] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2d31]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#5865f2]/20 text-[#5865f2]">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Ekran Paylaşımı
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/30">
                  SINIRSIZ BİTRATE
                </span>
              </h2>
              <p className="text-xs text-[#949ba4]">Discord Nitro kilidi olmadan en yüksek kalitede yayın yapın</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-[#949ba4] hover:text-white rounded-lg hover:bg-[#35373c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block">
            Yayın Kalitesi ve FPS Seçin
          </label>
          
          {/* Presets List */}
          <div className="grid grid-cols-1 gap-2.5">
            {Object.entries(QUALITY_PRESETS).map(([key, preset]) => {
              const isSelected = selectedPreset === key;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedPreset(key)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-[#5865f2] bg-[#5865f2]/15 shadow-sm' 
                      : 'border-[#383a40] bg-[#2b2d31] hover:border-[#4752c4] hover:bg-[#35373c]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#5865f2] text-white' : 'bg-[#1e1f22] text-[#949ba4]'}`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        {preset.name}
                        {key === '1080p-60' && (
                          <span className="text-[10px] bg-[#5865f2] text-white px-1.5 py-0.2 rounded font-bold">ÖNERİLEN</span>
                        )}
                        {key === '4k-60' && (
                          <span className="text-[10px] bg-[#f23f43] text-white px-1.5 py-0.2 rounded font-bold">ULTRA</span>
                        )}
                      </div>
                      <div className="text-xs text-[#949ba4]">
                        Maksimum ~{Math.round(preset.bitrate / 1000000)} Mbps doğrudan akış
                      </div>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-[#5865f2] bg-[#5865f2]' : 'border-[#4e5058]'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SESLİ / SESSİZ YAYIN SEÇENEĞİ (DISCORD STYLE) */}
          <div className="pt-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#b5bac1] block mb-2">
              Yayın Ses Durumu
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* SESLİ SEÇENEĞİ */}
              <div
                onClick={() => setWithAudio(true)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                  withAudio 
                    ? 'border-[#23a55a] bg-[#23a55a]/15 shadow-sm' 
                    : 'border-[#383a40] bg-[#2b2d31] hover:bg-[#35373c]'
                }`}
              >
                <div className={`p-2 rounded-lg ${withAudio ? 'bg-[#23a55a] text-white' : 'bg-[#1e1f22] text-[#949ba4]'}`}>
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Sesli Paylaş</span>
                    {withAudio && <span className="text-[9px] bg-[#23a55a] text-white px-1 rounded">AÇIK</span>}
                  </div>
                  <div className="text-[10px] text-[#949ba4]">
                    Oyun ve masaüstü sesi yayına gider
                  </div>
                </div>
              </div>

              {/* SESSİZ SEÇENEĞİ */}
              <div
                onClick={() => setWithAudio(false)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                  !withAudio 
                    ? 'border-[#f23f43] bg-[#f23f43]/15 shadow-sm' 
                    : 'border-[#383a40] bg-[#2b2d31] hover:bg-[#35373c]'
                }`}
              >
                <div className={`p-2 rounded-lg ${!withAudio ? 'bg-[#f23f43] text-white' : 'bg-[#1e1f22] text-[#949ba4]'}`}>
                  <VolumeX className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Sessiz Paylaş</span>
                    {!withAudio && <span className="text-[9px] bg-[#f23f43] text-white px-1 rounded">SES KAPALI</span>}
                  </div>
                  <div className="text-[10px] text-[#949ba4]">
                    Sadece görüntü gider, ses gitmez
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#2b2d31] border-t border-[#383a40]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white hover:underline transition-all"
          >
            İptal
          </button>
          <button
            onClick={() => {
              onStartShare(selectedPreset, withAudio);
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-semibold shadow-md transition-all flex items-center gap-2 hover:scale-105"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            Yayını Başlat {withAudio ? '(Sesli)' : '(Sessiz)'}
          </button>
        </div>
      </div>
    </div>
  );
}