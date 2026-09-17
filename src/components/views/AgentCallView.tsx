import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Clock,
  User,
  ShieldCheck,
  Download,
  LogOut,
  Users,
  CheckCircle2,
  Headphones,
  Sparkles,
  Search,
  Radio,
  UserCheck,
  ExternalLink,
  Volume2,
  Volume1,
  VolumeX,
  Activity,
  Waves
} from 'lucide-react';
import { PBXUser, Call } from '../../types';
import {
  playDTMF,
  playTelephonyFx
} from '../../utils/audioTones';
import { downloadCallAudioBlob } from '../../lib/firebase';
import { webrtcVoice } from '../../utils/webrtcVoiceService';

interface AgentCallViewProps {
  currentUser: PBXUser;
  activeCalls: Call[];
  incomingCall: Call | null;
  callHistory: Call[];
  users?: PBXUser[];
  onlineUsers?: Record<string, { lastSeen: number; name: string; extension: string }>;
  onSwitchUser?: (user: PBXUser) => void;
  onMakeCall: (number: string, name?: string) => void;
  onHangupCall: (callId: string) => void;
  onHoldToggle: (callId: string) => void;
  onAnswerIncoming: () => void;
  onRejectIncoming: () => void;
  onSimulateRemoteAnswer?: (callId: string) => void;
  onTriggerSimulatedCall?: () => void;
  onLogout: () => void;
  onSwitchToAdmin?: () => void;
}

export const AgentCallView: React.FC<AgentCallViewProps> = ({
  currentUser,
  activeCalls,
  incomingCall,
  callHistory,
  users = [],
  onlineUsers = {},
  onSwitchUser,
  onMakeCall,
  onHangupCall,
  onHoldToggle,
  onAnswerIncoming,
  onRejectIncoming,
  onSimulateRemoteAnswer,
  onTriggerSimulatedCall,
  onLogout,
  onSwitchToAdmin,
}) => {
  const [dialNumber, setDialNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [lastDialed, setLastDialed] = useState<string>('');
  const [callNotes, setCallNotes] = useState('');
  const [searchDirectory, setSearchDirectory] = useState('');
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState(false);

  // WebRTC Real-Time Voice Chat states
  const [voiceLevel, setVoiceLevel] = useState<number>(0);
  const [voiceStatus, setVoiceStatus] = useState<'connecting' | 'connected' | 'failed' | 'idle'>('idle');
  const [speakerVolume, setSpeakerVolume] = useState<number>(1);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isSpeakerphone, setIsSpeakerphone] = useState<boolean>(() => webrtcVoice.getIsSpeakerphoneOn());
  const [speakerGainBoost, setSpeakerGainBoost] = useState<number>(2.8);

  // Helper to normalize extension strings (removes '#', spaces, etc.)
  const cleanExt = (e?: string | number) => (e ? String(e).replace(/[^0-9a-zA-Z]/g, '').trim().toLowerCase() : '');
  const myExtNorm = cleanExt(currentUser.extension);
  const myNameNorm = String(currentUser.name || '').trim().toLowerCase();

  // Find active call for this agent's extension (either as caller or as callee)
  const currentCall = activeCalls.find((c) => {
    if (c.status === 'ended' || c.status === 'missed') return false;
    const callerExt = cleanExt(c.callerExtension || c.extension);
    const calleeExt = cleanExt(c.calleeExtension);
    const calleeName = String(c.calleeName || '').trim().toLowerCase();
    const callerName = String(c.callerName || '').trim().toLowerCase();

    return (
      (myExtNorm && (callerExt === myExtNorm || calleeExt === myExtNorm)) ||
      (myNameNorm && (calleeName === myNameNorm || callerName === myNameNorm))
    );
  });

  // Connect real two-way microphone audio as soon as call is answered ('connected')
  useEffect(() => {
    if (currentCall && currentCall.status === 'connected') {
      const isCaller =
        String(currentCall.callerExtension || currentCall.extension).trim() ===
        String(currentUser.extension).trim();

      setVoiceStatus('connecting');
      setVoiceNotice('جاري ربط المايكروفون وبدء المحادثة الصوتية الحية...');

      webrtcVoice
        .startVoiceSession(currentCall.id, isCaller, {
          onAudioLevel: (lvl) => {
            setVoiceLevel(lvl);
          },
          onStatusChange: (st) => {
            if (st === 'connected') {
              setVoiceStatus('connected');
              setVoiceNotice('المحادثة الصوتية متصلة بالمايكروفون الآن - تحدث مع الطرف الآخر بحرية');
            } else if (st === 'failed') {
              setVoiceStatus('failed');
              setVoiceNotice('يرجى السماح بصلاحية المايكروفون في المتصفح للتحدث بالصوت');
            }
          },
          onError: (err) => {
            setVoiceNotice(err);
          },
        })
        .catch(() => {});

      return () => {
        webrtcVoice.endVoiceSession();
        setVoiceStatus('idle');
        setVoiceLevel(0);
        setVoiceNotice(null);
      };
    } else {
      webrtcVoice.endVoiceSession();
      setVoiceStatus('idle');
      setVoiceLevel(0);
      setVoiceNotice(null);
    }
  }, [currentCall?.id, currentCall?.status]);

  const handleToggleMute = () => {
    const next = webrtcVoice.toggleMute();
    setIsMuted(next);
  };

  const handleChangeVolume = (vol: number) => {
    setSpeakerVolume(vol);
    webrtcVoice.setVolume(vol);
  };

  const handleToggleSpeakerphone = () => {
    const next = webrtcVoice.toggleSpeakerphone();
    setIsSpeakerphone(next);
  };

  const handleSetSpeakerGain = (boost: number) => {
    setSpeakerGainBoost(boost);
    webrtcVoice.setSpeakerphoneGain(boost);
    if (!isSpeakerphone) {
      webrtcVoice.setSpeakerphone(true);
      setIsSpeakerphone(true);
    }
  };

  // DTMF keypad buttons
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
    playDTMF(digit);
    setDialNumber((prev) => prev + digit);
  };

  const handleCall = () => {
    if (!dialNumber.trim()) return;
    const cleanNum = dialNumber.trim();
    const cleanDigits = cleanExt(cleanNum);
    const target = users.find(
      (u) =>
        cleanExt(u.extension) === cleanDigits ||
        (u.username && u.username.trim().toLowerCase() === cleanNum.toLowerCase()) ||
        u.name.trim().toLowerCase() === cleanNum.toLowerCase()
    );
    setLastDialed(cleanNum);
    onMakeCall(cleanNum, target ? target.name : undefined);
    setDialNumber('');
  };

  const handleRedial = () => {
    if (lastDialed) {
      onMakeCall(lastDialed);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Filter call history for this user
  const myHistory = callHistory.filter(
    (c) =>
      String(c.extension).trim() === String(currentUser.extension).trim() ||
      String(c.calleeExtension).trim() === String(currentUser.extension).trim()
  );

  // Filter colleagues in directory
  const colleagues = users.filter((u) => {
    const query = searchDirectory.trim().toLowerCase();
    if (!query) return true;
    return (
      u.name.toLowerCase().includes(query) ||
      u.extension.toLowerCase().includes(query) ||
      (u.username && u.username.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header - Focused on the Agent's Extension and Status */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & User identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-600/30 font-bold">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white leading-tight">
                  اتصالاتي • صفحة المكالمات
                </h1>
                <span className="text-xs font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  تحويلة: #{currentUser.extension}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>متصل - جاهز للمكالمات</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                الموظف: <span className="text-slate-200 font-semibold">{currentUser.name}</span>
              </p>
            </div>
          </div>

          {/* User Controls: Switch User & Logout */}
          <div className="flex items-center gap-2">
            {/* Quick Switch User for easy multi-account testing */}
            {onSwitchUser && (
              <button
                onClick={() => setIsSwitchUserOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                title="التبديل لحساب موظف آخر لتجربة الاتصال المتبادل"
              >
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>تبديل الموظف ({currentUser.extension})</span>
              </button>
            )}

            {/* If Admin is testing the Agent view */}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-xs font-semibold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Calling Workspace */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 flex-1 w-full space-y-5">
        
        {/* Unmissable High-Visibility Incoming Call Alert Banner */}
        {incomingCall && (
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-emerald-500/30 animate-pulse">
            <div className="flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4 text-right">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center animate-bounce shadow-xl shadow-emerald-500/40 shrink-0">
                  <PhoneIncoming className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      مكالمة واردة الآن ترن على خطك!
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                      كود: {incomingCall.callCode}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white mt-1.5">
                    {incomingCall.callerName}
                  </h3>
                  <p className="text-sm font-mono text-emerald-300 font-bold mt-0.5">
                    التحويلة: #{incomingCall.callerExtension || incomingCall.callerNumber} • إلى تحويلتك #{currentUser.extension}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Answer & Decline */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={onRejectIncoming}
                  className="flex-1 md:flex-none px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>رفض المكالمة</span>
                </button>
                <button
                  onClick={onAnswerIncoming}
                  className="flex-1 md:flex-none px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/40 transition-all active:scale-95 cursor-pointer"
                >
                  <PhoneCall className="w-5 h-5 animate-pulse" />
                  <span>الرد على المكالمة الآن</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Layout:
            - Left: Keypad & Quick Contacts
            - Right: Active Call / Caller Info & Timing
        */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (5 Cols): لوحة الأزرار والاتصال ودليل التحويلات */}
          <div className="lg:col-span-5 space-y-5">
            {/* Keypad Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-cyan-400" />
                  <span>لوحة الأزرار والطلب (Dial Pad)</span>
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  خطك: #{currentUser.extension}
                </span>
              </div>

              {/* Dial Input Field */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={dialNumber}
                  onChange={(e) => setDialNumber(e.target.value)}
                  placeholder="أدخل التحويلة أو الرقم المطلوب..."
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-3.5 text-center text-xl font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 transition-all tracking-wider"
                />
                {dialNumber && (
                  <button
                    onClick={() => setDialNumber((prev) => prev.slice(0, -1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white px-2 py-1 text-xs font-bold cursor-pointer"
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
                    <span className="text-xl font-mono leading-none group-hover:text-cyan-300">
                      {k.digit}
                    </span>
                    {k.sub && (
                      <span className="text-[10px] text-slate-500 font-normal tracking-widest mt-0.5">
                        {k.sub}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Call / Redial Actions */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {currentCall ? (
                  <button
                    onClick={() => onHangupCall(currentCall.id)}
                    className="col-span-2 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>إنهاء المكالمة</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleCall}
                      disabled={!dialNumber.trim()}
                      className="py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                      <PhoneCall className="w-5 h-5" />
                      <span>اتصال</span>
                    </button>

                    <button
                      onClick={handleRedial}
                      disabled={!lastDialed}
                      className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all active:scale-95 cursor-pointer"
                      title={lastDialed ? `إعادة الاتصال بالرقم ${lastDialed}` : 'لا يوجد رقم سابق'}
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>إعادة طلب</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Colleagues / Extensions Directory (دليل التحويلات والاتصال المباشر) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>دليل الموظفين والتحويلات</span>
                </h3>
                <span className="text-xs text-cyan-400 font-mono font-bold bg-cyan-500/15 px-2 py-0.5 rounded-full">
                  {users.length} موظف
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchDirectory}
                  onChange={(e) => setSearchDirectory(e.target.value)}
                  placeholder="ابحث بالاسم أو رقم التحويلة..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-right"
                />
              </div>

              {/* Colleagues list */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {colleagues.map((u) => {
                  const isSelf = String(u.extension).trim() === String(currentUser.extension).trim();
                  return (
                    <div
                      key={u.id || u.extension}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelf
                          ? 'bg-slate-800/30 border-slate-800'
                          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelf ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-700 text-white'
                        }`}>
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0 text-right">
                          <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded font-normal">
                                (أنت)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-cyan-400 font-bold">
                              #{u.extension}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>متاح للاتصال</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isSelf && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => window.open(`/?user=${u.extension}`, '_blank')}
                            title={`فتح خط تحويلة ${u.name} (#${u.extension}) في نافذة مستقلة للرد والتحدث`}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="hidden sm:inline">فتح الخط</span>
                          </button>
                          <button
                            onClick={() => onMakeCall(u.extension, u.name)}
                            disabled={!!currentCall}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-cyan-600/20 transition-all cursor-pointer active:scale-95"
                          >
                            <Phone className="w-3 h-3" />
                            <span>اتصال</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (7 Cols): شاشة المكالمة، بيانات المتصل والتوقيت اللحظي */}
          <div className="lg:col-span-7 space-y-5">
            {/* Active Call / Caller Details & Live Timing Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white">بيانات المتصل والتوقيت اللحظي (Caller Info & Timing)</h2>
                </div>
                {currentCall && currentCall.status === 'connected' && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>مكالمة متصلة ونشطة الآن</span>
                  </span>
                )}
              </div>

              {currentCall ? (
                currentCall.status === 'ringing' ? (
                  /* Outbound Ringing State (جاري الاتصال بالموظف) */
                  <div className="space-y-4">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-850 border-2 border-amber-500/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center animate-pulse shrink-0">
                          <PhoneOutgoing className="w-8 h-8 animate-bounce" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                              أنت المتصل ⬅️ جاري رنين هاتف الزميل
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                              كود: {currentCall.callCode}
                            </span>
                          </div>
                          <h3 className="text-xl font-black text-white mt-2">
                            {currentCall.calleeName || currentCall.callerNumber}
                          </h3>
                          <div className="text-xs font-mono text-cyan-300 font-bold mt-0.5">
                            التحويلة المستهدفة: #{currentCall.calleeExtension}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2.5">
                        <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                          <span>في انتظار رد الموظف على هاتفه...</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onHangupCall(currentCall.id)}
                            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer active:scale-95"
                          >
                            <PhoneOff className="w-4 h-4" />
                            <span>إلغاء الاتصال</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Multi-Window / Real Voice Calling Instructions */}
                    <div className="p-5 rounded-2xl bg-cyan-950/40 border-2 border-cyan-500/40 shadow-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>لتجربة المكالمة الحقيقية والتحدث المباشر بالصوت (WebRTC Voice):</span>
                        </div>
                        <span className="text-[10px] text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                          تحويلة #{currentCall.calleeExtension}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-300 leading-relaxed">
                        هاتف الزميل <strong>({currentCall.calleeName || currentCall.calleeExtension})</strong> يرن الآن. افتح شاشته في تبويب مستقل ثم اضغط <strong>"الرد على المكالمة"</strong> هناك لتبدآ الحديث الصوتي المباشر عبر المايكروفون.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          onClick={() => window.open(`/?user=${currentCall.calleeExtension}`, '_blank')}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer active:scale-95"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>فتح نافذة خط ({currentCall.calleeName} #{currentCall.calleeExtension}) للرد والتحدث</span>
                        </button>

                        {onSimulateRemoteAnswer && (
                          <button
                            onClick={() => onSimulateRemoteAnswer(currentCall.id)}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                            title="للتجربة السريعة داخل نفس هذه الشاشة دون فتح نافذة ثانية"
                          >
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                            <span>محاكاة الرد في نفس الشاشة (Demo)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Connected Active Call State (المكالمة متصلة الآن) */
                  <div className="space-y-4">
                    {/* Top Call Info Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                            {currentCall.direction === 'inbound' ? 'مكالمة واردة' : 'مكالمة صادرة'}
                          </span>
                          <span className="text-xs font-bold font-mono text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                            كود: {currentCall.callCode}
                          </span>
                        </div>
                        <h3 className="text-2xl font-black text-white mt-2">
                          {String(currentCall.extension).trim() === String(currentUser.extension).trim()
                            ? (currentCall.calleeName || currentCall.callerNumber)
                            : currentCall.callerName}
                        </h3>
                        <div className="text-xs font-mono text-slate-300 font-bold mt-1">
                          التحويلة / الرقم:{' '}
                          {String(currentCall.extension).trim() === String(currentUser.extension).trim()
                            ? `#${currentCall.calleeExtension}`
                            : `#${currentCall.callerExtension || currentCall.callerNumber}`}
                        </div>
                      </div>

                      {/* Live Call Duration Stopwatch (عداد التوقيت اللحظي بدقة) */}
                      <div className="bg-slate-950/90 border border-slate-700 rounded-2xl px-6 py-3.5 text-center sm:text-left shadow-inner">
                        <div className="text-[11px] text-slate-400 flex items-center justify-center sm:justify-start gap-1 font-semibold mb-0.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>التوقيت اللحظي:</span>
                        </div>
                        <div className="text-3xl font-mono font-black text-emerald-400 tracking-wider">
                          {formatSeconds(currentCall.duration)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          وقت البدء: {currentCall.startTime}
                        </div>
                      </div>
                    </div>

                    {/* Live WebRTC Real-Time Voice Waveform & Microphone Bar */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-emerald-950/40 border border-cyan-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Headphones className="w-4 h-4 text-emerald-400" />
                            <span>المحادثة الصوتية الحية المباشرة (Live WebRTC Audio)</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                            {voiceStatus === 'connected' ? '🎙️ المايكروفون نشط' : '⏳ جاري ربط الصوت...'}
                          </span>
                        </div>
                      </div>

                      {/* Live Dancing Voice Waveform Bars */}
                      <div className="flex items-center justify-center gap-1.5 py-3 bg-slate-950/70 rounded-xl border border-slate-800 px-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((barIdx) => {
                          const heightFactor = Math.max(4, Math.min(26, (voiceLevel / 100) * 32 * (0.35 + Math.sin(barIdx * 0.9) * 0.65)));
                          return (
                            <div
                              key={barIdx}
                              className={`w-1.5 rounded-full transition-all duration-75 ${
                                voiceLevel > 8 ? 'bg-gradient-to-t from-emerald-500 to-cyan-400' : 'bg-slate-700'
                              }`}
                              style={{ height: `${heightFactor}px` }}
                            />
                          );
                        })}
                      </div>

                      {/* Volume & Notice row with Loudspeaker Switch */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300 pt-1">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${voiceStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                          {voiceNotice || 'تحدث في المايكروفون وسيسمعك الطرف الآخر فوراً'}
                        </span>

                        {/* Speaker Volume Slider & Loudspeaker Quick Switch */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={handleToggleSpeakerphone}
                            id="btn-agent-loudspeaker-quick"
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                              isSpeakerphone
                                ? 'bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 text-cyan-200 border-cyan-400 shadow-sm shadow-cyan-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                            title="تبديل وضع مكبر الصوت للهاتف"
                          >
                            <Volume2 className={`w-3.5 h-3.5 ${isSpeakerphone ? 'text-cyan-300 animate-pulse' : ''}`} />
                            <span>{isSpeakerphone ? 'سبيكر الهاتف نشط 🔊' : 'سبيكر الهاتف 🔈'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleChangeVolume(speakerVolume > 0 ? 0 : 1)}
                            className="text-slate-400 hover:text-white cursor-pointer"
                            title={speakerVolume === 0 ? 'تشغيل الصوت' : 'كتم الصوت'}
                          >
                            {speakerVolume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={speakerVolume}
                            onChange={(e) => handleChangeVolume(parseFloat(e.target.value))}
                            className="w-20 accent-cyan-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                            title="مستوى صوت السماعة"
                          />
                        </div>
                      </div>

                      {/* Speakerphone Gain Boost Level (عند تفعيل مكبر الصوت) */}
                      {isSpeakerphone && (
                        <div className="pt-2 border-t border-cyan-900/40 flex items-center justify-between text-[11px] text-cyan-300">
                          <span className="font-semibold flex items-center gap-1">
                            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>تضخيم مكبر الصوت للهاتف:</span>
                          </span>
                          <div className="flex items-center gap-1">
                            {[1.5, 2.2, 2.8, 3.5].map((gain) => (
                              <button
                                key={gain}
                                type="button"
                                onClick={() => handleSetSpeakerGain(gain)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                                  speakerGainBoost === gain
                                    ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-400/50'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {Math.round(gain * 100)}%
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Active In-Call Controls (with Loudspeaker) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Hang Up */}
                      <button
                        onClick={() => onHangupCall(currentCall.id)}
                        id="btn-agent-hangup"
                        className="py-3 px-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
                      >
                        <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>إنهاء المكالمة</span>
                      </button>

                      {/* Loudspeaker (مكبر الصوت للهاتف) */}
                      <button
                        onClick={handleToggleSpeakerphone}
                        id="btn-agent-speakerphone"
                        className={`py-3 px-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                          isSpeakerphone
                            ? 'bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 text-cyan-200 border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
                        }`}
                        title="تشغيل مكبر الصوت للهاتف لتكبير الصوت بدون وضعه على الأذن"
                      >
                        {isSpeakerphone ? (
                          <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300 animate-pulse" />
                        ) : (
                          <Volume1 className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                        <span>{isSpeakerphone ? 'سبيكر: نشط 🔊' : 'مكبر الصوت 🔈'}</span>
                      </button>

                      {/* Mute Toggle */}
                      <button
                        onClick={handleToggleMute}
                        id="btn-agent-mute"
                        className={`py-3 px-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          isMuted
                            ? 'bg-red-500/20 text-red-300 border-red-500/50'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
                        <span>{isMuted ? 'إلغاء الكتم' : 'كتم المايك'}</span>
                      </button>

                      {/* Hold Toggle */}
                      <button
                        onClick={() => onHoldToggle(currentCall.id)}
                        id="btn-agent-hold"
                        className={`py-3 px-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          currentCall.status === 'on_hold'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {currentCall.status === 'on_hold' ? <Play className="w-4 h-4 text-amber-400" /> : <Pause className="w-4 h-4" />}
                        <span>{currentCall.status === 'on_hold' ? 'استئناف' : 'تعليق (Hold)'}</span>
                      </button>
                    </div>

                    {/* Quick Call Notes */}
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                        ملاحظات المكالمة:
                      </label>
                      <textarea
                        rows={2}
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                        placeholder="اكتب ملاحظات حول ما تم في المكالمة مع العميل أو الزميل..."
                        className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none text-right"
                      />
                    </div>
                  </div>
                )
              ) : (
                /* Idle Ready State (الخط متاح وجاهز) */
                <div className="py-10 px-4 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                    <Headphones className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-base font-bold text-white">الخط متاح وجاهز لاستقبال وإجراء المكالمات</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    قم بإدخال رقم التحويلة من لوحة الأزرار أو اضغط على اسم أي موظف من الدليل للاتصال به فوراً. عند ورود أي مكالمة ستظهر لك بيانات المتصل والتحويلة مع عداد التوقيت اللحظي.
                  </p>
                </div>
              )}
            </div>

            {/* My Recent Calls History */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>سجل مكالماتي الأخيرة ({currentUser.name})</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {myHistory.length} مكالمة
                </span>
              </div>

              {myHistory.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">لا توجد مكالمات مسجلة لهذه التحويلة بعد.</p>
              ) : (
                <div className="divide-y divide-slate-800 text-xs">
                  {myHistory.slice(0, 6).map((call) => (
                    <div key={call.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                          {call.direction === 'inbound' ? (
                            <PhoneIncoming className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <PhoneOutgoing className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">
                            {String(call.extension).trim() === String(currentUser.extension).trim()
                              ? (call.calleeName || call.callerNumber)
                              : call.callerName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            كود: {call.callCode} • {call.direction === 'inbound' ? 'واردة' : 'صادرة'}
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
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-cyan-300 transition-colors cursor-pointer"
                          title="تحميل تسجيل المكالمة"
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

      {/* Switch User Modal for effortless multi-user testing */}
      {isSwitchUserOpen && onSwitchUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>التبديل إلى موظف آخر</span>
              </h3>
              <button
                onClick={() => setIsSwitchUserOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              اختر الموظف الذي ترغب بالدخول بحسابه لتجربة استقبال وإجراء المكالمات فوراً:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {users.map((u) => {
                const isCurrent = String(u.extension).trim() === String(currentUser.extension).trim();
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u);
                      setIsSwitchUserOpen(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-950/50 border-cyan-500/60 text-white'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{u.name}</div>
                        <div className="text-[10px] text-cyan-400 font-mono">تحويلة #{u.extension} ({u.role === 'admin' ? 'مدير' : 'موظف'})</div>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold">
                        الحالي
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
