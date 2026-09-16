import React, { useState } from 'react';
import { 
  Voicemail as VoicemailIcon, 
  Play, 
  Pause, 
  Trash2, 
  Check, 
  CheckCheck, 
  Mic, 
  Download, 
  Share2, 
  Copy, 
  Clock, 
  Volume2, 
  Flame, 
  Sparkles,
  RefreshCw,
  Bell
} from 'lucide-react';
import { Voicemail } from '../../types';
import { speakVoicemail, stopSpeech, playTelephonyFx } from '../../utils/audioTones';

interface VoicemailViewProps {
  voicemails: Voicemail[];
  onToggleRead: (id: string) => void;
  onDeleteVoicemail: (id: string) => void;
  onRecordNewGreeting?: () => void;
}

export const VoicemailView: React.FC<VoicemailViewProps> = ({
  voicemails,
  onToggleRead,
  onDeleteVoicemail,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [greetingActive, setGreetingActive] = useState(false);
  const [greetingText, setGreetingText] = useState('أهلاً بك في اتصالاتي، يرجى ترك رسالتك بعد سماع الصفارة.');

  const filteredVoicemails = voicemails.filter((v) =>
    filter === 'all' ? true : !v.isRead
  );

  const handlePlayToggle = (vm: Voicemail) => {
    if (playingId === vm.id) {
      stopSpeech();
      setPlayingId(null);
    } else {
      stopSpeech();
      playTelephonyFx('beep');
      setPlayingId(vm.id);
      if (!vm.isRead) {
        onToggleRead(vm.id);
      }
      speakVoicemail(vm.transcription, () => {
        setPlayingId(null);
      });
    }
  };

  const handleCopyTranscription = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestGreeting = () => {
    setGreetingActive(true);
    playTelephonyFx('beep');
    speakVoicemail(greetingText, () => {
      setGreetingActive(false);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Greeting Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <VoicemailIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">صندوق البريد الصوتي الذكي</h3>
                <p className="text-xs text-slate-400">
                  تخزين التسجيلات التلقائية مع تحويل الصوت إلى نص وتنبيهات فورية عبر Firebase FCM
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs self-start sm:self-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filter === 'all' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل ({voicemails.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filter === 'unread' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                غير مقروء ({voicemails.filter((v) => !v.isRead).length})
              </button>
            </div>
          </div>

          {/* FCM & Firebase Note */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <Flame className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              يتم حفظ التسجيلات بصيغة WAV في <code className="text-cyan-300 font-mono">/var/spool/asterisk/voicemail</code> وتحديث Firestore وإشعار الهاتف الذكي لحظياً.
            </span>
          </div>
        </div>

        {/* Custom Greeting Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>رسالة الترحيب للتحويلة (Greeting):</span>
            </h4>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">مفعلة</span>
          </div>

          <textarea
            value={greetingText}
            onChange={(e) => setGreetingText(e.target.value)}
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />

          <button
            onClick={handleTestGreeting}
            disabled={greetingActive}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Volume2 className={`w-3.5 h-3.5 ${greetingActive ? 'animate-bounce text-amber-400' : ''}`} />
            <span>{greetingActive ? 'جاري سماع رسالة الترحيب...' : 'اختبار رسالة الترحيب'}</span>
          </button>
        </div>
      </div>

      {/* Voicemails List */}
      <div className="space-y-4">
        {filteredVoicemails.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
            <VoicemailIcon className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-400">لا توجد رسائل بريد صوتي جديدة</p>
            <p className="text-xs text-slate-500 mt-1">
              عند ترك أي متصل رسالة على تحويلتك ستظهر هنا مع إشعار فوري وتفريغ نصي تلقائي.
            </p>
          </div>
        ) : (
          filteredVoicemails.map((vm) => {
            const isPlaying = playingId === vm.id;
            return (
              <div
                key={vm.id}
                className={`p-5 rounded-2xl border transition-all ${
                  !vm.isRead
                    ? 'bg-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-bold text-white text-base">{vm.callerName}</span>
                      <span className="font-mono text-cyan-400 text-xs" dir="ltr">
                        {vm.callerNumber}
                      </span>
                      <span className="text-slate-500 text-xs">•</span>
                      <span className="text-slate-400 text-xs">تحويلة {vm.extension}</span>
                      {!vm.isRead ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          رسالة جديدة
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                          مقروءة
                        </span>
                      )}
                    </div>

                    {/* Transcription */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 relative group">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          التفريغ النصي التلقائي (Speech to Text):
                        </span>
                        <button
                          onClick={() => handleCopyTranscription(vm.id, vm.transcription)}
                          className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
                        >
                          {copiedId === vm.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>نسخ النص</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="leading-relaxed italic">"{vm.transcription}"</p>
                    </div>

                    {/* Waveform visualizer */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {vm.audioWaveform.map((h, idx) => (
                        <div
                          key={idx}
                          style={{ height: `${Math.max(8, h * 0.35)}px` }}
                          className={`w-1.5 rounded-full transition-all ${
                            isPlaying
                              ? 'bg-cyan-400 animate-pulse'
                              : 'bg-slate-700'
                          }`}
                        />
                      ))}
                      <span className="text-[11px] font-mono text-slate-400 mr-2">
                        {vm.duration} ثانية ({vm.fileSize})
                      </span>
                      <span className="text-[11px] text-slate-500 mr-auto font-mono">
                        {vm.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <button
                      onClick={() => handlePlayToggle(vm)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer ${
                        isPlaying
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPlaying ? 'إيقاف مؤقت' : 'استماع للتسجيل'}</span>
                    </button>

                    <button
                      onClick={() => onToggleRead(vm.id)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                      title={vm.isRead ? 'تحديد كغير مقروء' : 'تحديد كمقروء'}
                    >
                      {vm.isRead ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Check className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => onDeleteVoicemail(vm.id)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                      title="حذف الرسالة الصوتية"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
