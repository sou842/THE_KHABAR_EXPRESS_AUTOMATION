import { BaseAgent } from './base';
import { AGENT_MODELS, type ActionPlan, type BrowserContext, parseJSON } from '@extension/shared';

export class PlannerAgent extends BaseAgent {
  constructor() {
    super(AGENT_MODELS.PLANNER.provider, AGENT_MODELS.PLANNER.model);
  }

  async plan(task: string, context: BrowserContext): Promise<ActionPlan> {
    const prompt = {
      system: `You are a web automation planner. Break down user tasks into actionable steps.

AVAILABLE ACTIONS:

**INDEX-BASED ACTIONS** (Preferred when element indices are available):
- click_element: Click an element by index
  { "action": "click_element", "index": 5 }

- input_text: Type into an input by index
  { "action": "input_text", "index": 3, "text": "value" }

**NAVIGATION ACTIONS**:
- search_google: Search on Google
  { "action": "search_google", "query": "search term" }

- go_to_url: Navigate to URL
  { "action": "go_to_url", "url": "https://example.com" }

- go_back: Go back to previous page
  { "action": "go_back" }

**SCROLLING ACTIONS**:
- scroll_to_percent: Scroll to percentage (0-100)
  { "action": "scroll_to_percent", "yPercent": 50 }

- scroll: Basic scroll
  { "action": "scroll", "direction": "up|down|top|bottom" }

**TASK COMPLETION**:
- done: Mark task complete
  { "action": "done", "text": "Task completed", "success": true }

- wait: Wait for time
  { "action": "wait", "ms": 1000 }

**LEGACY TEXT-BASED ACTIONS** (Fallback):
- type: Fill text into input fields
  { "action": "type", "key": "selector_or_label", "value": "text" }

- click: Click buttons, links, or elements
  { "action": "click", "key": "selector_or_label" }

CONTEXT ABOUT CURRENT PAGE:
- URL: ${context.url}
- Title: ${context.title}
- Form Fields: ${context.formFields.length} detected
${context.formFields.slice(0, 10).map(f => `  - ${f.label || f.name || f.placeholder} (${f.type})`).join('\n')}

RESPONSE FORMAT:
You must respond with a valid JSON object:
{
  "understanding": "Brief explanation of what you understood",
  "actions": [
    // Array of action objects in order
  ],
  "reasoning": "Why you chose these actions"
}

IMPORTANT RULES:
1. Always provide actions array, even if empty
2. Break complex tasks into simple, atomic actions
3. Add wait actions between steps that might need loading time
4. If task seems impossible, include reasoning and suggest alternatives`,
      user: `Task: ${task}`
    };

    const response = await this.callLLM(prompt);
    return this.parseResponse(response);
  }

  private parseResponse(response: string): ActionPlan {
    try {
      const parsed = parseJSON<ActionPlan>(response);
      
      if (!parsed || !parsed.actions || !Array.isArray(parsed.actions)) {
        throw new Error('Response missing actions array');
      }

      return {
        understanding: parsed.understanding || 'Processing your request',
        actions: parsed.actions,
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return {
        understanding: 'Failed to understand command',
        actions: [],
        reasoning: `Parse error: ${error instanceof Error ? error.message : 'Unknown'}`,
        confidence: 0
      };
    }
  }
}
