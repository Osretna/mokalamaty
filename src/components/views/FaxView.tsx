import React, { useState } from 'react';
import { 
  FileText, 
  Send, 
  Download, 
  Eye, 
  Printer, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X, 
  RefreshCw, 
  FileCheck, 
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Building
} from 'lucide-react';
import { FaxItem } from '../../types';
import { playTelephonyFx } from '../../utils/audioTones';

interface FaxViewProps {
  faxes: FaxItem[];
  onSendFax: (newFax: Omit<FaxItem, 'id' | 'timestamp'>) => void;
}

export const FaxView: React.FC<FaxViewProps> = ({ faxes, onSendFax }) => {
  const [selectedFax, setSelectedFax] = useState<FaxItem | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all');

  // Form states
  const [recipientNumber, setRecipientNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [coverText, setCoverText] = useState('');
  const [resolution, setResolution] = useState('196x204 DPI (Fine)');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [pagesCount, setPagesCount] = useState(2);

  const filteredFaxes = faxes.filter((f) =>
    filterDirection === 'all' ? true : f.direction === filterDirection
  );

  const handleExecuteSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientNumber.trim() || !subject.trim()) return;

    setIsTransmitting(true);
    playTelephonyFx('fax');

    setTimeout(() => {
      onSendFax({
        direction: 'outbound',
        remoteNumber: recipientNumber.trim(),
        remoteCallerId: recipientName.trim() || 'فاكس مؤسسي',
        pages: pagesCount,
        status: 'sent',
        subject: subject.trim(),
        fileSize: `${(pagesCount * 0.45).toFixed(1)} MB`,
        resolution,
        senderName: 'م. نسمة جمال - اتصالاتي',
        previewText: coverText.trim() || 'وثيقة مرسلة عبر بوابة Hylafax ومحرك Asterisk الرقمي.',
      });

      setIsTransmitting(false);
      setIsSendModalOpen(false);
      setRecipientNumber('');
      setRecipientName('');
      setSubject('');
      setCoverText('');
      playTelephonyFx('notification');
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">الفاكس الرقمي (Hylafax & Postfix Gateway)</h3>
              <p className="text-xs text-slate-400">
                إرسال واستقبال الفاكسات عبر بروتوكول T.38 / FoIP والتخزين في Firestore بصيغ PDF و TIFF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSendModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال فاكس جديد</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setFilterDirection('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterDirection === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              جميع الفاكسات ({faxes.length})
            </button>
            <button
              onClick={() => setFilterDirection('inbound')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterDirection === 'inbound' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              المستلمة (Inbound)
            </button>
            <button
              onClick={() => setFilterDirection('outbound')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterDirection === 'outbound' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              المرسلة (Outbound)
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
            Hylafax v6.0 • T.38 Enabled • Postfix Maildir Synced
          </span>
        </div>
      </div>

      {/* Faxes Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4">الموضوع / العنوان</th>
                <th className="py-3 px-4">الطرف الآخر</th>
                <th className="py-3 px-4">رقم الفاكس</th>
                <th className="py-3 px-4">الصفحات</th>
                <th className="py-3 px-4">التاريخ والوقت</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredFaxes.map((fax) => (
                <tr key={fax.id} className="hover:bg-slate-800/40 text-slate-300 transition-colors">
                  <td className="py-3.5 px-4">
                    {fax.direction === 'inbound' ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>مستلم</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-blue-400 font-bold">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>مرسل</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white max-w-xs truncate">
                    {fax.subject}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-300">
                    {fax.remoteCallerId}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-cyan-400" dir="ltr">
                    {fax.remoteNumber}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {fax.pages} صفحات
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {fax.timestamp}
                  </td>
                  <td className="py-3.5 px-4">
                    {fax.status === 'received' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        تم الاستلام
                      </span>
                    )}
                    {fax.status === 'sent' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        تم الإرسال (OK)
                      </span>
                    )}
                    {fax.status === 'failed' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        فشل الإرسال
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedFax(fax)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="معاينة المستند"
                      >
                        <Eye className="w-3 h-3 text-cyan-400" />
                        <span>معاينة</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fax Preview Modal */}
      {selectedFax && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">معاينة وثيقة الفاكس الرقمي</h3>
                  <p className="text-xs text-slate-400">
                    رقم الإرسال: {selectedFax.id} • الدقة: {selectedFax.resolution}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFax(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Body (Simulated TIFF/PDF Paper) */}
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-950/60">
              <div className="bg-white text-slate-900 rounded-xl p-8 shadow-md border border-slate-200 font-sans space-y-6">
                {/* Official Letterhead */}
                <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-black tracking-tight text-slate-900">
                      نظام الفاكس الرقمي - اتصالاتي
                    </div>
                    <div className="text-xs text-slate-600">
                      بوابة Hylafax الرسمية • شهادة إرسال مشفرة T.38
                    </div>
                  </div>
                  <div className="text-left text-xs font-mono text-slate-500" dir="ltr">
                    <div>DATE: {selectedFax.timestamp}</div>
                    <div>PAGES: {selectedFax.pages}</div>
                  </div>
                </div>

                {/* Transmission Details */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-700">المرسل / الجهة: </span>
                    <span className="text-slate-900 font-semibold">{selectedFax.senderName || selectedFax.remoteCallerId}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">الرقم: </span>
                    <span className="font-mono text-slate-900" dir="ltr">{selectedFax.remoteNumber}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold text-slate-700">الموضوع: </span>
                    <span className="text-slate-900 font-bold">{selectedFax.subject}</span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="space-y-3 pt-2 text-sm leading-relaxed text-slate-800">
                  <p className="font-serif">{selectedFax.previewText}</p>
                  <p className="text-xs text-slate-500 pt-4">
                    [تم التحقق من مطابقة الحزمة الإلكترونية بواسطة بروتوكول Hylafax v6.0 وتخزين نسخة في Firestore].
                  </p>
                </div>

                {/* Stamp & Footer */}
                <div className="pt-6 border-t border-dashed border-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold border border-emerald-600/40 bg-emerald-50 px-3 py-1.5 rounded-lg">
                    <ShieldCheck className="w-4 h-4" />
                    <span>معتمد رقمياً ومطابق للمواصفات</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    CHECKSUM: 4a9f-88c2-3e11
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-800/90 px-6 py-3 border-t border-slate-700 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                حجم الملف: {selectedFax.fileSize}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert('تم تنزيل نسخة الـ PDF للفاكس')}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send New Fax Modal */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إرسال فاكس رقمي جديد</h3>
                  <p className="text-xs text-slate-400">عبر خطوط Asterisk و Hylafax T.38</p>
                </div>
              </div>
              <button
                onClick={() => setIsSendModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSend} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    رقم الفاكس المستقبل: *
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={recipientNumber}
                    onChange={(e) => setRecipientNumber(e.target.value)}
                    placeholder="+20223456789"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    اسم الجهة المستقبلة:
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="مثال: البنك الأهلي"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  موضوع الفاكس: *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: تفاصيل عقد التوريد واعتماد خطوط الـ SIP"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  نص صفحة الغلاف (Cover Page):
                </label>
                <textarea
                  rows={3}
                  value={coverText}
                  onChange={(e) => setCoverText(e.target.value)}
                  placeholder="اكتب مقدمة الفاكس أو التعليمات للجهة المستقبلة..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    عدد الصفحات:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={pagesCount}
                    onChange={(e) => setPagesCount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    دقة الفاكس:
                  </label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="196x204 DPI (Fine)">عالية الدقة Fine (196x204 DPI)</option>
                    <option value="Standard 98 DPI">قياسية Standard (98 DPI)</option>
                  </select>
                </div>
              </div>

              {/* Fake attachment */}
              <div className="p-3 border border-dashed border-slate-700 rounded-xl bg-slate-950/40 text-center space-y-1">
                <Upload className="w-5 h-5 text-blue-400 mx-auto" />
                <div className="text-xs text-slate-300 font-medium">تم إرفاق المستند الرقمي تلقائياً (PDF/TIFF)</div>
                <div className="text-[11px] text-slate-500">جاهز للتشفير والتوجيه إلى مودم Hylafax</div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isTransmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Send className={`w-4 h-4 ${isTransmitting ? 'animate-bounce' : ''}`} />
                  <span>{isTransmitting ? 'جاري إرسال إشارات T.38...' : 'إرسال الفاكس الآن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
