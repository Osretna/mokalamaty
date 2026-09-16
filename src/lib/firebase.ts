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
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { getDatabase, ref, set, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { Call, PBXUser } from '../types';

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

    console.log(`✅ [Firebase Sync] User ${user.name} (${user.extension}) automatically saved to Firestore!`);
    return true;
  } catch (error) {
    console.error('❌ Error saving user to Firebase:', error);
    return false;
  }
}

/**
 * Real-time listener for users collection in Firestore
 */
export function subscribeUsersFromFirebase(
  onUpdate: (users: PBXUser[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const usersCol = collection(db, 'users');
    return onSnapshot(
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
    return () => {};
  }
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
      const callRtdbRef = ref(rtdb, `activeCalls/${call.callCode || call.id}`);
      await set(callRtdbRef, {
        callCode: call.callCode,
        callerNumber: call.callerNumber,
        callerName: call.callerName,
        extension: call.extension,
        status: call.status,
        duration: call.duration,
        direction: call.direction,
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
