import React, { useState } from 'react';
import { 
  Server, 
  Cpu, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Radio, 
  ShieldCheck, 
  Flame, 
  Play, 
  Layers, 
  Monitor, 
  Code2, 
  ExternalLink,
  Zap
} from 'lucide-react';
import { playTelephonyFx } from '../../utils/audioTones';

export const AsteriskMiddlewareView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'middleware' | 'simulator' | 'electron' | 'asterisk_conf'>('middleware');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [simulatedEventType, setSimulatedEventType] = useState('Newchannel');
  const [simulatedPayload, setSimulatedPayload] = useState<any>(null);

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const fireSimulation = () => {
    playTelephonyFx('connected');
    const timestamp = new Date().toISOString();
    let result: any = {};

    if (simulatedEventType === 'Newchannel') {
      result = {
        amiEvent: 'Newchannel',
        privilege: 'call,all',
        channel: 'PJSIP/101-0000004f',
        channelState: '4',
        channelStateDesc: 'Ring',
        callerIDNum: '+201012345678',
        callerIDName: 'أحمد عبد السلام',
        exten: '101',
        context: 'from-internal',
        firestoreSync: {
          collection: 'calls',
          docId: 'call_4f',
          action: 'set',
          data: {
            status: 'ringing',
            direction: 'inbound',
            callerNumber: '+201012345678',
            callerName: 'أحمد عبد السلام',
            extension: '101',
            timestamp,
          },
        },
        fcmNotification: {
          title: '📞 مكالمة واردة جديدة',
          body: 'المتصل: أحمد عبد السلام (+201012345678) يرن على تحويلتك 101',
          data: { callId: 'call_4f', screenPop: 'true' },
        },
      };
    } else if (simulatedEventType === 'BridgeEnter') {
      result = {
        amiEvent: 'BridgeEnter',
        bridgeUniqueid: 'br-99182',
        channel: 'PJSIP/101-0000004f',
        callerIDNum: '+201012345678',
        firestoreSync: {
          collection: 'calls',
          docId: 'call_4f',
          action: 'update',
          data: { status: 'connected', connectedAt: timestamp },
        },
      };
    } else if (simulatedEventType === 'Hold') {
      result = {
        amiEvent: 'Hold',
        channel: 'PJSIP/101-0000004f',
        musicOnHoldClass: 'default',
        firestoreSync: {
          collection: 'calls',
          docId: 'call_4f',
          action: 'update',
          data: { status: 'on_hold', holdStart: timestamp },
        },
      };
    } else if (simulatedEventType === 'Hangup') {
      result = {
        amiEvent: 'Hangup',
        channel: 'PJSIP/101-0000004f',
        cause: '16',
        causeTxt: 'Normal Clearing',
        firestoreSync: {
          collection: 'calls',
          docId: 'call_4f',
          action: 'update',
          data: { status: 'ended', endedAt: timestamp },
        },
      };
    }

    setSimulatedPayload(result);
  };

  const middlewareCode = `/**
 * اتصالاتي - Node.js Asterisk AMI to Firebase Middleware
 * Bridges Asterisk AMI events directly into Firebase Firestore & Cloud Messaging
 * Author: Nesma Gamal / Etsalati PBX Platform
 */

const AsteriskManager = require('asterisk-manager');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// 1. Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
const messaging = admin.messaging();

// 2. Initialize Asterisk AMI Client (Port 5038)
const ami = new AsteriskManager(
  5038,                 // AMI Port
  '127.0.0.1',          // Asterisk Server IP
  'etsalati_admin',     // AMI Username (manager.conf)
  'AsteriskSecret2026', // AMI Password
  true                  // Auto-reconnect
);

ami.keepConnected();

console.log('🚀 [Etsalati Middleware] Connecting to Asterisk AMI on 127.0.0.1:5038...');

ami.on('connect', () => {
  console.log('✅ Connected to Asterisk AMI successfully!');
});

// 3. Listen to Incoming Call Event (Newchannel)
ami.on('newchannel', async (evt) => {
  const callerNumber = evt.calleridnum || 'مجهول';
  const callerName = evt.calleridname || 'متصل غير مسجل';
  const exten = evt.exten || '101';
  const channel = evt.channel;

  console.log(\`📞 New Call: \${callerName} (\${callerNumber}) -> Ext: \${exten}\`);

  // Write call directly to Firestore
  const callRef = db.collection('calls').doc(channel.replace(/[/.]/g, '_'));
  await callRef.set({
    callerNumber,
    callerName,
    extension: exten,
    channel,
    status: 'ringing',
    direction: 'inbound',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Dispatch Instant FCM Notification for Screen-Pop
  try {
    await messaging.send({
      topic: \`extension_\${exten}\`,
      notification: {
        title: '📞 مكالمة واردة جديدة',
        body: \`المتصل: \${callerName} (\${callerNumber})\`,
      },
      data: {
        channel,
        callerNumber,
        callerName,
        extension: exten,
        action: 'screen_pop',
      },
    });
  } catch (err) {
    console.error('FCM Error:', err.message);
  }
});

// 4. Listen to Call Answered (BridgeEnter)
ami.on('bridgeenter', async (evt) => {
  const channel = evt.channel;
  console.log(\`✅ Call Answered on channel: \${channel}\`);
  const callRef = db.collection('calls').doc(channel.replace(/[/.]/g, '_'));
  await callRef.update({
    status: 'connected',
    answeredAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => {});
});

// 5. Listen to Call Hangup
ami.on('hangup', async (evt) => {
  const channel = evt.channel;
  console.log(\`❌ Call Ended: \${channel}\`);
  const callRef = db.collection('calls').doc(channel.replace(/[/.]/g, '_'));
  await callRef.update({
    status: 'ended',
    endedAt: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => {});
});

// 6. REST API for Triggering Calls from Frontend (Click-to-Call)
const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/originate', (req, res) => {
  const { fromExt, toDestination } = req.body;
  ami.action({
    action: 'originate',
    channel: \`PJSIP/\${fromExt}\`,
    context: 'from-internal',
    exten: toDestination,
    priority: 1,
    callerid: \`"Etsalati Softphone" <\${fromExt}>\`,
    async: true,
  }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, response });
  });
});

app.listen(4000, () => {
  console.log('🌐 Middleware REST API listening on port 4000');
});`;

  const electronCode = `// electron/main.js
const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#020617',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load production build or dev server
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Windows native notifications for Incoming Calls & Faxes
ipcMain.on('show-notification', (event, { title, body }) => {
  new Notification({ title, body, icon: path.join(__dirname, 'icon.ico') }).show();
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});`;

  const asteriskConf = `; /etc/asterisk/manager.conf
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0
webenabled = no

[etsalati_admin]
secret = AsteriskSecret2026
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
permit = 192.168.1.0/255.255.255.0
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan,originate
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan,originate

; /etc/asterisk/pjsip.conf
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

[101]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw,g722
auth=auth101
aors=101

[auth101]
type=auth
auth_type=userpass
password=sip_secret_101
username=101

[101]
type=aor
max_contacts=5`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">معمارية النظام و Node.js Middleware</h3>
              <p className="text-xs text-slate-400">
                حلقة الوصل بين محرك Asterisk AMI وقاعدة بيانات Firebase وتطبيق Windows Electron
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              جاهز للإنتاج (Production Ready)
            </span>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('middleware')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'middleware'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>كود Node.js Middleware</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>محاكي أحداث AMI إلى Firestore</span>
          </button>

          <button
            onClick={() => setActiveTab('electron')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'electron'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>تجهيز تطبيق Windows (Electron)</span>
          </button>

          <button
            onClick={() => setActiveTab('asterisk_conf')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'asterisk_conf'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>ملفات إعداد Asterisk (manager.conf)</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Node.js Middleware */}
      {activeTab === 'middleware' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>ملف الـ Middleware: <code className="text-cyan-300 font-mono">server/asteriskMiddleware.js</code></span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                يقوم بالاتصال بسيرفر Asterisk عبر AMI (Port 5038) ومزامنة المكالمات في Firestore فورياً وإطلاق إشعارات FCM
              </p>
            </div>

            <button
              onClick={() => copyCode('middleware', middlewareCode)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedSection === 'middleware' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ بنجاح</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الكود كاملاً</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-cyan-200 overflow-x-auto max-h-[500px] leading-relaxed" dir="ltr">
            <pre>{middlewareCode}</pre>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="font-bold text-white block mb-1">1. تثبيت الحزم:</span>
              <code className="text-cyan-400 font-mono">npm install asterisk-manager firebase-admin express cors</code>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="font-bold text-white block mb-1">2. مفتاح Firebase:</span>
              <span className="text-slate-400">ضع ملف <code className="text-amber-400">serviceAccountKey.json</code> في نفس المجلد</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="font-bold text-white block mb-1">3. بدء التشغيل:</span>
              <code className="text-emerald-400 font-mono">node asteriskMiddleware.js</code>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AMI Simulator */}
      {activeTab === 'simulator' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>محاكي إشارات AMI والتحويل التلقائي لـ Firestore و FCM:</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              اختر نوع الحدث الوارد من البدالة لاختبار كيفية معالجته وتخزينه في قاعدة بيانات Firestore
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['Newchannel', 'BridgeEnter', 'Hold', 'Hangup'].map((type) => (
              <button
                key={type}
                onClick={() => setSimulatedEventType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  simulatedEventType === type
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
                }`}
              >
                Event: {type}
              </button>
            ))}

            <button
              onClick={fireSimulation}
              className="mr-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>إطلاق الحدث وفحص النتيجة</span>
            </button>
          </div>

          {simulatedPayload ? (
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed" dir="ltr">
              <pre>{JSON.stringify(simulatedPayload, null, 2)}</pre>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              انقر على "إطلاق الحدث وفحص النتيجة" لرؤية نموذج استجابة الـ Middleware وتحويل الحدث إلى Firestore و FCM.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Windows Electron */}
      {activeTab === 'electron' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-400" />
                <span>حزمة سطح المكتب لنظام Windows (Electron Build):</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                تغليف تطبيق "اتصالاتي" كبرنامج تنفيذي مستقل (.exe) يعمل في صينية النظام (System Tray) مع إشعارات ويندوز
              </p>
            </div>

            <button
              onClick={() => copyCode('electron', electronCode)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedSection === 'electron' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ كود main.js</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-blue-200 overflow-x-auto leading-relaxed" dir="ltr">
            <pre>{electronCode}</pre>
          </div>

          <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs space-y-1">
            <div className="font-bold text-white">أمر التجميع لحزمة Windows (.exe):</div>
            <code className="text-cyan-400 font-mono block" dir="ltr">npx electron-builder --win --x64</code>
          </div>
        </div>
      )}

      {/* Tab 4: Asterisk Configuration */}
      {activeTab === 'asterisk_conf' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>إعدادات Asterisk الأساسية (manager.conf & pjsip.conf):</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                تكوين حساب الـ AMI لتمكين الـ Middleware من استقبال الأحداث والتحكم في القنوات
              </p>
            </div>

            <button
              onClick={() => copyCode('asterisk', asteriskConf)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedSection === 'asterisk' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الإعدادات</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-emerald-200 overflow-x-auto leading-relaxed" dir="ltr">
            <pre>{asteriskConf}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
