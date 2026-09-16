import React, { useState, useEffect } from 'react';
import { 
  PhoneIncoming, 
  PhoneOff, 
  PhoneCall, 
  User, 
  Building2, 
  Clock, 
  Star, 
  FileText, 
  Voicemail as VoicemailIcon, 
  Plus, 
  Check, 
  X,
  Volume2
} from 'lucide-react';
import { Call, CRMContact } from '../types';
import { startIncomingRing, stopIncomingRing, playTelephonyFx } from '../utils/audioTones';

interface ScreenPopModalProps {
  incomingCall: Call | null;
  crmContact: CRMContact | null;
  onAnswer: (call: Call) => void;
  onReject: (call: Call) => void;
  onSendToVoicemail: (call: Call) => void;
  onAddCRMNote: (contactId: string, noteText: string) => void;
  onSaveNewContact?: (name: string, phone: string, company: string) => void;
}

export const ScreenPopModal: React.FC<ScreenPopModalProps> = ({
  incomingCall,
  crmContact,
  onAnswer,
  onReject,
  onSendToVoicemail,
  onAddCRMNote,
}) => {
  const [quickNote, setQuickNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    if (incomingCall) {
      startIncomingRing();
      return () => {
        stopIncomingRing();
      };
    }
  }, [incomingCall]);

  if (!incomingCall) return null;

  const handleAnswer = () => {
    stopIncomingRing();
    playTelephonyFx('connected');
    onAnswer(incomingCall);
  };

  const handleReject = () => {
    stopIncomingRing();
    playTelephonyFx('hangup');
    onReject(incomingCall);
  };

  const handleVoicemail = () => {
    stopIncomingRing();
    playTelephonyFx('notification');
    onSendToVoicemail(incomingCall);
  };

  const handleSaveNote = () => {
    if (!quickNote.trim() || !crmContact) return;
    onAddCRMNote(crmContact.id, quickNote.trim());
    setQuickNote('');
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl w-full max-w-lg shadow-2xl shadow-emerald-500/20 overflow-hidden">
        {/* Ringing Top Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <PhoneIncoming className="w-6 h-6 animate-bounce text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg">مكالمة واردة (Inbound SIP)</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold font-mono">
                  تحويلة {incomingCall.extension}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-black/30 text-xs font-bold font-mono text-cyan-200 border border-cyan-300/30">
                  كود: {incomingCall.callCode}
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                قناة Asterisk: {incomingCall.channelId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-xs text-white">
            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            <span>رنين جاري...</span>
          </div>
        </div>

        {/* CRM Screen-Pop Data Details */}
        <div className="p-6 space-y-4">
          {crmContact ? (
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white">{crmContact.name}</h4>
                    {crmContact.vip && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        عميل VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {crmContact.company}
                  </p>
                </div>

                <div className="text-left" dir="ltr">
                  <div className="text-sm font-mono font-bold text-cyan-400">
                    {incomingCall.callerNumber}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {crmContact.totalCalls} مكالمة سابقة
                  </div>
                </div>
              </div>

              {/* Last Note from CRM */}
              {crmContact.notes.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs text-slate-300">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-cyan-400" />
                    آخر ملاحظة في سجل العميل:
                  </div>
                  <p className="line-clamp-2 italic">"{crmContact.notes[0].text}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-700/50 text-slate-400 mx-auto flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div className="text-base font-bold text-white">رقم غير مسجل في الـ CRM</div>
              <div className="text-sm font-mono text-cyan-400" dir="ltr">
                {incomingCall.callerNumber}
              </div>
              <p className="text-xs text-slate-400">
                يمكنك الرد وتسجيل بيانات المتصل لاحقاً في قاعدة بيانات العملاء.
              </p>
            </div>
          )}

          {/* Quick Note during ringing */}
          {crmContact && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                إضافة ملاحظة سريعة أثناء المكالمة:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="اكتب ملاحظة مختصرة تُحفظ في الـ CRM..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleSaveNote}
                  disabled={!quickNote.trim()}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {noteSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{noteSaved ? 'تم' : 'حفظ'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 grid grid-cols-3 gap-2.5">
            {/* Answer Call */}
            <button
              id="btn-screenpop-answer"
              onClick={handleAnswer}
              className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>رد (Answer)</span>
            </button>

            {/* Send to Voicemail */}
            <button
              id="btn-screenpop-voicemail"
              onClick={handleVoicemail}
              className="py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <VoicemailIcon className="w-4 h-4" />
              <span>بريد صوتي</span>
            </button>

            {/* Reject / Hangup */}
            <button
              id="btn-screenpop-reject"
              onClick={handleReject}
              className="py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>رفض (Busy)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
