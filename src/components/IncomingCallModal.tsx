import React from 'react';
import { Phone, PhoneCall, PhoneOff, User, ShieldCheck } from 'lucide-react';
import type { CallSession } from '../services/webrtcManager';

interface IncomingCallModalProps {
  session: CallSession;
  onAnswer: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  session,
  onAnswer,
  onReject,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        id="incoming-call-card"
        className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 md:p-8 text-center shadow-2xl shadow-emerald-950/50 relative overflow-hidden"
      >
        {/* Background ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/15 blur-3xl rounded-full pointer-events-none"></div>

        {/* Pulse calling avatar */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute w-32 h-32 rounded-full bg-emerald-500/10 animate-ping"></div>
          <div className="absolute w-24 h-24 rounded-full bg-emerald-500/20 animate-pulse"></div>
          
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-600/30 text-white">
            <Phone className="w-10 h-10 animate-bounce" />
          </div>
        </div>

        {/* Caller Title & Info */}
        <div className="space-y-1.5 mb-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            مكالمة واردة الآن
          </span>

          <h2 className="text-2xl font-bold text-white tracking-tight mt-2">
            {session.peerName || 'الطالب'}
          </h2>

          <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-500" />
            معرّف المتصل: <span className="font-mono text-emerald-400 font-semibold">{session.peerId}</span>
          </p>
        </div>

        {/* Reassurance badge about call connection stability */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-8 text-xs text-slate-400 flex items-center gap-2 text-right">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>تم تعزيز اتصال WebRTC لمنع انقطاع المكالمة عند الرد وضمان تدفق الصوت ثنائياً فورا.</span>
        </div>

        {/* Action Buttons: Answer (فتح الخط) & Reject (رفض) */}
        <div className="grid grid-cols-2 gap-4">
          <button
            id="answer-call-btn"
            onClick={onAnswer}
            className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3.5 px-5 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all transform active:scale-95"
          >
            <PhoneCall className="w-5 h-5" />
            <span>فتح الخط (الرد)</span>
          </button>

          <button
            id="reject-call-btn"
            onClick={onReject}
            className="flex items-center justify-center gap-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold py-3.5 px-5 rounded-2xl transition-all active:scale-95"
          >
            <PhoneOff className="w-5 h-5" />
            <span>رفض المكالمة</span>
          </button>
        </div>

      </div>
    </div>
  );
};
