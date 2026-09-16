import React, { useState } from 'react';
import { 
  Contact, 
  Search, 
  Star, 
  PhoneCall, 
  Mail, 
  Building2, 
  Clock, 
  Plus, 
  X, 
  FileText, 
  Check, 
  ChevronLeft,
  UserPlus
} from 'lucide-react';
import { CRMContact } from '../../types';

interface CRMViewProps {
  contacts: CRMContact[];
  onMakeCall: (number: string, name?: string) => void;
  onAddContact: (contact: CRMContact) => void;
  onAddNote: (contactId: string, text: string) => void;
}

export const CRMView: React.FC<CRMViewProps> = ({
  contacts,
  onMakeCall,
  onAddContact,
  onAddNote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVIPOnly, setFilterVIPOnly] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(contacts[0] || null);
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New contact form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isVIP, setIsVIP] = useState(false);

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVIP = filterVIPOnly ? c.vip : true;
    return matchesSearch && matchesVIP;
  });

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedContact) return;
    onAddNote(selectedContact.id, newNoteText.trim());
    setNewNoteText('');
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    const contact: CRMContact = {
      id: `crm-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      company: newCompany.trim() || 'شركة خاصة',
      email: newEmail.trim() || `${newPhone.replace(/\+/g, '')}@client.com`,
      vip: isVIP,
      totalCalls: 1,
      lastInteraction: new Date().toISOString().slice(0, 16).replace('T', ' '),
      notes: [
        {
          id: `n-${Date.now()}`,
          text: 'تم إنشاء بطاقة العميل في دليل الـ CRM ومطابقة رقم الهاتف مع كاشف المتصل.',
          date: new Date().toISOString().slice(0, 10),
          author: 'م. نسمة جمال',
        },
      ],
    };
    onAddContact(contact);
    setSelectedContact(contact);
    setIsAddModalOpen(false);
    setNewName('');
    setNewPhone('');
    setNewCompany('');
    setNewEmail('');
    setIsVIP(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Contact className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إدارة علاقات العملاء (CRM & Screen-Pop Sync)</h3>
              <p className="text-xs text-slate-400">
                ربط هوية المتصل ببيانات العميل، سجل الاتصالات، والملاحظات المحفوظة في Firestore
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة عميل جديد</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Contacts List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search & VIP Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف أو الشركة..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={() => setFilterVIPOnly(!filterVIPOnly)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                filterVIPOnly
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="تصفية عملاء VIP فقط"
            >
              <Star className={`w-4 h-4 ${filterVIPOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/20 border-cyan-500/70 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{contact.name}</span>
                        {contact.vip && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        <span>{contact.company}</span>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold text-cyan-400" dir="ltr">
                      {contact.phone}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{contact.totalCalls} مكالمات سابقة</span>
                    <span className="font-mono">{contact.lastInteraction}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Contact Profile Drawer (7 cols) */}
        <div className="lg:col-span-7">
          {selectedContact ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Header profile */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-extrabold text-white">{selectedContact.name}</h3>
                    {selectedContact.vip && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        حساب استراتيجي VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedContact.company}</span>
                  </p>
                </div>

                {/* Click to call button */}
                <button
                  onClick={() => onMakeCall(selectedContact.phone, selectedContact.name)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer self-start sm:self-center"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>اتصال مباشر (Click-to-Call)</span>
                </button>
              </div>

              {/* Quick Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                  <div className="text-slate-400 mb-1">رقم الهاتف:</div>
                  <div className="font-mono text-cyan-400 font-bold" dir="ltr">{selectedContact.phone}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                  <div className="text-slate-400 mb-1">البريد الإلكتروني:</div>
                  <div className="font-mono text-slate-200 truncate">{selectedContact.email}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                  <div className="text-slate-400 mb-1">إجمالي المكالمات:</div>
                  <div className="font-bold text-emerald-400">{selectedContact.totalCalls} تفاعل هاتف</div>
                </div>
              </div>

              {/* Notes Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>ملاحظات وسجل العميل في CRM:</span>
                </h4>

                <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="اكتب ملاحظة جديدة عن نتائج المكالمة أو طلبات العميل..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={!newNoteText.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    حفظ
                  </button>
                </form>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedContact.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-cyan-300">{note.author}</span>
                        <span className="font-mono">{note.date}</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
              اختر عميلاً من القائمة لعرض ملفه وسجل الاتصالات
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-slate-800/90 px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">إضافة بطاقة عميل إلى CRM</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">اسم العميل / المسؤول: *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: م. أحمد عبد السلام"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">رقم الهاتف (Caller ID): *</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+201012345678"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">اسم المؤسسة أو الشركة:</label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="مثال: دار الهندسة الاستشارية"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">البريد الإلكتروني:</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="vip-checkbox"
                  checked={isVIP}
                  onChange={(e) => setIsVIP(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="vip-checkbox" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  تصنيف كعميل مهم (VIP Customer)
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  إضافة العميل ومزامنته
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
