import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  PhoneOff, 
  Delete, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Sparkles,
  PhoneCall,
  User,
  Hash
} from 'lucide-react';
import { playDTMF, playTelephonyFx, startRingback, stopRingback } from '../utils/audioTones';
import { PBXUser } from '../types';

interface SoftphoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PBXUser;
  users: PBXUser[];
  onMakeCall: (destinationNumber: string, destinationName?: string) => void;
}

export const SoftphoneModal: React.FC<SoftphoneModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onMakeCall,
}) => {
  const [dialNumber, setDialNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isDialing, setIsDialing] = useState(false);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    playDTMF(digit);
    setDialNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setDialNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDialNumber('');
  };

  const handleCall = () => {
    if (!dialNumber.trim()) return;
    setIsDialing(true);
    startRingback();

    // Check if dialNumber matches an extension or user
    const matchedUser = users.find((u) => u.extension === dialNumber.trim());
    const destName = matchedUser ? matchedUser.name : `خط خارجي (${dialNumber})`;

    setTimeout(() => {
      stopRingback();
      playTelephonyFx('connected');
      setIsDialing(false);
      onMakeCall(dialNumber.trim(), destName);
      onClose();
    }, 2800);
  };

  const handleCancelDialing = () => {
    stopRingback();
    setIsDialing(false);
  };

  const dialKeys = [
    { digit: '1', sub: '' },
    { digit: '2', sub: 'ABC' },
    { digit: '3', sub: 'DEF' },
    { digit: '4', sub: 'GHI' },
    { digit: '5', sub: 'JKL' },
    { digit: '6', sub: 'MNO' },
    { digit: '7', sub: 'PQRS' },
    { digit: '8', sub: 'TUV' },
    { digit: '9', sub: 'WXYZ' },
    { digit: '*', sub: '' },
    { digit: '0', sub: '+' },
    { digit: '#', sub: '' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">الهاتف الشبكي (Softphone)</h3>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                تحويلة {currentUser.extension} • SIP جاهز
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dial Display */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800">
          <div className="relative flex items-center">
            <input
              id="input-dial-number"
              type="text"
              readOnly
              dir="ltr"
              value={dialNumber}
              placeholder="أدخل الرقم أو التحويلة..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold text-cyan-300 tracking-wider placeholder:text-slate-600 focus:outline-none"
            />
            {dialNumber && (
              <button
                onClick={handleBackspace}
                className="absolute right-3 p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                title="مسح رقم"
              >
                <Delete className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Quick status during dialing */}
          {isDialing && (
            <div className="mt-2 text-center py-1.5 px-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              جاري الاتصال عبر Asterisk Trunk...
            </div>
          )}
        </div>

        {/* DTMF Keypad */}
        <div className="p-4 grid grid-cols-3 gap-2.5">
          {dialKeys.map((item) => (
            <button
              key={item.digit}
              id={`keypad-${item.digit === '*' ? 'star' : item.digit === '#' ? 'hash' : item.digit}`}
              onClick={() => handleDigitClick(item.digit)}
              disabled={isDialing}
              className="group flex flex-col items-center justify-center py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-cyan-600/30 border border-slate-700/70 hover:border-cyan-500/40 text-white font-mono transition-all active:scale-95 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span className="text-xl font-bold group-hover:text-cyan-300 transition-colors">
                {item.digit}
              </span>
              {item.sub && (
                <span className="text-[10px] text-slate-400 tracking-widest leading-none mt-0.5">
                  {item.sub}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Speed Dial Quick Extensions */}
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5">تحويلات سريعة:</div>
          <div className="flex flex-wrap gap-1.5">
            {users.slice(0, 4).map((u) => (
              <button
                key={u.id}
                onClick={() => setDialNumber(u.extension)}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-cyan-600/20 text-slate-300 hover:text-cyan-300 border border-slate-700 text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <User className="w-3 h-3 text-cyan-400" />
                <span>{u.extension}</span>
                <span className="text-[10px] text-slate-400">({u.name.split(' ')[0]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Call Action Bar */}
        <div className="p-4 bg-slate-800/60 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-xl border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'إلغاء كتم الميكروفون' : 'كتم الميكروفون'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {!isDialing ? (
            <button
              id="btn-dial-call"
              onClick={handleCall}
              disabled={!dialNumber.trim()}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <Phone className="w-5 h-5" />
              <span>اتصال (SIP Call)</span>
            </button>
          ) : (
            <button
              id="btn-cancel-call"
              onClick={handleCancelDialing}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              <span>إلغاء الاتصال</span>
            </button>
          )}

          <button
            onClick={handleClear}
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="مسح الكل"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
