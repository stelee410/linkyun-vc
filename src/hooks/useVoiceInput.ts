import { useRef, useState, useCallback } from 'react';

/**
 * 语音输入状态机：
 *   idle → (长按) → recording → (松手) → processing → idle
 *              ↘ (上滑取消) → idle
 */
export type VoiceState = 'idle' | 'recording' | 'processing' | 'error';

interface UseVoiceInputOptions {
  /** 豆包大模型录音文件极速版识别 APP ID */
  appId?: string;
  /** 豆包大模型录音文件极速版识别 Access Token */
  accessToken?: string;
  /** 对话框现有文字，可供日后扩展（prompt 字段） */
  contextText?: string;
  onFinalResult: (text: string) => void;
  onError?: (message: string) => void;
}

export interface UseVoiceInputReturn {
  state: VoiceState;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
}

const DOUBAO_ASR_URL =
  'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash';

// ── 音频工具函数 ───────────────────────────────────────────────────────────────

/**
 * 将任意浏览器录音 Blob 解码并重采样为 16kHz 单声道 PCM。
 * 使用 OfflineAudioContext，无需外部库。
 */
async function decodeToPCM16k(blob: Blob): Promise<Int16Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
  await decodeCtx.close();

  const targetRate = 16000;
  const numSamples = Math.ceil(audioBuffer.duration * targetRate);
  const offlineCtx = new OfflineAudioContext(1, numSamples, targetRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();

  const float32 = rendered.getChannelData(0);
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

/** PCM Int16 数据 → WAV Blob（添加 44 字节 RIFF/WAVE 文件头） */
function pcmToWav(pcm: Int16Array, sampleRate = 16000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);
  new Int16Array(buffer, 44).set(pcm);

  return new Blob([buffer], { type: 'audio/wav' });
}

/** Blob → base64 字符串（不含 data:...;base64, 前缀） */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useVoiceInput(options: UseVoiceInputOptions): UseVoiceInputReturn {
  const { appId, accessToken, onFinalResult, onError } = options;

  const [state, setState] = useState<VoiceState>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const cleanupRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return;
    cancelledRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      setState('error');
      onError?.(
        err instanceof Error && err.name === 'NotAllowedError'
          ? '未授权使用麦克风，请在浏览器设置中允许'
          : '获取麦克风失败',
      );
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.start(200);
    setState('recording');
  }, [state, onError]);

  const stopRecording = useCallback(() => {
    if (state !== 'recording') return;
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.onstop = async () => {
      if (cancelledRef.current) return;

      const chunks = chunksRef.current;
      chunksRef.current = [];
      if (chunks.length === 0) { setState('idle'); return; }

      setState('processing');

      const rawBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const abortCtrl = new AbortController();
      abortCtrlRef.current = abortCtrl;

      try {
        if (!appId || !accessToken) {
          throw new Error('未配置 VITE_DOUBAO_ASR_APP_ID / VITE_DOUBAO_ASR_ACCESS_TOKEN');
        }

        // 转换为豆包支持的 WAV 格式（16kHz 单声道）
        const pcm = await decodeToPCM16k(rawBlob);
        if (abortCtrl.signal.aborted) return;

        const wavBlob = pcmToWav(pcm);
        const base64Audio = await blobToBase64(wavBlob);
        if (abortCtrl.signal.aborted) return;

        const resp = await fetch(DOUBAO_ASR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-App-Key': appId,
            'X-Api-Access-Key': accessToken,
            'X-Api-Resource-Id': 'volc.bigasr.auc_turbo',
            'X-Api-Request-Id': crypto.randomUUID(),
            'X-Api-Sequence': '-1',
          },
          body: JSON.stringify({
            user: { uid: appId },
            audio: { data: base64Audio },
            request: { model_name: 'bigmodel' },
          }),
          signal: abortCtrl.signal,
        });

        // 豆包通过响应头返回状态码
        const statusCode = resp.headers.get('X-Api-Status-Code');
        if (statusCode === '20000003') {
          // 静音音频
          setState('idle');
          return;
        }
        if (statusCode && statusCode !== '20000000') {
          const msg = resp.headers.get('X-Api-Message') ?? '识别失败';
          throw new Error(`豆包 ASR 错误（${statusCode}）：${msg}`);
        }

        const data = await resp.json();
        const text: string = data?.result?.text ?? '';
        setState('idle');
        if (text) onFinalResult(text);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setState('idle');
          return;
        }
        // CORS 错误通常表现为 Failed to fetch
        const msg = (err as Error).message ?? '语音识别失败';
        setState('error');
        onError?.(msg.includes('Failed to fetch') ? '网络请求失败（可能是跨域限制），请联系管理员' : msg);
      } finally {
        abortCtrlRef.current = null;
      }
    };

    recorder.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }, [state, appId, accessToken, onFinalResult, onError]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    cleanupRecorder();
    setState('idle');
  }, [cleanupRecorder]);

  return { state, startRecording, stopRecording, cancelRecording };
}
