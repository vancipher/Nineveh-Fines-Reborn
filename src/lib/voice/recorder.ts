export interface RecordedClip {
  blob: Blob;
  filename: string;
}

function pickRecorderFormat(): { mimeType: string; filename: string } {
  const candidates = [
    { mimeType: 'audio/webm;codecs=opus', filename: 'clip.webm' },
    { mimeType: 'audio/webm', filename: 'clip.webm' },
    { mimeType: 'audio/mp4', filename: 'clip.m4a' },
    { mimeType: 'audio/aac', filename: 'clip.m4a' },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: '', filename: 'clip.webm' };
}

/**
 * Record a short audio clip (works on HTTPS / localhost; Safari uses mp4/m4a when needed).
 */
export async function recordAudioClip(seconds = 5): Promise<RecordedClip> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone not available');
  }

  const { mimeType, filename } = pickRecorderFormat();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      stream.getTracks().forEach((t) => t.stop());
      reject(new Error('Recording failed'));
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = recorder.mimeType || mimeType || 'audio/webm';
      resolve({ blob: new Blob(chunks, { type }), filename });
    };
    recorder.start();
    setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, seconds * 1000);
  });
}

export async function transcribeOnServer(
  audio: Blob,
  language: string,
  filename = 'clip.webm',
): Promise<{ text: string; provider: string }> {
  const form = new FormData();
  form.append('audio', audio, filename);
  form.append('language', language);

  const res = await fetch('/api/voice/transcribe', { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Transcription failed');
  return data;
}
