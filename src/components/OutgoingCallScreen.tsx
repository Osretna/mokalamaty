import React from 'react';
import { Phone, PhoneOff, Radio, ShieldCheck } from 'lucide-react';
import type { CallSession } from '../services/webrtcManager';

interface OutgoingCallScreenProps {
  session: CallSession;
  onCancelCall: () => void;
}

export const OutgoingCallScreen: React.FC<OutgoingCallScreenProps> = ({
  session,
  onCancelCall,
}) => {
  return (
    <div className="w-full max-w-md mx-auto animate-fadeIn text-center">
      <div 
        id="outgoing-call-card"
        className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Glow ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>

        {/* Pulsating calling rings */}
        <div className="relative my-8 flex items-center justify-center">
          <div className="absolute w-36 h-36 rounded-full bg-emerald-500/10 animate-ping"></div>
          <div className="absolute w-28 h-28 rounded-full bg-teal-500/20 animate-pulse"></div>
          
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-600/30 text-white">
            <Phone className="w-9 h-9 animate-bounce" />
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-2 mb-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            جاري الاتصال... يرن الآن
          </span>

          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            {session.peerName}
          </h2>

          <p className="text-xs text-slate-400 font-mono">
            معرّف المتصل به: <span className="text-emerald-400">{session.peerId}</span>
          </p>
        </div>

        {/* Reassurance text */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 mb-8 text-xs text-slate-400 flex items-start gap-2.5 text-right">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            نظام الاتصال المحدث يضمن عدم انقطاع الخط لدى الطالب عند قيام المستخدم بالرد وفتح الخط.
          </span>
        </div>

        {/* Cancel Call Button */}
        <button
          id="cancel-outgoing-call-btn"
          onClick={onCancelCall}
          className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <PhoneOff className="w-5 h-5" />
          <span>إلغاء الاتصال</span>
        </button>

      </div>
    </div>
  );
};
