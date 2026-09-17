import { CallSignalMessage, TelephonyUser, CallLogItem } from '../types/telephony';
import { telephonyAudio } from './audioService';

export const DEFAULT_USERS: TelephonyUser[] = [
  {
    id: 'user-6100',
    name: 'طارق زينهم محمد عزب',
    extension: '6100',
    role: 'user', // Standard user
    department: 'المبيعات وتطوير الأعمال',
    accountName: 'mokalamaty_6100',
    pbxServerIp: '192.168.1.100',
    password: '6100',
    avatarColor: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'user-6101',
    name: 'أحمد سمير محمود',
    extension: '6101',
    role: 'user',
    department: 'خدمة العملاء والدعم الفني',
    accountName: 'mokalamaty_6101',
    pbxServerIp: '192.168.1.100',
    password: '6101',
    avatarColor: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'user-6102',
    name: 'ندى الشربيني',
    extension: '6102',
    role: 'user',
    department: 'الموارد البشرية والإدارة',
    accountName: 'mokalamaty_6102',
    pbxServerIp: '192.168.1.100',
    password: '6102',
    avatarColor: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'user-6103',
    name: 'مصطفى كمال إبراهيم',
    extension: '6103',
    role: 'admin', // Admin
    department: 'إدارة الشبكات ونظم المعلومات',
    accountName: 'mokalamaty_6103',
    pbxServerIp: '192.168.1.100',
    password: '6103',
    avatarColor: 'from-amber-500 to-orange-600',
  },
  {
    id: 'user-6104',
    name: 'سارة علي القاضي',
    extension: '6104',
    role: 'user',
    department: 'الحسابات والشؤون المالية',
    accountName: 'mokalamaty_6104',
    pbxServerIp: '192.168.1.100',
    password: '6104',
    avatarColor: 'from-pink-500 to-rose-600',
  },
  {
    id: 'user-6000',
    name: 'الرد الصوتي واختبار البدالة (Echo PBX)',
    extension: '6000',
    role: 'user',
    department: 'خدمة الرد الآلي للبدالة',
    accountName: 'mokalamaty_6000',
    pbxServerIp: '192.168.1.100',
    password: '6000',
    avatarColor: 'from-slate-500 to-slate-700',
  },
];

const BROADCAST_CHANNEL_NAME = 'mokalamaty_telephony_channel_v2';

export class TelephonySignalManager {
  private channel: BroadcastChannel | null = null;
  private messageListeners: ((msg: CallSignalMessage) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this.handleIncomingSignal(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel error, fallback to storage events', e);
      }
    }

    // Fallback & cross-window sync via storage
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'mokalamaty_signal_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.handleIncomingSignal(data);
          } catch {}
        }
      });
    }
  }

  public subscribe(listener: (msg: CallSignalMessage) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== listener);
    };
  }

  public broadcast(message: CallSignalMessage) {
    // 1. Send to BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch {}
    }

    // 2. Send via localStorage for resilient cross-tab updates
    try {
      localStorage.setItem(
        'mokalamaty_signal_event',
        JSON.stringify({ ...message, _rnd: Math.random() })
      );
    } catch {}

    // 3. Also notify current window listeners if it's self-loopable or needed
  }

  private handleIncomingSignal(msg: CallSignalMessage) {
    if (!msg || !msg.type) return;
    this.messageListeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (err) {
        console.error('Error in signal listener', err);
      }
    });
  }
}

export const signalManager = new TelephonySignalManager();
