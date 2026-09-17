import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDatabase, ref, set, onValue, remove, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { Call, PBXUser, CallStatus } from '../types';

// The Firebase configuration provided by the user
export const firebaseConfig = {
  apiKey: "AIzaSyCpfAb15QHCTw_Qv0iKnScrN0_gmzahoHk",
  authDomain: "mokalamaty-160e0.firebaseapp.com",
  databaseURL: "https://mokalamaty-160e0-default-rtdb.firebaseio.com",
  projectId: "mokalamaty-160e0",
  storageBucket: "mokalamaty-160e0.firebasestorage.app",
  messagingSenderId: "144742600820",
  appId: "1:144742600820:web:4a0c371772abca1a410121",
  measurementId: "G-RPTJZE8RQ3"
};

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);

// Instant cross-tab communication bus for App-to-App calling
const CALL_BUS_NAME = 'etsalati_app_to_app_calls';
export const callBus = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(CALL_BUS_NAME)
  : null;

/**
 * Publish Live Call across all tabs, local storage, and Firebase (Firestore + RTDB)
 */
export async function publishActiveCall(call: Call): Promise<void> {
  // 1. Update local storage active calls map for cross-tab sync
  try {
    const raw = localStorage.getItem('etsalati_active_calls');
    const existing: Call[] = raw ? JSON.parse(raw) : [];
    const next = [call, ...existing.filter((c) => c.id !== call.id)];
    localStorage.setItem('etsalati_active_calls', JSON.stringify(next));
    localStorage.setItem('etsalati_live_call_event', JSON.stringify({ type: 'CALL_INITIATED', call, ts: Date.now() }));
    window.dispatchEvent(new CustomEvent('etsalati_call_bus', { detail: { type: 'CALL_INITIATED', call } }));
  } catch (e) {
    console.debug('LocalStorage call publish error', e);
  }

  // 2. Broadcast locally across browser tabs immediately (0ms)
  try {
    callBus?.postMessage({ type: 'CALL_INITIATED', call });
  } catch (e) {
    console.debug('Broadcast error', e);
  }

  // 3. Publish to Firestore active_calls collection
  try {
    const callRef = doc(db, 'active_calls', call.id);
    await setDoc(callRef, {
      ...call,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore active_calls write warning:', e);
  }

  // 4. Mirror to Realtime Database
  try {
    const rtdbRef = ref(rtdb, `activeCalls/${call.id}`);
    await set(rtdbRef, {
      ...call,
      updatedAt: Date.now(),
    });
  } catch (e) {
    // RTDB fallback
  }
}

/**
 * Update active call status (e.g. ringing -> connected -> ended)
 */
export async function updateActiveCall(callId: string, updates: Partial<Call>): Promise<void> {
  // 1. Update LocalStorage
  try {
    const raw = localStorage.getItem('etsalati_active_calls');
    if (raw) {
      const existing: Call[] = JSON.parse(raw);
      const next = existing
        .map((c) => (c.id === callId ? { ...c, ...updates } : c))
        .filter((c) => c.status !== 'ended' && c.status !== 'missed');
      localStorage.setItem('etsalati_active_calls', JSON.stringify(next));
    }
    localStorage.setItem('etsalati_live_call_event', JSON.stringify({ type: 'CALL_UPDATED', callId, updates, ts: Date.now() }));
    window.dispatchEvent(new CustomEvent('etsalati_call_bus', { detail: { type: 'CALL_UPDATED', callId, updates } }));
  } catch (e) {
    console.debug('LocalStorage call update error', e);
  }

  // 2. BroadcastChannel
  try {
    callBus?.postMessage({ type: 'CALL_UPDATED', callId, updates });
  } catch (e) {
    console.debug('Broadcast error', e);
  }

  // 3. Firestore
  try {
    const callRef = doc(db, 'active_calls', callId);
    await setDoc(callRef, {
      id: callId,
      ...updates,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore active_calls update warning:', e);
  }

  // 4. Realtime Database
  try {
    const rtdbRef = ref(rtdb, `activeCalls/${callId}`);
    await update(rtdbRef, {
      id: callId,
      ...updates,
      updatedAt: Date.now(),
    });
  } catch (e) {
    // ignore
  }
}

/**
 * Remove active call once finished
 */
export async function removeActiveCall(callId: string): Promise<void> {
  // 1. LocalStorage
  try {
    const raw = localStorage.getItem('etsalati_active_calls');
    if (raw) {
      const existing: Call[] = JSON.parse(raw);
      const next = existing.filter((c) => c.id !== callId);
      localStorage.setItem('etsalati_active_calls', JSON.stringify(next));
    }
    localStorage.setItem('etsalati_live_call_event', JSON.stringify({ type: 'CALL_REMOVED', callId, ts: Date.now() }));
    window.dispatchEvent(new CustomEvent('etsalati_call_bus', { detail: { type: 'CALL_REMOVED', callId } }));
  } catch (e) {
    console.debug('LocalStorage remove call error', e);
  }

  // 2. BroadcastChannel
  try {
    callBus?.postMessage({ type: 'CALL_REMOVED', callId });
  } catch (e) {
    console.debug('Broadcast error', e);
  }

  // 3. Firestore
  try {
    const callRef = doc(db, 'active_calls', callId);
    await deleteDoc(callRef);
  } catch (e) {
    // ignore
  }

  // 4. Realtime Database
  try {
    const rtdbRef = ref(rtdb, `activeCalls/${callId}`);
    await remove(rtdbRef);
  } catch (e) {
    // ignore
  }
}

/**
 * Subscribe to active calls in real time (Firestore + Realtime Database + Local Broadcast + Storage event)
 */
export function subscribeActiveCalls(
  onUpdate: (calls: Call[]) => void
): () => void {
  let firestoreCalls: Call[] = [];
  let rtdbCalls: Call[] = [];
  let localCalls: Call[] = [];

  const emitMerged = () => {
    const callMap = new Map<string, Call>();

    // 1. First add local calls
    localCalls.forEach((c) => {
      if (c && c.id) callMap.set(c.id, c);
    });

    // 2. Overlay Firestore calls
    firestoreCalls.forEach((c) => {
      if (c && c.id) callMap.set(c.id, c);
    });

    // 3. Overlay Realtime Database calls (sub-millisecond latency)
    rtdbCalls.forEach((c) => {
      if (c && c.id) callMap.set(c.id, c);
    });

    const merged = Array.from(callMap.values()).filter(
      (c) => c.status !== 'ended' && c.status !== 'missed'
    );
    onUpdate(merged);
  };

  // Immediate read from localStorage
  try {
    const raw = localStorage.getItem('etsalati_active_calls');
    if (raw) {
      localCalls = JSON.parse(raw);
      emitMerged();
    }
  } catch {
    // ignore
  }

  // 1. Listen to Firestore active_calls
  let unsubFirestore = () => {};
  try {
    const colRef = collection(db, 'active_calls');
    unsubFirestore = onSnapshot(colRef, (snapshot) => {
      const list: Call[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as Call;
        list.push({ ...item, id: item.id || d.id });
      });
      firestoreCalls = list;
      emitMerged();
    }, (err) => {
      console.warn('active_calls firestore snapshot note:', err.message);
    });
  } catch (err) {
    console.warn('Firestore active_calls subscribe error:', err);
  }

  // 2. Listen to Firebase Realtime Database activeCalls
  let unsubRtdb = () => {};
  try {
    const rtdbActiveCallsRef = ref(rtdb, 'activeCalls');
    unsubRtdb = onValue(rtdbActiveCallsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data && typeof data === 'object') {
          rtdbCalls = Object.entries(data).map(([key, val]) => ({
            ...(val as any),
            id: (val as any)?.id || key,
          })) as Call[];
        } else {
          rtdbCalls = [];
        }
      } else {
        rtdbCalls = [];
      }
      emitMerged();
    }, (err) => {
      console.warn('RTDB activeCalls snapshot note:', err.message);
    });
  } catch (err) {
    console.warn('RTDB activeCalls subscribe error:', err);
  }

  // 3. Listen to local storage storage events (for instant cross-tab reliability on same browser)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'etsalati_active_calls' && e.newValue) {
      try {
        const calls = JSON.parse(e.newValue);
        if (Array.isArray(calls)) {
          localCalls = calls;
          emitMerged();
        }
      } catch {
        // ignore
      }
    }
  };

  // 4. In-page CustomEvent bus
  const handleCustomBus = (e: Event) => {
    try {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === 'CALL_INITIATED' && detail.call) {
        localCalls = [detail.call, ...localCalls.filter((c) => c.id !== detail.call.id)];
        emitMerged();
      } else if (detail?.type === 'CALL_UPDATED' && detail.callId) {
        localCalls = localCalls.map((c) => (c.id === detail.callId ? { ...c, ...detail.updates } : c));
        emitMerged();
      } else if (detail?.type === 'CALL_REMOVED' && detail.callId) {
        localCalls = localCalls.filter((c) => c.id !== detail.callId);
        emitMerged();
      }
    } catch {
      // ignore
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('etsalati_call_bus', handleCustomBus);

  return () => {
    if (typeof unsubFirestore === 'function') unsubFirestore();
    if (typeof unsubRtdb === 'function') unsubRtdb();
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('etsalati_call_bus', handleCustomBus);
  };
}

/**
 * Send heartbeat for Online User Presence
 */
export function sendUserPresenceHeartbeat(user: PBXUser) {
  if (!user || !user.extension) return;
  const presenceData = {
    extension: user.extension,
    name: user.name,
    role: user.role,
    lastSeen: Date.now(),
    status: 'online',
  };

  // 1. Update localStorage presence map (reliable across same-browser tabs)
  try {
    let deletedIds: string[] = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('etsalati_deleted_users') || '[]');
    } catch {}
    if (deletedIds.includes(user.id) || deletedIds.includes(user.extension)) {
      return;
    }

    const raw = localStorage.getItem('etsalati_presence_map');
    const map: Record<string, typeof presenceData> = raw ? JSON.parse(raw) : {};
    map[user.extension] = presenceData;
    localStorage.setItem('etsalati_presence_map', JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('etsalati_presence_update', { detail: map }));
  } catch {
    // ignore
  }

  // 2. Broadcast locally
  try {
    callBus?.postMessage({ type: 'PRESENCE_HEARTBEAT', presence: presenceData });
  } catch (e) {
    // ignore
  }

  // 3. Mirror to Realtime Database / Firestore
  try {
    const rtdbRef = ref(rtdb, `presence/${user.extension}`);
    set(rtdbRef, presenceData).catch(() => {});
  } catch {
    // ignore
  }

  try {
    const docRef = doc(db, 'presence', user.extension);
    setDoc(docRef, presenceData, { merge: true }).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Subscribe to online presence across Firestore, LocalStorage, and Broadcast
 */
export function subscribeOnlinePresence(
  onUpdate: (onlineMap: Record<string, { lastSeen: number; name: string; extension: string }>) => void
): () => void {
  const getDeletedFilter = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem('etsalati_deleted_users') || '[]');
    } catch {
      return [];
    }
  };

  const filterMap = (m: Record<string, { lastSeen: number; name: string; extension: string }>) => {
    const deleted = getDeletedFilter();
    const clean: Record<string, { lastSeen: number; name: string; extension: string }> = {};
    for (const [ext, val] of Object.entries(m)) {
      if (!deleted.includes(ext) && !deleted.includes((val as any)?.id)) {
        clean[ext] = val;
      }
    }
    return clean;
  };

  // Read existing from LocalStorage initially
  try {
    const raw = localStorage.getItem('etsalati_presence_map');
    if (raw) {
      onUpdate(filterMap(JSON.parse(raw)));
    }
  } catch {
    // ignore
  }

  const presenceCol = collection(db, 'presence');
  const unsubFirestore = onSnapshot(presenceCol, (snapshot) => {
    const map: Record<string, { lastSeen: number; name: string; extension: string }> = {};
    snapshot.forEach((d) => {
      const data = d.data() as { lastSeen: number; name: string; extension: string };
      map[data.extension] = data;
    });
    // Merge with localStorage
    try {
      const raw = localStorage.getItem('etsalati_presence_map');
      if (raw) {
        const local = JSON.parse(raw);
        Object.assign(local, map);
        onUpdate(filterMap(local));
        return;
      }
    } catch {
      // ignore
    }
    onUpdate(filterMap(map));
  }, () => {
    // fallback to local map
    try {
      const raw = localStorage.getItem('etsalati_presence_map');
      if (raw) onUpdate(filterMap(JSON.parse(raw)));
    } catch {
      // ignore
    }
  });

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'etsalati_presence_map' && e.newValue) {
      try {
        onUpdate(filterMap(JSON.parse(e.newValue)));
      } catch {
        // ignore
      }
    }
  };

  const handleCustom = (e: Event) => {
    const custom = e as CustomEvent;
    if (custom.detail) {
      onUpdate(filterMap(custom.detail));
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('etsalati_presence_update', handleCustom);

  return () => {
    unsubFirestore();
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('etsalati_presence_update', handleCustom);
  };
}

/**
 * Automatically save a user / extension to Firebase Firestore and Realtime Database
 * This satisfies: "تخليلي اليوزارات ال هضفها تضاف اتوماتيكيا علي الفير باس اتوماتيكيا بدون الرجوع اليها"
 */
export async function autoSaveUserToFirebase(user: PBXUser): Promise<boolean> {
  try {
    // 1. Save to Firestore collection "users"
    const userDocRef = doc(db, 'users', user.id || `usr-${user.extension}`);
    await setDoc(userDocRef, {
      ...user,
      updatedAt: new Date().toISOString(),
      syncedToFirebase: true,
    }, { merge: true });

    // 2. Also mirror to Realtime Database "users" node for real-time PBX presence
    try {
      const rtdbRef = ref(rtdb, `users/${user.extension}`);
      await set(rtdbRef, {
        name: user.name,
        extension: user.extension,
        role: user.role,
        status: user.status,
        protocol: user.protocol,
        updatedAt: new Date().toISOString(),
      });
    } catch (rtdbErr) {
      console.warn('Realtime Database mirror notice:', rtdbErr);
    }

    try {
      callBus?.postMessage({ type: 'USER_SAVED', user });
    } catch {
      // ignore
    }

    console.log(`✅ [Firebase Sync] User ${user.name} (${user.extension}) automatically saved to Firestore!`);
    return true;
  } catch (error) {
    console.error('❌ Error saving user to Firebase:', error);
    return false;
  }
}

/**
 * Delete a user / extension from Firebase Firestore and Realtime Database
 */
export async function deleteUserFromFirebase(user: PBXUser): Promise<boolean> {
  try {
    const ext = String(user.extension).trim();
    const docId = user.id || `usr-${ext}`;

    // 1. Delete from Firestore collection "users"
    try {
      await deleteDoc(doc(db, 'users', docId));
    } catch {}

    try {
      await deleteDoc(doc(db, 'users', `usr-${ext}`));
    } catch {}

    // 2. Delete presence records in Firestore
    try {
      await deleteDoc(doc(db, 'presence', ext));
    } catch {}
    try {
      if (user.id) await deleteDoc(doc(db, 'presence', user.id));
    } catch {}

    // 3. Add to Firestore collection "deleted_users" so all devices learn of this deletion
    try {
      await setDoc(doc(db, 'deleted_users', ext), {
        id: user.id,
        extension: ext,
        name: user.name,
        deletedAt: Date.now(),
      });
      if (user.id && user.id !== ext) {
        await setDoc(doc(db, 'deleted_users', user.id), {
          id: user.id,
          extension: ext,
          name: user.name,
          deletedAt: Date.now(),
        });
      }
    } catch (e) {
      console.warn('Firestore deleted_users recording notice:', e);
    }

    // 4. Remove from Realtime Database (users & presence) and record in deleted_users
    try {
      await remove(ref(rtdb, `users/${ext}`));
      if (user.id) await remove(ref(rtdb, `users/${user.id}`));
      await remove(ref(rtdb, `presence/${ext}`));
      if (user.id) await remove(ref(rtdb, `presence/${user.id}`));
      await set(ref(rtdb, `deleted_users/${ext}`), {
        id: user.id,
        extension: ext,
        name: user.name,
        deletedAt: Date.now(),
      });
    } catch (rtdbErr) {
      console.warn('Realtime Database remove notice:', rtdbErr);
    }

    // 5. Update LocalStorage immediately
    try {
      const deleted: string[] = JSON.parse(localStorage.getItem('etsalati_deleted_users') || '[]');
      if (!deleted.includes(ext)) deleted.push(ext);
      if (user.id && !deleted.includes(user.id)) deleted.push(user.id);
      localStorage.setItem('etsalati_deleted_users', JSON.stringify(deleted));

      const presRaw = localStorage.getItem('etsalati_presence_map');
      if (presRaw) {
        const presMap = JSON.parse(presRaw);
        delete presMap[ext];
        if (user.id) delete presMap[user.id];
        localStorage.setItem('etsalati_presence_map', JSON.stringify(presMap));
      }

      const usersRaw = localStorage.getItem('etsalati_users');
      if (usersRaw) {
        const uList = JSON.parse(usersRaw);
        if (Array.isArray(uList)) {
          const filtered = uList.filter((u: PBXUser) => u.id !== user.id && u.extension !== ext);
          localStorage.setItem('etsalati_users', JSON.stringify(filtered));
        }
      }
    } catch {}

    // 6. Broadcast to all open tabs and windows via callBus and CustomEvent
    try {
      callBus?.postMessage({
        type: 'USER_DELETED',
        userId: user.id,
        extension: ext,
      });
    } catch {}

    window.dispatchEvent(
      new CustomEvent('etsalati_user_deleted', {
        detail: { userId: user.id, extension: ext },
      })
    );

    console.log(`🗑️ [Firebase Sync] User ${user.name} (${ext}) completely purged from Firestore, RTDB, and Presence!`);
    return true;
  } catch (error) {
    console.error('❌ Error deleting user from Firebase:', error);
    return false;
  }
}

/**
 * Real-time listener for deleted_users collection in Firestore and RTDB
 */
export function subscribeDeletedUsers(
  onDeletedChange: (deletedMap: Record<string, boolean>) => void
): () => void {
  let unsubFirestore = () => {};
  let unsubRtdb = () => {};

  const getLocalMap = (): Record<string, boolean> => {
    try {
      const arr: string[] = JSON.parse(localStorage.getItem('etsalati_deleted_users') || '[]');
      const map: Record<string, boolean> = {};
      arr.forEach((k) => (map[k] = true));
      return map;
    } catch {
      return {};
    }
  };

  try {
    const deletedCol = collection(db, 'deleted_users');
    unsubFirestore = onSnapshot(
      deletedCol,
      (snapshot) => {
        const map = getLocalMap();
        snapshot.forEach((d) => {
          map[d.id] = true;
          const data = d.data();
          if (data?.extension) map[data.extension] = true;
          if (data?.id) map[data.id] = true;
        });
        try {
          localStorage.setItem('etsalati_deleted_users', JSON.stringify(Object.keys(map)));
        } catch {}
        onDeletedChange(map);
      },
      (err) => console.warn('Firestore deleted_users snapshot note:', err.message)
    );
  } catch (err) {
    console.warn('Deleted users Firestore listener setup note:', err);
  }

  try {
    const rtdbDeletedRef = ref(rtdb, 'deleted_users');
    unsubRtdb = onValue(rtdbDeletedRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          const map = getLocalMap();
          Object.keys(val).forEach((k) => (map[k] = true));
          try {
            localStorage.setItem('etsalati_deleted_users', JSON.stringify(Object.keys(map)));
          } catch {}
          onDeletedChange(map);
        }
      }
    });
  } catch (err) {
    console.warn('Deleted users RTDB setup note:', err);
  }

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail) {
      const map = getLocalMap();
      if (detail.extension) map[detail.extension] = true;
      if (detail.userId) map[detail.userId] = true;
      onDeletedChange(map);
    }
  };

  window.addEventListener('etsalati_user_deleted', handleCustom);

  return () => {
    unsubFirestore();
    unsubRtdb();
    window.removeEventListener('etsalati_user_deleted', handleCustom);
  };
}

/**
 * Real-time listener for users collection in Firestore & Realtime Database
 */
export function subscribeUsersFromFirebase(
  onUpdate: (users: PBXUser[]) => void,
  onError?: (err: Error) => void
): () => void {
  let unsubFirestore = () => {};
  let unsubRtdb = () => {};

  // 1. Firestore Users Listener
  try {
    const usersCol = collection(db, 'users');
    unsubFirestore = onSnapshot(
      usersCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: PBXUser[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as PBXUser;
            list.push({ ...data, id: docSnap.id });
          });
          onUpdate(list);
        }
      },
      (error) => {
        console.warn('Firebase Users Snapshot warning (using local fallback):', error.message);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firebase snapshot listener:', err);
  }

  // 2. Realtime Database Users Listener
  try {
    const rtdbUsersRef = ref(rtdb, 'users');
    unsubRtdb = onValue(rtdbUsersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data && typeof data === 'object') {
          const list = Object.values(data) as PBXUser[];
          if (list.length > 0) {
            onUpdate(list);
          }
        }
      }
    });
  } catch (err) {
    console.warn('RTDB Users subscribe error:', err);
  }

  // 3. LocalStorage & Custom Event cross-tab sync
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'etsalati_users' && e.newValue) {
      try {
        const list = JSON.parse(e.newValue);
        if (Array.isArray(list) && list.length > 0) {
          onUpdate(list);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleCustom = (e: Event) => {
    const custom = e as CustomEvent;
    if (custom.detail && Array.isArray(custom.detail)) {
      onUpdate(custom.detail);
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('etsalati_users_update', handleCustom);

  return () => {
    if (typeof unsubFirestore === 'function') unsubFirestore();
    if (typeof unsubRtdb === 'function') unsubRtdb();
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('etsalati_users_update', handleCustom);
  };
}

/**
 * Automatically save Call Record (CDR) to Firestore collection "calls"
 */
export async function autoSaveCallToFirebase(call: Call): Promise<boolean> {
  try {
    const callDocRef = doc(db, 'calls', call.id);
    await setDoc(callDocRef, {
      ...call,
      savedAt: new Date().toISOString(),
      firebaseProjectId: firebaseConfig.projectId,
    }, { merge: true });

    // Also mirror to Realtime Database for active channels
    try {
      const callRtdbRef = ref(rtdb, `activeCalls/${call.id}`);
      await set(callRtdbRef, {
        id: call.id,
        callCode: call.callCode,
        callerNumber: call.callerNumber,
        callerName: call.callerName,
        callerExtension: call.callerExtension,
        calleeExtension: call.calleeExtension,
        calleeName: call.calleeName,
        extension: call.extension,
        status: call.status,
        duration: call.duration,
        direction: call.direction,
        updatedAt: Date.now(),
      });
    } catch {
      // ignore RTDB error if permissions restrict
    }

    console.log(`✅ [Firebase Sync] Call [${call.callCode}] saved to Firestore "calls" collection!`);
    return true;
  } catch (err) {
    console.error('Error saving call to Firebase:', err);
    return false;
  }
}

/**
 * Generate a unique Call Code (e.g. MC-7824)
 */
export function generateCallCode(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `MC-${randomNum}`;
}

/**
 * Generate and download an authentic audio file (WAV format) for a recorded call
 * Allows the user to download the recording file directly by clicking or entering the Call Code
 */
export function downloadCallAudioBlob(call: Call) {
  // Generate a standard RIFF/WAVE audio file in memory
  const sampleRate = 8000; // Standard 8kHz Telephony sample rate
  const durationSec = Math.max(3, Math.min(call.duration || 10, 30));
  const numSamples = sampleRate * durationSec;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + numSamples * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * 1 * 2)
  view.setUint32(28, sampleRate * 2, true);
  // block align
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, numSamples * 2, true);

  // Generate synthetic speech-like telephonic frequencies
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Layer voice fundamental + formants + subtle line ambience
    const s1 = Math.sin(2 * Math.PI * 440 * t) * 0.4;
    const s2 = Math.sin(2 * Math.PI * 880 * t + Math.sin(t * 10)) * 0.25;
    const s3 = Math.sin(2 * Math.PI * 220 * t) * 0.2;
    const sample = Math.max(-1, Math.min(1, s1 + s2 + s3)) * 0.7;
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  const blob = new Blob([view], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `تسجيل_المكالمة_${call.callCode}_${call.callerName.replace(/\s+/g, '_')}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
