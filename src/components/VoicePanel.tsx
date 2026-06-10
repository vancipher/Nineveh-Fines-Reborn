'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from './LangProvider';
import { t } from '@/lib/i18n';
import { createSttProvider, type SttLanguage } from '@/lib/voice/stt';
import { getVoiceEnvironment, voiceBlockMessage } from '@/lib/voice/environment';
import { recordAudioClip, transcribeOnServer } from '@/lib/voice/recorder';
import { parseStepValue, type ViolationSpeechRef, type VoiceStep } from '@/lib/voice/parser';
import { parseLocalizedNumber, sanitizeNumericInput } from '@/lib/numerals';
import { cn } from '@/lib/utils';

interface VoicePanelProps {
  voiceLanguage: SttLanguage;
  violations?: ViolationSpeechRef[];
  onParsed: (result: { violationIndex: number; count: number; amount: number; raw: string }) => void;
}

type WizardStep = VoiceStep | 'idle' | 'done';
type InputMode = 'manual' | 'live' | 'record';

const STEPS: VoiceStep[] = ['violation', 'count', 'amount'];

export function VoicePanel({ voiceLanguage, violations = [], onParsed }: VoicePanelProps) {
  const { lang } = useLang();
  const providerRef = useRef(createSttProvider());
  const activeStepRef = useRef<WizardStep>('idle');
  const inputModeRef = useRef<InputMode>('manual');
  const appliedRef = useRef(false);
  const stableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const violationsRef = useRef(violations);
  violationsRef.current = violations;
  const env = useMemo(() => getVoiceEnvironment(), []);
  const envWarning = voiceBlockMessage(env.blockReason, lang);

  function parseStep(text: string, step: VoiceStep) {
    return parseStepValue(text, step, step === 'violation' ? violationsRef.current : undefined);
  }

  const [serverSttAvailable, setServerSttAvailable] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('idle');
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  inputModeRef.current = inputMode;
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [liveFinal, setLiveFinal] = useState('');
  const [interimText, setInterimText] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [parsedPreview, setParsedPreview] = useState<number | null>(null);
  const [values, setValues] = useState<{ violation?: number; count?: number; amount?: number }>({});
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/voice/transcribe')
      .then((r) => r.json())
      .then((d) => setServerSttAvailable(Boolean(d.available)))
      .catch(() => setServerSttAvailable(false));
  }, []);

  const stepPrompt = useCallback(
    (step: VoiceStep) => {
      if (lang === 'ar') {
        if (step === 'violation') return 'الخطوة 1: رقم المخالفة أو اسمها (مثل: الإشارة الضوئية)';
        if (step === 'count') return 'الخطوة 2: عدد المخالفات';
        return 'الخطوة 3: المبلغ بالدينار';
      }
      if (step === 'violation') return 'Step 1: violation number or title (e.g. traffic light)';
      if (step === 'count') return 'Step 2: count of cases';
      return 'Step 3: amount in IQD';
    },
    [lang],
  );

  const stepLabel = (step: VoiceStep) => {
    if (step === 'violation') return t(lang, 'violation');
    if (step === 'count') return t(lang, 'count');
    return t(lang, 'amount');
  };

  function clearStableTimer() {
    if (stableTimerRef.current) {
      clearTimeout(stableTimerRef.current);
      stableTimerRef.current = null;
    }
  }

  function stopLiveRecognition() {
    clearStableTimer();
    providerRef.current.stop();
    setListening(false);
  }

  function resetWizard() {
    stopLiveRecognition();
    appliedRef.current = false;
    activeStepRef.current = 'idle';
    setWizardStep('idle');
    setListening(false);
    setRecording(false);
    setLiveFinal('');
    setInterimText('');
    setManualValue('');
    setParsedPreview(null);
    const empty = {};
    valuesRef.current = empty;
    setValues(empty);
    setError('');
    setMessage('');
    setInputMode('manual');
  }

  function advanceWithValue(step: VoiceStep, parsed: number) {
    setError('');
    const stepIdx = STEPS.indexOf(step);
    const nextValues = { ...valuesRef.current, [step]: parsed };
    valuesRef.current = nextValues;
    setValues(nextValues);

    if (stepIdx < STEPS.length - 1) {
      const next = STEPS[stepIdx + 1];
      activeStepRef.current = next;
      setMessage(lang === 'ar' ? `${stepLabel(step)}: ${parsed}` : `${stepLabel(step)}: ${parsed}`);
      setLiveFinal('');
      setInterimText('');
      setManualValue('');
      setParsedPreview(null);
      appliedRef.current = false;
      setWizardStep(next);
      setMessage(stepPrompt(next));
      if (inputModeRef.current === 'live') {
        setTimeout(() => startLiveListening(next), 350);
      }
      return;
    }

    onParsed({
      violationIndex: nextValues.violation!,
      count: nextValues.count!,
      amount: parsed,
      raw: `${nextValues.violation} / ${nextValues.count} / ${parsed}`,
    });
    activeStepRef.current = 'done';
    setWizardStep('done');
    stopLiveRecognition();
    setMessage(t(lang, 'parsed'));
  }

  function applyParsedStep(step: VoiceStep, text: string) {
    if (appliedRef.current) return false;
    if (parseStep(text, step) === null) return false;
    appliedRef.current = true;
    stopLiveRecognition();
    applyFinalStep(step, text);
    return true;
  }

  function applyFinalStep(step: VoiceStep, text: string) {
    const parsed = parseStep(text, step);
    setParsedPreview(parsed);
    if (parsed === null) {
      setError(
        lang === 'ar'
          ? 'لم أفهم الرقم — عدّله في الحقل أو أعد المحاولة'
          : 'Could not parse — edit the field or retry',
      );
      return false;
    }
    setManualValue(String(parsed));
    advanceWithValue(step, parsed);
    return true;
  }

  function submitManual() {
    if (wizardStep === 'idle' || wizardStep === 'done') return;
    stopLiveRecognition();
    const n = parseLocalizedNumber(sanitizeNumericInput(manualValue));
    if (!Number.isFinite(n)) {
      setError(lang === 'ar' ? 'أدخل رقماً صحيحاً' : 'Enter a valid number');
      return;
    }
    applyFinalStep(wizardStep, String(n));
  }

  function pickDefaultMode(): InputMode {
    if (env.blockReason) return serverSttAvailable && env.canUseMic ? 'record' : 'manual';
    if (env.speechApiAvailable && env.secureContext) return 'live';
    if (serverSttAvailable && env.canUseMic) return 'record';
    return 'manual';
  }

  function startWizard() {
    resetWizard();
    const mode = pickDefaultMode();
    setInputMode(mode);
    activeStepRef.current = 'violation';
    setWizardStep('violation');
    setMessage(stepPrompt('violation'));
    if (mode === 'live') void startLiveListening('violation');
  }

  function handleLiveResult(step: VoiceStep, transcript: string, isFinal: boolean) {
    const parsed = parseStep(transcript, step);
    setParsedPreview(parsed);

    if (isFinal && transcript.trim()) {
      applyParsedStep(step, transcript);
      return;
    }

    if (parsed !== null && transcript.trim()) {
      clearStableTimer();
      stableTimerRef.current = setTimeout(() => {
        if (!appliedRef.current && activeStepRef.current === step) {
          applyParsedStep(step, transcript);
        }
      }, 750);
    }
  }

  function startLiveListening(step: VoiceStep) {
    if (env.blockReason) {
      setError(envWarning ?? t(lang, 'noSpeech'));
      setInputMode(serverSttAvailable ? 'record' : 'manual');
      return;
    }

    stopLiveRecognition();
    appliedRef.current = false;
    activeStepRef.current = step;
    setWizardStep(step);
    setListening(true);
    setLiveFinal('');
    setInterimText('');
    setError('');
    setInputMode('live');
    setMessage(stepPrompt(step));

    providerRef.current.start({
      language: voiceLanguage,
      onResult: ({ transcript, finalText, interim, isFinal }) => {
        setLiveFinal(finalText || transcript);
        setInterimText(interim);
        handleLiveResult(step, transcript, isFinal);
      },
      onError: (msg, code) => {
        clearStableTimer();
        setListening(false);
        if (code === 'network' && serverSttAvailable) {
          setMessage(lang === 'ar' ? 'التعرف المباشر فشل — جرّب «تسجيل 5 ثوان»' : 'Live speech failed — try "Record 5 sec"');
          setInputMode('record');
          setError('');
          return;
        }
        if (code === 'no-speech') {
          setError(msg);
          return;
        }
        setError(msg);
        setInputMode('manual');
      },
      onEnd: ({ transcript }) => {
        clearStableTimer();
        setListening(false);
        if (appliedRef.current || activeStepRef.current !== step) return;
        if (transcript.trim()) {
          const parsed = parseStep(transcript, step);
          if (parsed !== null) applyParsedStep(step, transcript);
        }
      },
    });
  }

  async function startRecordListening(step: VoiceStep) {
    if (!env.canUseMic && !env.isLocalhost) {
      setError(envWarning ?? (lang === 'ar' ? 'الميكروفون يحتاج HTTPS' : 'Microphone requires HTTPS'));
      setInputMode('manual');
      return;
    }

    if (!serverSttAvailable) {
      setError(
        lang === 'ar'
          ? 'أضف GROQ_API_KEY في ملف .env (مجاني من groq.com) أو اكتب الرقم في الحقل'
          : 'Add GROQ_API_KEY to .env (free at groq.com) or type the number',
      );
      setInputMode('manual');
      return;
    }

    setWizardStep(step);
    setRecording(true);
    setLiveFinal('');
    setInterimText('');
    setError('');
    setInputMode('record');
    setMessage(lang === 'ar' ? 'تحدث الآن… (3 ثوان)' : 'Speak now… (3 seconds)');

    try {
      const { blob, filename } = await recordAudioClip(3);
      setMessage(lang === 'ar' ? 'جاري التحويل إلى نص…' : 'Transcribing…');
      const { text } = await transcribeOnServer(blob, voiceLanguage, filename);
      setLiveFinal(text);
      setParsedPreview(parseStep(text, step));
      if (text.trim()) applyFinalStep(step, text);
      else setError(lang === 'ar' ? 'لم يُسمع شيء — حاول مرة أخرى' : 'Nothing heard — try again');
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, 'error'));
      setInputMode('manual');
    } finally {
      setRecording(false);
    }
  }

  useEffect(() => () => {
    clearStableTimer();
    providerRef.current.stop();
  }, []);

  const activeStepIndex = wizardStep === 'idle' || wizardStep === 'done' ? -1 : STEPS.indexOf(wizardStep);
  const activeStep = wizardStep === 'idle' || wizardStep === 'done' ? null : wizardStep;

  return (
    <div className="card space-y-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800">{t(lang, 'voice')}</p>
        <p className="mt-1 text-xs text-slate-500">
          {lang === 'ar' ? '3 خطوات: مخالفة → عدد → مبلغ' : '3 steps: violation → count → amount'}
        </p>
      </div>

      {envWarning && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {envWarning}
        </div>
      )}

      {serverSttAvailable && (
        <p className="rounded-xl bg-green-50 px-3 py-2 text-center text-xs text-green-800">
          {lang === 'ar' ? 'التسجيل الصوتي عبر الخادم متاح (Groq)' : 'Server recording STT available (Groq)'}
        </p>
      )}

      <div className="flex justify-center gap-2">
        {STEPS.map((step, idx) => (
          <div
            key={step}
            className={cn(
              'flex min-w-[72px] flex-col items-center rounded-xl px-2 py-2 text-xs font-medium',
              activeStepIndex === idx && 'bg-brand-600 text-white',
              activeStepIndex > idx && 'bg-green-100 text-green-800',
              activeStepIndex < idx && activeStepIndex >= 0 && 'bg-slate-100 text-slate-500 dark:bg-dark-elevated dark:text-dark-muted',
              wizardStep === 'idle' && 'bg-slate-100 text-slate-500 dark:bg-dark-elevated dark:text-dark-muted',
              wizardStep === 'done' && 'bg-green-100 text-green-800',
            )}
          >
            <span>{idx + 1}</span>
            <span>{stepLabel(step)}</span>
            {values[step] !== undefined && <span className="font-bold">{values[step]}</span>}
          </div>
        ))}
      </div>

      {activeStep && (
        <p className="rounded-xl bg-brand-50 px-3 py-2 text-center text-sm text-brand-800 dark:bg-dark-elevated dark:text-dark-text">
          {stepPrompt(activeStep)}
        </p>
      )}

      {wizardStep === 'idle' || wizardStep === 'done' ? (
        <div className="flex justify-center">
          <button type="button" className="btn-primary px-8 py-3" onClick={startWizard}>
            {lang === 'ar' ? 'بدء الإدخال' : 'Start entry'}
          </button>
        </div>
      ) : (
        <>
          {/* Manual input — always works */}
          <div className="rounded-xl border-2 border-brand-200 bg-white p-4 dark:border-dark-border dark:bg-dark-surface">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {lang === 'ar' ? 'اكتب الرقم (يعمل دائماً)' : 'Type the number (always works)'}
            </label>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-center text-2xl font-bold"
                inputMode="numeric"
                pattern="[0-9]*"
                value={manualValue}
                onChange={(e) => {
                  setManualValue(e.target.value);
                  setParsedPreview(parseStep(e.target.value, activeStep!));
                }}
                placeholder={activeStep === 'amount' ? '200000' : activeStep === 'violation' ? '1–59' : '0'}
              />
              <button type="button" className="btn-primary shrink-0 px-6" onClick={submitManual}>
                {lang === 'ar' ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>

          {/* Voice buttons */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              {!env.blockReason && (
                <button
                  type="button"
                  className={cn('btn-secondary text-xs', inputMode === 'live' && listening && 'ring-2 ring-brand-500')}
                  disabled={listening || recording}
                  onClick={() => activeStep && startLiveListening(activeStep)}
                >
                  {lang === 'ar' ? 'صوت مباشر' : 'Live speech'}
                </button>
              )}
              <button
                type="button"
                className={cn('btn-secondary text-xs', recording && 'ring-2 ring-red-500')}
                disabled={listening || recording || !serverSttAvailable}
                onClick={() => activeStep && startRecordListening(activeStep)}
              >
                {recording
                  ? lang === 'ar'
                    ? 'جاري التسجيل…'
                    : 'Recording…'
                  : lang === 'ar'
                    ? 'تسجيل 3 ثوان'
                    : 'Record 3 sec'}
              </button>
            </div>

            {(listening || recording) && (
              <button type="button" className={cn('mic-btn', (listening || recording) && 'listening')} aria-hidden>
                <MicIcon />
              </button>
            )}
          </div>

          {/* Live transcript */}
          <div className="min-h-[64px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-start">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {listening
                ? lang === 'ar'
                  ? 'يسمع الآن (مباشر)'
                  : 'Live listening'
                : recording
                  ? lang === 'ar'
                    ? 'يسجّل…'
                    : 'Recording…'
                  : lang === 'ar'
                    ? 'آخر نص'
                    : 'Last heard'}
            </p>
            {liveFinal || interimText ? (
              <p className="text-base text-slate-800">
                <span>{liveFinal}</span>
                {interimText && <span className="text-slate-400 italic"> {interimText}</span>}
              </p>
            ) : (
              <p className="text-sm text-slate-400">{lang === 'ar' ? '…' : '…'}</p>
            )}
            {parsedPreview !== null && (
              <p className="mt-2 text-sm font-semibold text-green-700">
                {lang === 'ar' ? 'فهمت:' : 'Detected:'}{' '}
                {parsedPreview.toLocaleString(lang === 'ar' ? 'ar-IQ' : 'en-IQ')}
              </p>
            )}
          </div>
        </>
      )}

      {wizardStep === 'done' && (
        <button type="button" className="btn-secondary w-full" onClick={resetWizard}>
          {lang === 'ar' ? 'إدخال مخالفة أخرى' : 'Enter another violation'}
        </button>
      )}

      {message && <p className="text-center text-sm text-green-700">{message}</p>}
      {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
    </svg>
  );
}
