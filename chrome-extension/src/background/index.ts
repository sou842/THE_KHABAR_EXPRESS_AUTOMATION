import { Executor } from './agent/executor';
import { BrowserContext } from './browser/context';
import { userMemoryStore } from '@extension/storage';

console.log('--- PromptBridge Background Loading ---');

let currentExecutor: Executor | null = null;
let currentPort: chrome.runtime.Port | null = null;
const browserContext = new BrowserContext();

/**
 * Initialize on install
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] PromptBridge installed');

  // Initialize user memory if not exists
  const memory = await userMemoryStore.get();
  if (!memory.name && !memory.email) {
    await userMemoryStore.set({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      city: '',
      country: '',
      zipcode: ''
    });
  }
});

/**
 * Configure side panel behavior
 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Background] Side panel error:', error));

/**
 * Open side panel when clicking the action button
 */
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

/**
 * Handle side panel connection
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'side-panel-connection') {
    console.log('[Background] Side panel connected');
    currentPort = port;

    port.onMessage.addListener(async (message) => {
      try {
        console.log('[Background] Received message:', message.type);

        switch (message.type) {
          case 'heartbeat':
            port.postMessage({ type: 'heartbeat_ack' });
            break;

          case 'new_task': {
            if (!message.task || !message.tabId) {
              return port.postMessage({ 
                type: 'error', 
                error: 'Missing task or tabId' 
              });
            }

            console.log('[Background] Starting new task:', message.task);

            // Notify start
            port.postMessage({
              type: 'status_update',
              status: {
                status: 'analyzing',
                message: 'Analyzing page and understanding command...'
              }
            });

            // Create and execute
            currentExecutor = new Executor(message.task, message.tabId, browserContext, message.title);
            
            port.postMessage({
              type: 'status_update',
              status: {
                status: 'thinking',
                message: 'AI is planning the actions...'
              }
            });

            const result = await currentExecutor.execute();
            
            console.log('[Background] Task complete:', result);

            port.postMessage({ 
              type: 'task_complete', 
              result 
            });
            break;
          }

          case 'cancel_task': {
            if (currentExecutor) {
              await currentExecutor.cancel();
              port.postMessage({ type: 'task_cancelled' });
            }
            break;
          }

          case 'get_user_memory': {
            const memory = await userMemoryStore.get();
            port.postMessage({ type: 'user_memory', memory });
            break;
          }

          case 'update_user_memory': {
            await userMemoryStore.set(message.memory);
            port.postMessage({ type: 'user_memory_updated' });
            break;
          }

          default:
            port.postMessage({ 
              type: 'error', 
              error: `Unknown message type: ${message.type}` 
            });
        }
      } catch (error) {
        console.error('[Background] Error handling port message:', error);
        port.postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[Background] Side panel disconnected');
      currentPort = null;
      currentExecutor?.cancel();
    });
  }
});

/**
 * Handle one-time messages (fallback)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received one-time message:', message.type);
  
  // Handle any legacy messages here if needed
  sendResponse({ received: true });
  return true;
});

// Hot reload for development
if ((import.meta as any).env?.DEV) {
  console.log('[Background] Development mode detected, connecting to hot reload server...');
  const ws = new WebSocket('ws://localhost:3333');
  ws.onmessage = (event) => {
    if (event.data === 'reload') {
      console.log('[Background] Received reload signal, reloading extension...');
      chrome.runtime.reload();
    }
  };
  ws.onerror = (error) => {
    console.error('[Background] Hot reload server disconnected or error:', error);
  };
}

console.log('[Background] PromptBridge background service worker ready');
