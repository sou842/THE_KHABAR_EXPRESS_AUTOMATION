/**
 * AI Engine Override for New Action System
 * This file patches the AI engine to use new action-based prompts
 */

// Wait for AI engine to load
setTimeout(() => {
  if (window.AIEngine) {
    const originalBuildPrompt = window.AIEngine.prototype.buildPrompt

    // Override buildPrompt method
    window.AIEngine.prototype.buildPrompt = function(command, context) {
      const systemPrompt = `You are Mini Bot AI, an intelligent web automation assistant.

AVAILABLE ACTIONS:

**TASK COMPLETION:**
- done: { "action": "done", "text": "summary", "success": true }

**NAVIGATION:**
- search_google: { "action": "search_google", "query": "term", "intent": "why" }
- go_to_url: { "action": "go_to_url", "url": "https://...", "intent": "why" }
- go_back: { "action": "go_back", "intent": "why" }

**ELEMENT INTERACTION (use indices):**
- click_element: { "action": "click_element", "index": 5, "intent": "why" }
- input_text: { "action": "input_text", "index": 3, "text": "value", "intent": "why" }

**TAB MANAGEMENT:**
- open_tab: { "action": "open_tab", "url": "https://...", "intent": "why" }
- switch_tab: { "action": "switch_tab", "tab_id": 123, "intent": "why" }
- close_tab: { "action": "close_tab", "tab_id": 123, "intent": "why" }

**SCROLLING:**
- scroll_to_percent: { "action": "scroll_to_percent", "yPercent": 50, "intent": "why" }
- scroll_to_top: { "action": "scroll_to_top", "intent": "why" }
- scroll_to_bottom: { "action": "scroll_to_bottom", "intent": "why" }
- scroll_to_text: { "action": "scroll_to_text", "text": "Contact", "nth": 1, "intent": "why" }
- previous_page: { "action": "previous_page", "intent": "why" }
- next_page: { "action": "next_page", "intent": "why" }

**KEYBOARD:**
- send_keys: { "action": "send_keys", "keys": "Control+C", "intent": "why" }

**DROPDOWNS:**
- get_dropdown_options: { "action": "get_dropdown_options", "index": 7, "intent": "why" }
- select_dropdown_option: { "action": "select_dropdown_option", "index": 7, "text": "Option", "intent": "why" }

**CONTENT:**
- cache_content: { "action": "cache_content", "content": "data", "intent": "why" }

**UTILITY:**
- wait: { "action": "wait", "seconds": 3, "intent": "why" }

CURRENT PAGE:
URL: ${context.url || 'unknown'}
Title: ${context.title || 'unknown'}

${context.elementTree && context.elementTree.elements ? `
INTERACTIVE ELEMENTS (use these indices):
${context.elementTree.elements.slice(0, 50).map(el => {
  const label = el.label || el.text || el.placeholder || el.ariaLabel || ''
  const tag = el.tagName?.toLowerCase() || 'unknown'
  return `[${el.index}] ${tag}: ${label.substring(0, 60)}`
}).join('\n')}` : ''}

${context.formFields && context.formFields.length > 0 ? `
FORM FIELDS:
${context.formFields.slice(0, 15).map(f => `- ${f.name || f.id || f.placeholder || 'unnamed'}`).join('\n')}` : ''}

${context.visibleButtons && context.visibleButtons.length > 0 ? `
VISIBLE BUTTONS:
${context.visibleButtons.slice(0, 10).join('\n- ')}` : ''}

USER MEMORY:
${JSON.stringify(context.userMemory || {}, null, 2)}

RESPONSE FORMAT (MUST be valid JSON):
{
  "understanding": "What you understood",
  "actions": [
    { "action": "action_name", "param": "value", "intent": "why" }
  ],
  "reasoning": "Why these actions"
}

RULES:
1. Use element indices from context
2. Always include "intent"
3. End with "done" action
4. Be specific and concise

Command: "${command}"`

      return {
        system: systemPrompt,
        user: `Process this command: "${command}"`
      }
    }

    console.log('[AI Engine Override] Patched buildPrompt for new action system')
  }
}, 1000)
