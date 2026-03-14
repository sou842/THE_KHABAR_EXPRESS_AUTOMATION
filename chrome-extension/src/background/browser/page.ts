export class Page {
  constructor(private tabId: number) {}

  async executeAction(action: any): Promise<any> {
    console.log('[Page] Executing action:', action);
    
    return await chrome.tabs.sendMessage(this.tabId, {
      type: 'EXECUTE_ACTION',
      payload: action
    });
  }

  async executeActionPlan(actions: any[], reasoning: string): Promise<any> {
    console.log('[Page] Executing action plan with', actions.length, 'actions');
    
    return await chrome.tabs.sendMessage(this.tabId, {
      type: 'EXECUTE_ACTION_PLAN',
      payload: { actions, reasoning }
    });
  }

  async takeScreenshot(): Promise<string> {
    return await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
  }

  async navigate(url: string): Promise<void> {
    await chrome.tabs.update(this.tabId, { url });
  }

  async reload(): Promise<void> {
    await chrome.tabs.reload(this.tabId);
  }

  async getInfo() {
    return await chrome.tabs.get(this.tabId);
  }
}
