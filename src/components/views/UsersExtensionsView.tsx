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
  Check,
  Copy,
  Smartphone,
  Download,
  Share2,
  Headphones,
  Pencil,
  Trash2,
  AlertTriangle,
  Save,
  Loader2,
} from 'lucide-react';
import { PBXUser } from '../../types';
import { autoSaveUserToFirebase, deleteUserFromFirebase } from '../../lib/firebase';

interface UsersExtensionsViewProps {
  users: PBXUser[];
  currentUser: PBXUser;
  onUpdateUsers: (newUsers: PBXUser[]) => void;
  onUpdateCurrentUser?: (user: PBXUser | null) => void;
}

export const UsersExtensionsView: React.FC<UsersExtensionsViewProps> = ({
  users,
  currentUser,
  onUpdateUsers,
  onUpdateCurrentUser,
}) => {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createdUserModal, setCreatedUserModal] = useState<PBXUser | null>(null);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // New User / Extension Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [extension, setExtension] = useState('');
  const [email, setEmail] = useState('');
  const [protocol, setProtocol] = useState<'SIP' | 'IAX2' | 'PJSIP'>('SIP');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'agent'>('agent');
  const [sipServer, setSipServer] = useState('192.168.1.100');

  // Edit User State
  const [editingUser, setEditingUser] = useState<PBXUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editExtension, setEditExtension] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editProtocol, setEditProtocol] = useState<'SIP' | 'IAX2' | 'PJSIP'>('SIP');
  const [editRole, setEditRole] = useState<'admin' | 'supervisor' | 'agent'>('agent');
  const [editStatus, setEditStatus] = useState<PBXUser['status']>('online');
  const [editSipServer, setEditSipServer] = useState('192.168.1.100');
  const [editVoicemailEnabled, setEditVoicemailEnabled] = useState(true);
  const [editRecordingEnabled, setEditRecordingEnabled] = useState(true);
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete User State
  const [deletingUser, setDeletingUser] = useState<PBXUser | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const handleOpenEditModal = (user: PBXUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username || user.extension);
    setEditPassword(user.password || user.secret || '');
    setEditExtension(user.extension);
    setEditEmail(user.email || '');
    setEditProtocol(user.protocol || 'SIP');
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditSipServer(user.sipServer || '192.168.1.100');
    setEditVoicemailEnabled(user.voicemailEnabled ?? true);
    setEditRecordingEnabled(user.recordingEnabled ?? true);
    setEditShowPassword(false);
  };

  const handleSaveEditedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim() || !editExtension.trim()) return;

    setIsSavingEdit(true);
    const finalUsername = editUsername.trim() || `agent${editExtension.trim()}`;
    const finalPassword = editPassword.trim() || editingUser.password || `pass${editExtension.trim()}`;

    const updatedUser: PBXUser = {
      ...editingUser,
      name: editName.trim(),
      username: finalUsername,
      password: finalPassword,
      secret: finalPassword,
      extension: editExtension.trim(),
      email: editEmail.trim() || `${finalUsername}@etsalati.local`,
      protocol: editProtocol,
      role: editRole,
      status: editStatus,
      sipServer: editSipServer.trim() || '192.168.1.100',
      voicemailEnabled: editVoicemailEnabled,
      recordingEnabled: editRecordingEnabled,
      syncedToFirebase: true,
      updatedAt: new Date().toISOString(),
    };

    // 1. Update users list in state & local storage
    const newUsers = users.map((u) => (u.id === editingUser.id || u.extension === editingUser.extension ? updatedUser : u));
    onUpdateUsers(newUsers);

    // 2. If editing current logged-in user, update session immediately
    if (currentUser.id === editingUser.id || currentUser.extension === editingUser.extension) {
      onUpdateCurrentUser?.(updatedUser);
    }

    // 3. Automatically sync updated fields to Firebase Firestore & RTDB
    await autoSaveUserToFirebase(updatedUser);

    setIsSavingEdit(false);
    setEditingUser(null);
    setSyncToast(`تم حفظ وتحديث بيانات المستخدم (${updatedUser.name} - #${updatedUser.extension}) ومزامنتها على Firebase!`);
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleOpenDeleteModal = (user: PBXUser) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeletingLoading(true);

    const deletedUser = deletingUser;

    // 1. Remove from users list
    const newUsers = users.filter((u) => u.id !== deletedUser.id && u.extension !== deletedUser.extension);
    onUpdateUsers(newUsers);

    // 2. Add to deleted tracking list in localStorage to prevent restoring
    try {
      const existingDeleted: string[] = JSON.parse(localStorage.getItem('etsalati_deleted_users') || '[]');
      if (!existingDeleted.includes(deletedUser.id)) existingDeleted.push(deletedUser.id);
      if (!existingDeleted.includes(deletedUser.extension)) existingDeleted.push(deletedUser.extension);
      localStorage.setItem('etsalati_deleted_users', JSON.stringify(existingDeleted));
      localStorage.setItem('etsalati_users', JSON.stringify(newUsers));
    } catch {
      // ignore
    }

    // 3. Delete from Firebase Firestore & RTDB
    await deleteUserFromFirebase(deletedUser);

    // 4. Check if current user deleted themselves
    const isSelf = currentUser.id === deletedUser.id || currentUser.extension === deletedUser.extension;

    setIsDeletingLoading(false);
    setDeletingUser(null);

    if (isSelf) {
      onUpdateCurrentUser?.(null);
    } else {
      setSyncToast(`تم حذف المستخدم (${deletedUser.name} - #${deletedUser.extension}) نهائياً من النظام وFirebase.`);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

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

  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !extension.trim()) return;

    const finalUsername = username.trim() || `agent${extension.trim()}`;
    const finalPassword = password.trim() || `pass${extension.trim()}`;

    const newUser: PBXUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      username: finalUsername,
      password: finalPassword,
      email: email.trim() || `${finalUsername}@etsalati.local`,
      extension: extension.trim(),
      protocol,
      role,
      status: 'online',
      secret: finalPassword,
      context: 'from-internal',
      voicemailEnabled: true,
      recordingEnabled: true,
      sipServer: sipServer.trim() || '192.168.1.100',
      syncedToFirebase: true,
      createdAt: new Date().toISOString(),
    };

    // 1. Update UI and Local State immediately
    onUpdateUsers([...users, newUser]);

    // 2. Automatically sync to Firebase Firestore & RTDB
    await autoSaveUserToFirebase(newUser);

    setSyncToast(`تم إنشاء وتفعيل المستخدم (${newUser.name}) ومزامنته تلقائياً على Firebase!`);
    setTimeout(() => setSyncToast(null), 4000);

    // Show provisioned credentials modal
    setCreatedUserModal(newUser);

    // Reset Form
    setIsAddModalOpen(false);
    setName('');
    setUsername('');
    setPassword('');
    setEmail('');
    setExtension('');
  };

  // Download .3cxconfig XML for newly created user
  const handleDownloadConfig = (user: PBXUser) => {
    const host = user.sipServer || '192.168.1.100';
    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<AccountConfiguration>
  <AccountName>mokalamaty_${user.extension}</AccountName>
  <CallerID>${user.name} (${user.extension})</CallerID>
  <Extension>${user.extension}</Extension>
  <ID>${user.username || user.extension}</ID>
  <Password>${user.password || user.secret}</Password>
  <ServerIP>${host}</ServerIP>
  <OutboundProxy>${host}:5060</OutboundProxy>
  <Protocol>UDP</Protocol>
  <Port>5060</Port>
</AccountConfiguration>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3cx_config_${user.extension}.3cxconfig`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                  <span>تفعيل تلقائي ومباشر على Firebase</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                إنشاء حسابات الموظفين (معرف ID وكلمة المرور) والربط مع 3CXPhone. يتم حفظ وتفعيل أي مستخدم جديد تلقائياً في Firebase (مشروع mokalamaty-160e0).
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مستخدم وتحويلة جديدة</span>
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

      {/* Extensions & Users Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">التحويلة</th>
                <th className="py-3 px-4">اسم الموظف</th>
                <th className="py-3 px-4">اسم المستخدم للدخول (ID)</th>
                <th className="py-3 px-4">البروتوكول</th>
                <th className="py-3 px-4">نوع الصلاحية</th>
                <th className="py-3 px-4">حالة التواجد (Presence)</th>
                <th className="py-3 px-4">كلمة المرور للدخول و3CX</th>
                <th className="py-3 px-4 text-center">إعدادات 3CX</th>
                <th className="py-3 px-4 text-center">التحكم والإجراءات</th>
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

                    {/* Login Username / ID */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {u.username || u.extension}
                      </span>
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
                        u.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        u.role === 'supervisor' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' :
                        'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}>
                        {u.role === 'admin' ? 'مدير نظام (Admin)' : u.role === 'supervisor' ? 'مشرف اتصالات' : 'موظف اتصال (Agent)'}
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

                    {/* Password */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-xs">
                          {isSecretVisible ? (u.password || u.secret) : '••••••••••••'}
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

                    {/* 3CX Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setCreatedUserModal(u)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="عرض بيانات الربط مع 3CXPhone"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                          <span>بيانات 3CX</span>
                        </button>
                        <button
                          onClick={() => handleDownloadConfig(u)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-cyan-900/60 text-slate-400 hover:text-cyan-300 border border-slate-700"
                          title="تحميل ملف .3cxconfig"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Edit & Delete Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-cyan-100 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm shadow-cyan-950/50"
                          title="تعديل بيانات المستخدم والتحويلة"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(u)}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-rose-100 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm shadow-rose-950/50"
                          title="حذف المستخدم والتحويلة نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User / Extension Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إنشاء وتفعيل مستخدم وتحويلة جديدة</h3>
                  <p className="text-[11px] text-slate-400">يتم التفعيل والحفظ التلقائي في Firebase وAsterisk مباشرة</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExtension} className="p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">اسم الموظف بالكامل: *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: محمد السيد (خدمة العملاء)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Username (Login ID) & Extension */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    اسم المستخدم / ID للدخول: *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: mohamed106"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">يستخدمه لتسجيل الدخول</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    رقم التحويلة الداخلية (SIP Ext): *
                  </label>
                  <input
                    type="text"
                    required
                    value={extension}
                    onChange={(e) => setExtension(e.target.value)}
                    placeholder="مثال: 106"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">رقم الاتصال الداخلي</span>
                </div>
              </div>

              {/* Password & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    كلمة المرور (للدخول ولـ 3CX): *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">نوع الصلاحية والشاشة:</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="agent">موظف اتصال (شاشة الأزرار و3CX فقط)</option>
                    <option value="admin">مدير نظام (لوحة التحكم الكاملة)</option>
                    <option value="supervisor">مشرف خدمة</option>
                  </select>
                </div>
              </div>

              {/* SIP Server & Protocol */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">عنوان سيرفر SIP (PBX IP):</label>
                  <input
                    type="text"
                    value={sipServer}
                    onChange={(e) => setSipServer(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">البروتوكول:</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="SIP">SIP / PJSIP (موصى به لـ 3CX)</option>
                    <option value="IAX2">IAX2</option>
                  </select>
                </div>
              </div>

              {/* Auto Sync Banner */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  سيتم حفظ وتفعيل المستخدم مباشرة على Firebase Firestore دون الحاجة لأي إعداد يدوي إضافي.
                </span>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-600/30 active:scale-95 cursor-pointer"
                >
                  إنشاء وتفعيل المستخدم فوراً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Provisioned & 3CX Setup Modal */}
      {createdUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/60 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-950 to-slate-900 px-6 py-4 border-b border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تم تفعيل المستخدم وحفظه في Firebase بنجاح!</h3>
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    بيانات تسجيل الدخول والربط ببرنامج 3CXPhone الخاصة بالموظف
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreatedUserModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Content */}
            <div className="p-6 space-y-4 text-xs">
              {/* Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[11px] block">الموظف:</span>
                  <span className="text-white font-bold text-sm">{createdUserModal.name}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  createdUserModal.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}>
                  {createdUserModal.role === 'admin' ? 'مدير (Admin)' : 'موظف اتصال (Agent)'}
                </span>
              </div>

              {/* Login Credentials */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>بيانات تسجيل الدخول للتطبيق:</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 font-sans text-[10px] block">اسم المستخدم (ID):</span>
                      <span className="text-cyan-300 font-bold">{createdUserModal.username || createdUserModal.extension}</span>
                    </div>
                    <button
                      onClick={() => handleCopy('modal-username', createdUserModal.username || createdUserModal.extension)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      {copiedField === 'modal-username' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 font-sans text-[10px] block">كلمة المرور:</span>
                      <span className="text-amber-300 font-bold">{createdUserModal.password || createdUserModal.secret}</span>
                    </div>
                    <button
                      onClick={() => handleCopy('modal-pass', createdUserModal.password || createdUserModal.secret)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      {copiedField === 'modal-pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3CX Phone Settings */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>بيانات الربط مع برنامج 3CXPhone:</span>
                </h4>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-slate-400 font-sans">التحويلة (Extension):</span>
                    <span className="text-white font-bold">{createdUserModal.extension}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-slate-400 font-sans">عنوان السيرفر (PBX IP):</span>
                    <span className="text-cyan-300 font-bold">{createdUserModal.sipServer || '192.168.1.100'}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-slate-400 font-sans">Outbound Proxy:</span>
                    <span className="text-cyan-300 font-bold">{createdUserModal.sipServer || '192.168.1.100'}:5060</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => handleDownloadConfig(createdUserModal)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل ملف التكوين (.3cxconfig)</span>
                </button>

                <button
                  onClick={() => setCreatedUserModal(null)}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  تم، إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User / Extension Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95">
            <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تعديل بيانات المستخدم والتحويلة</h3>
                  <p className="text-[11px] text-slate-400">
                    تعديل حساب: {editingUser.name} (#{editingUser.extension}) ومزامنته فوراً
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedUser} className="p-6 space-y-4 overflow-y-auto flex-1 text-right">
              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">اسم الموظف بالكامل: *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="مثال: محمد السيد"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Username (Login ID) & Extension */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    اسم المستخدم / ID للدخول: *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">معرف الدخول للنظام</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    رقم التحويلة الداخلية: *
                  </label>
                  <input
                    type="text"
                    required
                    value={editExtension}
                    onChange={(e) => setEditExtension(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">رقم طلب الخط الداخلي</span>
                </div>
              </div>

              {/* Password & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    كلمة المرور (للدخول ولـ 3CX): *
                  </label>
                  <div className="relative">
                    <input
                      type={editShowPassword ? 'text' : 'password'}
                      required
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono pl-9"
                    />
                    <button
                      type="button"
                      onClick={() => setEditShowPassword(!editShowPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    >
                      {editShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">نوع الصلاحية والشاشة:</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="agent">موظف اتصال (شاشة الأزرار و3CX فقط)</option>
                    <option value="admin">مدير نظام (لوحة التحكم الكاملة)</option>
                    <option value="supervisor">مشرف خدمة</option>
                  </select>
                </div>
              </div>

              {/* Email & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="user@etsalati.local"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">حالة التواجد (Presence):</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="online">متاح (Online)</option>
                    <option value="busy">مشغول (Busy)</option>
                    <option value="dnd">ممنوع الإزعاج (DND)</option>
                    <option value="away">في استراحة (Away)</option>
                    <option value="offline">غير متصل (Offline)</option>
                  </select>
                </div>
              </div>

              {/* SIP Server & Protocol */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">عنوان سيرفر SIP (PBX IP):</label>
                  <input
                    type="text"
                    value={editSipServer}
                    onChange={(e) => setEditSipServer(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">البروتوكول:</label>
                  <select
                    value={editProtocol}
                    onChange={(e) => setEditProtocol(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="SIP">SIP / PJSIP (موصى به لـ 3CX)</option>
                    <option value="IAX2">IAX2</option>
                  </select>
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editVoicemailEnabled}
                    onChange={(e) => setEditVoicemailEnabled(e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300 font-semibold">تفعيل البريد الصوتي</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRecordingEnabled}
                    onChange={(e) => setEditRecordingEnabled(e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300 font-semibold">تفعيل تسجيل المكالمات</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-600/30 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ التعديلات...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ التعديلات في النظام وFirebase</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-950/80 to-slate-900 px-6 py-4 border-b border-rose-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تأكيد حذف المستخدم والتحويلة</h3>
                  <p className="text-[11px] text-rose-300 font-medium">إجراء نهائي لا يمكن التراجع عنه</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                disabled={isDeletingLoading}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs text-right">
              <p className="text-slate-300 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا المستخدم نهائياً؟ سيتم إلغاء التحويلة وحذف حسابه وجميع بياناته تلقائياً من النظام وقاعدة بيانات Firebase (مشروع mokalamaty-160e0).
              </p>

              {/* User details card */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">اسم الموظف:</span>
                  <span className="text-white font-bold text-sm">{deletingUser.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">رقم التحويلة (SIP Ext):</span>
                  <span className="font-mono text-cyan-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {deletingUser.extension}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">اسم المستخدم (ID):</span>
                  <span className="font-mono text-slate-300 font-bold">{deletingUser.username || deletingUser.extension}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">نوع الصلاحية:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    deletingUser.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    deletingUser.role === 'supervisor' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' :
                    'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    {deletingUser.role === 'admin' ? 'مدير نظام (Admin)' : deletingUser.role === 'supervisor' ? 'مشرف اتصالات' : 'موظف اتصال (Agent)'}
                  </span>
                </div>
              </div>

              {/* Warning if deleting current session user */}
              {(currentUser.id === deletingUser.id || currentUser.extension === deletingUser.extension) && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    ⚠️ <strong>تنبيه:</strong> أنت تقوم بحذف الحساب المسجل به حالياً! سيتم تسجيل خروجك فور تأكيد الحذف.
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeletingLoading}
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  إلغاء وتراجع
                </button>
                <button
                  type="button"
                  disabled={isDeletingLoading}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  {isDeletingLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحذف من Firebase...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>تأكيد الحذف نهائياً</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
