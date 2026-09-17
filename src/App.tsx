import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Navigation, ActiveTab } from './components/Navigation';
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
import { AgentCallView } from './components/views/AgentCallView';
import { LoginView } from './components/LoginView';

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
  startRingback,
  stopRingback,
  startBusyTone,
  stopBusyTone,
} from './utils/audioTones';
import {
  autoSaveUserToFirebase,
  autoSaveCallToFirebase,
  subscribeUsersFromFirebase,
  generateCallCode,
  publishActiveCall,
  updateActiveCall,
  removeActiveCall,
  subscribeActiveCalls,
  sendUserPresenceHeartbeat,
  subscribeOnlinePresence,
  callBus,
} from './lib/firebase';
import { webrtcVoice } from './utils/webrtcVoiceService';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const validTabs: ActiveTab[] = [
      'dashboard',
      'calls',
      'voicemail',
      'fax',
      'conferences',
      'crm',
      'users',
      'middleware',
    ];
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as ActiveTab;
      if (validTabs.includes(hash)) return hash;
      const saved = localStorage.getItem('etsalati_active_tab') as ActiveTab;
      if (saved && validTabs.includes(saved)) return saved;
    }
    return 'dashboard';
  });

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

  // Online employees presence map
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { lastSeen: number; name: string; extension: string }>>({});

  const [currentUser, setCurrentUser] = useState<PBXUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user') || urlParams.get('ext');
        if (userParam) {
          const found = INITIAL_USERS.find(
            (u) =>
              u.extension.trim() === userParam.trim() ||
              (u.username && u.username.trim() === userParam.trim())
          );
          if (found) {
            sessionStorage.setItem('etsalati_session_user', JSON.stringify(found));
            return found;
          }
        }
      } catch (e) {
        console.debug(e);
      }

      const sessionSaved = sessionStorage.getItem('etsalati_session_user');
      if (sessionSaved) {
        try {
          return JSON.parse(sessionSaved);
        } catch {}
      }

      const saved = localStorage.getItem('etsalati_logged_in_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return INITIAL_USERS[0]; // Eng. Nesma Gamal (Admin) by default
  });

  const [adminPreviewAgent, setAdminPreviewAgent] = useState<boolean>(() => {
    return localStorage.getItem('etsalati_admin_preview_agent') === 'true';
  });
  const [amiEvents, setAmiEvents] = useState<AMIEvent[]>(INITIAL_AMI_EVENTS);
  const [pbxStatus, setPbxStatus] = useState<PBXStatus>(INITIAL_PBX_STATUS);

  // Modals
  const [isSoftphoneOpen, setIsSoftphoneOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [transferCall, setTransferCall] = useState<Call | null>(null);

  // Synchronize Refs to prevent effect re-creation race conditions
  const currentUserRef = useRef<PBXUser | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const incomingCallRef = useRef<Call | null>(incomingCall);
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Persist Navigation & User Session across refresh
  useEffect(() => {
    localStorage.setItem('etsalati_active_tab', activeTab);
    if (typeof window !== 'undefined') {
      window.location.hash = `#${activeTab}`;
    }
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('etsalati_admin_preview_agent', adminPreviewAgent ? 'true' : 'false');
  }, [adminPreviewAgent]);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('etsalati_session_user', JSON.stringify(currentUser));
      localStorage.setItem('etsalati_logged_in_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('etsalati_session_user');
      localStorage.removeItem('etsalati_logged_in_user');
    }
  }, [currentUser]);

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
          let deletedIds: string[] = [];
          try {
            deletedIds = JSON.parse(localStorage.getItem('etsalati_deleted_users') || '[]');
          } catch {
            deletedIds = [];
          }
          // Merge Firebase users with current state excluding deleted ones
          const map = new Map<string, PBXUser>(prev.filter((u) => !deletedIds.includes(u.id) && !deletedIds.includes(u.extension)).map((u) => [u.extension, u]));
          firebaseUsers.forEach((fbU) => {
            if (!deletedIds.includes(fbU.id) && !deletedIds.includes(fbU.extension)) {
              map.set(fbU.extension, fbU);
            }
          });
          return Array.from(map.values()).filter((u: PBXUser) => !deletedIds.includes(u.id) && !deletedIds.includes(u.extension));
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

  // Heartbeat & Online Presence
  useEffect(() => {
    if (!currentUser) return;
    sendUserPresenceHeartbeat(currentUser);
    const interval = setInterval(() => {
      sendUserPresenceHeartbeat(currentUser);
    }, 10000);

    const unsubPresence = subscribeOnlinePresence((map) => {
      setOnlineUsers(map);
    });

    return () => {
      clearInterval(interval);
      unsubPresence();
    };
  }, [currentUser]);

  // Real-time Active Calls Listener (Firebase Firestore + BroadcastChannel + LocalStorage for same-device cross-tab)
  useEffect(() => {
    if (!currentUser) return;

    // Process live calls list
    const processLiveCalls = (liveCalls: Call[]) => {
      const user = currentUserRef.current;
      if (!user) return;
      const myExt = String(user.extension).trim();
      const myName = String(user.name).trim();
      const myUser = String(user.username || '').trim();

      // Check if there is an incoming call ringing for this user:
      const incoming = liveCalls.find((c) => {
        if (c.status !== 'ringing') return false;
        if (c.callerExtension && String(c.callerExtension).trim() === myExt) return false;
        if (String(c.extension).trim() === myExt && c.direction === 'outbound') return false;

        const calleeExt = String(c.calleeExtension || '').trim();
        const calleeName = String(c.calleeName || '').trim();
        return calleeExt === myExt || calleeName === myName || (myUser && calleeExt === myUser);
      });

      if (incoming) {
        setIncomingCall(incoming);
        startIncomingRing();
      } else if (incomingCallRef.current && !liveCalls.some((c) => c.id === incomingCallRef.current?.id && c.status === 'ringing')) {
        stopIncomingRing();
        setIncomingCall(null);
      }

      // Check if our outbound call was answered by the other party:
      setActiveCalls((prev) => {
        let changed = false;
        const next = prev
          .map((localCall) => {
            const remote = liveCalls.find((lc) => lc.id === localCall.id);
            if (remote) {
              if (localCall.status === 'ringing' && remote.status === 'connected') {
                stopRingback();
                playTelephonyFx('connected');
                changed = true;
                return { ...localCall, status: 'connected', duration: remote.duration || 1 };
              }
              if (remote.status === 'ended' || remote.status === 'missed') {
                stopRingback();
                stopIncomingRing();
                playTelephonyFx('hangup');
                changed = true;
                return { ...localCall, status: remote.status };
              }
            }
            return localCall;
          })
          .filter((c) => c.status !== 'ended' && c.status !== 'missed');

        // If a remote call was accepted and involves this user as callee
        liveCalls.forEach((rc) => {
          if (
            (String(rc.extension).trim() === myExt || String(rc.calleeExtension).trim() === myExt) &&
            rc.status === 'connected' &&
            !next.some((c) => c.id === rc.id)
          ) {
            next.push(rc);
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    };

    // 1. Subscribe to Firestore active_calls & localStorage storage events
    const unsubCalls = subscribeActiveCalls(processLiveCalls);

    // 2. BroadcastChannel & CustomEvent message handler for 0ms cross-tab instant communication
    const handleBusData = (data: any) => {
      if (!data) return;
      const user = currentUserRef.current;
      if (!user) return;
      const myExt = String(user.extension).trim();
      const myName = String(user.name).trim();
      const myUser = String(user.username || '').trim();

      if (data.type === 'CALL_INITIATED') {
        const call: Call = data.call;
        const calleeExt = String(call.calleeExtension || '').trim();
        const calleeName = String(call.calleeName || '').trim();
        const isTarget = calleeExt === myExt || calleeName === myName || (myUser && calleeExt === myUser);
        const isNotSelf = String(call.callerExtension).trim() !== myExt;

        if (isTarget && isNotSelf && call.status === 'ringing') {
          setIncomingCall(call);
          startIncomingRing();
        }
      } else if (data.type === 'CALL_UPDATED') {
        const { callId, updates } = data;
        if (updates.status === 'connected') {
          stopRingback();
          stopIncomingRing();
          playTelephonyFx('connected');
          setIncomingCall(null);
        } else if (updates.status === 'ended' || updates.status === 'missed') {
          stopRingback();
          stopIncomingRing();
          playTelephonyFx('hangup');
          setIncomingCall(null);
        }
        setActiveCalls((prev) =>
          prev
            .map((c) => (c.id === callId ? { ...c, ...updates } : c))
            .filter((c) => c.status !== 'ended' && c.status !== 'missed')
        );
      } else if (data.type === 'CALL_REMOVED') {
        setActiveCalls((prev) => prev.filter((c) => c.id !== data.callId));
        if (incomingCallRef.current && incomingCallRef.current.id === data.callId) {
          stopIncomingRing();
          setIncomingCall(null);
        }
      }
    };

    const handleBusMessage = (event: MessageEvent) => {
      handleBusData(event.data);
    };

    const handleCustomBus = (e: Event) => {
      handleBusData((e as CustomEvent).detail);
    };

    callBus?.addEventListener('message', handleBusMessage);
    window.addEventListener('etsalati_call_bus', handleCustomBus);

    return () => {
      unsubCalls();
      callBus?.removeEventListener('message', handleBusMessage);
      window.removeEventListener('etsalati_call_bus', handleCustomBus);
    };
  }, [currentUser]);

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

  const handleSimulateRemoteAnswer = (callId: string) => {
    stopRingback();
    stopIncomingRing();
    playTelephonyFx('connected');
    setActiveCalls((prev) =>
      prev.map((c) => (c.id === callId ? { ...c, status: 'connected', duration: 1 } : c))
    );
    updateActiveCall(callId, { status: 'connected', duration: 1 });
  };

  const handleHangup = (callId: string) => {
    stopHoldMusic();
    stopRingback();
    stopIncomingRing();
    webrtcVoice.endVoiceSession();
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
    updateActiveCall(callId, { status: 'ended' });
    setTimeout(() => {
      removeActiveCall(callId);
    }, 1000);
  };

  const handleMakeCall = (number: string, name?: string) => {
    if (!currentUser) return;
    const cleanNum = number.trim();

    // Check if the dialed number matches an employee / extension in the system
    const targetUser = users.find(
      (u) =>
        u.extension.trim() === cleanNum ||
        (u.username && u.username.trim() === cleanNum) ||
        u.name.trim() === cleanNum
    );

    const isInternal = !!targetUser;
    const callCode = generateCallCode();

    const newCall: Call = {
      id: `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      callCode,
      callerNumber: currentUser.extension,
      callerName: currentUser.name,
      callerExtension: currentUser.extension,
      extension: currentUser.extension,
      calleeExtension: targetUser ? targetUser.extension : cleanNum,
      calleeName: targetUser ? targetUser.name : (name || `خطي خارجي (${cleanNum})`),
      direction: 'outbound',
      status: isInternal ? 'ringing' : 'connected',
      duration: isInternal ? 0 : 1,
      startTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      channelId: `PJSIP/${currentUser.extension}-000000${Math.floor(Math.random() * 90 + 10)}`,
      isRecording: true,
      isAppToApp: isInternal,
    };

    if (isInternal) {
      // Caller hears PBX ringback tone while waiting for the employee to answer
      startRingback();
    } else {
      playTelephonyFx('connected');
    }

    setActiveCalls((prev) => [newCall, ...prev.filter((c) => c.id !== newCall.id)]);
    publishActiveCall(newCall);
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
    stopRingback();
    playTelephonyFx('connected');
    const answeredCall: Call = {
      ...call,
      status: 'connected',
      duration: 1,
    };
    setActiveCalls((prev) => [answeredCall, ...prev.filter((c) => c.id !== call.id)]);
    setIncomingCall(null);
    updateActiveCall(call.id, { status: 'connected', duration: 1 });
    autoSaveCallToFirebase(answeredCall);
  };

  const handleRejectIncomingCall = (call: Call) => {
    stopIncomingRing();
    stopRingback();
    webrtcVoice.endVoiceSession();
    playTelephonyFx('hangup');
    const missedCall: Call = {
      ...call,
      status: 'missed',
    };
    setCallHistory((prev) => [missedCall, ...prev]);
    autoSaveCallToFirebase(missedCall);
    setIncomingCall(null);
    updateActiveCall(call.id, { status: 'missed' });
    setTimeout(() => {
      removeActiveCall(call.id);
    }, 1200);
  };

  const handleSwitchUser = (newUser: PBXUser) => {
    setCurrentUser(newUser);
    localStorage.setItem('etsalati_logged_in_user', JSON.stringify(newUser));
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
          author: currentUser?.name || 'مستخدم النظام',
        };
        return {
          ...c,
          notes: [newNote, ...c.notes],
          lastInteraction: new Date().toISOString().slice(0, 16).replace('T', ' '),
        };
      })
    );
  };

  const handleLoginSuccess = (user: PBXUser) => {
    setCurrentUser(user);
    localStorage.setItem('etsalati_logged_in_user', JSON.stringify(user));
    setAdminPreviewAgent(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('etsalati_logged_in_user');
    setAdminPreviewAgent(false);
  };

  // If not logged in -> Show Login Screen
  if (!currentUser) {
    return <LoginView users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  // If logged-in user is an Agent (or Admin testing Agent screen)
  // "اما ال انشئهم لعمل الاتصال فقط لا تظهرلهم الا قائمة الازرار فقط او المستخدم المتصل بياناته عشان يعرف من المتصل والتوقيت"
  if (currentUser.role !== 'admin' || adminPreviewAgent) {
    return (
      <AgentCallView
        currentUser={currentUser}
        activeCalls={activeCalls}
        incomingCall={incomingCall}
        callHistory={callHistory}
        users={users}
        onlineUsers={onlineUsers}
        onSwitchUser={handleSwitchUser}
        onMakeCall={handleMakeCall}
        onHangupCall={handleHangup}
        onHoldToggle={handleHoldToggle}
        onAnswerIncoming={() => incomingCall && handleAnswerIncomingCall(incomingCall)}
        onRejectIncoming={() => incomingCall && handleRejectIncomingCall(incomingCall)}
        onSimulateRemoteAnswer={handleSimulateRemoteAnswer}
        onTriggerSimulatedCall={handleTriggerSimulatedIncomingCall}
        onLogout={handleLogout}
        onSwitchToAdmin={currentUser.role === 'admin' ? () => setAdminPreviewAgent(false) : undefined}
      />
    );
  }

  const unreadVoicemailCount = voicemails.filter((v) => !v.isRead).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Top Application Header */}
      <Header
        pbxStatus={pbxStatus}
        currentUser={currentUser}
        onOpenSoftphone={() => setIsSoftphoneOpen(true)}
        onTriggerSimulatedCall={handleTriggerSimulatedIncomingCall}
        unreadVoicemailsCount={unreadVoicemailCount}
        activeCallsCount={activeCalls.length}
        onLogout={handleLogout}
        onSwitchToAgentView={() => setAdminPreviewAgent(true)}
      />

      {/* Primary Navigation Tabs */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unreadVoicemailsCount={unreadVoicemailCount}
        unresolvedFaxesCount={faxes.filter((f) => f.status === 'received').length}
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
            onUpdateCurrentUser={(updated) => {
              if (updated) {
                setCurrentUser(updated);
                sessionStorage.setItem('etsalati_session_user', JSON.stringify(updated));
                localStorage.setItem('etsalati_logged_in_user', JSON.stringify(updated));
              } else {
                handleLogout();
              }
            }}
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
        crmContact={
          crmContacts.find(
            (c) =>
              incomingCall &&
              (c.phone === incomingCall.callerNumber || c.extension === incomingCall.callerExtension)
          ) || null
        }
        onAnswer={handleAnswerIncomingCall}
        onReject={handleRejectIncomingCall}
        onSendToVoicemail={handleSendToVoicemail}
        onAddCRMNote={handleAddCRMNote}
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
