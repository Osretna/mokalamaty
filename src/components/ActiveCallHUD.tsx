import React, { useState, useEffect } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Volume1,
  VolumeX,
  Pause,
  Play,
  Clock,
  Headphones,
  Maximize2,
  Radio,
} from 'lucide-react';
import { Call, PBXUser } from '../types';
import { webrtcVoice } from '../utils/webrtcVoiceService';

interface ActiveCallHUDProps {
  currentCall: Call;
  currentUser: PBXUser;
  onHangup: (callId: string) => void;
  onHoldToggle?: (callId: string) => void;
  onOpenFullView?: () => void;
}

export const ActiveCallHUD: React.FC<ActiveCallHUDProps> = ({
  currentCall,
  currentUser,
  onHangup,
  onHoldToggle,
  onOpenFullView,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerphone, setIsSpeakerphone] = useState(() => webrtcVoice.getIsSpeakerphoneOn());
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [speakerGainLevel, setSpeakerGainLevel] = useState<number>(2.8);

  const cleanExt = (e?: string | number) => (e ? String(e).replace(/[^0-9a-zA-Z]/g, '').trim().toLowerCase() : '');
  const myExt = cleanExt(currentUser.extension);
  const callerExt = cleanExt(currentCall.callerExtension || currentCall.extension);
  const isCaller = callerExt === myExt;

  const otherPartyName = isCaller
    ? (currentCall.calleeName || currentCall.callerNumber || 'الطرف الآخر')
    : (currentCall.callerName || 'المتصل');
  const otherPartyExt = isCaller ? currentCall.calleeExtension : (currentCall.callerExtension || currentCall.callerNumber);

  // Synchronize speakerphone and mute state with webrtcVoice
  useEffect(() => {
    setIsMuted(webrtcVoice.getIsMuted());
    setIsSpeakerphone(webrtcVoice.getIsSpeakerphoneOn());
  }, []);

  const handleToggleMute = () => {
    const next = webrtcVoice.toggleMute();
    setIsMuted(next);
  };

  const handleToggleSpeakerphone = () => {
    webrtcVoice.unlockAudioPlayback();
    const next = webrtcVoice.toggleSpeakerphone();
    setIsSpeakerphone(next);
  };

  const handleSetGainBoost = (boost: number) => {
    setSpeakerGainLevel(boost);
    webrtcVoice.setSpeakerphoneGain(boost);
    if (!isSpeakerphone) {
      webrtcVoice.setSpeakerphone(true);
      setIsSpeakerphone(true);
    }
  };

  const formatDuration = (sec?: number) => {
    const s = sec || 0;
    const m = Math.floor(s / 60);
    const remainder = s % 60;
    return `${m.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const isRinging = currentCall.status === 'ringing';
  const isConnected = currentCall.status === 'connected';
  const isOnHold = currentCall.status === 'on_hold';

  return (
    <div
      id="etsalati-active-call-hud"
      className="fixed bottom-3 right-3 left-3 sm:left-auto sm:right-6 z-50 sm:max-w-xl bg-slate-900/95 backdrop-blur-md border-2 border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-950/60 p-4 transition-all animate-in slide-in-from-bottom-5"
      dir="rtl"
    >
      {/* Top Banner Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${
                isConnected
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-700'
                  : isRinging
                  ? 'bg-gradient-to-br from-amber-500 to-orange-700 animate-pulse'
                  : 'bg-gradient-to-br from-slate-600 to-slate-800'
              }`}
            >
              <Headphones className="w-5 h-5" />
            </div>
            {isConnected && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-ping" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isRinging
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isConnected ? 'المكالمة متصلة الآن 🟢' : isRinging ? 'جاري الرنين... ⏳' : 'معلقة (Hold) ⏸️'}
              </span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-800/40 px-2 py-0.5 rounded-full">
                كود: {currentCall.callCode}
              </span>
            </div>

            <h4 className="text-base font-bold text-white truncate mt-1">
              {otherPartyName}
              <span className="text-xs font-normal text-slate-400 font-mono mr-2">
                (تحويلة: #{otherPartyExt || '---'})
              </span>
            </h4>
          </div>
        </div>

        {/* Live Timer & View details button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>المدة</span>
            </div>
            <div className="text-sm font-black font-mono text-emerald-400">
              {formatDuration(currentCall.duration)}
            </div>
          </div>

          {onOpenFullView && (
            <button
              onClick={onOpenFullView}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="عرض شاشة الاتصال الكاملة"
              id="btn-hud-expand"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Real-time WebRTC Audio Activity Bar */}
      {isConnected && (
        <div className="mb-3 px-3 py-2 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-medium text-[11px] sm:text-xs">
              المحادثة الصوتية تعمل مباشرة بالمايكروفون الحقيقي
            </span>
          </div>

          {/* Dancing Audio Bars */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
              const h = Math.max(4, Math.min(18, (audioLevel / 100) * 20 * (0.4 + Math.sin(idx * 0.8) * 0.6)));
              return (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isSpeakerphone ? 'bg-cyan-400' : 'bg-emerald-400'
                  }`}
                  style={{ height: `${h}px` }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* In-Call Controls Row with Loudspeaker / Speakerphone */}
      <div className="grid grid-cols-4 gap-2">
        {/* 1. End Call / Hang up */}
        <button
          onClick={() => onHangup(currentCall.id)}
          id="btn-hud-hangup"
          className="min-h-[44px] py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
          title="إنهاء المكالمة"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">إنهاء</span>
        </button>

        {/* 2. Speakerphone / Loudspeaker (مكبر الصوت) */}
        <button
          onClick={handleToggleSpeakerphone}
          id="btn-hud-speakerphone"
          className={`min-h-[44px] py-2.5 px-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
            isSpeakerphone
              ? 'bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 text-cyan-200 border-cyan-400 ring-2 ring-cyan-500/30 shadow-md shadow-cyan-500/20'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
          }`}
          title="تشغيل مكبر الصوت للهاتف لتكبير الصوت بدون وضعه على الأذن"
        >
          {isSpeakerphone ? (
            <Volume2 className="w-4 h-4 text-cyan-300 animate-pulse" />
          ) : (
            <Volume1 className="w-4 h-4" />
          )}
          <span className="truncate">
            {isSpeakerphone ? 'سبيكر: نشط 🔊' : 'مكبر الصوت 🔈'}
          </span>
        </button>

        {/* 3. Mute Microphone */}
        <button
          onClick={handleToggleMute}
          id="btn-hud-mute"
          className={`min-h-[44px] py-2.5 px-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isMuted
              ? 'bg-red-500/20 text-red-300 border-red-500/50'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
          }`}
          title={isMuted ? 'إلغاء كتم المايك' : 'كتم المايكروفون'}
        >
          {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
          <span>{isMuted ? 'صامت' : 'المايك'}</span>
        </button>

        {/* 4. Hold / Resume */}
        <button
          onClick={() => onHoldToggle?.(currentCall.id)}
          id="btn-hud-hold"
          className={`min-h-[44px] py-2.5 px-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isOnHold
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
          }`}
          title={isOnHold ? 'استئناف المكالمة' : 'تعليق المكالمة (Hold)'}
        >
          {isOnHold ? <Play className="w-4 h-4 text-amber-400" /> : <Pause className="w-4 h-4" />}
          <span>{isOnHold ? 'استئناف' : 'تعليق'}</span>
        </button>
      </div>

      {/* Quick Speakerphone Gain Boost options when Speakerphone is active */}
      {isSpeakerphone && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-cyan-300">
          <span className="font-bold flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5" />
            <span>مستوى تضخيم الصوت:</span>
          </span>
          <div className="flex items-center gap-1">
            {[1.5, 2.2, 2.8, 3.5].map((gain) => (
              <button
                key={gain}
                onClick={() => handleSetGainBoost(gain)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                  speakerGainLevel === gain
                    ? 'bg-cyan-500 text-slate-950'
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
  );
};
