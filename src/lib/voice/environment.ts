export interface VoiceEnvironment {
  secureContext: boolean;
  hostname: string;
  isLocalhost: boolean;
  isLanIp: boolean;
  speechApiAvailable: boolean;
  canUseMic: boolean;
  blockReason: 'lan-http' | 'insecure' | 'no-speech-api' | null;
}

export function getVoiceEnvironment(): VoiceEnvironment {
  if (typeof window === 'undefined') {
    return {
      secureContext: true,
      hostname: '',
      isLocalhost: true,
      isLanIp: false,
      speechApiAvailable: false,
      canUseMic: false,
      blockReason: null,
    };
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  const isLanIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  const secureContext = window.isSecureContext;
  const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  const speechApiAvailable = Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);

  let blockReason: VoiceEnvironment['blockReason'] = null;
  if (!secureContext && isLanIp) blockReason = 'lan-http';
  else if (!secureContext) blockReason = 'insecure';
  else if (!speechApiAvailable) blockReason = 'no-speech-api';

  return {
    secureContext,
    hostname,
    isLocalhost,
    isLanIp,
    speechApiAvailable,
    canUseMic: secureContext || isLocalhost,
    blockReason,
  };
}

export function voiceBlockMessage(blockReason: VoiceEnvironment['blockReason'], lang: 'ar' | 'en'): string | null {
  if (!blockReason) return null;

  if (blockReason === 'lan-http') {
    return lang === 'ar'
      ? 'أنت تفتح التطبيق من الهاتف عبر http://192.168… — المتصفح يمنع التعرف على الصوت بدون HTTPS. الحل: شغّل npm run dev:https ثم افتح https://IP-الحاسوب:3000 أو اكتب الأرقام في الحقول أدناه.'
      : 'You opened the app from your phone via http://192.168… — browsers block speech without HTTPS. Run npm run dev:https and open https://your-PC-IP:3000, or type numbers below.';
  }

  if (blockReason === 'insecure') {
    return lang === 'ar'
      ? 'هذا الموقع غير آمن (HTTP). التعرف على الصوت يعمل فقط على localhost أو HTTPS.'
      : 'This site is not secure (HTTP). Speech recognition only works on localhost or HTTPS.';
  }

  return lang === 'ar'
    ? 'المتصفح لا يدعم التعرف على الصوت — استخدم Chrome أو اكتب الأرقام يدوياً.'
    : 'Browser does not support speech recognition — use Chrome or type numbers manually.';
}
