/**
 * 用户端 Hub SSE：订阅 GET /api/v1/user/events?session_id=
 * 与 proactive push 共用 Redis 频道；创作者更新 verified 时推送 type=session_verified。
 * 使用 fetch + ReadableStream（EventSource 无法携带 X-API-Key）。
 */
import { getApiUrl, WORKSPACE_CODE } from '../config/api';
import { getApiKey } from '../lib/authStorage';

const SESSION_VERIFIED_TYPE = 'session_verified';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 从 SSE 文本块中提取 data: 行合并后的字符串 */
function extractSseData(block: string): string | null {
  const lines = block.split('\n');
  const parts: string[] = [];
  for (const line of lines) {
    if (line.startsWith('data:')) {
      parts.push(line.slice(5).trimStart());
    }
  }
  if (parts.length === 0) return null;
  return parts.join('\n');
}

export interface SubscribeUserHubSessionOptions {
  /** 当前群聊会话数字 id（与 URL 一致） */
  sessionId: string;
  /** 收到创作者对 verified 的更新 */
  onSessionVerified: (verified: boolean) => void;
}

/**
 * 建立长连接并在收到 session_verified 事件时回调；断线后自动重连。
 * @returns 取消订阅（中止连接并停止重连）
 */
export function subscribeUserHubSessionEvents(options: SubscribeUserHubSessionOptions): () => void {
  const { sessionId, onSessionVerified } = options;
  let stopped = false;
  let abort: AbortController | null = null;

  const run = async () => {
    while (!stopped) {
      const apiKey = getApiKey();
      if (!apiKey) {
        await sleep(2000);
        continue;
      }

      abort = new AbortController();
      try {
        const url = getApiUrl(
          `/api/v1/user/events?session_id=${encodeURIComponent(sessionId)}`
        );
        const headers: Record<string, string> = {
          Accept: 'text/event-stream',
          'X-API-Key': apiKey,
        };
        const ws = WORKSPACE_CODE?.trim();
        if (ws) headers['X-Workspace-Code'] = ws;

        const res = await fetch(url, {
          method: 'GET',
          headers,
          signal: abort.signal,
        });
        if (!res.ok) {
          throw new Error(`events HTTP ${res.status}`);
        }
        const reader = res.body?.getReader();
        if (!reader) throw new Error('events: no body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          for (;;) {
            const sep = buffer.indexOf('\n\n');
            if (sep < 0) break;
            const block = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);

            const raw = extractSseData(block);
            if (!raw?.trim()) continue;
            try {
              const obj = JSON.parse(raw) as Record<string, unknown>;
              if (
                obj.type === SESSION_VERIFIED_TYPE &&
                typeof obj.verified === 'boolean'
              ) {
                const sid = obj.session_id;
                if (sid != null && String(sid) !== sessionId) continue;
                onSessionVerified(obj.verified);
              }
            } catch {
              /* 非 JSON 或无关事件 */
            }
          }
        }
      } catch (e) {
        if (stopped || (e instanceof DOMException && e.name === 'AbortError')) {
          return;
        }
      } finally {
        abort = null;
      }

      if (!stopped) {
        await sleep(2500);
      }
    }
  };

  void run();

  return () => {
    stopped = true;
    abort?.abort();
  };
}
