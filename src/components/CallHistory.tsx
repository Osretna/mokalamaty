import React from 'react';
import { 
  Clock, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Phone, 
  Trash2, 
  RotateCcw 
} from 'lucide-react';
import { CallLogItem } from '../types/telephony';

interface CallHistoryProps {
  logs: CallLogItem[];
  onRedial: (extension: string, name: string) => void;
  onClearLogs: () => void;
}

export const CallHistory: React.FC<CallHistoryProps> = ({
  logs,
  onRedial,
  onClearLogs,
}) => {
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'لم يتم الرد';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return 'اليوم';
    }
    return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-slate-900/90 rounded-3xl border border-slate-800 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            سجل المكالمات الأخيرة
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            سجل فوري لجميع المكالمات الصادرة والواردة والمفقودة
          </p>
        </div>

        {logs.length > 0 && (
          <button
            id="btn-clear-call-history"
            onClick={onClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-700/50 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            مسح السجل
          </button>
        )}
      </div>

      {/* History Items */}
      <div className="space-y-2.5">
        {logs.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            لا توجد أي مكالمات مسجلة حتى الآن
          </div>
        ) : (
          logs.map((log) => {
            const isMissed = log.direction === 'missed' || log.status === 'missed';
            const isIncoming = log.direction === 'incoming';

            return (
              <div
                key={log.id}
                id={`call-log-${log.id}`}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isMissed
                        ? 'bg-rose-950/70 text-rose-400 border border-rose-800/60'
                        : isIncoming
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                        : 'bg-cyan-950/70 text-cyan-400 border border-cyan-800/60'
                    }`}
                  >
                    {isMissed ? (
                      <PhoneMissed className="w-4 h-4" />
                    ) : isIncoming ? (
                      <PhoneIncoming className="w-4 h-4" />
                    ) : (
                      <PhoneOutgoing className="w-4 h-4" />
                    )}
                  </div>

                  {/* Details */}
                  <div>
                    <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                      <span className={isMissed ? 'text-rose-300' : ''}>
                        {log.contactName || `تحويلة #${log.extension}`}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        #{log.extension}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{formatDate(log.timestamp)}</span>
                      <span>•</span>
                      <span>{formatTime(log.timestamp)}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-300">
                        {formatDuration(log.durationSeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Redial Action */}
                <button
                  id={`btn-redial-${log.extension}`}
                  onClick={() => onRedial(log.extension, log.contactName)}
                  title="إعادة الاتصال"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700 hover:border-emerald-500 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 fill-current" />
                  <span>اتصال</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
