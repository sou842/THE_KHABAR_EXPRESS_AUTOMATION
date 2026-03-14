export interface AgentConfig {
  provider: 'gemini' | 'openai';
  model: string;
}

export interface ActionPlan {
  understanding: string;
  actions: Action[];
  reasoning: string;
  confidence?: number;
}

export interface Action {
  action: string;
  [key: string]: any;
}

export interface BrowserContext {
  url: string;
  title: string;
  formFields: FormField[];
  pageText: string;
  elementTree?: ElementTree;
  visibleButtons?: any[];
  visibleLinks?: any[];
}

export interface FormField {
  type: string;
  name?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  value?: string;
}

export interface ElementTree {
  elements: any[];
  count: number;
}

export interface ExecutionResult {
  success: boolean;
  plan?: ActionPlan;
  results?: any[];
  error?: string;
  cancelled?: boolean;
}

export interface Message {
  type: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  timestamp?: number;
}

export interface TaskStatus {
  status: 'idle' | 'analyzing' | 'thinking' | 'executing' | 'completed' | 'error';
  message: string;
  totalSteps?: number;
  currentStep?: number;
}
