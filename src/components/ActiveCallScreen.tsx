import React, { useState } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Volume1,
  VolumeX,
  Radio,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { CallSession, WebRTCStats } from '../services/webrtcManager';

interface ActiveCallScreenProps {
  session: CallSession;
  stats: WebRTCStats;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onChangeVolumeBoost: (vol: number) => void;
}

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  session,
  stats,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  onChangeVolumeBoost,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Format seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-xl mx-auto animate-fadeIn">
      <div 
        id="active-call-card"
        className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl"
      >
        {/* Glow backdrop indicator */}
        <div 
          className={`absolute top-0 right-1/2 translate-x-1/2 w-80 h-36 blur-3xl rounded-full pointer-events-none transition-colors duration-700 ${
            stats.isSpeakerOn ? 'bg-emerald-500/20' : 'bg-teal-500/10'
          }`}
        ></div>

        {/* Top Call Status Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400">مكالمة جارية مباشرة</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 text-xs font-mono font-bold text-slate-200">
            <span>{formatDuration(session.durationSeconds)}</span>
          </div>
        </div>

        {/* Peer Avatar and Name */}
        <div className="text-center my-4 space-y-2">
          <div className="relative inline-flex items-center justify-center">
            {/* Dynamic voice wave rings based on remote audio energy */}
            <div 
              className="absolute rounded-full bg-emerald-500/10 transition-all duration-150"
              style={{
                width: `${90 + stats.audioOutputLevel * 0.8}px`,
                height: `${90 + stats.audioOutputLevel * 0.8}px`,
              }}
            ></div>

            <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-700 p-0.5 shadow-xl flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white">
                <span className="text-3xl font-bold">
                  {session.peerName.charAt(0) || 'ص'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {session.peerName}
            </h2>
            <p className="text-xs text-slate-400">
              {session.peerRole === 'student' ? 'طرف الطالب' : 'طرف المستخدم'} • معرّف: <span className="font-mono text-emerald-400">{session.peerId}</span>
            </p>
          </div>
        </div>

        {/* Dual Live Audio Equalizer (Voice Activity Bars) */}
        <div className="my-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          
          {/* Remote Audio Level (صوت الطرف الآخر) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                صوت {session.peerName} (المستقبل عبر السماعة):
              </span>
              <span className="font-mono text-xs font-semibold text-emerald-400">
                {stats.audioOutputLevel > 5 ? 'يتحدث الآن' : 'في الانتظار'}
              </span>
            </div>

            {/* Audio Wave Meter */}
            <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden flex items-center">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-100 ease-out"
                style={{ width: `${Math.max(4, stats.audioOutputLevel)}%` }}
              ></div>
            </div>
          </div>

          {/* Local Mic Level (صوت ميكروفونك) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-slate-400" />
                ميكروفونك:
              </span>
              <span className={`text-[11px] font-medium ${stats.isMuted ? 'text-rose-400' : 'text-slate-400'}`}>
                {stats.isMuted ? 'مكتوم' : stats.audioInputLevel > 5 ? 'يلتقط صوتك' : 'جاهز'}
              </span>
            </div>

            <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-100 ${
                  stats.isMuted ? 'bg-rose-500' : 'bg-teal-400'
                }`}
                style={{ width: `${stats.isMuted ? 0 : Math.max(3, stats.audioInputLevel)}%` }}
              ></div>
            </div>
          </div>

        </div>

        {/* LOUDSPEAKER (مكبر الصوت) CONTROL SECTION */}
        <div className="mb-6 bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl transition-colors ${
                stats.isSpeakerOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}>
                {stats.isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <Volume1 className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">مكبر الصوت (وضع السبيكر)</h3>
                  {stats.isSpeakerOn && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                      مضخم x{stats.volumeBoost.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {stats.isSpeakerOn 
                    ? 'صوت مكبر للهاتف والأجهزة دون الحاجة لوضعه على الأذن'
                    : 'وضع سماعة الأذن العادي (اضغط للتكبير)'
                  }
                </p>
              </div>
            </div>

            {/* Toggle Button for Speakerphone */}
            <button
              id="speakerphone-toggle-btn"
              onClick={onToggleSpeaker}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                stats.isSpeakerOn
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {stats.isSpeakerOn ? 'مفعّل (إيقاف)' : 'تشغيل مكبر الصوت'}
            </button>
          </div>

          {/* Volume Boost Fine-tuning Slider (expandable) */}
          <div className="pt-2 border-t border-slate-800/60 mt-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <button 
                id="toggle-slider-btn"
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
              >
                <Sliders className="w-3 h-3" />
                <span>{showVolumeSlider ? 'إخفاء شريط التكبير' : 'تعديل درجة التضخيم يدوياً'}</span>
              </button>
              <span className="text-emerald-400 font-mono text-xs">
                {Math.round(stats.volumeBoost * 100)}%
              </span>
            </div>

            {showVolumeSlider && (
              <div className="space-y-2 pt-1">
                <input
                  id="volume-boost-slider"
                  type="range"
                  min="0.8"
                  max="3.5"
                  step="0.1"
                  value={stats.volumeBoost}
                  onChange={(e) => onChangeVolumeBoost(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>عادي (100%)</span>
                  <span>متوسط (200%)</span>
                  <span>أقصى تضخيم (350%)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Primary Call Controls: Mute, Speaker, End Call */}
        <div className="flex items-center justify-center gap-4 pt-2">
          
          {/* Mute Button */}
          <button
            id="toggle-mute-btn"
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
              stats.isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={stats.isMuted ? 'إلغاء كتم الصوت' : 'كتم الميكروفون'}
          >
            {stats.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[9px] font-medium">{stats.isMuted ? 'مكتوم' : 'كتم'}</span>
          </button>

          {/* Quick Speaker Button */}
          <button
            id="quick-speaker-btn"
            onClick={onToggleSpeaker}
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
              stats.isSpeakerOn
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="تبديل مكبر الصوت"
          >
            {stats.isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <Volume1 className="w-5 h-5" />}
            <span className="text-[9px] font-medium">{stats.isSpeakerOn ? 'سبيكر' : 'سماعة'}</span>
          </button>

          {/* End Call Button (Big Red) */}
          <button
            id="end-active-call-btn"
            onClick={onEndCall}
            className="h-14 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
            title="إنهاء المكالمة"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-sm">إنهاء المكالمة</span>
          </button>

        </div>

        {/* Quality Diagnostics info */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>اتصال WebRTC مستقر ومباشر (بدون انقطاع)</span>
          </div>

          <div className="font-mono text-slate-400 flex items-center gap-2">
            <span>ICE: {stats.iceState}</span>
            <span>•</span>
            <span>Signaling: {stats.signalingState}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
