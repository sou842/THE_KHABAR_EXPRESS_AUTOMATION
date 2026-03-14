// API configuration - Sensitive keys should be moved to environment variables
export const API_CONFIG = {
  GEMINI: {
    key: '', // Replace with your Gemini API key or use process.env
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    model: 'gemini-2.5-flash-lite'
  },
  OPENAI: {
    key: '', // Replace with your OpenAI API key or use process.env
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  }
} as const;

export const AGENT_MODELS = {
  PLANNER: {
    provider: 'gemini' as const,
    model: API_CONFIG.GEMINI.model
  },
  NAVIGATOR: {
    provider: 'openai' as const,
    model: API_CONFIG.OPENAI.model
  }
} as const;

export const CONFIG = {
  highlights: {
    className: 'mini-bot-highlight',
    styleId: 'mini-bot-styles'
  },
  delays: {
    fieldHighlight: 300,
    betweenActions: 400,
    scroll: 600,
    afterClick: 500,
    afterClear: 300,
    typing: { min: 35, max: 95 }
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 1000
  }
} as const;
