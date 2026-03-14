import Dexie, { type EntityTable } from 'dexie';

export interface ExecutionHistoryItem {
  timestamp: number;
  command: string;
  url: string;
  actionPlan?: any;
  success: boolean | null;
  resultText?: string;
  error?: string;
}

class HistoryDatabase extends Dexie {
  history!: EntityTable<ExecutionHistoryItem, 'timestamp'>;
  constructor() {
    super('PromptBridgeDB');
    this.version(1).stores({
      history: 'timestamp' // timestamp is the primary key
    });
  }
}

const db = new HistoryDatabase();

let isMigrated = false;
async function migrateFromChromeStorage() {
  if (isMigrated) return;
  const result = await chrome.storage.local.get(['executionHistory']);
  if (result.executionHistory && result.executionHistory.length > 0) {
    try {
      await db.history.bulkPut(result.executionHistory);
      await chrome.storage.local.remove(['executionHistory']);
    } catch (e) {
      console.error('Failed to migrate old history:', e);
    }
  }
  isMigrated = true;
}

export const executionHistoryStore = {
  async get(): Promise<ExecutionHistoryItem[]> {
    await migrateFromChromeStorage();
    return db.history.orderBy('timestamp').toArray();
  },

  async add(item: ExecutionHistoryItem): Promise<void> {
    await migrateFromChromeStorage();
    await db.history.put(item);
  },

  async clear(): Promise<void> {
    await db.history.clear();
  },

  async delete(timestamp: number): Promise<void> {
    await db.history.delete(timestamp);
  }
};
