export type AsteriskStatus = 'connected' | 'reconnecting' | 'error' | 'disconnected';
export type FirebaseStatus = 'synced' | 'syncing' | 'offline';

export interface SIPTrunk {
  id: string;
  name: string;
  host: string;
  type: 'SIP' | 'IAX2' | 'PJSIP';
  status: 'online' | 'offline';
  channelsInUse: number;
  maxChannels: number;
  latencyMs: number;
}

export interface PBXStatus {
  asteriskStatus: AsteriskStatus;
  amiChannels: number;
  activeCallsCount: number;
  sipTrunks: SIPTrunk[];
  firebaseSync: FirebaseStatus;
  fcmStatus: 'active' | 'inactive';
  uptime: string;
  cpuLoad: number;
  memoryLoad: number;
  version: string;
}

export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'ringing' | 'connected' | 'on_hold' | 'ended' | 'transferred' | 'missed';

export interface Call {
  id: string;
  callCode: string; // Unique Call Tracking Code (e.g. MC-8492)
  direction: CallDirection;
  callerNumber: string;
  callerName: string;
  extension: string;
  status: CallStatus;
  startTime: string;
  duration: number; // in seconds
  isRecording: boolean;
  recordingUrl?: string;
  channelId: string;
  crmContactId?: string;
  holdSince?: number;
}

export interface Voicemail {
  id: string;
  extension: string;
  callerNumber: string;
  callerName: string;
  timestamp: string;
  duration: number; // seconds
  isRead: boolean;
  transcription: string;
  audioWaveform: number[];
  fileSize: string;
}

export interface FaxItem {
  id: string;
  direction: 'inbound' | 'outbound';
  remoteNumber: string;
  remoteCallerId: string;
  pages: number;
  status: 'received' | 'sent' | 'failed' | 'transmitting';
  timestamp: string;
  subject: string;
  fileSize: string;
  previewText: string;
  senderName?: string;
  resolution: string;
}

export interface Participant {
  id: string;
  name: string;
  callerId: string;
  extension?: string;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: string;
  isModerator?: boolean;
  avatarColor?: string;
}

export interface ConferenceRoom {
  id: string;
  roomNumber: string;
  name: string;
  pin: string;
  participants: Participant[];
  isLocked: boolean;
  isRecording: boolean;
  maxParticipants: number;
}

export interface CRMContact {
  id: string;
  name: string;
  phone: string;
  company: string;
  email: string;
  vip: boolean;
  totalCalls: number;
  notes: { id: string; text: string; date: string; author: string }[];
  lastInteraction: string;
  address?: string;
  accountManager?: string;
}

export interface PBXUser {
  id: string;
  name: string;
  email: string;
  extension: string;
  protocol: 'SIP' | 'IAX2' | 'PJSIP';
  role: 'admin' | 'supervisor' | 'agent';
  status: 'online' | 'busy' | 'away' | 'dnd' | 'offline';
  secret: string;
  context: string;
  voicemailEnabled: boolean;
  recordingEnabled: boolean;
}

export interface AMIEvent {
  id: string;
  event: string;
  timestamp: string;
  channel: string;
  details: string;
  type?: 'call' | 'hangup' | 'fax' | 'voicemail' | 'bridge' | 'warning';
  privilege?: string;
}
