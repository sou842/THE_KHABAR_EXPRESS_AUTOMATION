import { API_CONFIG, type AgentConfig } from '@extension/shared';

export abstract class BaseAgent {
  protected provider: 'gemini' | 'openai';
  protected model: string;

  constructor(provider: 'gemini' | 'openai', model: string) {
    this.provider = provider;
    this.model = model;
  }

  protected async callLLM(prompt: { system: string; user: string }): Promise<string> {
    if (this.provider === 'gemini') {
      return await this.callGemini(prompt);
    } else {
      return await this.callOpenAI(prompt);
    }
  }

  private async callGemini(prompt: { system: string; user: string }): Promise<string> {
    const url = `${API_CONFIG.GEMINI.url}?key=${API_CONFIG.GEMINI.key}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${prompt.system}\n\n${prompt.user}` }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  private async callOpenAI(prompt: { system: string; user: string }): Promise<string> {
    const response = await fetch(API_CONFIG.OPENAI.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.OPENAI.key}`
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
