import React, { useRef, forwardRef, useState } from 'react';
import { Send, ImagePlus, FileText, X, Mic, Keyboard, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IMAGE_ACCEPT, DOC_ACCEPT } from '../../hooks/useFileUpload';
import type { PendingFile } from '../../types/chat';
import { tw } from '../../themes';
import type { VoiceState } from '../../hooks/useVoiceInput';

type Variant = 'individual' | 'lawyer';

const variantStyles = {
  individual: {
    focus: tw.inputFocus,
    sendActive: tw.sendActive,
    sendDisabled: tw.sendDisabled,
  },
  lawyer: {
    focus: tw.inputFocus,
    sendActive: tw.sendActive,
    sendDisabled: tw.sendDisabled,
  },
};

/** 长按上滑多少像素进入"取消"区域 */
const CANCEL_THRESHOLD_PX = 80;

interface ChatInputProps {
  variant?: Variant;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  pendingFiles: PendingFile[];
  onAddFiles: (files: FileList | null, type: 'image' | 'document') => void;
  onRemoveFile: (index: number) => void;
  hint?: string;
  /** 语音输入状态（仅 recording / processing / error / idle） */
  voiceState?: VoiceState;
  /** 开始录音 */
  onVoiceStart?: () => void;
  /** 松开：停止录音并发送识别 */
  onVoiceStop?: () => void;
  /** 上滑取消：丢弃录音 */
  onVoiceCancel?: () => void;
}

const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(function ChatInput({
  variant = 'individual',
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = '描述您的问题',
  pendingFiles,
  onAddFiles,
  onRemoveFile,
  hint = '支持图片（jpg/png/gif/webp）与文档（pdf/doc/docx/txt/md）。AI 助手仅供参考。',
  voiceState,
  onVoiceStart,
  onVoiceStop,
  onVoiceCancel,
}, ref) {
  const styles = variantStyles[variant];
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [inCancelZone, setInCancelZone] = useState(false);

  const pressStartYRef = useRef(0);
  const isPressingRef = useRef(false);

  const isVoiceEnabled = !!(onVoiceStart && onVoiceStop && onVoiceCancel);
  const isRecording = voiceState === 'recording';
  const isProcessing = voiceState === 'processing';
  const isVoiceBusy = isRecording || isProcessing;

  const hasContent = value.trim() || pendingFiles.length > 0;
  const canSend = hasContent && !disabled && !isVoiceBusy;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // ── 长按手势处理 ──────────────────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isProcessing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isPressingRef.current = true;
    pressStartYRef.current = e.clientY;
    setInCancelZone(false);
    onVoiceStart?.();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPressingRef.current) return;
    setInCancelZone(e.clientY - pressStartYRef.current < -CANCEL_THRESHOLD_PX);
  };

  const handlePointerUp = () => {
    if (!isPressingRef.current) return;
    isPressingRef.current = false;
    const wasInCancel = inCancelZone;
    setInCancelZone(false);
    if (wasInCancel) {
      onVoiceCancel?.();
    } else {
      onVoiceStop?.();
    }
  };

  const handlePointerCancel = () => {
    if (!isPressingRef.current) return;
    isPressingRef.current = false;
    setInCancelZone(false);
    onVoiceCancel?.();
  };

  // 识别完成后（processing → idle）自动切回文字模式，方便用户确认 / 编辑
  // （由父组件在 onFinalResult 里调用 setInput 触发 re-render，
  //  这里无需额外监听，语音模式由用户自行切换）

  // ── 渲染 ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border-t border-slate-100">
      <div className="max-w-5xl mx-auto px-3 pt-3 pb-2">

        {/* 待上传文件预览 */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingFiles.map((p, i) => (
              <div
                key={i}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-2 py-1.5 text-sm',
                  p.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700'
                )}
              >
                {p.type === 'image' && p.previewUrl ? (
                  <img src={p.previewUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                ) : (
                  <FileText className="w-5 h-5 shrink-0 text-slate-500" />
                )}
                <span className="max-w-[120px] truncate">{p.file.name}</span>
                {p.error && <span className="text-xs">{p.error}</span>}
                <button
                  type="button"
                  onClick={() => onRemoveFile(i)}
                  className="p-0.5 rounded hover:bg-black/10"
                  aria-label="移除"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── 语音模式 ── */}
        {isVoiceMode ? (
          <div className="flex items-center justify-center gap-2 w-4/5 mx-auto">
            {/* 切回键盘 */}
            <button
              type="button"
              onClick={() => { if (!isVoiceBusy) setIsVoiceMode(false); }}
              disabled={isVoiceBusy}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-40"
              title="切换到键盘输入"
            >
              <Keyboard className="w-5 h-5" />
            </button>

            {/* 长按说话按钮 */}
            <div className="flex-1 relative select-none">
              {/* 上方提示浮层（仅录音时显示，识别中不显示避免重复） */}
              <button
                type="button"
                className={cn(
                  'w-full h-12 rounded-2xl font-medium text-sm select-none transition-all duration-150',
                  'flex items-center justify-center gap-2 touch-none',
                  isProcessing
                    ? 'bg-slate-100 text-slate-400 cursor-wait'
                    : inCancelZone
                      ? 'bg-red-500 text-white scale-[0.97]'
                      : isRecording
                        ? 'bg-blue-500 text-white scale-[0.98] shadow-md shadow-blue-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.98]'
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    识别中...
                  </>
                ) : isRecording ? (
                  <>
                    <span className="flex items-end gap-0.5 h-4">
                      {([10, 16, 12, 14, 8] as number[]).map((h, i) => (
                        <span
                          key={i}
                          className="w-0.5 bg-current rounded-full animate-bounce"
                          style={{ height: `${inCancelZone ? 6 : h}px`, animationDelay: `${i * 0.08}s` }}
                        />
                      ))}
                    </span>
                    <span>{inCancelZone ? '↑ 松开取消' : '松开发送 · 上滑取消'}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    按住说话
                  </>
                )}
              </button>
            </div>

            {/* 发送按钮（有内容时显示） */}
            {hasContent && (
              <button
                onClick={onSend}
                disabled={!canSend}
                className={cn(
                  'shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl transition-all',
                  canSend ? styles.sendActive : styles.sendDisabled
                )}
                title="发送"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>

        ) : (
          /* ── 文字模式 ── */
          <div className="flex items-end gap-2">
            {/* 切换到语音模式 */}
            {isVoiceEnabled && (
              <button
                type="button"
                onClick={() => setIsVoiceMode(true)}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100 transition-colors mb-0.5"
                title="切换到语音输入"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

            {/* 文字输入框 */}
            <div className="flex-1 relative">
              <input
                ref={imageInputRef}
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => onAddFiles(e.target.files, 'image')}
              />
              <input
                ref={docInputRef}
                type="file"
                accept={DOC_ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => onAddFiles(e.target.files, 'document')}
              />
              <textarea
                ref={ref}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={cn(
                  'w-full p-4 pr-24 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 transition-all resize-none min-h-[60px] max-h-[200px]',
                  variantStyles[variant].focus
                )}
                rows={1}
                disabled={disabled}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  title="上传图片"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  title="上传文档"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button
                  onClick={onSend}
                  disabled={!canSend}
                  className={cn(
                    'p-2 rounded-xl transition-all',
                    canSend ? styles.sendActive : styles.sendDisabled
                  )}
                  title="发送"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-center text-slate-400 pb-2">{hint}</p>
    </div>
  );
});

export default ChatInput;
