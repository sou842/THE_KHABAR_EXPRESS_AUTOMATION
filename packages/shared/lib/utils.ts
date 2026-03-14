export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function parseJSON<T>(text: string): T | null {
  try {
    // Extract JSON from markdown code blocks if present
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonText = codeBlockMatch ? codeBlockMatch[1] : text;
    
    return JSON.parse(jsonText) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

export function sanitizeSelector(selector: string): string {
  // Remove potentially dangerous characters from selectors
  return selector.replace(/[<>'"]/g, '');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
