import React, { useState } from 'react';
import { Shield, Plus, Trash2, Check, X, ShieldAlert, Users, Palette, Lock } from 'lucide-react';
import { socket } from '../services/socket';

const COLOR_PALETTE = [
  '#f1c40f', '#e67e22', '#e74c3c', '#e91e63', '#9b59b6', 
  '#3498db', '#2ecc71', '#1abc9c', '#5865f2', '#00b0f4', 
  '#eb459e', '#f23f43', '#57f287', '#fee75c', '#99aab5'
];

const AVAILABLE_PERMISSIONS = [
  { id: 'admin', label: 'Yönetici (Tüm Yetkiler)', desc: 'Sunucu üzerindeki tüm ayarlara ve yetkilere erişebilir.' },
  { id: 'kick', label: 'Üyeleri Sunucudan At (Kick)', desc: 'Kural ihlali yapan üyeleri sunucudan atabilir.' },
  { id: 'ban', label: 'Üyeleri Sunucudan Yasakla (Ban)', desc: 'İstenmeyen üyeleri sunucudan kalıcı olarak yasaklayabilir.' },
  { id: 'mute_members', label: 'Üyeleri Sustur', desc: 'Ses odasında konuşan üyeleri sunucu genelinde susturabilir.' },
  { id: 'manage_roles', label: 'Rolleri Yönet', desc: 'Yeni roller oluşturabilir, silebilir ve üyelere atayabilir.' },
  { id: 'manage_channels', label: 'Kanalları Yönet', desc: 'Metin ve ses kanalları oluşturabilir, silebilir veya adlandırabilir.' },
  { id: 'priority_speaker', label: 'Öncelikli Konuşmacı', desc: 'Konuştuğunda diğer üyelerin ses seviyesi hafifçe kısılır.' }
];

export default function RoleManagementModal({ roles = [], onClose }) {
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id || null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#5865f2');
  const [isCreating, setIsCreating] = useState(false);

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const handleCreateRole = (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    socket.emit('create-role', {
      name: newRoleName.trim(),
      color: newRoleColor,
      hoist: true,
      permissions: []
    });
    setNewRoleName('');
    setIsCreating(false);
  };

  const handleUpdateRoleColor = (color) => {
    if (!selectedRole) return;
    socket.emit('update-role', {
      roleId: selectedRole.id,
      updates: { color }
    });
  };

  const handleUpdateRoleName = (name) => {
    if (!selectedRole || selectedRole.id === 'role-founder') return;
    socket.emit('update-role', {
      roleId: selectedRole.id,
      updates: { name }
    });
  };

  const handleTogglePermission = (permId) => {
    if (!selectedRole || selectedRole.id === 'role-founder') return;
    const currentPerms = selectedRole.permissions || [];
    const nextPerms = currentPerms.includes(permId)
      ? currentPerms.filter(p => p !== permId)
      : [...currentPerms, permId];

    socket.emit('update-role', {
      roleId: selectedRole.id,
      updates: { permissions: nextPerms }
    });
  };

  const handleDeleteRole = (roleId) => {
    if (roleId === 'role-founder') {
      alert('Kurucu rolü silinemez!');
      return;
    }
    if (confirm('Bu rolü silmek istediğinize emin misiniz?')) {
      socket.emit('delete-role', { roleId });
      setSelectedRoleId(roles[0]?.id || null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#1e1f22] border border-[#383a40] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2d31] bg-[#18191c]">
          <div className="flex items-center gap-2.5 text-white font-bold">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="text-base">Sunucu Rol & Yetki Yönetimi</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Roles List / Right Editor */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Roles Sidebar */}
          <div className="w-56 bg-[#141517] border-r border-[#2b2d31] p-3 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 mb-2 text-[11px] font-bold text-[#949ba4] uppercase">
                <span>Roller ({roles.length})</span>
                <button
                  onClick={() => setIsCreating(true)}
                  className="p-1 rounded bg-[#5865f2] hover:bg-[#4752c4] text-white transition-colors cursor-pointer"
                  title="Yeni Rol Oluştur"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {roles.map(r => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedRoleId(r.id);
                      setIsCreating(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      isSelected ? 'bg-[#35373c] text-white shadow' : 'text-[#949ba4] hover:bg-[#232428] hover:text-[#dbdee1]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      <span className="truncate">{r.name}</span>
                    </span>
                    {r.id === 'role-founder' && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Editor Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#1e1f22]">
            {isCreating ? (
              <form onSubmit={handleCreateRole} className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#5865f2]" />
                  <span>Yeni Rol Oluştur</span>
                </h3>

                <div>
                  <label className="text-[11px] font-bold uppercase text-[#b5bac1] block mb-1.5">Rol Adı</label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Örn: VIP Gamer, Moderatör"
                    className="w-full bg-[#111214] border border-[#383a40] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#5865f2]"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-[#b5bac1] block mb-1.5">Rol Rengi</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COLOR_PALETTE.map(c => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setNewRoleColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                          newRoleColor === c ? 'scale-115 ring-2 ring-white' : 'hover:scale-105'
                        }`}
                      >
                        {newRoleColor === c && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newRoleColor}
                    onChange={(e) => setNewRoleColor(e.target.value)}
                    className="w-32 bg-[#111214] border border-[#383a40] rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all"
                  >
                    Rolü Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    Vazgeç
                  </button>
                </div>
              </form>
            ) : selectedRole ? (
              <div className="space-y-5">
                {/* Role Header & Name Editor */}
                <div className="flex items-center justify-between pb-3 border-b border-[#2b2d31]">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedRole.color }} />
                      <span>{selectedRole.name}</span>
                    </h3>
                    <span className="text-[11px] text-[#949ba4]">Sıra: #{selectedRole.position}</span>
                  </div>

                  {selectedRole.id !== 'role-founder' && (
                    <button
                      onClick={() => handleDeleteRole(selectedRole.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f23f43]/15 text-[#f23f43] hover:bg-[#f23f43] hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Rolü Sil</span>
                    </button>
                  )}
                </div>

                {/* Color Chooser */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#b5bac1] block mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#5865f2]" />
                    <span>Rol Rengi Seç</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTE.map(c => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => handleUpdateRoleColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                          selectedRole.color === c ? 'scale-115 ring-2 ring-white' : 'hover:scale-105'
                        }`}
                      >
                        {selectedRole.color === c && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissions Toggles */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#b5bac1] block mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Yetki İzinleri</span>
                  </label>

                  <div className="space-y-2">
                    {AVAILABLE_PERMISSIONS.map(perm => {
                      const isAllowed = selectedRole.id === 'role-founder' || selectedRole.permissions?.includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => handleTogglePermission(perm.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                            selectedRole.id === 'role-founder'
                              ? 'bg-[#18191c]/50 border-white/5 cursor-not-allowed opacity-80'
                              : 'bg-[#18191c] hover:bg-[#232428] border-[#2b2d31] cursor-pointer'
                          }`}
                        >
                          <div className="pr-4">
                            <span className="font-bold text-white text-xs block">{perm.label}</span>
                            <span className="text-[11px] text-[#949ba4] block">{perm.desc}</span>
                          </div>

                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                            isAllowed ? 'bg-[#23a55a] border-[#23a55a] text-white' : 'border-[#4e5058] bg-[#2b2d31]'
                          }`}>
                            {isAllowed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
