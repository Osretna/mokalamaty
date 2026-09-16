import React, { useState } from 'react';
import { 
  Layers, 
  User, 
  KeyRound, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Plus, 
  X, 
  Radio, 
  Phone, 
  Voicemail, 
  Disc,
  CheckCircle,
  Settings,
  Flame,
  CloudCheck,
  Check
} from 'lucide-react';
import { PBXUser } from '../../types';
import { autoSaveUserToFirebase } from '../../lib/firebase';

interface UsersExtensionsViewProps {
  users: PBXUser[];
  currentUser: PBXUser;
  onUpdateUsers: (newUsers: PBXUser[]) => void;
}

export const UsersExtensionsView: React.FC<UsersExtensionsViewProps> = ({
  users,
  currentUser,
  onUpdateUsers,
}) => {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // New Extension Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [extension, setExtension] = useState('');
  const [protocol, setProtocol] = useState<'SIP' | 'IAX2' | 'PJSIP'>('SIP');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'agent'>('agent');
  const [secret, setSecret] = useState('');

  const toggleSecret = (id: string) => {
    setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStatusChange = async (userId: string, newStatus: PBXUser['status']) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const updatedUser = { ...u, status: newStatus };
        autoSaveUserToFirebase(updatedUser);
        return updatedUser;
      }
      return u;
    });
    onUpdateUsers(updated);
    setSyncToast('تم تحديث حالة المستخدم ومزامنتها في Firebase');
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleAddExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !extension.trim()) return;

    const newUser: PBXUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim() || `${extension}@etsalati.local`,
      extension: extension.trim(),
      protocol,
      role,
      status: 'online',
      secret: secret.trim() || `sip_secret_${extension}`,
      context: 'from-internal',
      voicemailEnabled: true,
      recordingEnabled: true,
    };

    // 1. Update UI and Local State immediately
    onUpdateUsers([...users, newUser]);

    // 2. Automatically sync to Firebase Firestore & RTDB
    await autoSaveUserToFirebase(newUser);

    setSyncToast(`تمت إضافة التحويلة (${newUser.extension}) ومزامنتها تلقائياً على Firebase بنجاح!`);
    setTimeout(() => setSyncToast(null), 4000);

    setIsAddModalOpen(false);
    setName('');
    setEmail('');
    setExtension('');
    setSecret('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">إدارة التحويلات والمستخدمين (SIP / IAX Extensions)</h3>
                <span className="flex items-center gap-1 text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>مزامنة تلقائية مع Firebase</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                أي تحويلة أو مستخدم تقوم بإضافته يتم حفظه وتحديثه تلقائياً في قاعدة بيانات Firebase (مشروع mokalamaty-160e0).
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة تحويلة جديدة</span>
          </button>
        </div>

        {/* Sync Toast Feedback */}
        {syncToast && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{syncToast}</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">Firestore: /users</span>
          </div>
        )}
      </div>

      {/* Extensions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                <th className="py-3 px-4">رقم التحويلة</th>
                <th className="py-3 px-4">اسم الموظف / المستخدم</th>
                <th className="py-3 px-4">البروتوكول</th>
                <th className="py-3 px-4">الدور / الصلاحية</th>
                <th className="py-3 px-4">حالة التواجد (Presence)</th>
                <th className="py-3 px-4">كلمة المرور SIP Secret</th>
                <th className="py-3 px-4 text-center">الخدمات المفعلة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => {
                const isSecretVisible = !!showSecrets[u.id];
                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 text-slate-300 transition-colors">
                    {/* Extension */}
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400 text-sm">
                      <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {u.extension}
                      </span>
                    </td>

                    {/* Name & Email */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{u.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                    </td>

                    {/* Protocol */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {u.protocol}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'admin' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        u.role === 'supervisor' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role === 'admin' ? 'مدير نظام' : u.role === 'supervisor' ? 'مشرف اتصالات' : 'موظف خدمة'}
                      </span>
                    </td>

                    {/* Presence Status */}
                    <td className="py-3.5 px-4">
                      <select
                        value={u.status}
                        onChange={(e) => handleStatusChange(u.id, e.target.value as any)}
                        className={`text-[11px] font-semibold rounded-lg px-2.5 py-1 border cursor-pointer focus:outline-none ${
                          u.status === 'online' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' :
                          u.status === 'busy' ? 'bg-rose-950/40 border-rose-500/50 text-rose-300' :
                          u.status === 'dnd' ? 'bg-amber-950/40 border-amber-500/50 text-amber-300' :
                          u.status === 'away' ? 'bg-blue-950/40 border-blue-500/50 text-blue-300' :
                          'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        <option value="online">متاح (Online)</option>
                        <option value="busy">مشغول (Busy)</option>
                        <option value="dnd">ممنوع الإزعاج (DND)</option>
                        <option value="away">في استراحة (Away)</option>
                        <option value="offline">غير متصل (Offline)</option>
                      </select>
                    </td>

                    {/* Secret */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-xs">
                          {isSecretVisible ? u.secret : '••••••••••••'}
                        </span>
                        <button
                          onClick={() => toggleSecret(u.id)}
                          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                          title={isSecretVisible ? 'إخفاء' : 'إظهار'}
                        >
                          {isSecretVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Features */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`p-1.5 rounded-lg text-xs ${u.voicemailEnabled ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-800 text-slate-600'}`} title="البريد الصوتي">
                          <Voicemail className="w-3.5 h-3.5" />
                        </span>
                        <span className={`p-1.5 rounded-lg text-xs ${u.recordingEnabled ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-800 text-slate-600'}`} title="تسجيل المكالمات">
                          <Disc className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Extension Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-slate-800/90 px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">إضافة تحويلة داخلية جديدة</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExtension} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">رقم التحويلة: *</label>
                  <input
                    type="text"
                    required
                    value={extension}
                    onChange={(e) => setExtension(e.target.value)}
                    placeholder="مثال: 106"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">البروتوكول:</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="SIP">SIP (PJSIP)</option>
                    <option value="IAX2">IAX2 (Inter-Asterisk)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">اسم الموظف / التحويلة: *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مروان عادل (المبيعات)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">الصلاحية:</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="agent">موظف (Agent)</option>
                    <option value="supervisor">مشرف (Supervisor)</option>
                    <option value="admin">مدير (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">كلمة مرور SIP Secret:</label>
                  <input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="تلقائي إن ترك فارغاً"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  حفظ التحويلة في Asterisk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
