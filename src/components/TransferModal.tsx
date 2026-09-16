import React, { useState } from 'react';
import { X, ArrowRightLeft, PhoneForwarded, User, Search, CheckCircle2 } from 'lucide-react';
import { Call, PBXUser } from '../types';
import { playTelephonyFx } from '../utils/audioTones';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: Call | null;
  users: PBXUser[];
  onExecuteTransfer: (callId: string, destinationExt: string, isAttended: boolean) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  call,
  users,
  onExecuteTransfer,
}) => {
  const [selectedExt, setSelectedExt] = useState('');
  const [customExt, setCustomExt] = useState('');
  const [isAttended, setIsAttended] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !call) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.extension.includes(searchTerm)
  );

  const handleTransfer = () => {
    const target = selectedExt || customExt.trim();
    if (!target) return;
    playTelephonyFx('connected');
    onExecuteTransfer(call.id, target, isAttended);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-800/90 px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <PhoneForwarded className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">تحويل المكالمة (Call Transfer)</h3>
              <p className="text-xs text-slate-400">
                المتصل الحالي: <span className="text-cyan-400 font-bold">{call.callerName}</span> ({call.callerNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transfer Mode Toggle */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800">
          <label className="text-xs font-semibold text-slate-300 block mb-2">نوع التحويل:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsAttended(false)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                !isAttended
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>تحويل أعمى (Blind)</span>
              <span className="text-[10px] text-slate-500 font-normal">تحويل فوري ومباشر</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAttended(true)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                isAttended
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <PhoneForwarded className="w-4 h-4" />
              <span>تحويل مشروط (Attended)</span>
              <span className="text-[10px] text-slate-500 font-normal">التحدث مع الزميل أولاً</span>
            </button>
          </div>
        </div>

        {/* Extensions List */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو رقم التحويلة..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {filteredUsers.map((u) => {
              const isSelected = selectedExt === u.extension;
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    setSelectedExt(u.extension);
                    setCustomExt('');
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
                      : 'bg-slate-800/60 border-slate-750 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {u.extension}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.role === 'admin' ? 'مدير النظام' : u.role === 'supervisor' ? 'مشرف' : 'موظف'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      u.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' :
                      u.status === 'busy' ? 'bg-rose-500/20 text-rose-400' :
                      u.status === 'dnd' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {u.status === 'online' ? 'متاح' : u.status === 'busy' ? 'مشغول' : u.status === 'dnd' ? 'ممنوع الإزعاج' : 'غير متصل'}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Or Manual External Number */}
          <div className="pt-2 border-t border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              أو أدخل رقم تحويلة أو خط خارجي يدوي:
            </label>
            <input
              type="text"
              value={customExt}
              onChange={(e) => {
                setCustomExt(e.target.value);
                setSelectedExt('');
              }}
              placeholder="مثال: 106 أو 01012345678"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            id="btn-confirm-transfer"
            type="button"
            onClick={handleTransfer}
            disabled={!selectedExt && !customExt.trim()}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <PhoneForwarded className="w-4 h-4" />
            <span>تنفيذ التحويل الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
