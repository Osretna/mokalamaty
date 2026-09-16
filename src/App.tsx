import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { SoftphoneModal } from './components/SoftphoneModal';
import { ScreenPopModal } from './components/ScreenPopModal';
import { TransferModal } from './components/TransferModal';

// Views
import { DashboardView } from './components/views/DashboardView';
import { CallManagerView } from './components/views/CallManagerView';
import { VoicemailView } from './components/views/VoicemailView';
import { FaxView } from './components/views/FaxView';
import { ConferenceView } from './components/views/ConferenceView';
import { CRMView } from './components/views/CRMView';
import { UsersExtensionsView } from './components/views/UsersExtensionsView';
import { AsteriskMiddlewareView } from './components/views/AsteriskMiddlewareView';

// Data & types
import {
  INITIAL_CALLS,
  INITIAL_CALL_HISTORY,
  INITIAL_VOICEMAILS,
  INITIAL_FAXES,
  INITIAL_CONFERENCES,
  INITIAL_CRM_CONTACTS,
  INITIAL_USERS,
  INITIAL_AMI_EVENTS,
  INITIAL_PBX_STATUS,
} from './data/mockData';
import { Call, Voicemail, FaxItem, ConferenceRoom, CRMContact, PBXUser, AMIEvent, PBXStatus } from './types';
import {
  playTelephonyFx,
  startIncomingRing,
  stopIncomingRing,
  startHoldMusic,
  stopHoldMusic,
} from './utils/audioTones';
import {
  autoSaveUserToFirebase,
  autoSaveCallToFirebase,
  subscribeUsersFromFirebase,
  generateCallCode,
} from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'calls' | 'voicemail' | 'fax' | 'conferences' | 'crm' | 'users' | 'middleware'
  >('dashboard');

  // Application State
  const [activeCalls, setActiveCalls] = useState<Call[]>(() => {
    const saved = localStorage.getItem('etsalati_active_calls');
    return saved ? JSON.parse(saved) : INITIAL_CALLS;
  });

  const [callHistory, setCallHistory] = useState<Call[]>(() => {
    const saved = localStorage.getItem('etsalati_call_history');
    return saved ? JSON.parse(saved) : INITIAL_CALL_HISTORY;
  });

  const [voicemails, setVoicemails] = useState<Voicemail[]>(() => {
    const saved = localStorage.getItem('etsalati_voicemails');
    return saved ? JSON.parse(saved) : INITIAL_VOICEMAILS;
  });

  const [faxes, setFaxes] = useState<FaxItem[]>(() => {
    const saved = localStorage.getItem('etsalati_faxes');
    return saved ? JSON.parse(saved) : INITIAL_FAXES;
  });

  const [conferences, setConferences] = useState<ConferenceRoom[]>(() => {
    const saved = localStorage.getItem('etsalati_conferences');
    return saved ? JSON.parse(saved) : INITIAL_CONFERENCES;
  });

  const [crmContacts, setCrmContacts] = useState<CRMContact[]>(() => {
    const saved = localStorage.getItem('etsalati_crm');
    return saved ? JSON.parse(saved) : INITIAL_CRM_CONTACTS;
  });

  const [users, setUsers] = useState<PBXUser[]>(() => {
    const saved = localStorage.getItem('etsalati_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser] = useState<PBXUser>(INITIAL_USERS[0]); // Eng. Nesma Gamal (101)
  const [amiEvents, setAmiEvents] = useState<AMIEvent[]>(INITIAL_AMI_EVENTS);
  const [pbxStatus, setPbxStatus] = useState<PBXStatus>(INITIAL_PBX_STATUS);

  // Modals
  const [isSoftphoneOpen, setIsSoftphoneOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [transferCall, setTransferCall] = useState<Call | null>(null);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('etsalati_active_calls', JSON.stringify(activeCalls));
  }, [activeCalls]);

  useEffect(() => {
    localStorage.setItem('etsalati_call_history', JSON.stringify(callHistory));
  }, [callHistory]);

  useEffect(() => {
    localStorage.setItem('etsalati_voicemails', JSON.stringify(voicemails));
  }, [voicemails]);

  useEffect(() => {
    localStorage.setItem('etsalati_faxes', JSON.stringify(faxes));
  }, [faxes]);

  useEffect(() => {
    localStorage.setItem('etsalati_conferences', JSON.stringify(conferences));
  }, [conferences]);

  useEffect(() => {
    localStorage.setItem('etsalati_crm', JSON.stringify(crmContacts));
  }, [crmContacts]);

  useEffect(() => {
    localStorage.setItem('etsalati_users', JSON.stringify(users));
  }, [users]);

  // Real-time Firebase Firestore Users Listener
  useEffect(() => {
    const unsubscribe = subscribeUsersFromFirebase((firebaseUsers) => {
      if (firebaseUsers && firebaseUsers.length > 0) {
        setUsers((prev) => {
          // Merge Firebase users with current state
          const map = new Map(prev.map((u) => [u.extension, u]));
          firebaseUsers.forEach((fbU) => map.set(fbU.extension, fbU));
          return Array.from(map.values());
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Duration Timer for active calls
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCalls((prevCalls) =>
        prevCalls.map((call) => {
          if (call.status === 'connected' || call.status === 'on_hold') {
            return { ...call, duration: call.duration + 1 };
          }
          return call;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Periodic AMI event generator (Simulating live PBX activity)
  useEffect(() => {
    const amiInterval = setInterval(() => {
      const eventTypes = [
        {
          event: 'VarSet',
          channel: 'PJSIP/101-0000004e',
          details: 'BRIDGEPEER = PJSIP/trunk_we-00000012',
        },
        {
          event: 'RTCPReceived',
          channel: 'PJSIP/102-0000005a',
          details: 'PT=200(Sender Report) Jitter=0.002s FractionLost=0',
        },
        {
          event: 'DeviceStateChange',
          channel: 'PJSIP/104',
          details: 'Device PJSIP/104 state change to INUSE',
        },
      ];
      const randomEv = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const newEv: AMIEvent = {
        id: `ami-${Date.now()}`,
        event: randomEv.event,
        privilege: 'call,all',
        channel: randomEv.channel,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        details: randomEv.details,
      };

      setAmiEvents((prev) => [newEv, ...prev.slice(0, 19)]);
    }, 12000);

    return () => clearInterval(amiInterval);
  }, []);

  // Handlers for Active Calls
  const handleHoldToggle = (callId: string) => {
    setActiveCalls((prev) =>
      prev.map((c) => {
        if (c.id !== callId) return c;
        if (c.status === 'on_hold') {
          stopHoldMusic();
          playTelephonyFx('connected');
          return { ...c, status: 'connected' };
        } else {
          startHoldMusic();
          return { ...c, status: 'on_hold' };
        }
      })
    );
  };

  const handleRecordToggle = (callId: string) => {
    playTelephonyFx('beep');
    setActiveCalls((prev) =>
      prev.map((c) => (c.id === callId ? { ...c, isRecording: !c.isRecording } : c))
    );
  };

  const handleHangup = (callId: string) => {
    stopHoldMusic();
    playTelephonyFx('hangup');
    const callToArchive = activeCalls.find((c) => c.id === callId);
    if (callToArchive) {
      const completedCall: Call = {
        ...callToArchive,
        status: 'ended',
        startTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setCallHistory((prev) => [completedCall, ...prev]);
      autoSaveCallToFirebase(completedCall);
    }
    setActiveCalls((prev) => prev.filter((c) => c.id !== callId));
  };

  const handleMakeCall = (number: string, name?: string) => {
    const newCall: Call = {
      id: `call-${Date.now()}`,
      callCode: generateCallCode(),
      callerNumber: number,
      callerName: name || `خطي خارجي (${number})`,
      extension: currentUser.extension,
      direction: 'outbound',
      status: 'connected',
      duration: 1,
      startTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      channelId: `PJSIP/${currentUser.extension}-000000${Math.floor(Math.random() * 90 + 10)}`,
      isRecording: true,
    };
    setActiveCalls((prev) => [newCall, ...prev]);
    autoSaveCallToFirebase(newCall);
  };

  const handleExecuteTransfer = (callId: string, destinationExt: string, isAttended: boolean) => {
    const call = activeCalls.find((c) => c.id === callId);
    if (!call) return;

    // Log AMI Event
    const amiEv: AMIEvent = {
      id: `ami-${Date.now()}`,
      event: isAttended ? 'AttendedTransfer' : 'BlindTransfer',
      privilege: 'call,all',
      channel: call.channelId,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      details: `Call transferred from Ext ${call.extension} to Ext ${destinationExt} (${isAttended ? 'Attended' : 'Blind'})`,
    };
    setAmiEvents((prev) => [amiEv, ...prev]);

    // Archive and remove
    const completedCall: Call = {
      ...call,
      status: 'transferred',
      startTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };
    setCallHistory((prev) => [completedCall, ...prev]);
    autoSaveCallToFirebase(completedCall);
    setActiveCalls((prev) => prev.filter((c) => c.id !== callId));
  };

  // Simulate Incoming Call (Triggered from Header Button)
  const handleTriggerSimulatedIncomingCall = () => {
    const sampleNumbers = [
      { phone: '+201012345678', name: 'أحمد عبد السلام', company: 'دار الهندسة' },
      { phone: '+201209876543', name: 'سارة إبراهيم', company: 'مجموعة النيل للتجارة' },
      { phone: '+201155443322', name: 'د. طارق مراد', company: 'مركز الأمل الطبي' },
    ];
    const picked = sampleNumbers[Math.floor(Math.random() * sampleNumbers.length)];

    const simCall: Call = {
      id: `sim-call-${Date.now()}`,
      callCode: generateCallCode(),
      callerNumber: picked.phone,
      callerName: picked.name,
      extension: currentUser.extension,
      direction: 'inbound',
      status: 'ringing',
      duration: 0,
      startTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      channelId: `PJSIP/trunk_we-000000${Math.floor(Math.random() * 90 + 10)}`,
      isRecording: false,
    };

    startIncomingRing();
    setIncomingCall(simCall);
  };

  const handleAnswerIncomingCall = (call: Call) => {
    stopIncomingRing();
    playTelephonyFx('connected');
    const answeredCall: Call = {
      ...call,
      status: 'connected',
      duration: 1,
    };
    setActiveCalls((prev) => [answeredCall, ...prev]);
    autoSaveCallToFirebase(answeredCall);
    setIncomingCall(null);
  };

  const handleRejectIncomingCall = (call: Call) => {
    stopIncomingRing();
    playTelephonyFx('hangup');
    const missedCall: Call = {
      ...call,
      status: 'missed',
    };
    setCallHistory((prev) => [missedCall, ...prev]);
    autoSaveCallToFirebase(missedCall);
    setIncomingCall(null);
  };

  const handleSendToVoicemail = (call: Call) => {
    stopIncomingRing();
    playTelephonyFx('beep');
    const newVm: Voicemail = {
      id: `vm-${Date.now()}`,
      callerNumber: call.callerNumber,
      callerName: call.callerName,
      extension: currentUser.extension,
      duration: 22,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      audioWaveform: [30, 45, 60, 35, 70, 50, 40, 65, 80, 55, 30, 60, 75, 40],
      isRead: false,
      fileSize: '352 KB',
      transcription: `رسالة واردة من ${call.callerName}: نرجو معاودة الاتصال بخصوص مشروع البدالة في أقرب وقت.`,
    };
    setVoicemails((prev) => [newVm, ...prev]);
    setIncomingCall(null);
  };

  // Voicemail Actions
  const handleToggleVoicemailRead = (id: string) => {
    setVoicemails((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isRead: !v.isRead } : v))
    );
  };

  const handleDeleteVoicemail = (id: string) => {
    playTelephonyFx('hangup');
    setVoicemails((prev) => prev.filter((v) => v.id !== id));
  };

  // Fax Actions
  const handleSendFax = (newFaxData: Omit<FaxItem, 'id' | 'timestamp'>) => {
    const newFax: FaxItem = {
      ...newFaxData,
      id: `fax-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    setFaxes((prev) => [newFax, ...prev]);
  };

  // CRM Actions
  const handleAddCRMContact = (contact: CRMContact) => {
    playTelephonyFx('notification');
    setCrmContacts((prev) => [contact, ...prev]);
  };

  const handleAddCRMNote = (contactId: string, text: string) => {
    playTelephonyFx('notification');
    setCrmContacts((prev) =>
      prev.map((c) => {
        if (c.id !== contactId) return c;
        const newNote = {
          id: `n-${Date.now()}`,
          text,
          date: new Date().toISOString().slice(0, 10),
          author: currentUser.name,
        };
        return {
          ...c,
          notes: [newNote, ...c.notes],
          lastInteraction: new Date().toISOString().slice(0, 16).replace('T', ' '),
        };
      })
    );
  };

  const unreadVoicemailCount = voicemails.filter((v) => !v.isRead).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Top Application Header */}
      <Header
        pbxStatus={pbxStatus}
        currentUser={currentUser}
        onOpenSoftphone={() => setIsSoftphoneOpen(true)}
        onTriggerSimulatedCall={handleTriggerSimulatedIncomingCall}
      />

      {/* Primary Navigation Tabs */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unreadVoicemails={unreadVoicemailCount}
        activeCallsCount={activeCalls.length}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            pbxStatus={pbxStatus}
            activeCalls={activeCalls}
            amiEvents={amiEvents}
            voicemails={voicemails}
            faxes={faxes}
            onHoldToggle={handleHoldToggle}
            onRecordToggle={handleRecordToggle}
            onOpenTransfer={(call) => setTransferCall(call)}
            onHangup={handleHangup}
            onOpenSoftphone={() => setIsSoftphoneOpen(true)}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'calls' && (
          <CallManagerView
            activeCalls={activeCalls}
            callHistory={callHistory}
            currentUser={currentUser}
            users={users}
            onHoldToggle={handleHoldToggle}
            onRecordToggle={handleRecordToggle}
            onOpenTransfer={(call) => setTransferCall(call)}
            onHangup={handleHangup}
            onMakeCall={handleMakeCall}
          />
        )}

        {activeTab === 'voicemail' && (
          <VoicemailView
            voicemails={voicemails}
            onToggleRead={handleToggleVoicemailRead}
            onDeleteVoicemail={handleDeleteVoicemail}
          />
        )}

        {activeTab === 'fax' && (
          <FaxView faxes={faxes} onSendFax={handleSendFax} />
        )}

        {activeTab === 'conferences' && (
          <ConferenceView
            conferences={conferences}
            currentUser={currentUser}
            onUpdateConferences={setConferences}
          />
        )}

        {activeTab === 'crm' && (
          <CRMView
            contacts={crmContacts}
            onMakeCall={(num, name) => {
              handleMakeCall(num, name);
              setActiveTab('calls');
            }}
            onAddContact={handleAddCRMContact}
            onAddNote={handleAddCRMNote}
          />
        )}

        {activeTab === 'users' && (
          <UsersExtensionsView
            users={users}
            currentUser={currentUser}
            onUpdateUsers={setUsers}
          />
        )}

        {activeTab === 'middleware' && <AsteriskMiddlewareView />}
      </main>

      {/* Footer System Status Bar */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-3 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            نظام اتصالاتي الموحد للبدالات الرقمية
          </span>
          <span>•</span>
          <span>Asterisk 20 LTS (SIP / IAX / ConfBridge)</span>
          <span>•</span>
          <span>Hylafax T.38 FoIP</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span>Electron Windows Wrapper Ready</span>
          <span>•</span>
          <span className="text-emerald-400">Firebase Firestore Synced</span>
        </div>
      </footer>

      {/* Floating Modals */}
      <SoftphoneModal
        isOpen={isSoftphoneOpen}
        onClose={() => setIsSoftphoneOpen(false)}
        currentUser={currentUser}
        onCallInitiated={(number) => {
          handleMakeCall(number);
          setActiveTab('calls');
        }}
      />

      <ScreenPopModal
        incomingCall={incomingCall}
        crmContacts={crmContacts}
        onAnswer={handleAnswerIncomingCall}
        onReject={handleRejectIncomingCall}
        onSendVoicemail={handleSendToVoicemail}
      />

      <TransferModal
        isOpen={!!transferCall}
        onClose={() => setTransferCall(null)}
        call={transferCall}
        users={users}
        onExecuteTransfer={handleExecuteTransfer}
      />
    </div>
  );
}
