import React from 'react';
import { 
  PhoneCall, 
  PhoneForwarded, 
  Pause, 
  Play, 
  Disc, 
  PhoneOff, 
  Voicemail as VoicemailIcon, 
  FileText, 
  Users, 
  Cpu, 
  Server, 
  Radio, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  ShieldCheck, 
  Activity, 
  Flame,
  Volume2,
  Download
} from 'lucide-react';
import { PBXStatus, Call, AMIEvent, Voicemail, FaxItem } from '../../types';
import { downloadCallAudioBlob } from '../../lib/firebase';

interface DashboardViewProps {
  pbxStatus: PBXStatus;
  activeCalls: Call[];
  amiEvents: AMIEvent[];
  voicemails: Voicemail[];
  faxes: FaxItem[];
  onHoldToggle: (callId: string) => void;
  onRecordToggle: (callId: string) => void;
  onOpenTransfer: (call: Call) => void;
  onHangup: (callId: string) => void;
  onOpenSoftphone: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pbxStatus,
  activeCalls,
  amiEvents,
  voicemails,
  faxes,
  onHoldToggle,
  onRecordToggle,
  onOpenTransfer,
  onHangup,
  onOpenSoftphone,
  onNavigateToTab,
}) => {
  const unreadVoicemails = voicemails.filter((v) => !v.isRead).length;
  const recentFaxesCount = faxes.length;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Calls Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">مكالمات جارية لحظياً</p>
              <h3 className="text-2xl font-extrabold text-white mt-1 font-mono">
                {activeCalls.length}
              </h3>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{pbxStatus.amiChannels} قنوات AMI نشطة</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <PhoneCall className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">سيرفر Asterisk</span>
            <span className="text-cyan-400 font-semibold">جاهز ومستقر</span>
          </div>
        </div>

        {/* Voicemail Card */}
        <div 
          onClick={() => onNavigateToTab('voicemail')}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4.5 relative overflow-hidden shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">صندوق البريد الصوتي</p>
              <h3 className="text-2xl font-extrabold text-white mt-1 font-mono">
                {unreadVoicemails}
                <span className="text-xs font-normal text-slate-400 mr-2">رسالة جديدة</span>
              </h3>
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-400">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>إشعارات FCM مفعلة</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <VoicemailIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">المجموع الكلي</span>
            <span className="text-slate-300 font-semibold">{voicemails.length} تسجيلات</span>
          </div>
        </div>

        {/* Digital Fax Card */}
        <div 
          onClick={() => onNavigateToTab('fax')}
          className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-4.5 relative overflow-hidden shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">الفاكس الرقمي (Hylafax)</p>
              <h3 className="text-2xl font-extrabold text-white mt-1 font-mono">
                {recentFaxesCount}
              </h3>
              <div className="flex items-center gap-1 mt-2 text-xs text-blue-400">
                <span>استقبال وإرسال رقمي عبر T.38</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">خادم Postfix</span>
            <span className="text-emerald-400 font-semibold">متصل ونشط</span>
          </div>
        </div>

        {/* Server & Trunks Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">حمل المعالج والذاكرة</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-white font-mono">{pbxStatus.cpuLoad}%</span>
                <span className="text-xs text-slate-400">RAM: {pbxStatus.memoryLoad}%</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>3 بوابات SIP Trunks متصلة</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">زمن التشغيل المتواصل</span>
            <span className="text-slate-300 font-mono text-[10px]">{pbxStatus.uptime}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Calls Management & Realtime AMI Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Live Calls Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">المكالمات الجارية الآن على البدالة</h3>
                  <p className="text-xs text-slate-400">
                    إدارة فورية: تحويل، وضع قيد الانتظار، تشغيل التسجيل الصوتي
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenSoftphone}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>إجراء مكالمة جديدة</span>
              </button>
            </div>

            {activeCalls.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <PhoneOff className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-400">لا توجد مكالمات نشطة حالياً</p>
                <p className="text-xs text-slate-500 mt-1">
                  يمكنك النقر على "محاكاة مكالمة واردة" أعلى الشاشة لتجربة الـ Screen-Pop وإدارة المكالمة.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCalls.map((call) => (
                  <div
                    key={call.id}
                    className={`p-4 rounded-xl border transition-all ${
                      call.status === 'on_hold'
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Caller Information */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                            call.status === 'on_hold'
                              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {call.direction === 'inbound' ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {call.callerName}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                call.status === 'on_hold'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {call.status === 'on_hold' ? 'قيد الانتظار (On Hold)' : 'متصلة (Connected)'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="font-mono text-cyan-400" dir="ltr">
                              {call.callerNumber}
                            </span>
                            <span>•</span>
                            <span>التحويلة: <strong className="text-slate-300">{call.extension}</strong></span>
                            <span>•</span>
                            <span className="font-mono text-emerald-400 font-semibold">
                              {formatDuration(call.duration)}
                            </span>
                            {call.callCode && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  كود: {call.callCode}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Interactive Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {/* Download Recording */}
                        <button
                          onClick={() => downloadCallAudioBlob(call)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="تحميل تسجيل المكالمة بترميز WAV"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-400" />
                          <span>تحميل</span>
                        </button>
                        {/* Hold / Resume */}
                        <button
                          onClick={() => onHoldToggle(call.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            call.status === 'on_hold'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          }`}
                          title={call.status === 'on_hold' ? 'استئناف المكالمة' : 'وضع المكالمة قيد الانتظار مع موسيقى'}
                        >
                          {call.status === 'on_hold' ? (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>استئناف</span>
                            </>
                          ) : (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              <span>انتظار</span>
                            </>
                          )}
                        </button>

                        {/* Transfer */}
                        <button
                          onClick={() => onOpenTransfer(call)}
                          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="تحويل المكالمة لتحويلة أخرى"
                        >
                          <PhoneForwarded className="w-3.5 h-3.5 text-cyan-400" />
                          <span>تحويل</span>
                        </button>

                        {/* Record Toggle */}
                        <button
                          onClick={() => onRecordToggle(call.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            call.isRecording
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          }`}
                          title={call.isRecording ? 'إيقاف التسجيل' : 'بدء تسجيل المكالمة'}
                        >
                          <Disc className={`w-3.5 h-3.5 ${call.isRecording ? 'text-rose-400 animate-spin' : ''}`} />
                          <span>{call.isRecording ? 'تسجيل جاري' : 'تسجيل'}</span>
                        </button>

                        {/* Hangup */}
                        <button
                          onClick={() => onHangup(call.id)}
                          className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
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

          {/* Quick Trunks & Infrastructure Status */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>خطوط الربط الخارجية (SIP / IAX Trunks)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {pbxStatus.sipTrunks.map((trunk) => (
                <div key={trunk.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-200">{trunk.name}</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      متصل
                    </span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">{trunk.host}</div>
                  <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between text-[11px] text-slate-400">
                    <span>القنوات: {trunk.channelsInUse} / {trunk.maxChannels}</span>
                    <span className="text-cyan-400">{trunk.latencyMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Live AMI Event Stream */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">سجل أحداث Asterisk AMI</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              بث مباشر
            </span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[440px] pr-1">
            {amiEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-800 text-xs space-y-1 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono text-cyan-400">
                    {ev.event}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {ev.timestamp}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-300 truncate" dir="ltr">
                  {ev.channel}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {ev.details}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>مربوط بـ Node.js Middleware</span>
            <span className="text-emerald-400 font-semibold">مزامنة Firestore نشطة</span>
          </div>
        </div>
      </div>
    </div>
  );
};
