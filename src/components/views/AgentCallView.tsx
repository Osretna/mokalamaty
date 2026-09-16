import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Clock,
  User,
  ShieldCheck,
  Check,
  Copy,
  Download,
  Flame,
  Radio,
  Server,
  LogOut,
  Smartphone,
  Info,
  CheckCircle2,
  FileText,
  Settings,
  Headphones,
  Wrench,
  Sparkles,
  Activity,
  Wifi,
  AlertTriangle
} from 'lucide-react';
import { PBXUser, Call } from '../../types';
import {
  playDTMF,
  startDialTone,
  stopDialTone,
  startLiveMicTest,
  playTelephonyFx
} from '../../utils/audioTones';
import { downloadCallAudioBlob } from '../../lib/firebase';
import { ThreeCXDiagnosticModal } from '../ThreeCXDiagnosticModal';

interface AgentCallViewProps {
  currentUser: PBXUser;
  activeCalls: Call[];
  incomingCall: Call | null;
  callHistory: Call[];
  onMakeCall: (number: string, name?: string) => void;
  onHangupCall: (callId: string) => void;
  onHoldToggle: (callId: string) => void;
  onAnswerIncoming: () => void;
  onRejectIncoming: () => void;
  onTriggerSimulatedCall: () => void;
  onLogout: () => void;
  onSwitchToAdmin?: () => void;
}

export const AgentCallView: React.FC<AgentCallViewProps> = ({
  currentUser,
  activeCalls,
  incomingCall,
  callHistory,
  onMakeCall,
  onHangupCall,
  onHoldToggle,
  onAnswerIncoming,
  onRejectIncoming,
  onTriggerSimulatedCall,
  onLogout,
  onSwitchToAdmin,
}) => {
  const [dialNumber, setDialNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lastDialed, setLastDialed] = useState<string>('');
  const [callNotes, setCallNotes] = useState('');
  const [is3CXFixModalOpen, setIs3CXFixModalOpen] = useState(false);
  const [isOffHook, setIsOffHook] = useState(false);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micStopFn, setMicStopFn] = useState<(() => void) | null>(null);

  // Find active call for this agent's extension
  const currentCall = activeCalls.find((c) => c.extension === currentUser.extension) || activeCalls[0];

  // Stop dial tone when in call or call state changes
  useEffect(() => {
    if (currentCall) {
      stopDialTone();
      setIsOffHook(true);
    } else if (!isOffHook) {
      stopDialTone();
    }
  }, [currentCall]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopDialTone();
      if (micStopFn) {
        micStopFn();
      }
    };
  }, [micStopFn]);

  // Toggle Hook Switch (رفع / إنزال السماعة)
  const handleToggleHook = () => {
    if (currentCall) {
      onHangupCall(currentCall.id);
      setIsOffHook(false);
      stopDialTone();
      playTelephonyFx('hangup');
    } else if (isOffHook) {
      // Put On Hook
      setIsOffHook(false);
      stopDialTone();
      playTelephonyFx('hangup');
    } else {
      // Take Off Hook -> Start PBX Dial Tone
      setIsOffHook(true);
      startDialTone();
    }
  };

  // Toggle Live Mic Echo Test
  const handleToggleMicTest = async () => {
    if (isMicTesting && micStopFn) {
      micStopFn();
      setMicStopFn(null);
      setIsMicTesting(false);
      setMicLevel(0);
    } else {
      try {
        const { stop } = await startLiveMicTest((level) => {
          setMicLevel(level);
        }, true);
        setMicStopFn(() => stop);
        setIsMicTesting(true);
      } catch {
        alert('يرجى السماح بالوصول إلى الميكروفون من إعدادات المتصفح');
      }
    }
  };

  // Keypad buttons
  const keypad = [
    { digit: '1', sub: '' },
    { digit: '2', sub: 'ABC' },
    { digit: '3', sub: 'DEF' },
    { digit: '4', sub: 'GHI' },
    { digit: '5', sub: 'JKL' },
    { digit: '6', sub: 'MNO' },
    { digit: '7', sub: 'PQRS' },
    { digit: '8', sub: 'TUV' },
    { digit: '9', sub: 'WXYZ' },
    { digit: '*', sub: '' },
    { digit: '0', sub: '+' },
    { digit: '#', sub: '' },
  ];

  const handleKeyPress = (digit: string) => {
    stopDialTone();
    playDTMF(digit);
    setDialNumber((prev) => prev + digit);
  };

  const handleCall = () => {
    if (!dialNumber.trim()) return;
    stopDialTone();
    setIsOffHook(true);
    setLastDialed(dialNumber);
    onMakeCall(dialNumber.trim());
    setDialNumber('');
  };

  const handleRedial = () => {
    if (lastDialed) {
      stopDialTone();
      setIsOffHook(true);
      onMakeCall(lastDialed);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // 3CX Phone Credentials
  const pbxHost = currentUser.sipServer || '192.168.1.100';
  const threeCXConfig = {
    accountName: `mokalamaty_${currentUser.extension}`,
    callerId: `${currentUser.name} (${currentUser.extension})`,
    extension: currentUser.extension,
    id: currentUser.username || currentUser.extension,
    password: currentUser.password || currentUser.secret || '123456',
    serverIp: pbxHost,
    outboundProxy: `${pbxHost}:5060`,
  };

  // Generate .3cxconfig XML download
  const handleDownload3CXConfig = () => {
    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<AccountConfiguration>
  <AccountName>${threeCXConfig.accountName}</AccountName>
  <CallerID>${threeCXConfig.callerId}</CallerID>
  <Extension>${threeCXConfig.extension}</Extension>
  <ID>${threeCXConfig.id}</ID>
  <Password>${threeCXConfig.password}</Password>
  <ServerIP>${threeCXConfig.serverIp}</ServerIP>
  <OutboundProxy>${threeCXConfig.outboundProxy}</OutboundProxy>
  <Protocol>UDP</Protocol>
  <Port>5060</Port>
  <Codec>G711u,G711a,G729</Codec>
</AccountConfiguration>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3cx_config_${currentUser.extension}.3cxconfig`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter call history for this user
  const myHistory = callHistory.filter((c) => c.extension === currentUser.extension);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Agent Bar */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & User Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-cyan-600/30 font-bold">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white leading-tight">
                  واجهة موظف الاتصال • {currentUser.name}
                </h1>
                <span className="text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  تحويلة: #{currentUser.extension}
                </span>
                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>3CX جاهز للاتصال</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                اسم المستخدم للدخول: <span className="font-mono text-cyan-300 font-semibold">{currentUser.username || currentUser.extension}</span>
              </p>
            </div>
          </div>

          {/* Status Indicators & Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Inbound Test Call Simulation */}
            <button
              onClick={onTriggerSimulatedCall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              title="محاكاة مكالمة واردة لاختبار شاشة المتصل والتوقيت"
            >
              <PhoneIncoming className="w-3.5 h-3.5 text-amber-400" />
              <span>محاكاة اتصال وارد</span>
            </button>

            {/* If Admin is previewing, button to return to Admin Dashboard */}
            {currentUser.role === 'admin' && onSwitchToAdmin && (
              <button
                onClick={onSwitchToAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>العودة للوحة الإدارة</span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/50 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-xs font-semibold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 flex-1 w-full space-y-6">
        
        {/* 3CX "Not connected" Fix Notification Banner */}
        <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-cyan-500/15 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3 text-right">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Wifi className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  دليل حل مشكلة الربط الفعلي
                </span>
                <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  تحويل Not connected ➔ On Hook 🟢
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1">
                هل يظهر لك برنامج 3CXPhone رسالة "Not connected" وتريد تحويله إلى On Hook فوراً؟
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                اكتشفنا الخطأ الموجود في إعدادات Outbound Proxy وتطابق حقل ID مع التحويلة من صورتك • اضغط هنا للحصول على الحل وتنزيل ملف التكوين الجاهز.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIs3CXFixModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all active:scale-95 cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>حل مشكلة 3CX وتحويله إلى On Hook</span>
            </button>
          </div>
        </div>

        {/* Incoming Call Screen-Pop Alert Banner (If Any) */}
        {incomingCall && (
          <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/90 border-2 border-emerald-500 rounded-2xl p-5 shadow-2xl animate-pulse">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-right">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center animate-bounce shadow-lg shadow-emerald-500/30">
                  <PhoneIncoming className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                      مكالمة واردة الآن (Incoming SIP Call)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                      كود: {incomingCall.callCode}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">{incomingCall.callerName}</h3>
                  <p className="text-sm font-mono text-emerald-400 font-bold mt-0.5">
                    الرقم: {incomingCall.callerNumber} • إلى تحويلة {currentUser.extension}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={onRejectIncoming}
                  className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>رفض المكالمة</span>
                </button>
                <button
                  onClick={onAnswerIncoming}
                  className="flex-1 md:flex-none px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>الرد على المكالمة</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Grid: [Dialpad & Live Call Console] & [Caller Info + 3CX Setup] */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 cols): Dial Pad & Control Buttons (قائمة الأزرار) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-cyan-400" />
                  <span>لوحة الأزرار والاتصال (Dial Pad)</span>
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  SIP / {currentUser.protocol}
                </span>
              </div>

              {/* Line Hook Status & Operator Switch */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 mb-4 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3.5 h-3.5 rounded-full ${
                    currentCall
                      ? 'bg-red-500 animate-ping'
                      : isOffHook
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                  }`} />
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">حالة الخط (Line Hook Status):</div>
                    <div className="text-xs font-mono font-black flex items-center gap-1.5 mt-0.5">
                      {currentCall ? (
                        <span className="text-red-400">🔴 In Call (جاري المكالمة)</span>
                      ) : isOffHook ? (
                        <span className="text-amber-300">🟡 Off Hook (سماعة مرفوعة - حرارة)</span>
                      ) : (
                        <span className="text-emerald-400">🟢 On Hook (جاهز ومغلق)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hook Switch Toggle Button */}
                <button
                  onClick={handleToggleHook}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
                    currentCall || isOffHook
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 shadow-red-500/10'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
                  }`}
                  title={isOffHook ? 'إنزال السماعة (Put On Hook)' : 'رفع السماعة وسماع نغمة البدالة (Take Off Hook)'}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{isOffHook || currentCall ? 'إنزال السماعة (On Hook)' : 'رفع السماعة (Off Hook)'}</span>
                </button>
              </div>

              {/* Live Mic Echo Test & Level Meter */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 mb-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-300">اختبار الميكروفون الحقيقي (Echo Test)</span>
                  </div>
                  <button
                    onClick={handleToggleMicTest}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isMicTesting
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isMicTesting ? 'إيقاف الاختبار' : 'اختبار الصوت الحي'}</span>
                  </button>
                </div>

                {isMicTesting && (
                  <div className="space-y-1.5 pt-1 animate-in fade-in">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>مستوى التقاط الصوت:</span>
                      <span className="text-emerald-400 font-bold">{micLevel}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full transition-all duration-75 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400"
                        style={{ width: `${Math.max(5, micLevel)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-emerald-300 font-medium">
                      ✓ الميكروفون متصل ويعمل! تحدث وستسمع صوتك مباشرة لاختبار الجودة.
                    </p>
                  </div>
                )}
              </div>

              {/* Dial Input Field */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={dialNumber}
                  onChange={(e) => setDialNumber(e.target.value)}
                  placeholder="أدخل الرقم المطلوب أو استخدم الأزرار..."
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-3.5 text-center text-lg font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all tracking-wider"
                />
                {dialNumber && (
                  <button
                    onClick={() => setDialNumber((prev) => prev.slice(0, -1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-xs font-bold cursor-pointer"
                  >
                    مسح
                  </button>
                )}
              </div>

              {/* Keypad Grid (قائمة الأزرار) */}
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {keypad.map((k) => (
                  <button
                    key={k.digit}
                    onClick={() => handleKeyPress(k.digit)}
                    className="py-3 sm:py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-cyan-600/30 border border-slate-700/60 hover:border-cyan-500/50 text-white font-bold transition-all active:scale-95 flex flex-col items-center justify-center cursor-pointer group"
                  >
                    <span className="text-lg font-mono leading-none group-hover:text-cyan-300">
                      {k.digit}
                    </span>
                    {k.sub && (
                      <span className="text-[9px] text-slate-500 font-normal tracking-widest mt-0.5">
                        {k.sub}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Main Call Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {currentCall ? (
                  <button
                    onClick={() => onHangupCall(currentCall.id)}
                    className="col-span-2 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>إنهاء المكالمة الحالية</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleCall}
                      disabled={!dialNumber.trim()}
                      className="py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                      <PhoneCall className="w-5 h-5" />
                      <span>اتصال</span>
                    </button>

                    <button
                      onClick={handleRedial}
                      disabled={!lastDialed}
                      className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all active:scale-95 cursor-pointer"
                      title={lastDialed ? `إعادة الاتصال بالرقم ${lastDialed}` : 'لا يوجد رقم سابق'}
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>إعادة طلب</span>
                    </button>
                  </>
                )}
              </div>

              {/* Auxiliary Controls (Hold / Mute during call) */}
              {currentCall && (
                <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => onHoldToggle(currentCall.id)}
                    className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      currentCall.status === 'on_hold'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {currentCall.status === 'on_hold' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    <span>{currentCall.status === 'on_hold' ? 'استئناف' : 'تعليق (Hold)'}</span>
                  </button>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isMuted
                        ? 'bg-red-500/20 text-red-300 border-red-500/50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
                    <span>{isMuted ? 'إلغاء الكتم' : 'كتم الميكروفون'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (7 cols): [Caller Info & Timing] + [3CXPhone Integration Guide] */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Caller Information & Live Timing Card (بيانات المستخدم المتصل والتوقيت) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white">بيانات المتصل والتوقيت اللحظي (Caller Info & Timing)</h2>
                </div>
                {currentCall && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>مكالمة نشطة الآن</span>
                  </span>
                )}
              </div>

              {currentCall ? (
                /* Active Call Details */
                <div className="space-y-4">
                  {/* Top Banner with Caller Name & Code */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                          {currentCall.direction === 'inbound' ? 'واردة (Inbound)' : 'صادرة (Outbound)'}
                        </span>
                        <span className="text-xs font-bold font-mono text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          كود المكالمة: {currentCall.callCode}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white mt-1.5">{currentCall.callerName}</h3>
                      <div className="text-sm font-mono text-slate-300 font-bold mt-0.5">
                        رقم الهاتف: {currentCall.callerNumber}
                      </div>
                    </div>

                    {/* Live Timing / Stopwatch (التوقيت) */}
                    <div className="bg-slate-950/80 border border-slate-700/80 rounded-2xl px-5 py-3 text-center sm:text-left shadow-inner">
                      <div className="text-[11px] text-slate-400 flex items-center justify-center sm:justify-start gap-1 font-semibold mb-0.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>التوقيت والمدة الحية:</span>
                      </div>
                      <div className="text-2xl font-mono font-black text-emerald-400 tracking-wider">
                        {formatSeconds(currentCall.duration)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        بدأت في: {currentCall.startTime}
                      </div>
                    </div>
                  </div>

                  {/* Channel & Recording Info */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                      <span className="text-slate-400 block text-[11px]">قناة Asterisk:</span>
                      <span className="font-mono text-slate-200 font-bold truncate block mt-0.5">
                        {currentCall.channelId}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-[11px]">تسجيل المكالمة:</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span>جاري التسجيل آلياً</span>
                        </span>
                      </div>
                      <button
                        onClick={() => downloadCallAudioBlob(currentCall)}
                        className="p-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/50 text-[11px] flex items-center gap-1 cursor-pointer"
                        title="تحميل المقطع المسجل"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>WAV</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Agent Notes */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      ملاحظات المكالمة السريعة:
                    </label>
                    <textarea
                      rows={2}
                      value={callNotes}
                      onChange={(e) => setCallNotes(e.target.value)}
                      placeholder="اكتب ملخص ما تم في المكالمة مع العميل..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* Idle State */
                <div className="py-8 px-4 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Headphones className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">الخط جاهز ومتاح لاستقبال المكالمات</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                    عند ورود أي مكالمة عبر <span className="text-cyan-300 font-semibold">3CXPhone</span> أو تحويلتك، ستظهر هنا فوراً بيانات المتصل الكاملة واسمه ورقمه مع عداد التوقيت اللحظي بدقة.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={onTriggerSimulatedCall}
                      className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <PhoneIncoming className="w-4 h-4 text-cyan-400" />
                      <span>تجربة ظهور المتصل والتوقيت الآن</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. 3CXPhone Integration Guide Card (الربط ببرنامج 3CXPhone) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-white">
                    بيانات الربط ببرنامج 3CXPhone (Windows / Mobile)
                  </h2>
                </div>
                <button
                  onClick={handleDownload3CXConfig}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
                  title="تحميل ملف الإعداد التلقائي للتطبيق"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل ملف التكوين (.3cxconfig)</span>
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                قم بتنصيب تطبيق <span className="text-white font-semibold">3CXPhone</span> على جهازك (Windows أو الهاتف)، ثم افتح <strong>Accounts</strong> وأدخل البيانات التالية الخاصة بتحويلتك:
              </p>

              {/* Parameter Table with One-Click Copy */}
              <div className="space-y-2 font-mono text-xs">
                {/* Account Name */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <div>
                    <span className="text-slate-400 font-sans text-[11px] block">اسم الحساب (Account Name):</span>
                    <span className="text-white font-bold">{threeCXConfig.accountName}</span>
                  </div>
                  <button
                    onClick={() => handleCopy('accountName', threeCXConfig.accountName)}
                    className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="نسخ"
                  >
                    {copiedKey === 'accountName' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Extension & ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div>
                      <span className="text-slate-400 font-sans text-[11px] block">التحويلة (Extension):</span>
                      <span className="text-cyan-300 font-bold">{threeCXConfig.extension}</span>
                    </div>
                    <button
                      onClick={() => handleCopy('extension', threeCXConfig.extension)}
                      className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedKey === 'extension' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div>
                      <span className="text-slate-400 font-sans text-[11px] block">اسم المستخدم / ID:</span>
                      <span className="text-cyan-300 font-bold">{threeCXConfig.id}</span>
                    </div>
                    <button
                      onClick={() => handleCopy('id', threeCXConfig.id)}
                      className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedKey === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Password & Server IP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div>
                      <span className="text-slate-400 font-sans text-[11px] block">كلمة المرور (Password):</span>
                      <span className="text-amber-300 font-bold">{threeCXConfig.password}</span>
                    </div>
                    <button
                      onClick={() => handleCopy('password', threeCXConfig.password)}
                      className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedKey === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div>
                      <span className="text-slate-400 font-sans text-[11px] block">سيرفر البدالة (PBX Server IP):</span>
                      <span className="text-white font-bold">{threeCXConfig.serverIp}</span>
                    </div>
                    <button
                      onClick={() => handleCopy('serverIp', threeCXConfig.serverIp)}
                      className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedKey === 'serverIp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Crucial Outbound Proxy Notice */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="text-[11px] font-sans">
                    <span className="font-bold text-amber-300 block">تنبيه Outbound Proxy:</span>
                    <span className="text-slate-300">يجب أن يكون خيار Outbound Proxy غير مفعل (Unchecked) في 3CXPhone.</span>
                  </div>
                  <button
                    onClick={() => setIs3CXFixModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>تفاصيل الإصلاح</span>
                  </button>
                </div>
              </div>

              {/* Status footer */}
              <div className="mt-3.5 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>حالة الخط: <strong>On Hook / جاهز للاتصال</strong></span>
                </div>
                <button
                  onClick={() => setIs3CXFixModalOpen(true)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                >
                  حل مشكلة Not Connected في 3CX ➔
                </button>
              </div>
            </div>

            {/* 3. My Recent Calls (سجل مكالمات الموظف) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>سجل مكالماتي الأخيرة ({currentUser.name})</span>
              </h2>

              {myHistory.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">لا توجد مكالمات سابقة مسجلة لتحويلتك حتى الآن.</p>
              ) : (
                <div className="divide-y divide-slate-800/80 text-xs">
                  {myHistory.slice(0, 5).map((call) => (
                    <div key={call.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                          {call.direction === 'inbound' ? (
                            <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <PhoneOutgoing className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white">{call.callerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {call.callerNumber} • كود: {call.callCode}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-mono text-emerald-400 font-bold">
                            {formatSeconds(call.duration)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{call.startTime}</div>
                        </div>
                        <button
                          onClick={() => downloadCallAudioBlob(call)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors cursor-pointer"
                          title="تحميل التسجيل"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 3CX Diagnostics and Fix Modal */}
      <ThreeCXDiagnosticModal
        isOpen={is3CXFixModalOpen}
        onClose={() => setIs3CXFixModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
};
