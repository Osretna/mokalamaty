import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Server, 
  Database, 
  Bell, 
  Radio, 
  ShieldCheck, 
  UserCheck, 
  PlusCircle, 
  Flame,
  Clock,
  Sparkles,
  PhoneIncoming
} from 'lucide-react';
import { PBXStatus, PBXUser } from '../types';

interface HeaderProps {
  pbxStatus: PBXStatus;
  currentUser: PBXUser;
  onOpenSoftphone: () => void;
  onTriggerSimulatedCall: () => void;
  unreadVoicemailsCount: number;
  activeCallsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  pbxStatus,
  currentUser,
  onOpenSoftphone,
  onTriggerSimulatedCall,
  unreadVoicemailsCount,
  activeCallsCount,
}) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold text-xl ring-2 ring-cyan-500/30">
              <PhoneCall className="w-5 h-5" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">اتصالاتي</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Asterisk + Firebase PBX
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              المنظومة الموحدة لإدارة المكالمات، البريد الصوتي، الفاكس، وغرف المؤتمرات
            </p>
          </div>
        </div>

        {/* Live PBX & Firebase Status Badges */}
        <div className="hidden xl:flex items-center gap-2 text-xs">
          {/* Asterisk AMI Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>محرك Asterisk:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              متصل (AMI)
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 font-mono">{pbxStatus.amiChannels} قنوات</span>
          </div>

          {/* Firebase Sync Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
            <span>Firebase:</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
              <Database className="w-3 h-3 text-amber-400" />
              <span>mokalamaty-160e0 (متزامن)</span>
            </span>
          </div>

          {/* FCM Notifications */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>إشعارات FCM:</span>
            <span className="text-emerald-400 font-medium">نشط</span>
          </div>
        </div>

        {/* Action Controls & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Quick Incoming Call Simulation Trigger */}
          <button
            id="btn-simulate-call"
            onClick={onTriggerSimulatedCall}
            title="محاكاة اتصال SIP وارد لاختبار الـ Screen-Pop والإشعار"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors active:scale-95 cursor-pointer"
          >
            <PhoneIncoming className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span className="hidden md:inline">محاكاة مكالمة واردة</span>
            <span className="md:hidden">محاكاة</span>
          </button>

          {/* Open Softphone Button */}
          <button
            id="btn-open-softphone"
            onClick={onOpenSoftphone}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>لوحة الاتصال</span>
            {activeCallsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                {activeCallsCount}
              </span>
            )}
          </button>

          {/* Digital Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 text-slate-400 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{timeStr}</span>
          </div>

          {/* Current User Extension Card */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs">
            <div className="w-7 h-7 rounded-full bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
              {currentUser.extension}
            </div>
            <div className="hidden lg:block text-right">
              <div className="font-semibold text-slate-200 leading-tight">{currentUser.name}</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                تحويلة {currentUser.extension} ({currentUser.protocol})
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
