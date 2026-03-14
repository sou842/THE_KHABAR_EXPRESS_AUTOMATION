import type { BrowserContext as IBrowserContext } from '@extension/shared';
import { userMemoryStore } from '@extension/storage';

export class BrowserContext {
  private currentTabId: number | null = null;

  async getState(tabId: number): Promise<IBrowserContext> {
    this.currentTabId = tabId;
    const tab = await chrome.tabs.get(tabId);
    
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'GET_FULL_CONTEXT'
      });

      const userMemory = await userMemoryStore.get();

      return {
        url: tab.url || '',
        title: tab.title || '',
        formFields: response.formFields || [],
        pageText: response.pageText || '',
        elementTree: response.elementTree,
        visibleButtons: response.visibleButtons || [],
        visibleLinks: response.visibleLinks || []
      };
    } catch (error) {
      console.error('[BrowserContext] Failed to get page context:', error);
      return {
        url: tab.url || '',
        title: tab.title || '',
        formFields: [],
        pageText: ''
      };
    }
  }

  async getCurrentPage(): Promise<number | null> {
    if (!this.currentTabId) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTabId = tabs[0]?.id || null;
    }
    return this.currentTabId;
  }
}
