import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  Wrench, 
  AlertTriangle, 
  Wifi, 
  ShieldAlert, 
  Server, 
  CheckCircle2, 
  ArrowRight,
  Info
} from 'lucide-react';
import { TelephonyUser } from '../types/telephony';

interface Admin3CXSettingsProps {
  currentUser: TelephonyUser;
}

export const Admin3CXSettings: React.FC<Admin3CXSettingsProps> = ({ currentUser }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showFixModal, setShowFixModal] = useState(false);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const download3cxConfig = () => {
    const configContent = `[Account]
AccountName=mokalamaty_${currentUser.extension}
CallerID=${currentUser.extension}
DisplayName=${currentUser.name}
Extension=${currentUser.extension}
AuthID=${currentUser.extension}
AuthPassword=${currentUser.password || currentUser.extension}
PBXServerIP=${currentUser.pbxServerIp}
OutboundProxy=
UseOutboundProxy=0
AutoAnswer=0
CodecPriority=G711u,G711a,G729
`;
    const blob = new Blob([configContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mokalamaty_${currentUser.extension}.3cxconfig`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Top Banner (Exactly matching User's Image 7) */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-[#131b2e] to-slate-900 border border-amber-600/40 p-4 sm:p-5 shadow-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  تحويل Not connected ← On Hook
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-500/40">
                  دليل حل مشكلة الربط الفعلي
                </span>
              </div>
              
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                هل يظهر لك برنامج 3CXPhone رسالة "Not connected" وتريد تحويله إلى On Hook فوراً؟
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                اكتشفنا الخطأ الموجود في إعدادات Outbound Proxy وتطابق حقل ID مع التحويلة • اضغط هنا للحصول على الحل وتنزيل ملف التكوين الجاهز.
              </p>
            </div>
          </div>

          <button
            id="btn-3cx-fix-guide"
            onClick={() => setShowFixModal(true)}
            className="self-start lg:self-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Wrench className="w-4 h-4" />
            حل مشكلة 3CX وتحويله إلى On Hook
          </button>
        </div>
      </div>

      {/* Main Connection Data Card (Exactly matching User's Image 8) */}
      <div className="rounded-3xl bg-[#0e1628]/95 border border-slate-800 p-5 sm:p-7 shadow-2xl">
        
        {/* Card Header with Download Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              بيانات الربط ببرنامج 3CXPhone (Windows / Mobile)
            </h2>
          </div>

          <button
            id="btn-download-3cxconfig"
            onClick={download3cxConfig}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/60 text-amber-300 font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            تحميل ملف التكوين (.3cxconfig)
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-slate-300 my-4 leading-relaxed">
          قم بتنصيب تطبيق <strong>3CXPhone</strong> على جهازك (Windows أو الهاتف)، ثم افتح <strong>Accounts</strong> وأدخل البيانات التالية الخاصة بتحويلتك:
        </p>

        {/* 2-Column Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          
          {/* Account Name */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl flex items-center justify-between">
            <button
              onClick={() => handleCopy('acc', `mokalamaty_${currentUser.extension}`)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              {copiedKey === 'acc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block">:اسم الحساب (Account Name)</span>
              <span className="font-mono text-sm font-bold text-cyan-300">mokalamaty_{currentUser.extension}</span>
            </div>
          </div>

          {/* Extension */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl flex items-center justify-between">
            <button
              onClick={() => handleCopy('ext', currentUser.extension)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              {copiedKey === 'ext' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block">:التحويلة (Extension)</span>
              <span className="font-mono text-sm font-bold text-white">{currentUser.extension}</span>
            </div>
          </div>

          {/* User ID */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl flex items-center justify-between">
            <button
              onClick={() => handleCopy('id', currentUser.extension)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              {copiedKey === 'id' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block">:اسم المستخدم / ID</span>
              <span className="font-mono text-sm font-bold text-white">{currentUser.extension}</span>
            </div>
          </div>

          {/* Password */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl flex items-center justify-between">
            <button
              onClick={() => handleCopy('pass', currentUser.password || currentUser.extension)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              {copiedKey === 'pass' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block">:كلمة المرور (Password)</span>
              <span className="font-mono text-sm font-bold text-white">{currentUser.password || currentUser.extension}</span>
            </div>
          </div>

          {/* PBX Server IP (Full Width) */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl flex items-center justify-between md:col-span-2">
            <button
              onClick={() => handleCopy('ip', currentUser.pbxServerIp)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              {copiedKey === 'ip' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block">:(PBX Server IP) سيرفر البدالة</span>
              <span className="font-mono text-sm font-bold text-emerald-400">{currentUser.pbxServerIp}</span>
            </div>
          </div>

        </div>

        {/* Outbound Proxy Warning Box */}
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              تنبيه Outbound Proxy:
            </div>
            <p className="text-xs text-slate-300">
              يجب أن يكون خيار <strong>Outbound Proxy غير مفعل (Unchecked)</strong> في إعدادات 3CXPhone لضمان استقرار الاتصال.
            </p>
          </div>

          <button
            onClick={() => setShowFixModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 self-start sm:self-center transition-colors shrink-0"
          >
            <Wrench className="w-3.5 h-3.5" />
            تفاصيل الإصلاح
          </button>
        </div>

        {/* Footer Status and Links */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          <button
            onClick={() => setShowFixModal(true)}
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            حل مشكلة Not Connected في 3CX
          </button>

          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>حالة الخط: On Hook / جاهز للاتصال</span>
          </div>
        </div>

      </div>

      {/* Repair / Fix Modal */}
      {showFixModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                خطوات تحويل 3CX إلى On Hook بنجاح
              </h3>
              <button
                onClick={() => setShowFixModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <strong className="text-emerald-400 block mb-1">1. تطابق اسم المستخدم والتحويلة:</strong>
                تأكد أن حقلي Extension و ID يحتويان كلاهما على الرقم <strong>{currentUser.extension}</strong> بالضبط.
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <strong className="text-amber-400 block mb-1">2. إلغاء تفعيل Outbound Proxy:</strong>
                في تبويب Advanced أو Network، تأكد من إزالة علامة الصح (Uncheck) من خيار "Use Outbound Proxy".
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <strong className="text-cyan-400 block mb-1">3. تنزيل ملف التكوين التلقائي:</strong>
                استخدم زر "تحميل ملف التكوين (.3cxconfig)" وافتحه مباشرة ليقوم البرنامج بضبط جميع الإعدادات فوراً وبدقة.
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowFixModal(false)}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
              >
                فهمت، إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
