export interface TelephonyUser {
  id: string;
  name: string;
  extension: string;
  role: 'user' | 'admin';
  department: string;
  accountName: string;
  pbxServerIp: string;
  password?: string;
  avatarColor?: string;
  lastSeen?: number;
}

export type CallState = 
  | 'idle'
  | 'dialing'      // caller initiated, establishing
  | 'ringing'      // target phone is ringing
  | 'connected'    // call answered, speaking
  | 'on_hold'      // call placed on hold
  | 'ended';       // call terminated

export interface ActiveCall {
  callId: string;
  callerExtension: string;
  callerName: string;
  targetExtension: string;
  targetName: string;
  state: CallState;
  startTime?: number;
  durationSeconds: number;
  isMuted: boolean;
  isOnHold: boolean;
  isSpeaker: boolean;
  direction: 'outgoing' | 'incoming';
}

export interface CallLogItem {
  id: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  contactName: string;
  extension: string;
  timestamp: number;
  durationSeconds: number;
  status: 'answered' | 'missed' | 'declined';
}

export interface CallSignalMessage {
  type: 
    | 'CALL_INVITE'       // Caller -> Receiver: "I am calling you"
    | 'CALL_RINGING'      // Receiver -> Caller: "I am ringing"
    | 'CALL_ACCEPTED'     // Receiver -> Caller: "I answered the call"
    | 'CALL_REJECTED'     // Receiver -> Caller: "I rejected your call"
    | 'CALL_ENDED'        // Either party terminated
    | 'CALL_HOLD'         // Caller or Receiver toggled hold
    | 'PRESENCE_PING'     // Broadcast presence
    | 'PRESENCE_PONG';    // Respond presence
  callId: string;
  fromExtension: string;
  fromName: string;
  toExtension: string;
  payload?: any;
  timestamp: number;
}
