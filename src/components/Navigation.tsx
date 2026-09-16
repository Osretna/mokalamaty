import React from 'react';
import { 
  LayoutDashboard, 
  Phone, 
  Voicemail as VoicemailIcon, 
  FileText, 
  Users, 
  Contact, 
  Layers, 
  Cpu,
  Flame,
  Radio
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard'
  | 'calls'
  | 'voicemail'
  | 'fax'
  | 'conferences'
  | 'crm'
  | 'users'
  | 'middleware';

interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeCallsCount: number;
  unreadVoicemailsCount: number;
  unresolvedFaxesCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  activeCallsCount,
  unreadVoicemailsCount,
  unresolvedFaxesCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'لوحة التحكم',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'calls' as ActiveTab,
      label: 'إدارة المكالمات',
      icon: Phone,
      badge: activeCallsCount > 0 ? activeCallsCount : null,
      badgeColor: 'bg-emerald-500 text-white animate-pulse',
    },
    {
      id: 'voicemail' as ActiveTab,
      label: 'البريد الصوتي',
      icon: VoicemailIcon,
      badge: unreadVoicemailsCount > 0 ? unreadVoicemailsCount : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'fax' as ActiveTab,
      label: 'الفاكس الرقمي',
      icon: FileText,
      badge: unresolvedFaxesCount > 0 ? unresolvedFaxesCount : null,
      badgeColor: 'bg-blue-500 text-white',
    },
    {
      id: 'conferences' as ActiveTab,
      label: 'غرف المؤتمرات',
      icon: Users,
      badge: null,
    },
    {
      id: 'crm' as ActiveTab,
      label: 'سجل العملاء CRM',
      icon: Contact,
      badge: null,
    },
    {
      id: 'users' as ActiveTab,
      label: 'المستخدمين والتحويلات',
      icon: Layers,
      badge: null,
    },
    {
      id: 'middleware' as ActiveTab,
      label: 'محرك Asterisk والربط',
      icon: Cpu,
      badge: 'AMI',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-4">
      <div className="flex items-center overflow-x-auto no-scrollbar gap-1 py-1.5 max-w-7xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`tab-nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.badge !== null && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${item.badgeColor || 'bg-slate-700 text-slate-300'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
