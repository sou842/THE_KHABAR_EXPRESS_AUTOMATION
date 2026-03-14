import { BrowserContext } from '../browser/context';
import { Page } from '../browser/page';
import type { ExecutionResult } from '@extension/shared';
import { executionHistoryStore } from '@extension/storage';

export class Executor {
  private page: Page;
  private cancelled = false;

  constructor(
    private task: string,
    private tabId: number,
    private browserContext: BrowserContext,
    private title?: string
  ) {
    this.page = new Page(tabId);
  }

  async execute(): Promise<ExecutionResult> {
    try {
      console.log('[Executor] Starting task execution:', this.task);

      // Get browser context
      const context = await this.browserContext.getState(this.tabId);
      console.log('[Executor] Got browser context:', context.url);

      // Bypass Planner and generate an explicit ActionPlan for chat injection
      console.log('[Executor] Creating direct plan for chat injection...');
      const plan = {
        understanding: this.title 
          ? `Task: ${this.title}`
          : 'Executing chat injection for user input',
        actions: [
          { action: 'inject_chat_text', text: this.task },
          { action: 'wait_for_chat_response' }
        ],
        reasoning: 'Directly routing text to known chat input formats (ChatGPT/Claude) and waiting for a response',
        confidence: 1.0
      };
      console.log('[Executor] Plan created:', plan);

      if (this.cancelled) {
        return { success: false, cancelled: true };
      }

      // Execute actions via Page (which sends to content script)
      console.log('[Executor] Executing actions...');
      const results = [];
      let extractedText = '';

      for (let i = 0; i < plan.actions.length; i++) {
        if (this.cancelled) break;

        const action = plan.actions[i];
        console.log(`[Executor] Executing action ${i + 1}/${plan.actions.length}:`, action);

        try {
          const result = await this.page.executeAction(action);
          
          if (result && result.error) {
            console.error('[Executor] Action returned error:', result.error);
            results.push({ success: false, action, error: result.error });
            break; // Stop execution on failure
          }

          results.push({ success: true, action, result });
          
          if (action.action === 'wait_for_chat_response' && result && result.responseText) {
             extractedText = result.responseText;
          }
        } catch (error) {
          console.error('[Executor] Action threw exception:', error);
          results.push({
            success: false,
            action,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          break; // Stop execution on failure
        }
      }

      console.log('[Executor] Execution complete, saving to history...');

      // Save to history
      const isSuccess = results.every(r => r.success);
      const firstError = results.find(r => !r.success)?.error;

      let finalResultText = extractedText;
      if (extractedText) {
        try {
          // ── Robust JSON extraction ──────────────────────────────────────────
          // Handles: fenced blocks, bare `json\n` prefix, prose around JSON,
          // and literal newlines embedded inside JSON string values.

          /** Escape bare \n/\r inside JSON strings using a character-walk. */
          const fixNewlines = (s: string): string => {
            let out = '';
            let inStr = false;
            for (let i = 0; i < s.length; i++) {
              const ch = s[i];
              if (ch === '"') {
                // count preceding backslashes; even → real quote boundary
                let bs = 0, j = i - 1;
                while (j >= 0 && s[j] === '\\') { bs++; j--; }
                if (bs % 2 === 0) inStr = !inStr;
                out += ch;
              } else if (inStr && ch === '\n') {
                out += '\\n';
              } else if (inStr && ch === '\r') {
                out += '\\r';
              } else {
                out += ch;
              }
            }
            return out;
          };

          /** Try to parse `s` as valid JSON (object OR array). */
          const tryParse = (s: string): any | null => {
            for (const attempt of [s.trim(), fixNewlines(s.trim())]) {
              try { return JSON.parse(attempt); } catch { /* next */ }
            }
            return null;
          };

          /** Extract the JSON value (object `{}` or array `[]`) from raw text.
           *  Tries four strategies in order, stops at first success. */
          const extractJson = (raw: string): any | null => {
            const text = raw.trim();

            // Strategy 1: ```json ... ``` or ``` ... ``` fenced blocks
            const fence = /```(?:json)?\s*([\s\S]*?)```/gi;
            let m: RegExpExecArray | null;
            while ((m = fence.exec(text)) !== null) {
              const v = tryParse(m[1]);
              if (v !== null && typeof v === 'object') return v;
            }

            // Strategy 2: bare `json\n{...}` or `json\n[...]` prefix
            const bare = /\bjson\s*\n([\s\S]*)/i;
            const bm = text.match(bare);
            if (bm) {
              const v = tryParse(bm[1]);
              if (v !== null && typeof v === 'object') return v;
            }

            // Strategy 3: walk every `{` and `[` with nesting depth to find
            //             the largest valid JSON value in the text
            for (const open of ['{', '['] as const) {
              const close = open === '{' ? '}' : ']';
              let fromIdx = 0;
              while (true) {
                const s = text.indexOf(open, fromIdx);
                if (s === -1) break;
                let depth = 0, e = -1;
                for (let i = s; i < text.length; i++) {
                  if (text[i] === open) depth++;
                  else if (text[i] === close) { depth--; if (depth === 0) { e = i; break; } }
                }
                if (e !== -1) {
                  const v = tryParse(text.slice(s, e + 1));
                  if (v !== null && typeof v === 'object') return v;
                }
                fromIdx = s + 1;
              }
            }
            return null;
          };

          // Fix malformed markdown-style URLs → plain URLs
          // e.g. [https://example.com](https://example.com) → https://example.com
          const fixUrl = (str: string) =>
            str.replace(/\[https?:\/\/[^\]]*\]\((https?:\/\/[^)]*)\)/g, '$1');

          // Recursively walk and sanitize all string values in the object
          const fixObject = (obj: any): any => {
            if (typeof obj === 'string') return fixUrl(obj);
            if (Array.isArray(obj)) return obj.map(fixObject);
            if (obj !== null && typeof obj === 'object') {
              return Object.fromEntries(
                Object.entries(obj).map(([k, v]) => [k, fixObject(v)])
              );
            }
            return obj;
          };

          const data = extractJson(extractedText);
          if (data !== null) {
            const sanitized = fixObject(data);
            finalResultText = JSON.stringify(sanitized, null, 2);
            console.log('[Executor] Successfully sanitized response JSON.');
          } else {
            console.warn('[Executor] Could not extract JSON from response — using raw text.');
          }
        } catch (e) {
          console.error('[Executor] Sanitization threw unexpectedly:', e);
        }
      }

      // Parse the finalResultText into structured data we can post to the API
      let parsedBlogData: any = null;
      try {
        if (finalResultText) {
          parsedBlogData = JSON.parse(finalResultText);
        }
      } catch {
        // Not parseable JSON, skip API call
      }

      await executionHistoryStore.add({
        timestamp: Date.now(),
        command: this.task,
        url: context.url,
        actionPlan: plan as any,
        success: isSuccess,
        resultText: finalResultText || undefined,
        error: firstError,
      });

      // If we have a valid blog object, post it to the ingest API with up to 5 retries
      if (isSuccess && parsedBlogData) {
        const postToApi = async (retryCount = 0): Promise<void> => {
          try {
            console.log(`[Executor] Posting to ingest API (attempt ${retryCount + 1}/5)...`);
            const response = await fetch('https://www.thekhabarexpress.com/api/external/ingest-blog', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-token': 'fallback_development_token_change_me',
              },
              body: JSON.stringify(parsedBlogData),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`API returned ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('[Executor] Successfully ingested blog via API:', result);
          } catch (e) {
            console.error(`[Executor] API call failed (attempt ${retryCount + 1}):`, e);
            if (retryCount < 4) {
              // Wait 2 seconds between retries
              await new Promise(r => setTimeout(r, 2000));
              await postToApi(retryCount + 1);
            } else {
              console.error('[Executor] API call failed after 5 attempts. Giving up.');
            }
          }
        };

        // Fire and don't await — don't let API failures affect main result
        postToApi().catch(e => console.error('[Executor] Unhandled API error:', e));
      }

      return {
        success: isSuccess,
        plan,
        results
      };
    } catch (error) {
      console.error('[Executor] Execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cancel(): Promise<void> {
    console.log('[Executor] Cancelling execution');
    this.cancelled = true;
  }
}
