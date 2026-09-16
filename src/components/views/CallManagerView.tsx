import React, { useState } from 'react';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneOff, 
  PhoneForwarded, 
  Pause, 
  Play, 
  Disc, 
  Search, 
  Clock, 
  Volume2, 
  Download, 
  Mic, 
  MicOff, 
  Delete, 
  Filter,
  CheckCircle,
  AlertCircle,
  Hash,
  Copy,
  Check,
  FileAudio
} from 'lucide-react';
import { Call, PBXUser } from '../../types';
import { playDTMF, playTelephonyFx, startRingback, stopRingback } from '../../utils/audioTones';
import { downloadCallAudioBlob } from '../../lib/firebase';

interface CallManagerViewProps {
  activeCalls: Call[];
  callHistory: Call[];
  currentUser: PBXUser;
  users: PBXUser[];
  onHoldToggle: (callId: string) => void;
  onRecordToggle: (callId: string) => void;
  onOpenTransfer: (call: Call) => void;
  onHangup: (callId: string) => void;
  onMakeCall: (number: string, name?: string) => void;
}

export const CallManagerView: React.FC<CallManagerViewProps> = ({
  activeCalls,
  callHistory,
  currentUser,
  users,
  onHoldToggle,
  onRecordToggle,
  onOpenTransfer,
  onHangup,
  onMakeCall,
}) => {
  const [dialNumber, setDialNumber] = useState('');
  const [isDialing, setIsDialing] = useState(false);
  const [searchHistory, setSearchHistory] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);

  // Call Code Lookup & Download
  const [lookupCode, setLookupCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const allCalls = [...activeCalls, ...callHistory];
  const matchedCallByCode = lookupCode.trim()
    ? allCalls.find((c) => c.callCode?.toLowerCase() === lookupCode.trim().toLowerCase())
    : null;

  const handleDigit = (digit: string) => {
    playDTMF(digit);
    setDialNumber((prev) => prev + digit);
  };

  const handleCall = () => {
    if (!dialNumber.trim()) return;
    setIsDialing(true);
    startRingback();

    const matched = users.find((u) => u.extension === dialNumber.trim());
    const destName = matched ? matched.name : `رقم خارجي (${dialNumber})`;

    setTimeout(() => {
      stopRingback();
      playTelephonyFx('connected');
      setIsDialing(false);
      onMakeCall(dialNumber.trim(), destName);
      setDialNumber('');
    }, 2500);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredHistory = callHistory.filter((c) => {
    const matchesSearch =
      c.callerName.toLowerCase().includes(searchHistory.toLowerCase()) ||
      c.callerNumber.includes(searchHistory) ||
      c.extension.includes(searchHistory) ||
      (c.callCode && c.callCode.toLowerCase().includes(searchHistory.toLowerCase()));
    const matchesFilter = historyFilter === 'all' ? true : c.direction === historyFilter;
    return matchesSearch && matchesFilter;
  });

  const togglePlayRecording = (callId: string) => {
    if (playingRecordingId === callId) {
      setPlayingRecordingId(null);
    } else {
      playTelephonyFx('beep');
      setPlayingRecordingId(callId);
      setTimeout(() => setPlayingRecordingId(null), 8000);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadRecording = (call: Call) => {
    playTelephonyFx('connected');
    downloadCallAudioBlob(call);
  };

  return (
    <div className="space-y-6">
      {/* 🎯 Feature Requested: Dedicated "البحث وتحميل المكالمة بواسطة الكود" Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FileAudio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>البحث وتحميل المكالمة بواسطة كود المكالمة (Call Code)</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
                  WAV Audio Sync
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                لكل مكالمة كود فريد (مثل <code className="text-cyan-400 font-mono">MC-8491</code> أو <code className="text-cyan-400 font-mono">MC-6102</code>). اكتب الكود للوصول المباشر للمكالمة وتحميل تسجيلها الصوتي.
              </p>
            </div>
          </div>

          {/* Code Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Hash className="w-4 h-4 absolute right-3 top-2.5 text-cyan-400" />
              <input
                type="text"
                dir="ltr"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="مثال: MC-8491"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl pr-9 pl-3 py-2 text-xs text-cyan-300 font-mono font-bold placeholder:text-slate-600 focus:outline-none"
              />
            </div>
            {lookupCode && (
              <button
                onClick={() => setLookupCode('')}
                className="p-2 text-slate-400 hover:text-white"
                title="مسح"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Lookup Result Box */}
        {lookupCode.trim() && (
          <div className="mt-4 animate-in fade-in">
            {matchedCallByCode ? (
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-black text-sm text-cyan-300 bg-cyan-900/60 px-2.5 py-1 rounded-lg border border-cyan-500/40">
                      {matchedCallByCode.callCode}
                    </span>
                    <span className="font-bold text-white text-sm">
                      {matchedCallByCode.callerName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono" dir="ltr">
                      ({matchedCallByCode.callerNumber})
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {matchedCallByCode.direction === 'inbound' ? 'واردة' : 'صادرة'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                    <span>التحويلة: <strong className="text-slate-200">{matchedCallByCode.extension}</strong></span>
                    <span>•</span>
                    <span>المدة: <strong className="text-emerald-400">{formatDuration(matchedCallByCode.duration)}</strong></span>
                    <span>•</span>
                    <span>التوقيت: {matchedCallByCode.startTime}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadRecording(matchedCallByCode)}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل تسجيل المكالمة (WAV)</span>
                  </button>

                  <button
                    onClick={() => togglePlayRecording(matchedCallByCode.id)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{playingRecordingId === matchedCallByCode.id ? 'إيقاف' : 'استماع'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>لم يتم العثور على أي مكالمة مسجلة بالكود: <strong className="font-mono">{lookupCode}</strong>. تأكد من صحة الكود أو تفقد الجدول أدناه.</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Softphone Console (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">وحدة الاتصال الهاتفي (SIP Phone)</h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                تحويلة {currentUser.extension}
              </span>
            </div>

            {/* Display */}
            <div className="relative mb-4">
              <input
                type="text"
                readOnly
                dir="ltr"
                value={dialNumber}
                placeholder="أدخل الرقم المطلوب..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold text-cyan-300 tracking-wider placeholder:text-slate-600 focus:outline-none"
              />
              {dialNumber && (
                <button
                  onClick={() => setDialNumber((prev) => prev.slice(0, -1))}
                  className="absolute right-3 top-3 p-1 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Delete className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* DTMF Pad */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDigit(d)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-600/30 border border-slate-700 hover:border-cyan-500/40 text-white font-mono font-bold text-lg transition-all active:scale-95 cursor-pointer"
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Dial Action */}
            <button
              onClick={handleCall}
              disabled={!dialNumber.trim() || isDialing}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <Phone className="w-5 h-5" />
              <span>{isDialing ? 'جاري طلب الرقم عبر Asterisk...' : 'بدء الاتصال (SIP Call)'}</span>
            </button>
          </div>

          {/* Quick Extensions Directory */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h4 className="text-xs font-bold text-slate-300 mb-2.5">دليل التحويلات الداخلية:</h4>
            <div className="space-y-1.5">
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => setDialNumber(u.extension)}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded">
                      {u.extension}
                    </span>
                    <span className="font-semibold text-slate-200">{u.name}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    u.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' :
                    u.status === 'busy' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {u.status === 'online' ? 'متاح' : u.status === 'busy' ? 'مشغول' : 'غير متصل'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Calls + CDR Call History (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Calls Section */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                <h3 className="text-base font-bold text-white">المكالمات النشطة في الوقت الفعلي</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {activeCalls.length} مكالمة جارية
              </span>
            </div>

            {activeCalls.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                لا توجد مكالمات نشطة حالياً. استخدم لوحة الاتصال أو انقر "محاكاة مكالمة واردة" لتجربة التفاعل.
              </div>
            ) : (
              <div className="space-y-3">
                {activeCalls.map((call) => (
                  <div
                    key={call.id}
                    className={`p-4 rounded-xl border ${
                      call.status === 'on_hold'
                        ? 'bg-amber-950/20 border-amber-500/50'
                        : 'bg-slate-800/80 border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-base">{call.callerName}</span>
                          
                          {/* Call Code Badge */}
                          <div className="flex items-center gap-1 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded text-[11px] font-mono text-cyan-300">
                            <span>{call.callCode}</span>
                            <button
                              onClick={() => handleCopyCode(call.callCode)}
                              className="text-cyan-400 hover:text-white"
                              title="نسخ كود المكالمة"
                            >
                              {copiedCode === call.callCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              call.status === 'on_hold'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {call.status === 'on_hold' ? 'انتظار (Music on Hold)' : 'جارية (Live)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="font-mono text-cyan-400" dir="ltr">
                            {call.callerNumber}
                          </span>
                          <span>•</span>
                          <span>التحويلة: <strong className="text-slate-300">{call.extension}</strong></span>
                          <span>•</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {formatDuration(call.duration)}
                          </span>
                        </div>

                        {/* Live Recording Waveform indicator */}
                        {call.isRecording && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                            <span className="font-semibold">جاري تسجيل المكالمة الصوتي على السيرفر</span>
                            <div className="flex items-end gap-0.5 h-3 ml-2">
                              <span className="w-1 bg-rose-500 animate-[pulse_0.6s_ease-in-out_infinite] h-2"></span>
                              <span className="w-1 bg-rose-500 animate-[pulse_0.8s_ease-in-out_infinite] h-3"></span>
                              <span className="w-1 bg-rose-500 animate-[pulse_0.5s_ease-in-out_infinite] h-1.5"></span>
                              <span className="w-1 bg-rose-500 animate-[pulse_0.7s_ease-in-out_infinite] h-2.5"></span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Interactive Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onHoldToggle(call.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            call.status === 'on_hold'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          }`}
                        >
                          {call.status === 'on_hold' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                          <span>{call.status === 'on_hold' ? 'استئناف' : 'انتظار'}</span>
                        </button>

                        <button
                          onClick={() => onOpenTransfer(call)}
                          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <PhoneForwarded className="w-3.5 h-3.5 text-cyan-400" />
                          <span>تحويل</span>
                        </button>

                        <button
                          onClick={() => onRecordToggle(call.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            call.isRecording
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          }`}
                        >
                          <Disc className={`w-3.5 h-3.5 ${call.isRecording ? 'animate-spin text-rose-400' : ''}`} />
                          <span>{call.isRecording ? 'إيقاف التسجيل' : 'تسجيل'}</span>
                        </button>

                        {/* Direct Download */}
                        <button
                          onClick={() => handleDownloadRecording(call)}
                          className="p-2 rounded-lg bg-slate-700 hover:bg-cyan-600 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                          title="تحميل تسجيل المكالمة الحالية (WAV)"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onHangup(call.id)}
                          className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                          title="إنهاء المكالمة"
                        >
                          <PhoneOff className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CDR (Call Detail Record) History Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">سجل تفاصيل المكالمات (CDR)</h3>
                <p className="text-xs text-slate-400">
                  جميع المكالمات المنجزة مزودة بكود تتبع فريد مع إمكانية التحميل والاستماع
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    placeholder="بحث برقم، اسم، أو كود..."
                    className="bg-slate-800 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs">
                  <button
                    onClick={() => setHistoryFilter('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      historyFilter === 'all' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setHistoryFilter('inbound')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      historyFilter === 'inbound' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    واردة
                  </button>
                  <button
                    onClick={() => setHistoryFilter('outbound')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      historyFilter === 'outbound' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    صادرة
                  </button>
                </div>
              </div>
            </div>

            {/* CDR Table with Call Code and Direct Download */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">كود المكالمة</th>
                    <th className="py-2.5 px-3">النوع</th>
                    <th className="py-2.5 px-3">المتصل / الجهة</th>
                    <th className="py-2.5 px-3">الرقم</th>
                    <th className="py-2.5 px-3">التحويلة</th>
                    <th className="py-2.5 px-3">الوقت</th>
                    <th className="py-2.5 px-3">المدة</th>
                    <th className="py-2.5 px-3 text-center">التسجيل الصوتي والتحميل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 text-slate-300 transition-colors">
                      {/* Call Code Column */}
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded font-mono text-cyan-300 font-bold text-[11px]">
                          <span>{item.callCode}</span>
                          <button
                            onClick={() => handleCopyCode(item.callCode)}
                            className="text-cyan-400 hover:text-white transition-colors"
                            title="نسخ كود المكالمة"
                          >
                            {copiedCode === item.callCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {item.direction === 'inbound' ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                            <PhoneIncoming className="w-3.5 h-3.5" />
                            <span>واردة</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                            <PhoneOutgoing className="w-3.5 h-3.5" />
                            <span>صادرة</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">{item.callerName}</td>
                      <td className="py-3 px-3 font-mono text-cyan-400" dir="ltr">{item.callerNumber}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">{item.extension}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{item.startTime}</td>
                      <td className="py-3 px-3 font-mono text-slate-300 font-bold">{formatDuration(item.duration)}</td>
                      
                      {/* Audio & Download Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => togglePlayRecording(item.id)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              playingRecordingId === item.id
                                ? 'bg-cyan-500 text-slate-950 font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            }`}
                            title="استماع للتسجيل"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{playingRecordingId === item.id ? 'تشغيل...' : 'استماع'}</span>
                          </button>

                          <button
                            onClick={() => handleDownloadRecording(item)}
                            className="px-2 py-1 rounded-lg bg-cyan-900/60 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="تحميل ملف الصوت WAV"
                          >
                            <Download className="w-3 h-3" />
                            <span>تحميل</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
