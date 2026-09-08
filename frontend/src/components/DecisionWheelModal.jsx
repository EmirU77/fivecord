import React, { useState, useRef, useEffect } from 'react';
import { Dices, X, Sparkles, Plus, Trash2, Send, RotateCw, Trophy } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

const DEFAULT_OPTIONS = [
  'CS2',
  'Valorant',
  'GTA V',
  'League of Legends',
  'Minecraft',
  'Rust',
  'Rocket League',
  'Yemek Söyle'
];

const COLORS = [
  '#5865f2', '#23a55a', '#f0b232', '#f23f43',
  '#eb459e', '#57f287', '#fee75c', '#ed4245',
  '#9b59b6', '#1abc9c', '#e67e22', '#3498db'
];

export default function DecisionWheelModal({ isOpen, onClose, onShareResult }) {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [newItem, setNewItem] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(null);
  const canvasRef = useRef(null);

  // Draw the wheel whenever options change or modal opens
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 10;
    const count = options.length;
    if (count === 0) return;
    const sliceAngle = (2 * Math.PI) / count;

    ctx.clearRect(0, 0, width, height);

    options.forEach((opt, i) => {
      const angle = i * sliceAngle;
      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1e1f22';
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 4;
      ctx.fillText(opt.length > 13 ? opt.slice(0, 11) + '..' : opt, radius - 18, 5);
      ctx.restore();
    });

    // Draw center hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e1f22';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#5865f2';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('5', centerX, centerY + 4);
  }, [options, isOpen]);

  if (!isOpen) return null;

  const handleSpin = () => {
    if (isSpinning || options.length < 2) return;
    setIsSpinning(true);
    setWinner(null);

    soundEffects.playDice();

    const count = options.length;
    const sliceDeg = 360 / count;
    // Generate random spins (between 5 and 9 full rotations + random slice)
    const randomExtra = Math.floor(Math.random() * count);
    const spins = 5 + Math.floor(Math.random() * 4);
    // Canvas 0 deg is at 3 o'clock (right). The pointer is at 12 o'clock (top, 270 deg).
    const targetSlice = randomExtra;
    const finalRot = rotation + (spins * 360) + (targetSlice * sliceDeg) + (sliceDeg / 2);
    
    setRotation(finalRot);

    setTimeout(() => {
      setIsSpinning(false);
      // Calculate winner accurately
      const normalized = (finalRot % 360);
      // Pointer is at 270 deg (top). Angle on canvas:
      const pointerAngle = (270 - (normalized % 360) + 360) % 360;
      const index = Math.floor(pointerAngle / sliceDeg) % count;
      const selected = options[index];
      setWinner(selected);
      soundEffects.playJoin();
    }, 4000);
  };

  const handleAddOption = (e) => {
    e.preventDefault();
    if (!newItem.trim() || options.length >= 12) return;
    setOptions([...options, newItem.trim()]);
    setNewItem('');
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center p-4 select-none"
      style={{ zIndex: 99999, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)' }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[#3f4147] flex flex-col md:flex-row"
        style={{ backgroundColor: '#313338', boxShadow: '0 24px 70px rgba(0, 0, 0, 0.75)' }}
      >
        {/* LEFT: THE WHEEL */}
        <div className="p-6 flex flex-col items-center justify-center flex-1 border-b md:border-b-0 md:border-r border-[#232428]" style={{ backgroundColor: '#2b2d31' }}>
          <div className="flex items-center gap-2 mb-4">
            <Dices className="w-5 h-5 text-[#f0b232]" />
            <h3 className="text-base font-bold text-white">Karar Çarkı</h3>
          </div>

          <div className="relative mb-6">
            {/* Top Pointer Arrow */}
            <div 
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 z-30"
              style={{
                borderLeft: '11px solid transparent',
                borderRight: '11px solid transparent',
                borderTop: '20px solid #f23f43',
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.6))'
              }}
            />

            {/* Wheel Canvas */}
            <div 
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none'
              }}
              className="rounded-full shadow-2xl"
            >
              <canvas 
                ref={canvasRef} 
                width={280} 
                height={280} 
                className="rounded-full block"
              />
            </div>
          </div>

          <button
            onClick={handleSpin}
            disabled={isSpinning || options.length < 2}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#5865f2] to-[#eb459e] hover:brightness-110 active:scale-95 disabled:opacity-50 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'Çark Dönüyor...' : 'ÇARK-I ÇEVİR!'}</span>
          </button>

          {winner && (
            <div className="mt-4 p-3 rounded-xl bg-[#23a55a]/20 border border-[#23a55a]/40 text-center w-full animate-in zoom-in-95 duration-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#23a55a] flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Kazanan Seçildi!
              </div>
              <div className="text-xl font-extrabold text-white mt-1">
                {winner} 🚀
              </div>
              {onShareResult && (
                <button
                  onClick={() => {
                    onShareResult(`🎯 **Karar Çarkı Sonucu:** **${winner}** seçildi! Haydi oyuna! 🚀`);
                    onClose();
                  }}
                  className="mt-2 text-xs text-[#5865f2] hover:text-white flex items-center justify-center gap-1 mx-auto hover:underline cursor-pointer"
                >
                  <Send className="w-3 h-3" /> Sohbete Paylaş
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: OPTIONS LIST & ADD FORM */}
        <div className="p-5 w-full md:w-64 flex flex-col justify-between" style={{ backgroundColor: '#313338' }}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#b5bac1]">
                Seçenekler ({options.length}/12)
              </span>
              <button 
                onClick={onClose}
                className="p-1 rounded text-[#949ba4] hover:text-white hover:bg-[#35373c] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-3">
              {options.map((opt, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#2b2d31] text-xs text-white"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: COLORS[i % COLORS.length] }} 
                    />
                    <span className="truncate">{opt}</span>
                  </div>
                  {options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(i)}
                      className="p-1 text-[#949ba4] hover:text-[#f23f43] rounded transition-colors cursor-pointer"
                      title="Kaldır"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add new option */}
            {options.length < 12 && (
              <form onSubmit={handleAddOption} className="flex gap-1.5 mb-2">
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Yeni oyun ekle..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#1e1f22] border border-[#383a40] text-white text-xs focus:outline-hidden focus:border-[#5865f2]"
                />
                <button
                  type="submit"
                  disabled={!newItem.trim()}
                  className="p-2 rounded-lg bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-40 text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

          <div className="pt-3 border-t border-[#232428] text-[11px] text-[#949ba4] text-center">
            💡 En az 2, en fazla 12 oyun ekleyebilirsiniz.
          </div>
        </div>
      </div>
    </div>
  );
}
