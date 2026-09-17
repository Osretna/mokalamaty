import React, { useEffect, useState } from 'react';
import { 
  Phone, 
  Delete, 
  User, 
  CheckCircle2, 
  PhoneCall, 
  Sparkles, 
  Volume2, 
  Radio, 
  ArrowUpRight 
} from 'lucide-react';
import { TelephonyUser } from '../types/telephony';
import { telephonyAudio } from '../utils/audioService';
import { DEFAULT_USERS } from '../utils/telephonySignal';

interface DialPadProps {
  inputNumber: string;
  onInputChange: (val: string) => void;
  onStartCall: (targetNumber: string, targetName?: string) => void;
  currentUser: TelephonyUser;
}

export const DialPad: React.FC<DialPadProps> = ({
  inputNumber,
  onInputChange,
  onStartCall,
  currentUser,
}) => {
  const [matchedContact, setMatchedContact] = useState<TelephonyUser | null>(null);

  // Look up matched contact based on entered extension
  useEffect(() => {
    if (!inputNumber) {
      setMatchedContact(null);
      return;
    }
    const match = DEFAULT_USERS.find(
      (u) => u.extension === inputNumber.trim() || u.name.includes(inputNumber.trim())
    );
    setMatchedContact(match || null);
  }, [inputNumber]);

  // Handle keypad digit click
  const handleDigitClick = (digit: string) => {
    telephonyAudio.playDTMF(digit);
    onInputChange(inputNumber + digit);
  };

  // Handle backspace
  const handleBackspace = () => {
    if (inputNumber.length > 0) {
      onInputChange(inputNumber.slice(0, -1));
    }
  };

  // Handle clear
  const handleClear = () => {
    onInputChange('');
  };

  // Keyboard support for dialing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is inside an input elsewhere
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (/^[0-9*#]$/.test(e.key)) {
        e.preventDefault();
        handleDigitClick(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (inputNumber.trim()) {
          onStartCall(inputNumber.trim(), matchedContact?.name);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputNumber, matchedContact]);

  const keypadButtons = [
    { digit: '1', letters: '' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
    { digit: '*', letters: '' },
    { digit: '0', letters: '+' },
    { digit: '#', letters: '' },
  ];

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/90 rounded-3xl border border-slate-800 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      
      {/* Extension Display Box (Styled exactly matching user's Image 9) */}
      <div className="relative mb-4">
        <div className="w-full min-h-[72px] bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 px-4 flex items-center justify-between shadow-inner">
          {/* Clear button on right/left for RTL */}
          <button
            id="btn-clear-dialpad"
            onClick={handleClear}
            className={`text-xs sm:text-sm font-bold text-slate-400 hover:text-rose-400 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800/80 ${
              !inputNumber ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            مسح
          </button>

          {/* Number Display */}
          <div className="text-center flex-1">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-white tracking-widest selection:bg-cyan-500/40">
              {inputNumber || <span className="text-slate-600 font-sans text-lg font-normal">أدخل رقم التحويلة...</span>}
            </span>
          </div>

          {/* Backspace icon */}
          <button
            id="btn-backspace-dialpad"
            onClick={handleBackspace}
            disabled={!inputNumber}
            className={`p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/80 ${
              !inputNumber ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Matched Contact Badge (Matches User's Image 9, with the status FIXED to Online / Ready to Call) */}
      {matchedContact && (
        <div className="mb-5 bg-gradient-to-r from-cyan-950/40 to-slate-900/90 border border-cyan-800/50 rounded-2xl p-3.5 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${matchedContact.avatarColor || 'from-cyan-500 to-blue-600'} flex items-center justify-center text-white font-bold text-base shadow-md`}>
              {matchedContact.name.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                {matchedContact.name}
                {matchedContact.extension === currentUser.extension && (
                  <span className="text-[10px] text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                    (تحويلتك)
                  </span>
                )}
              </div>
              <div className="text-xs text-cyan-400 font-mono mt-0.5">
                تحويلة #{matchedContact.extension} (اتصال داخلي مباشر)
              </div>
            </div>
          </div>

          {/* Status Badge: FIXED - Shows "متواجد حالياً / جاهز للاتصال" with glowing green indicator */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              متواجد حالياً
            </span>
          </div>
        </div>
      )}

      {/* Quick Extension Suggestions */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
          <span>تحويلات سريعة:</span>
          <span className="text-slate-500">انقر للاتصال المباشر</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DEFAULT_USERS.filter((u) => u.extension !== currentUser.extension).slice(0, 3).map((user) => (
            <button
              key={user.id}
              id={`quick-ext-${user.extension}`}
              onClick={() => {
                onInputChange(user.extension);
                telephonyAudio.playDTMF('5');
              }}
              className="px-2.5 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/90 border border-slate-800/80 hover:border-cyan-700/60 transition-all text-right group"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                {user.name.split(' ')[0]}
              </div>
              <div className="text-[11px] font-mono text-cyan-400/80 flex items-center justify-between mt-0.5">
                <span>#{user.extension}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Keypad Grid 3x4 */}
      <div className="grid grid-cols-3 gap-3 sm:gap-3.5 mb-6">
        {keypadButtons.map(({ digit, letters }) => (
          <button
            key={digit}
            id={`keypad-${digit === '*' ? 'star' : digit === '#' ? 'hash' : digit}`}
            onClick={() => handleDigitClick(digit)}
            className="h-14 sm:h-16 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 active:bg-cyan-600/40 border border-slate-700/50 hover:border-slate-600 transition-all flex flex-col items-center justify-center shadow-sm active:scale-95 group select-none cursor-pointer"
          >
            <span className="font-mono text-xl sm:text-2xl font-bold text-white group-hover:text-cyan-300">
              {digit}
            </span>
            {letters ? (
              <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-300 tracking-wider">
                {letters}
              </span>
            ) : (
              <span className="h-2.5"></span>
            )}
          </button>
        ))}
      </div>

      {/* Big Action Call Button */}
      <div className="flex items-center justify-center gap-3">
        <button
          id="btn-make-call"
          disabled={!inputNumber.trim()}
          onClick={() => onStartCall(inputNumber.trim(), matchedContact?.name)}
          className={`w-full py-4 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl transition-all select-none cursor-pointer ${
            inputNumber.trim()
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-[1.02] active:scale-98'
              : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed'
          }`}
        >
          <Phone className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
          <span>اتصال داخلي مباشر</span>
        </button>
      </div>

      {/* Status footer info */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          بروتوكول WebRTC الداخلي جاهز
        </span>
        <span className="font-mono">IP: {currentUser.pbxServerIp}</span>
      </div>
    </div>
  );
};
