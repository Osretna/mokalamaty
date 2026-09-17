import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  PhoneCall, 
  Radio, 
  CheckCircle2, 
  ExternalLink,
  Shield,
  Building,
  UserCheck
} from 'lucide-react';
import { TelephonyUser } from '../types/telephony';
import { DEFAULT_USERS } from '../utils/telephonySignal';

interface DirectoryContactsProps {
  currentUser: TelephonyUser;
  onCallUser: (extension: string, name: string) => void;
}

export const DirectoryContacts: React.FC<DirectoryContactsProps> = ({
  currentUser,
  onCallUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = DEFAULT_USERS.filter((user) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      user.name.toLowerCase().includes(q) ||
      user.extension.includes(q) ||
      user.department.toLowerCase().includes(q)
    );
  });

  const openCoworkerTab = (ext: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('ext', ext);
    window.open(url.toString(), '_blank', 'width=460,height=800,menubar=no,toolbar=no');
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-slate-900/90 rounded-3xl border border-slate-800 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            دليل التحويلات والزملاء
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            جميع التحويلات مسجلة ومتواجدة وجاهزة للاتصال الداخلي الفوري
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-contacts"
            type="text"
            placeholder="بحث بالاسم أو التحويلة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Directory List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            لم يتم العثور على أي تحويلة مطابقة للبحث
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isCurrentUser = user.extension === currentUser.extension;
            return (
              <div
                key={user.id}
                id={`contact-card-${user.extension}`}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCurrentUser
                    ? 'bg-gradient-to-r from-cyan-950/30 via-slate-900 to-slate-900/90 border-cyan-700/50 shadow-sm'
                    : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/90 hover:border-slate-700 shadow-sm'
                }`}
              >
                {/* User Info */}
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
                      user.avatarColor || 'from-cyan-500 to-blue-600'
                    } flex items-center justify-center text-white font-extrabold text-lg shadow-md shrink-0`}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100 text-sm sm:text-base">
                        {user.name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] bg-cyan-950 border border-cyan-700 text-cyan-300 px-2 py-0.5 rounded-md font-semibold">
                          أنت (حسابك الحالي)
                        </span>
                      )}
                      {user.role === 'admin' && (
                        <span className="text-[10px] bg-amber-950 border border-amber-700 text-amber-300 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" />
                          إدارة
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="font-mono text-cyan-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        تحويلة #{user.extension}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Building className="w-3 h-3 text-slate-500" />
                        {user.department}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Call Action */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  {/* Status Indicator (Fixed to Online / Ready to Call) */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>متواجد حالياً / On Hook</span>
                  </div>

                  {/* Actions */}
                  {!isCurrentUser ? (
                    <div className="flex items-center gap-2">
                      <button
                        id={`btn-call-${user.extension}`}
                        onClick={() => onCallUser(user.extension, user.name)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all active:scale-95 cursor-pointer"
                      >
                        <Phone className="w-4 h-4 fill-current" />
                        اتصال
                      </button>

                      {/* Open separate window button */}
                      <button
                        id={`btn-open-tab-${user.extension}`}
                        onClick={() => openCoworkerTab(user.extension)}
                        title="فتح نافذة منفصلة بهذا المستخدم لتجربة المكالمة الثنائية المتزامنة"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                      خطك النشط
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tip Banner for Testing */}
      <div className="mt-6 p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-cyan-400 shrink-0" />
          <p className="text-xs text-cyan-200">
            <strong>نصيحة اختبار المكالمات:</strong> يمكنك النقر على رمز المربع الصغير بجانب أي تحويلة لفتحها في نافذة مستقلة وتجربة الرنين المزدوج والمكالمة الصوتية المباشرة في نفس اللحظة!
          </p>
        </div>
      </div>
    </div>
  );
};
