import React, { useState } from 'react';
import { 
  Users, 
  Mic, 
  MicOff, 
  Lock, 
  Unlock, 
  Disc, 
  UserPlus, 
  UserMinus, 
  PhoneCall, 
  PhoneOff, 
  ShieldCheck, 
  Radio, 
  Plus, 
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { ConferenceRoom, Participant, PBXUser } from '../../types';
import { playTelephonyFx } from '../../utils/audioTones';

interface ConferenceViewProps {
  conferences: ConferenceRoom[];
  currentUser: PBXUser;
  onUpdateConferences: (newConfs: ConferenceRoom[]) => void;
}

export const ConferenceView: React.FC<ConferenceViewProps> = ({
  conferences,
  currentUser,
  onUpdateConferences,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(conferences[0]?.id || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('803');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPin, setNewRoomPin] = useState('1122');

  const currentRoom = conferences.find((c) => c.id === selectedRoomId) || conferences[0];

  const handleToggleMute = (participantId: string) => {
    if (!currentRoom) return;
    const updated = conferences.map((room) => {
      if (room.id !== currentRoom.id) return room;
      return {
        ...room,
        participants: room.participants.map((p) =>
          p.id === participantId ? { ...p, isMuted: !p.isMuted } : p
        ),
      };
    });
    onUpdateConferences(updated);
  };

  const handleMuteAll = () => {
    if (!currentRoom) return;
    playTelephonyFx('beep');
    const updated = conferences.map((room) => {
      if (room.id !== currentRoom.id) return room;
      return {
        ...room,
        participants: room.participants.map((p) =>
          p.isModerator ? p : { ...p, isMuted: true }
        ),
      };
    });
    onUpdateConferences(updated);
  };

  const handleToggleLock = () => {
    if (!currentRoom) return;
    playTelephonyFx('beep');
    const updated = conferences.map((room) =>
      room.id === currentRoom.id ? { ...room, isLocked: !room.isLocked } : room
    );
    onUpdateConferences(updated);
  };

  const handleToggleRecording = () => {
    if (!currentRoom) return;
    playTelephonyFx('beep');
    const updated = conferences.map((room) =>
      room.id === currentRoom.id ? { ...room, isRecording: !room.isRecording } : room
    );
    onUpdateConferences(updated);
  };

  const handleKick = (participantId: string) => {
    if (!currentRoom) return;
    playTelephonyFx('hangup');
    const updated = conferences.map((room) => {
      if (room.id !== currentRoom.id) return room;
      return {
        ...room,
        participants: room.participants.filter((p) => p.id !== participantId),
      };
    });
    onUpdateConferences(updated);
  };

  const handleJoinLeave = () => {
    if (!currentRoom) return;
    const userInRoom = currentRoom.participants.some((p) => p.extension === currentUser.extension);
    if (userInRoom) {
      playTelephonyFx('hangup');
      const updated = conferences.map((room) => {
        if (room.id !== currentRoom.id) return room;
        return {
          ...room,
          participants: room.participants.filter((p) => p.extension !== currentUser.extension),
        };
      });
      onUpdateConferences(updated);
    } else {
      playTelephonyFx('connected');
      const newParticipant: Participant = {
        id: `p-${Date.now()}`,
        name: currentUser.name,
        callerId: currentUser.extension,
        extension: currentUser.extension,
        isMuted: false,
        isSpeaking: true,
        joinedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        isModerator: currentUser.role === 'admin',
        avatarColor: 'bg-cyan-600',
      };
      const updated = conferences.map((room) => {
        if (room.id !== currentRoom.id) return room;
        return {
          ...room,
          participants: [...room.participants, newParticipant],
        };
      });
      onUpdateConferences(updated);
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const newRoom: ConferenceRoom = {
      id: `conf-${newRoomNumber}`,
      roomNumber: newRoomNumber,
      name: newRoomName.trim(),
      pin: newRoomPin,
      isLocked: false,
      isRecording: false,
      maxParticipants: 16,
      participants: [],
    };
    onUpdateConferences([...conferences, newRoom]);
    setSelectedRoomId(newRoom.id);
    setIsCreateModalOpen(false);
    setNewRoomName('');
    setNewRoomNumber(String(Number(newRoomNumber) + 1));
  };

  const isUserJoined = currentRoom?.participants.some((p) => p.extension === currentUser.extension);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">غرف المؤتمرات الصوتية (Asterisk ConfBridge)</h3>
              <p className="text-xs text-slate-400">
                قاعات افتراضية متعددة الأطراف مع دعم التشفير، التحكم في الميكروفونات، وتسجيل الجلسات
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-violet-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء غرفة جديدة</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Rooms List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 px-1">الغرف المتاحة على البدالة:</h4>
          <div className="space-y-2">
            {conferences.map((room) => {
              const isSelected = room.id === currentRoom?.id;
              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-violet-950/30 border-violet-500 text-white shadow-lg shadow-violet-500/10'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-violet-400 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-500/30 text-xs">
                        {room.roomNumber}
                      </span>
                      <span className="font-bold text-sm text-white">{room.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {room.isLocked && <Lock className="w-3.5 h-3.5 text-rose-400" title="الغرفة مقفلة" />}
                      {room.isRecording && <Disc className="w-3.5 h-3.5 text-rose-400 animate-spin" title="جاري التسجيل" />}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{room.participants.length} / {room.maxParticipants} مشارك</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      PIN: {room.pin}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Active Room Controls & Participants Grid (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {currentRoom && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              {/* Room Header & Moderator Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-extrabold text-white">{currentRoom.name}</h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      رقم {currentRoom.roomNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    محرك ConfBridge • رمز الدخول (PIN): <code className="font-mono text-cyan-300">{currentRoom.pin}</code>
                  </p>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleJoinLeave}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer ${
                      isUserJoined
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isUserJoined ? <PhoneOff className="w-3.5 h-3.5" /> : <PhoneCall className="w-3.5 h-3.5" />}
                    <span>{isUserJoined ? 'مغادرة الغرفة' : 'الانضمام للمؤتمر'}</span>
                  </button>

                  <button
                    onClick={handleMuteAll}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="كتم ميكروفونات جميع المشاركين"
                  >
                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                    <span>كتم الكل</span>
                  </button>

                  <button
                    onClick={handleToggleLock}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      currentRoom.isLocked
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title={currentRoom.isLocked ? 'إلغاء قفل الغرفة' : 'قفل الغرفة'}
                  >
                    {currentRoom.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleToggleRecording}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      currentRoom.isRecording
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title={currentRoom.isRecording ? 'إيقاف تسجيل المؤتمر' : 'بدء تسجيل المؤتمر'}
                  >
                    <Disc className={`w-4 h-4 ${currentRoom.isRecording ? 'animate-spin text-rose-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Participants Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>المشاركون الحاليون ({currentRoom.participants.length}):</span>
                  {currentRoom.isRecording && (
                    <span className="text-rose-400 flex items-center gap-1 text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      تسجيل المؤتمر الصوتي نشط
                    </span>
                  )}
                </div>

                {currentRoom.participants.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    الغرفة فارغة حالياً. انقر على "الانضمام للمؤتمر" لتكون أول المتحدثين.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentRoom.participants.map((p) => (
                      <div
                        key={p.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                          p.isSpeaking && !p.isMuted
                            ? 'bg-slate-800/90 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                            : 'bg-slate-800/50 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm relative ${p.avatarColor || 'bg-slate-700'}`}>
                            {p.name.slice(0, 1)}
                            {p.isSpeaking && !p.isMuted && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-white">{p.name}</span>
                              {p.isModerator && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                                  مشرف
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5" dir="ltr">
                              {p.callerId}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleMute(p.id)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              p.isMuted
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-700 text-slate-300 hover:text-white'
                            }`}
                            title={p.isMuted ? 'إلغاء الكتم' : 'كتم الميكروفون'}
                          >
                            {p.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleKick(p.id)}
                            className="p-2 rounded-lg bg-slate-700 hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="طرد المشارك من الغرفة"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-slate-800/90 px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">إنشاء غرفة مؤتمرات جديدة</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  رقم الغرفة (ConfBridge Number):
                </label>
                <input
                  type="text"
                  required
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  اسم الغرفة / الغرض:
                </label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="مثال: غرفة المراجعة الأسبوعية"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  رمز المرور للدخول (PIN Code):
                </label>
                <input
                  type="text"
                  required
                  value={newRoomPin}
                  onChange={(e) => setNewRoomPin(e.target.value)}
                  placeholder="1234"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  إنشاء الغرفة وتفعيلها
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
