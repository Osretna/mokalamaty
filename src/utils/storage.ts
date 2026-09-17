import { TelephonyUser, CallLogItem } from '../types/telephony';
import { DEFAULT_USERS } from './telephonySignal';

const STORAGE_KEYS = {
  CURRENT_USER: 'mokalamaty_current_user_v2',
  ACTIVE_TAB: 'mokalamaty_active_tab_v2',
  DIAL_INPUT: 'mokalamaty_dial_input_v2',
  CALL_LOGS: 'mokalamaty_call_logs_v2',
  USER_ROLE: 'mokalamaty_user_role_v2',
  AUDIO_SETTINGS: 'mokalamaty_audio_settings_v2',
};

export const storage = {
  getCurrentUser(): TelephonyUser {
    if (typeof window === 'undefined') return DEFAULT_USERS[0];
    
    // Check URL param first (?ext=6101) so opening in new tab/window directly logs in that user
    const params = new URLSearchParams(window.location.search);
    const extParam = params.get('ext');
    if (extParam) {
      const match = DEFAULT_USERS.find((u) => u.extension === extParam);
      if (match) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(match));
        return match;
      }
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        const verified = DEFAULT_USERS.find((u) => u.extension === parsed.extension);
        if (verified) return { ...verified, ...parsed };
      }
    } catch {}

    // Default to Tarek Zeinhom (6100) from user screenshot
    return DEFAULT_USERS[0];
  },

  setCurrentUser(user: TelephonyUser) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } catch {}
  },

  getActiveTab(): string {
    if (typeof window === 'undefined') return 'dialer';
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB) || 'dialer';
    } catch {
      return 'dialer';
    }
  },

  setActiveTab(tab: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tab);
    } catch {}
  },

  getDialInput(): string {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(STORAGE_KEYS.DIAL_INPUT) || '';
    } catch {
      return '';
    }
  },

  setDialInput(value: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.DIAL_INPUT, value);
    } catch {}
  },

  getCallLogs(): CallLogItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CALL_LOGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}

    // Initial realistic logs
    const initialLogs: CallLogItem[] = [
      {
        id: 'log-1',
        direction: 'incoming',
        contactName: 'أحمد سمير محمود',
        extension: '6101',
        timestamp: Date.now() - 1000 * 60 * 25,
        durationSeconds: 145,
        status: 'answered',
      },
      {
        id: 'log-2',
        direction: 'outgoing',
        contactName: 'ندى الشربيني',
        extension: '6102',
        timestamp: Date.now() - 1000 * 60 * 120,
        durationSeconds: 62,
        status: 'answered',
      },
      {
        id: 'log-3',
        direction: 'missed',
        contactName: 'سارة علي القاضي',
        extension: '6104',
        timestamp: Date.now() - 1000 * 60 * 360,
        durationSeconds: 0,
        status: 'missed',
      },
    ];
    return initialLogs;
  },

  saveCallLog(log: CallLogItem) {
    if (typeof window === 'undefined') return;
    try {
      const logs = this.getCallLogs();
      const updated = [log, ...logs.filter((l) => l.id !== log.id)].slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(updated));
    } catch {}
  },

  clearCallLogs() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.CALL_LOGS);
    } catch {}
  }
};
