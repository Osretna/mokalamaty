import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Copy,
  Check,
  Server,
  Key,
  ShieldCheck,
  Terminal,
  ExternalLink,
  HelpCircle,
  X,
  Radio,
  Wifi
} from 'lucide-react';
import { PBXUser } from '../types';

interface ThreeCXDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PBXUser;
}

export function ThreeCXDiagnosticModal({ isOpen, onClose, currentUser }: ThreeCXDiagnosticModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fix' | 'asterisk' | 'stepbystep'>('fix');

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const extension = currentUser.extension;
  const username = currentUser.username || currentUser.extension;
  const password = currentUser.password || currentUser.secret || '123456';
  const serverIp = currentUser.sipServer || '64.29.17.3';

  // Correct XML for 3CXPhone
  const handleDownloadFixed3CX = () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<AccountConfiguration>
  <AccountName>mokalamaty_${extension}</AccountName>
  <CallerID>${currentUser.name} (${extension})</CallerID>
  <Extension>${extension}</Extension>
  <ID>${extension}</ID>
  <Password>${password}</Password>
  <ServerIP>${serverIp}</ServerIP>
  <OutboundProxy></OutboundProxy>
  <UseOutboundProxy>0</UseOutboundProxy>
  <Protocol>UDP</Protocol>
  <Port>5060</Port>
  <Codec>G711u,G711a,G729</Codec>
  <AutoProvisioning>0</AutoProvisioning>
</AccountConfiguration>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3cx_ON_HOOK_${extension}.3cxconfig`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Asterisk PJSIP config
  const pjsipConfig = `; ==========================================
; إعدادات التحويلة ${extension} في Asterisk (PJSIP)
; أضف هذا النص في نهاية ملف /etc/asterisk/pjsip.conf
; ==========================================

[${extension}]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=${extension}-auth
aors=${extension}-aor

[${extension}-auth]
type=auth
auth_type=userpass
username=${extension}
password=${password}

[${extension}-aor]
type=aor
max_contacts=5
remove_existing=yes

; ==========================================
; أمر تحديث الإعدادات في Asterisk فوراً:
; asterisk -rx "pjsip reload"
; ==========================================`;

  // Asterisk chan_sip legacy config
  const sipConf = `; ==========================================
; إعدادات التحويلة ${extension} في Asterisk (chan_sip)
; أضف هذا النص في نهاية ملف /etc/asterisk/sip.conf
; ==========================================

[${extension}]
type=friend
host=dynamic
secret=${password}
context=from-internal
dtmfmode=rfc2833
disallow=all
allow=ulaw
allow=alaw
qualify=yes
nat=force_rport,comedia

; ==========================================
; أمر تحديث الإعدادات في Asterisk:
; asterisk -rx "sip reload"
; ==========================================`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-3xl max-w-3xl w-full shadow-2xl shadow-cyan-950/60 overflow-hidden my-6 text-right animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-cyan-950/60 to-slate-950 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shadow-lg">
              <Wifi className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>تشخيص وإصلاح ربط 3CXPhone لتحويله إلى</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-0.5 rounded-full font-mono">
                  On Hook 🟢
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                حل سبب ظهور <span className="text-red-400 font-bold font-mono">Not connected</span> وضبط خادم SIP بالشكل الصحيح
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('fix')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'fix'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>تصحيح الأخطاء الموضحة بالصورة</span>
          </button>

          <button
            onClick={() => setActiveTab('stepbystep')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stepbystep'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>القيم الصحيحة خطوة بخطوة</span>
          </button>

          <button
            onClick={() => setActiveTab('asterisk')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'asterisk'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>كود تفعيل التحويلة في Asterisk</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'fix' && (
            <div className="space-y-5">
              {/* Alert banner explaining the exact error in the screenshot */}
              <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-4 text-slate-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-red-300">
                      لماذا يظهر 3CXPhone رسالة "Not connected" بدلاً من "On Hook"؟
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      من واقع لقطة الشاشة التي قمت برفعها لإعدادات 3CX، هناك <strong className="text-white">خطأان رئيسيان</strong> يمنعان البرنامج نهائياً من الاتصال:
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparison of the 2 bugs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Error 1 */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-red-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> الخطأ الأول (قاتل)
                    </span>
                    <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-mono">
                      Outbound Proxy
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-red-300 dir-ltr text-left break-all">
                    Use Outbound Proxy: https://mokalamaty.vercel.app/
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    <strong className="text-amber-300">السبب:</strong> بروتوكول SIP للاتصال يعمل على منفذ UDP 5060 ولا يقبل روابط الويب <code className="text-cyan-300">https://</code>.
                  </p>
                  <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/30 text-[11px] text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>الحل: قم بإلغاء تفعيل (Uncheck) هذا الخيار تماماً!</span>
                  </div>
                </div>

                {/* Error 2 */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> الخطأ الثاني
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
                      ID Mismatch
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-amber-300 dir-ltr text-left">
                    Extension: 106 | ID: 6666
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    <strong className="text-amber-300">السبب:</strong> في بدالات Asterisk وSIP، يجب أن يكون حقل <code className="text-cyan-300">ID</code> مطابقاً تماماً لرقم التحويلة <code className="text-emerald-400">{extension}</code> حتى يقبل السيرفر المصادقة.
                  </p>
                  <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/30 text-[11px] text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>الحل: اكتب في حقل ID الرقم {extension}</span>
                  </div>
                </div>
              </div>

              {/* Fast Fix Button: Auto config file download */}
              <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-emerald-950/60 p-5 rounded-2xl border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1 text-center sm:text-right">
                  <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>تخطي الإدخال اليدوي وحل المشكلة بضغطة واحدة</span>
                  </h4>
                  <p className="text-xs text-slate-300">
                    قم بتحميل ملف الإعداد المصحح (.3cxconfig) وفتحه بنقرتين لضبط 3CXPhone فوراً على <strong>On Hook</strong>
                  </p>
                </div>

                <button
                  onClick={handleDownloadFixed3CX}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل ملف 3cxconfig المصحح</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'stepbystep' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                افتح نافذة <strong>Account settings</strong> في 3CXPhone واملأ الحقول كما يلي بالضبط:
              </p>

              <div className="space-y-2.5">
                {/* Account Name */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-400">Account name:</span>
                    <div className="font-mono text-xs font-bold text-cyan-300">mokalamaty_{extension}</div>
                  </div>
                  <button
                    onClick={() => handleCopy('acc', `mokalamaty_${extension}`)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="نسخ"
                  >
                    {copiedKey === 'acc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Caller ID */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-400">Caller ID:</span>
                    <div className="font-mono text-xs font-bold text-cyan-300">{currentUser.name} ({extension})</div>
                  </div>
                  <button
                    onClick={() => handleCopy('caller', `${currentUser.name} (${extension})`)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedKey === 'caller' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Extension */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-400">Extension:</span>
                    <div className="font-mono text-xs font-bold text-emerald-400">{extension}</div>
                  </div>
                  <button
                    onClick={() => handleCopy('ext', extension)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedKey === 'ext' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* ID */}
                <div className="bg-slate-950 p-3 rounded-xl border-2 border-emerald-500/40 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-emerald-400 font-bold">ID (لا تكتب 6666):</span>
                    <div className="font-mono text-xs font-bold text-emerald-300">{extension}</div>
                  </div>
                  <button
                    onClick={() => handleCopy('id', extension)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedKey === 'id' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-400">Password:</span>
                    <div className="font-mono text-xs font-bold text-amber-300">{password}</div>
                  </div>
                  <button
                    onClick={() => handleCopy('pwd', password)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedKey === 'pwd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* IP PBX */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-400">I am in the office - local IP of PBX:</span>
                    <div className="font-mono text-xs font-bold text-cyan-300">{serverIp}</div>
                  </div>
                  <button
                    onClick={() => handleCopy('ip', serverIp)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedKey === 'ip' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Outbound Proxy (Crucial) */}
                <div className="bg-red-500/10 p-3 rounded-xl border-2 border-red-500/40 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-red-300 font-bold">Use Outbound Proxy server:</span>
                    <div className="text-xs text-white font-bold">
                      غير مفعل (Unchecked ⬜) - احذف أي رابط ويب أو https
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                    مهم جداً
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'asterisk' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span>تكوين التحويلة في سيرفر Asterisk PJSIP (الموصى به)</span>
                  </h4>
                  <button
                    onClick={() => handleCopy('pjsip', pjsipConfig)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors"
                  >
                    {copiedKey === 'pjsip' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>نسخ التكوين</span>
                  </button>
                </div>
                <pre className="bg-slate-900 p-3 rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto text-left dir-ltr border border-slate-800">
                  {pjsipConfig}
                </pre>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-purple-400" />
                    <span>تكوين بديل في Asterisk sip.conf (Legacy)</span>
                  </h4>
                  <button
                    onClick={() => handleCopy('sip', sipConf)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold transition-colors"
                  >
                    {copiedKey === 'sip' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>نسخ التكوين</span>
                  </button>
                </div>
                <pre className="bg-slate-900 p-3 rounded-xl text-[11px] font-mono text-purple-300 overflow-x-auto text-left dir-ltr border border-slate-800">
                  {sipConf}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            بمجرد تطبيق هذه التعديلات، ستتحول شاشة 3CXPhone فوراً إلى <strong className="text-emerald-400">On Hook</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
