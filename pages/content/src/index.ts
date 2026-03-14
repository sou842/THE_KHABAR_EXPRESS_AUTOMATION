// PromptBridge - Content Script
// This is a TypeScript wrapper that imports the existing content.js logic

import { CONFIG } from '@extension/shared';

console.log('[Content] PromptBridge content script loading...');

// Inject styles
function injectStyles() {
  if (document.getElementById(CONFIG.highlights.styleId)) return;

  const style = document.createElement('style');
  style.id = CONFIG.highlights.styleId;
  style.innerHTML = `
    .${CONFIG.highlights.className} {
      outline: 3px solid #6366f1 !important;
      outline-offset: 2px !important;
      border-radius: 6px !important;
      background-color: rgba(99,102,241,0.08) !important;
      box-shadow: 0 0 20px rgba(99,102,241,0.3) !important;
      transition: all 0.2s ease;
    }
    .${CONFIG.highlights.className}-success {
      outline: 3px solid #10b981 !important;
      background-color: rgba(16,185,129,0.08) !important;
      box-shadow: 0 0 20px rgba(16,185,129,0.3) !important;
    }
    .${CONFIG.highlights.className}-error {
      outline: 3px solid #ef4444 !important;
      background-color: rgba(239,68,68,0.08) !important;
      box-shadow: 0 0 20px rgba(239,68,68,0.3) !important;
    }
    .minibot-alert-overlay {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #111827;
      border: 1px solid #1f2937;
      border-left: 4px solid #6366f1;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.2);
      border-radius: 8px;
      padding: 16px;
      width: 350px;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      animation: minibot-slide-in 0.3s ease-out forwards;
      display: flex;
      flex-direction: column;
      gap: 12px;
      color: #f3f4f6;
    }
    .minibot-alert-header {
      font-weight: 600;
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .minibot-alert-body {
      color: #9ca3af;
      font-size: 14px;
      line-height: 1.5;
      max-height: 250px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
    .minibot-alert-btn {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      align-self: flex-end;
      transition: background 0.2s;
    }
    .minibot-alert-btn:hover { background: #4338ca; }
    @keyframes minibot-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

function showCustomAlert(title: string, message: string) {
  const overlay = document.createElement('div');
  overlay.className = 'minibot-alert-overlay';
  
  const header = document.createElement('div');
  header.className = 'minibot-alert-header';
  header.textContent = title;
  
  const body = document.createElement('div');
  body.className = 'minibot-alert-body';
  body.textContent = message;
  
  const btn = document.createElement('button');
  btn.className = 'minibot-alert-btn';
  btn.textContent = 'Dismiss';
  btn.onclick = () => overlay.remove();
  
  overlay.appendChild(header);
  overlay.appendChild(body);
  overlay.appendChild(btn);
  document.body.appendChild(overlay);
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep channel open for async
});

async function handleMessage(message: any, sender: any, sendResponse: any) {
  try {
    console.log('[Content] Received message:', message.type);

    switch (message.type) {
      case 'EXECUTE_ACTION':
        const result = await executeAction(message.payload);
        sendResponse(result);
        break;

      case 'EXECUTE_ACTION_PLAN':
        executeActionPlan(message.payload.actions, message.payload.reasoning);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[Content] Error handling message:', error);
    sendResponse({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

async function executeAction(action: any): Promise<any> {
  console.log('[Content] Executing action:', action);
  
  // For now, we only handle our chat injection actions
  switch (action.action) {
    case 'inject_chat_text': {
      console.log('[Content] Attempting to inject chat text:', action.text);
      const text = action.text;
      if (!text) return { success: false, error: 'No text provided to inject' };

      // Helper to find the input element
      const findInput = () => {
        const textAreas = Array.from(document.querySelectorAll('textarea')) as HTMLTextAreaElement[];
        const contentEditables = Array.from(document.querySelectorAll('div[contenteditable], div[role="textbox"]')) as HTMLElement[];

        let inputEl = textAreas.find(el => 
          el.id === 'prompt-textarea' || 
          el.name === 'prompt-textarea' || 
          el.classList.contains('wcDTda_fallbackTextarea') || 
          el.dataset.virtualkeyboard === 'true' ||
          (el.placeholder || '').toLowerCase().includes('ask anything')
        );

        if (!inputEl) {
          inputEl = textAreas.find(el => {
            const ph = (el.placeholder || '').toLowerCase();
            return ph.includes('message') || ph.includes('ask') || ph.includes('prompt') || ph.includes('chat') || ph.includes('type');
          });
        }

        let editableContent = contentEditables.find(el => 
          el.dataset.testid === 'chat-input' || 
          el.classList.contains('ProseMirror') ||
          (el.getAttribute('aria-label') || '').toLowerCase().includes('prompt') ||
          (el.getAttribute('aria-label') || '').toLowerCase().includes('ask') ||
          (el.getAttribute('aria-label') || '').toLowerCase().includes('message')
        );

        return { 
          target: editableContent || inputEl, 
          inputEl, 
          editableContent,
          taCount: textAreas.length,
          ceCount: contentEditables.length
        };
      };

      // Poll for up to 5 seconds to find the input (handles slow SPAs and page loads)
      let found = findInput();
      let retries = 0;
      
      while (!found.target && retries < 10) {
        console.log(`[Content] Input not found, retrying... (${retries + 1}/10)`);
        await new Promise(r => setTimeout(r, 500));
        found = findInput();
        retries++;
      }

      if (!found.target) {
         console.error('[Content] Could not find chat input box after retries.');
         return { 
           success: false, 
           error: `Could not find a supported chat input on this page. (Scanned ${found.taCount} textareas and ${found.ceCount} editables). Try clicking inside the chat box manually first.` 
         };
      }

      const targetEl = found.target;
      const inputEl = found.inputEl;
      const editableContent = found.editableContent;

      console.log('[Content] Found chat input element:', targetEl);

      // 2. Inject text appropriately
      if (targetEl === inputEl) {
        // Native Textarea (ChatGPT) - Use React value setter hack to ensure state updates
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (nativeTextAreaValueSetter) {
            nativeTextAreaValueSetter.call(inputEl, text);
        } else {
            inputEl.value = text;
        }

        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Try clicking next sibling button (Send button convention)
        const form = inputEl.closest('form');
        setTimeout(() => {
          if (form) {
              const submitBtn = form.querySelector('button[type="submit"], button[data-testid="send-button"], button[aria-label*="send" i]');
              if (submitBtn && !(submitBtn as HTMLButtonElement).disabled) {
                 console.log('[Content] Clicking submit button:', submitBtn);
                 (submitBtn as HTMLElement).click();
              } else {
                 console.log('[Content] Submit button disabled or not found, dispatching Enter key');
                 inputEl?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
              }
          } else {
              // Dispatch Enter key if no form
              inputEl?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          }
        }, 100);
      } else if (targetEl === editableContent) {
        // ContentEditable (Claude / ProseMirror)
        console.log('[Content] Injecting into contenteditable');
        editableContent.focus();
        
        // Use document.execCommand for robust ProseMirror text injection
        document.execCommand('selectAll', false, undefined);
        document.execCommand('delete', false, undefined);
        document.execCommand('insertText', false, text);
        
        // Dispatch React Input Events
        editableContent.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Dispatch specific Enter key press for tip-tap/prosemirror
        setTimeout(() => {
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            editableContent?.dispatchEvent(enterEvent);
            
            // Fallback: Claude sometimes uses a button outside the editable div
            if (!enterEvent.defaultPrevented) {
                const nearestButton = document.querySelector('button[aria-label*="Send" i]');
                if (nearestButton && !(nearestButton as HTMLButtonElement).disabled) {
                    (nearestButton as HTMLElement).click();
                }
            }
        }, 100);
      }

      return { success: true, message: 'Text injected successfully' };
    }

    case 'wait_for_chat_response': {
      console.log('[Content] Waiting for chat response...');
      return new Promise((resolve) => {
        // Wait 2.5 seconds to allow the user's message to render.
        setTimeout(() => {
          const getCopyButtons = () => {
            // Priority 1: Exact matches provided by user for Claude and ChatGPT
            const exactMatches = Array.from(document.querySelectorAll('button[data-testid="action-bar-copy"], button[data-testid="copy-turn-action-button"]'));
            if (exactMatches.length > 0) return exactMatches;

            // Priority 2: Broad attribute search
            const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
            return buttons.filter(btn => {
                const attrs = [
                    btn.getAttribute('aria-label'),
                    btn.getAttribute('title'),
                    btn.getAttribute('data-testid')
                ].map(a => (a || '').toLowerCase());
                
                if (attrs.some(a => a.includes('copy'))) return true;
                
                const innerSVG = btn.querySelector('svg');
                if (innerSVG) {
                    const title = innerSVG.querySelector('title');
                    if (title && title.textContent?.toLowerCase().includes('copy')) return true;
                }
                
                return false;
            });
          };
          
          let initialCount = getCopyButtons().length;
          console.log('[Content] Initial copy buttons count (after 2.5s delay):', initialCount);
          
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            const currentButtons = getCopyButtons();
            // Claude sometimes removes and re-adds elements, so we look for any *new* button
            // But checking length is generally safe since new messages append to the DOM
            const currentCount = currentButtons.length;
            
            console.log(`[Content] Polling... (attempt ${attempts}), count: ${currentCount}`);
            
            if (currentCount > initialCount) {
              clearInterval(interval);
              const newButton = currentButtons[currentButtons.length - 1]; // get the latest one
              console.log('[Content] Found new copy button, clicking...');
              
              // Force click by dispatching MouseEvent instead of just .click() to bypass some React swallows
              const clickEvent = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
              newButton.dispatchEvent(clickEvent);
              
              if (!clickEvent.defaultPrevented) {
                  (newButton as HTMLElement).click();
              }
              
              // Now read clipboard and alert
              setTimeout(async () => {
                let responseText = '';
                try {
                  responseText = await navigator.clipboard.readText();
                  showCustomAlert("AI Response Ready", responseText);
                  resolve({ success: true, message: 'Response extracted from clipboard', responseText });
                } catch (e) {
                  // Fallback: get text by traversing up from the copy button
                  console.error('[Content] Failed to read clipboard, executing fallback extraction', e);
                  
                  // Try to find the closest message container by typical classes
                  let parentDiv = newButton.closest('[data-message-author-role="assistant"], .font-claude-message, .prose, .agent-turn, [data-testid="chat-message"]');
                  
                  // If not found, traverse up to 8 levels
                  if (!parentDiv) {
                      parentDiv = newButton;
                      for (let i = 0; i < 8; i++) {
                         if (parentDiv.parentElement) parentDiv = parentDiv.parentElement;
                         if (parentDiv.textContent && parentDiv.textContent.length > 300) break; // found a potentially good container
                      }
                  }
                  
                  // Try to smartly extract innerText to preserve spacing/newlines
                  responseText = parentDiv ? (parentDiv as HTMLElement).innerText || parentDiv.textContent || '' : 'Could not copy response.';
                  
                  showCustomAlert("AI Response (Fallback Mode)", responseText);
                  resolve({ success: true, message: 'Copied to clipboard but could not read natively, using fallback text.', responseText });
                }
              }, 800); // Give the browser time to write the copy event
            } else if (attempts > 60) { // 60 * 5s = 300s (5 minutes)
              clearInterval(interval);
              showCustomAlert("Timeout", "Timed out waiting for response from AI.");
              resolve({ success: false, error: 'Timed out waiting for response' });
            }
          }, 5000); // Check every 5 seconds as requested
        }, 2500);
      });
    }

    default:
      console.warn('[Content] Unknown action type:', action.action);
      return { success: false, error: `Unknown action: ${action.action}` };
  }
}

async function executeActionPlan(actions: any[], reasoning: string) {
  console.log('[Content] Executing action plan:', actions.length, 'actions');
  
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    
    try {
      await executeAction(action);
      await new Promise(resolve => setTimeout(resolve, CONFIG.delays.betweenActions));
    } catch (error) {
      console.error('[Content] Action failed:', action, error);
    }
  }
  
  console.log('[Content] Action plan complete');
}

// Initialize
injectStyles();
console.log('[Content] PromptBridge content script ready');
