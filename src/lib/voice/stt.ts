/**
 * Speech-to-text provider interface.
 * v1 uses the browser Web Speech API (free, online via Chrome/Edge/Safari).
 *
 * Cross-browser notes:
 *  - Chrome/Edge: support continuous + interimResults, work on HTTPS everywhere
 *  - Safari/iOS: only webkitSpeechRecognition (no unprefixed), does NOT support
 *    continuous=true reliably, no interimResults, no ar-IQ — must use ar-SA
 *  - Firefox: no Web Speech API at all → falls through to record mode
 */

export type SttLanguage = 'ar-IQ' | 'ar-SA' | 'en-US';

export interface SttStartOptions {
  language: SttLanguage;
  onResult: (payload: { transcript: string; finalText: string; interim: string; isFinal: boolean }) => void;
  onError: (message: string, code?: string) => void;
  onEnd?: (payload: { transcript: string }) => void;
}

export interface SttProvider {
  isSupported(): boolean;
  requestMicPermission(): Promise<boolean>;
  start(options: SttStartOptions): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognition;

/**
 * Returns true when running on Safari (macOS or iOS).
 * Safari only has the webkit-prefixed constructor; Chrome/Edge expose both.
 */
function isSafariEngine(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !w.SpeechRecognition && Boolean(w.webkitSpeechRecognition);
}

/**
 * Language fallbacks per preferred language.
 * On Safari, ar-IQ is not supported at all — start with ar-SA.
 */
function buildFallbacks(language: SttLanguage, safari: boolean): string[] {
  if (safari) {
    if (language.startsWith('ar')) return ['ar-SA', 'ar'];
    return ['en-US'];
  }
  if (language === 'ar-IQ') return ['ar-IQ', 'ar-SA', 'ar'];
  if (language === 'ar-SA') return ['ar-SA', 'ar'];
  return ['en-US'];
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function mapSpeechError(code: string, lang: 'ar' | 'en' = 'ar'): string {
  const ar: Record<string, string> = {
    network:
      'خطأ شبكة: تأكد من الإنترنت، أو استخدم زر «تسجيل 5 ثوان» أسفله.',
    'not-allowed': 'لم يُسمح بالميكروفون. اسمح بالوصول من شريط العنوان ثم أعد المحاولة.',
    'no-speech': 'لم يُسمع شيء. قرّب الميكروفون وتحدث بوضوح.',
    aborted: 'تم إيقاف الاستماع.',
    'audio-capture': 'لم يُعثر على ميكروفون.',
    'service-not-allowed': 'خدمة التعرف على الصوت غير متاحة في هذا المتصفح/الموقع.',
  };
  const en: Record<string, string> = {
    network: 'Network error — check your connection, or use "Record 5 sec" below.',
    'not-allowed': 'Microphone blocked. Allow access in the address bar and retry.',
    'no-speech': 'No speech detected. Speak closer to the mic.',
    aborted: 'Listening stopped.',
    'audio-capture': 'No microphone found.',
    'service-not-allowed': 'Speech service not allowed on this site/browser.',
  };
  const table = lang === 'ar' ? ar : en;
  return table[code] ?? (lang === 'ar' ? `خطأ في التعرف على الصوت: ${code}` : `Speech error: ${code}`);
}

export class WebSpeechSttProvider implements SttProvider {
  private recognition: SpeechRecognition | null = null;
  private langIndex = 0;
  private noSpeechRetries = 0;
  private emptyEndRetries = 0;
  private lastTranscript = '';
  private stopped = false;
  private safari = false;

  isSupported(): boolean {
    return getRecognitionCtor() !== null;
  }

  async requestMicPermission(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  start(options: SttStartOptions): void {
    this.langIndex = 0;
    this.noSpeechRetries = 0;
    this.emptyEndRetries = 0;
    this.lastTranscript = '';
    this.stopped = false;
    this.safari = isSafariEngine();
    void this.beginRecognition(options);
  }

  private async beginRecognition(options: SttStartOptions) {
    if (this.stopped) return;

    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      options.onError('Speech recognition is not supported. Use the "Record" button or type manually.');
      return;
    }

    const micOk = await this.requestMicPermission();
    if (!micOk) {
      options.onError(mapSpeechError('not-allowed'));
      return;
    }

    if (this.stopped) return;

    this.stopInternal();
    const recognition = new Ctor();
    const fallbacks = buildFallbacks(options.language, this.safari);
    recognition.lang = fallbacks[this.langIndex] ?? fallbacks[0];

    if (this.safari) {
      // Safari: single-shot mode only; continuous/interimResults cause failures
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
    } else {
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalText = '';
      for (let i = 0; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) finalText += piece;
        else interim += piece;
      }
      const transcript = (finalText + interim).trim();
      if (transcript) this.lastTranscript = transcript;
      options.onResult({
        transcript,
        finalText: finalText.trim(),
        interim: interim.trim(),
        isFinal: event.results[event.results.length - 1]?.isFinal ?? false,
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (this.stopped) return;
      const code = event.error || 'unknown';

      // Try next language fallback on network error
      if (code === 'network' && this.langIndex < fallbacks.length - 1) {
        this.langIndex += 1;
        setTimeout(() => void this.beginRecognition(options), 300);
        return;
      }

      // Retry once on transient no-speech
      if (code === 'no-speech' && this.noSpeechRetries < 1) {
        this.noSpeechRetries += 1;
        setTimeout(() => void this.beginRecognition(options), 200);
        return;
      }

      // Aborted during a restart — ignore
      if (code === 'aborted') return;

      options.onError(mapSpeechError(code), code);
    };

    recognition.onend = () => {
      if (this.stopped) {
        this.recognition = null;
        options.onEnd?.({ transcript: this.lastTranscript });
        return;
      }

      // Safari single-shot: recognition ends after each utterance.
      // If we got a transcript the caller will have already handled it.
      // If not, restart (up to 2 silent-end retries).
      if (!this.lastTranscript && this.emptyEndRetries < 2) {
        this.emptyEndRetries += 1;
        this.recognition = null;
        setTimeout(() => void this.beginRecognition(options), 250);
        return;
      }

      this.recognition = null;
      options.onEnd?.({ transcript: this.lastTranscript });
    };

    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      // Already started or other error — pass through as network
      options.onError(mapSpeechError('network'));
    }
  }

  stop(): void {
    this.stopped = true;
    this.stopInternal();
  }

  private stopInternal() {
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.stop();
      } catch {
        /* ignore */
      }
      this.recognition = null;
    }
  }
}

export function createSttProvider(): SttProvider {
  return new WebSpeechSttProvider();
}
