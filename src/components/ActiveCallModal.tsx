import React, { useEffect, useState } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Grid, 
  Radio, 
  Sparkles, 
  ArrowDownLeft, 
  ArrowUpRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { ActiveCall, CallSignalMessage, TelephonyUser } from '../types/telephony';
import { telephonyAudio } from '../utils/audioService';

interface ActiveCallModalProps {
  activeCall: ActiveCall | null;
  incomingCall: CallSignalMessage | null;
  currentUser: TelephonyUser;
  onAnswerCall: () => void;
  onRejectCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleHold: () => void;
  onToggleSpeaker: () => void;
  onSendDTMF: (digit: string) => void;
  onSimulateTargetAnswer?: () => void; // Quick answer button for the target user if on same device
}

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  activeCall,
  incomingCall,
  currentUser,
  onAnswerCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
  onToggleHold,
  onToggleSpeaker,
  onSendDTMF,
  onSimulateTargetAnswer,
}) => {
  const [showInCallKeypad, setShowInCallKeypad] = useState(false);

  // Format seconds into MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Sound effects coordinator
  useEffect(() => {
    if (incomingCall) {
      telephonyAudio.startIncomingRingtone();
    } else if (activeCall?.state === 'dialing' || activeCall?.state === 'ringing') {
      telephonyAudio.startRingbackTone();
    } else if (activeCall?.state === 'connected') {
      if (activeCall.isOnHold) {
        telephonyAudio.startHoldMusic();
      } else {
        telephonyAudio.stopAllSounds();
      }
    } else {
      telephonyAudio.stopAllSounds();
    }

    return () => {
      telephonyAudio.stopAllSounds();
    };
  }, [incomingCall, activeCall?.state, activeCall?.isOnHold]);

  // 1. INCOMING CALL POPUP
  if (incomingCall && !activeCall) {
    return (
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-cyan-500/80 rounded-3xl max-w-sm w-full p-6 shadow-2xl shadow-cyan-500/20 text-center animate-bounce">
          
          <div className="w-20 h-20 mx-auto rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 mb-4 animate-pulse">
            <Phone className="w-10 h-10 fill-current" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-600 text-cyan-300 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            مكالمة واردة داخلية
          </div>

          <h3 className="text-xl font-extrabold text-white mb-1">
            {incomingCall.fromName}
          </h3>
          <p className="text-sm font-mono text-cyan-300 mb-6">
            تحويلة #{incomingCall.fromExtension}
          </p>

          <div className="flex items-center justify-center gap-6">
            {/* Reject Button */}
            <button
              id="btn-incoming-reject"
              onClick={onRejectCall}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform active:scale-95">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-rose-400">رفض</span>
            </button>

            {/* Answer Button */}
            <button
              id="btn-incoming-answer"
              onClick={onAnswerCall}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/40 transition-transform active:scale-95 animate-pulse">
                <Phone className="w-8 h-8 fill-current" />
              </div>
              <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400">رد على المكالمة</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE CALL / DIALING SCREEN
  if (!activeCall) return null;

  const isConnected = activeCall.state === 'connected';
  const isRingingOrDialing = activeCall.state === 'dialing' || activeCall.state === 'ringing';

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Ambient background glow */}
        <div className={`absolute -top-24 -left-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none ${
          isConnected ? 'bg-emerald-500' : 'bg-cyan-500'
        }`} />
        <div className={`absolute -bottom-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none ${
          isConnected ? 'bg-teal-500' : 'bg-blue-500'
        }`} />

        {/* Top Status */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
          <span className="flex items-center gap-1.5 font-semibold text-cyan-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            اتصال آمن ومباشر داخل التطبيق
          </span>
          <span className="font-mono text-slate-400">
            {activeCall.direction === 'outgoing' ? 'مكالمة صادرة' : 'مكالمة واردة'}
          </span>
        </div>

        {/* Contact Info Avatar & Name */}
        <div className="text-center mb-6">
          <div className={`w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-3xl shadow-xl mb-4 relative ${
            isRingingOrDialing ? 'animate-pulse' : ''
          }`}>
            {activeCall.targetName.charAt(0)}

            {/* Glowing ring when calling */}
            {isRingingOrDialing && (
              <span className="absolute inset-0 rounded-3xl border-2 border-cyan-400 animate-ping opacity-40 pointer-events-none" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            {activeCall.targetName}
          </h2>
          
          <div className="font-mono text-cyan-400 text-sm mt-1">
            تحويلة #{activeCall.targetExtension}
          </div>

          {/* Call Status / Timer */}
          <div className="mt-3">
            {isRingingOrDialing ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                جاري الاتصال والرنين لدى الطرف الآخر...
              </div>
            ) : isConnected ? (
              <div>
                <span className="font-mono text-2xl font-black text-emerald-400 tracking-wider">
                  {formatTimer(activeCall.durationSeconds)}
                </span>
                {activeCall.isOnHold && (
                  <span className="block text-xs font-bold text-amber-400 mt-1">
                    [المكالمة معلقة قيد الانتظار - Hold]
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Simulated Instant Answer Helper (Great for local testing without multi tabs) */}
        {isRingingOrDialing && onSimulateTargetAnswer && (
          <div className="mb-6 p-3.5 rounded-2xl bg-cyan-950/50 border border-cyan-800/60 text-right animate-in fade-in">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-cyan-200">
                <strong>هاتف الطرف الآخر يرن الآن!</strong>
                <p className="text-[11px] text-cyan-400/80 mt-0.5">
                  يمكنك الرد كـ <strong>{activeCall.targetName}</strong> فوراً لاختبار المكالمة:
                </p>
              </div>

              <button
                id="btn-simulate-target-answer"
                onClick={onSimulateTargetAnswer}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 whitespace-nowrap cursor-pointer transition-all active:scale-95"
              >
                رد الآن كـ ({activeCall.targetExtension})
              </button>
            </div>
          </div>
        )}

        {/* Animated Audio Waveform (Visible during connected call) */}
        {isConnected && !activeCall.isOnHold && (
          <div className="flex items-center justify-center gap-1.5 h-10 mb-6 px-4">
            {[40, 75, 55, 95, 30, 80, 65, 90, 45, 85, 35, 70].map((h, i) => (
              <span
                key={i}
                className="w-1.5 bg-emerald-400/90 rounded-full animate-pulse transition-all duration-150"
                style={{
                  height: `${h}%`,
                  animationDelay: `${(i % 5) * 120}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Keypad Flyout during call */}
        {showInCallKeypad && isConnected && (
          <div className="mb-6 p-3 bg-slate-950 rounded-2xl border border-slate-800 grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9','*','0','#'].map((digit) => (
              <button
                key={digit}
                onClick={() => {
                  telephonyAudio.playDTMF(digit);
                  onSendDTMF(digit);
                }}
                className="h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-mono text-sm font-bold"
              >
                {digit}
              </button>
            ))}
          </div>
        )}

        {/* In-Call Controls (Mute, Hold, Keypad, Speaker) */}
        {isConnected && (
          <div className="grid grid-cols-4 gap-2 mb-6">
            
            {/* Mute Mic */}
            <button
              id="btn-call-mute"
              onClick={onToggleMute}
              className={`p-3 rounded-2xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                activeCall.isMuted
                  ? 'bg-rose-950/80 border-rose-600 text-rose-400'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="text-[10px] font-semibold">{activeCall.isMuted ? 'مكتوم' : 'كتم'}</span>
            </button>

            {/* Hold */}
            <button
              id="btn-call-hold"
              onClick={onToggleHold}
              className={`p-3 rounded-2xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                activeCall.isOnHold
                  ? 'bg-amber-950/80 border-amber-600 text-amber-400'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {activeCall.isOnHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              <span className="text-[10px] font-semibold">{activeCall.isOnHold ? 'استئناف' : 'انتظار'}</span>
            </button>

            {/* Speaker */}
            <button
              id="btn-call-speaker"
              onClick={onToggleSpeaker}
              className={`p-3 rounded-2xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                activeCall.isSpeaker
                  ? 'bg-cyan-950/80 border-cyan-600 text-cyan-400'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {activeCall.isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <span className="text-[10px] font-semibold">{activeCall.isSpeaker ? 'مكبر' : 'سماعة'}</span>
            </button>

            {/* In-Call Keypad */}
            <button
              id="btn-call-keypad"
              onClick={() => setShowInCallKeypad(!showInCallKeypad)}
              className={`p-3 rounded-2xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                showInCallKeypad
                  ? 'bg-cyan-950/80 border-cyan-600 text-cyan-400'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Grid className="w-5 h-5" />
              <span className="text-[10px] font-semibold">الأرقام</span>
            </button>
          </div>
        )}

        {/* End Call Hang-Up Button */}
        <div className="flex items-center justify-center">
          <button
            id="btn-end-call"
            onClick={onEndCall}
            className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-base flex items-center justify-center gap-3 shadow-xl shadow-rose-600/40 hover:shadow-rose-600/60 active:scale-95 transition-all cursor-pointer"
          >
            <PhoneOff className="w-6 h-6" />
            <span>إنهاء المكالمة</span>
          </button>
        </div>

      </div>
    </div>
  );
};
