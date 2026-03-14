export interface UserMemory {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  country: string;
  zipcode: string;
}

const DEFAULT_USER_MEMORY: UserMemory = {
  name: '',
  email: '',
  phone: '',
  company: '',
  address: '',
  city: '',
  country: '',
  zipcode: ''
};

export const userMemoryStore = {
  async get(): Promise<UserMemory> {
    const result = await chrome.storage.local.get(['userMemory']);
    return result.userMemory || DEFAULT_USER_MEMORY;
  },

  async set(memory: Partial<UserMemory>): Promise<void> {
    const current = await this.get();
    await chrome.storage.local.set({ 
      userMemory: { ...current, ...memory } 
    });
  },

  async clear(): Promise<void> {
    await chrome.storage.local.set({ userMemory: DEFAULT_USER_MEMORY });
  }
};
