import React, { useState } from 'react';
import {
  PhoneCall,
  UserCheck,
  Users,
  Search,
  Volume2,
  Mic,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Play,
  Square,
} from 'lucide-react';
import type { SignalingPeer } from '../services/signalingClient';

interface DialerProps {
  myUserId: string;
  myRole: 'student' | 'user';
  peers: SignalingPeer[];
  onStartCall: (peerId: string, peerName: string, role: 'student' | 'user') => void;
  onOpenTestWindow: () => void;
}

export const Dialer: React.FC<DialerProps> = ({
  myUserId,
  myRole,
  peers,
  onStartCall,
  onOpenTestWindow,
}) => {
  const [targetIdInput, setTargetIdInput] = useState('');
  const [targetNameInput, setTargetNameInput] = useState('');
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
  const [testAudioCtx, setTestAudioCtx] = useState<AudioContext | null>(null);

  // Filter out myself
  const onlineContacts = peers.filter(p => p.id !== myUserId);

  const handleDirectCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetIdInput.trim()) return;
    const cleanId = targetIdInput.trim();
    const role: 'student' | 'user' = myRole === 'student' ? 'user' : 'student';
    const name = targetNameInput.trim() || (role === 'student' ? 'الطالب' : 'المستخدم');
    onStartCall(cleanId, name, role);
  };

  // Test speakerphone chime
  const toggleTestSpeaker = () => {
    if (isTestingSpeaker) {
      if (testAudioCtx) {
        testAudioCtx.close().catch(() => {});
        setTestAudioCtx(null);
      }
      setIsTestingSpeaker(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        setTestAudioCtx(ctx);
        setIsTestingSpeaker(true);
      } catch (err) {
        console.warn('Audio test error:', err);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn">
      
      {/* Banner explaining call problem fix & speakerphone */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/40 border border-emerald-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-white">
                تم حل مشكلة انقطاع المكالمة عند الرد وتفعيل مكبر الصوت
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              تم تصحيح بروتوكول تبادل إشارات WebRTC (تنظيم وصول مرشحات ICE ومعالجة الرد الصوتي بالكامل)، مع إضافة زر 
              <strong className="text-emerald-400 font-semibold mx-1">مكبر الصوت (Loudspeaker)</strong>
              الذي يرفع مستوى الصوت بنسبة 300% للتحدث بالهاتف دون وضعه على الأذن.
            </p>
          </div>

          <button
            id="quick-test-opposite-peer-btn"
            onClick={onOpenTestWindow}
            className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <span>فتح نافذة تجربة للطرف الآخر</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Direct Call Box */}
        <div className="md:col-span-6 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <PhoneCall className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">
                {myRole === 'student' ? 'الاتصال بالمستخدم (المعلم/المستقبل)' : 'الاتصال بالطالب'}
              </h3>
            </div>

            <form onSubmit={handleDirectCall} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  معرّف الطرف الآخر (User ID):
                </label>
                <div className="relative">
                  <input
                    id="target-id-input"
                    type="text"
                    placeholder="مثال: user_9482 أو الصق المعرّف هنا"
                    value={targetIdInput}
                    onChange={(e) => setTargetIdInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-all font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  اسم الطرف المتصل به (اختياري):
                </label>
                <input
                  id="target-name-input"
                  type="text"
                  placeholder={myRole === 'student' ? 'المستخدم' : 'الطالب'}
                  value={targetNameInput}
                  onChange={(e) => setTargetNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                />
              </div>

              <button
                id="dial-now-submit-btn"
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <PhoneCall className="w-4 h-4" />
                <span>بدء الاتصال الصوتي المباشر</span>
              </button>
            </form>

            {/* Speaker & Audio Pre-test widget */}
            <div className="pt-2 border-t border-slate-800">
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">اختبار مكبر الصوت</h4>
                    <p className="text-[11px] text-slate-400">تأكد من سماع الصوت قبل الاتصال</p>
                  </div>
                </div>

                <button
                  id="test-speaker-btn"
                  onClick={toggleTestSpeaker}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isTestingSpeaker
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isTestingSpeaker ? (
                    <>
                      <Square className="w-3 h-3" />
                      <span>إيقاف النغمة</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>تجربة الصوت</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Online Contacts List */}
        <div className="md:col-span-6 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 min-h-[380px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-base">المستخدمون والطلاب المتواجدون الآن</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {onlineContacts.length}
                </span>
              </div>

              {/* Online peer list */}
              {onlineContacts.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mx-auto text-slate-500">
                    <Users className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-300">لا يوجد أطراف أخرى متصلة حالياً</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      يمكنك فتح نافذة جديدة لاختبار الاتصال والرد فوراً بين الطالب والمستخدم.
                    </p>
                  </div>
                  <button
                    id="open-peer-tab-btn"
                    onClick={onOpenTestWindow}
                    className="mt-2 inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-semibold text-xs px-4 py-2 rounded-xl transition-all"
                  >
                    <span>فتح الطرف الثاني في تبويب جديد</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {onlineContacts.map((peer) => (
                    <div
                      key={peer.id}
                      className="bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-3.5 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-sm">
                          {peer.name.charAt(0) || 'م'}
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900"></span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{peer.name}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              peer.role === 'student'
                                ? 'bg-indigo-950 text-indigo-400 border-indigo-800/60'
                                : 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                            }`}>
                              {peer.role === 'student' ? 'طالب' : 'مستخدم'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-mono">{peer.id}</span>
                        </div>
                      </div>

                      <button
                        id={`call-peer-${peer.id}`}
                        onClick={() => onStartCall(peer.id, peer.name, peer.role)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>اتصال</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick tips */}
            <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                عند استقبال المكالمة والضغط على <strong>"فتح الخط"</strong>، سيبقى الاتصال مستقراً دون انقطاع وسيتم تفعيل تدفق الصوت تلقائياً عبر تقنية WebRTC المحسنة.
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
