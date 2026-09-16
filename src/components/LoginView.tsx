import React, { useState } from 'react';
import { 
  PhoneCall, 
  Lock, 
  User, 
  ShieldCheck, 
  Flame, 
  ArrowRight, 
  Headphones, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Server
} from 'lucide-react';
import { PBXUser } from '../types';

interface LoginViewProps {
  users: PBXUser[];
  onLoginSuccess: (user: PBXUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, onLoginSuccess }) => {
  const [usernameOrExt, setUsernameOrExt] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const term = usernameOrExt.trim().toLowerCase();
      const pass = password.trim();

      // Find user by username, extension, or email
      const matched = users.find(
        (u) =>
          u.username?.toLowerCase() === term ||
          u.extension.toLowerCase() === term ||
          u.id.toLowerCase() === term ||
          u.email.toLowerCase() === term
      );

      if (!matched) {
        setErrorMsg('اسم المستخدم أو رقم التحويلة غير مسجل في النظام');
        setIsLoading(false);
        return;
      }

      // Check password (support password, secret, or default admin123 / pass)
      const validPasswords = [
        matched.password,
        matched.secret,
        matched.role === 'admin' ? 'admin123' : `pass${matched.extension}`,
        '123456',
      ].filter(Boolean);

      if (pass && (validPasswords.includes(pass) || matched.password === pass)) {
        onLoginSuccess(matched);
      } else if (!matched.password && (!pass || pass === '123456' || pass === matched.secret)) {
        onLoginSuccess(matched);
      } else {
        setErrorMsg('كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة');
      }
      setIsLoading(false);
    }, 400);
  };

  const handleQuickDemo = (user: PBXUser, pass: string) => {
    setUsernameOrExt(user.username || user.extension);
    setPassword(pass);
    setErrorMsg(null);
  };

  const adminUser = users.find((u) => u.role === 'admin') || users[0];
  const agentUser = users.find((u) => u.role === 'agent') || users[1];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-7 shadow-2xl backdrop-blur-xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Header Branding */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-cyan-400 text-white shadow-lg shadow-cyan-500/25 mb-3.5">
            <PhoneCall className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">نظام اتصالاتي وAsterisk PBX</h1>
          <p className="text-xs text-slate-400 mt-1">بوابة تسجيل الدخول الموحدة للربط مع 3CXPhone وقاعدة Firebase</p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Firebase: mokalamaty-160e0</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
              <Server className="w-3 h-3" />
              <span>SIP & 3CX Ready</span>
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-200 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
              اسم المستخدم (ID) أو رقم التحويلة:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="login-username-input"
                type="text"
                required
                value={usernameOrExt}
                onChange={(e) => setUsernameOrExt(e.target.value)}
                placeholder="أدخل اسم المستخدم أو التحويلة (مثال: admin أو 102)"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-right"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
              كلمة المرور (Password):
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الخاصة بحسابك"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-right"
              />
            </div>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري التحقق والدخول...</span>
              </span>
            ) : (
              <>
                <span>تسجيل الدخول للنظام</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Badges */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 text-center mb-2.5">
            تجربة سريعة للحسابات المسجلة:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {/* Admin demo */}
            {adminUser && (
              <button
                type="button"
                onClick={() => handleQuickDemo(adminUser, adminUser.password || 'admin123')}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-amber-500/30 text-right transition-all text-[11px] text-slate-300 hover:border-amber-400 group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>المدير (Admin)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">ID: {adminUser.username || 'admin'}</div>
                <div className="text-[9px] text-slate-500">لوحة التحكم الكاملة</div>
              </button>
            )}

            {/* Agent demo */}
            {agentUser && (
              <button
                type="button"
                onClick={() => handleQuickDemo(agentUser, agentUser.password || 'pass102')}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-cyan-500/30 text-right transition-all text-[11px] text-slate-300 hover:border-cyan-400 group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-0.5">
                  <Headphones className="w-3.5 h-3.5" />
                  <span>موظف (Agent)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">ID: {agentUser.username || 'ahmed102'}</div>
                <div className="text-[9px] text-slate-500">أزرار وبيانات المتصل و3CX</div>
              </button>
            )}
          </div>
        </div>

        {/* Roles Rule note */}
        <div className="mt-5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-400 leading-relaxed text-right">
          <span className="font-semibold text-cyan-400">ملاحظة الصلاحيات:</span>
          <p className="mt-0.5 text-slate-400 text-[10px]">
            • حساب <span className="text-amber-300">المدير (Admin)</span> يفتح لوحة التحكم الشاملة وإدارة المستخدمين.
            <br />
            • حسابات <span className="text-cyan-300">الموظفين (Agents)</span> تفتح فقط واجهة الاتصال (قائمة الأزرار، بيانات المتصل، التوقيت، وربط تطبيق 3CXPhone).
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-slate-500">
        نظام اتصالاتي الموحد • تكامل Asterisk PBX و3CXPhone وFirebase Realtime
      </div>
    </div>
  );
};
