import React, { useState, useEffect, useRef } from 'react';
import { Settings, History, X, Send, Zap, Activity, ListTodo, Play, Square, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import type { Message, TaskStatus, ExecutionResult } from '@extension/shared';

// ─── Category Cycling ────────────────────────────────────────────────────────
const CATEGORIES = [
  'technology',
  'food',
  'politics',
  'business',
  'science',
  'health',
  'entertainment',
  'sports',
  'travel',
  'finance',
] as const;

type Category = typeof CATEGORIES[number];

// ─── refineToValidJSON ────────────────────────────────────────────────────────
// Multi-strategy JSON array extractor. Each strategy tries twice:
//   pass 1: raw text  |  pass 2: after fixing bare newlines inside strings
// Strategy order: fenced block → bare `json\n` prefix → bracket slice → walk
// Only accepts arrays of objects with news-like keys (rejects tag arrays etc).

/** Escape literal \n/\r characters that appear INSIDE JSON string values.
 *  Uses a character-walk that tracks whether we are currently inside a
 *  quoted string, correctly handling escaped quotes (\\"... is not a string boundary). */
function fixUnescapedNewlines(s: string): string {
  let result = '';
  let inString = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      // Count preceding backslashes — even number means the quote is real
      let backslashes = 0;
      let j = i - 1;
      while (j >= 0 && s[j] === '\\') { backslashes++; j--; }
      if (backslashes % 2 === 0) inString = !inString;
      result += ch;
    } else if (inString && ch === '\n') {
      result += '\\n';   // escape bare newline inside string
    } else if (inString && ch === '\r') {
      result += '\\r';   // escape bare CR inside string
    } else {
      result += ch;
    }
  }
  return result;
}

/** Accepts only arrays whose first item is an object with at least one
 *  expected news/article key — filters out tag arrays, string arrays, etc. */
function isNewsArray(v: any): v is any[] {
  if (!Array.isArray(v) || v.length === 0) return false;
  const first = v[0];
  if (typeof first !== 'object' || first === null) return false;
  return ['headline', 'title', 'summary', 'category', 'source', 'publishedDate']
    .some(k => k in first);
}

function refineToValidJSON(raw: string): any[] {
  const text = raw.trim();

  // Try parsing `s` raw first, then with newlines fixed; only accept news arrays
  const tryParse = (s: string): any[] | null => {
    for (const attempt of [s, fixUnescapedNewlines(s)]) {
      try {
        const v = JSON.parse(attempt.trim());
        if (isNewsArray(v)) return v;
      } catch { /* try next */ }
    }
    return null;
  };

  // ----- Strategy 1: Extract ALL ```json ... ``` or ``` ... ``` blocks ----
  const fencedJsonRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = fencedJsonRe.exec(text)) !== null) {
    const candidate = m[1].trim();
    const result = tryParse(candidate);
    if (result) return result;
  }

  // ----- Strategy 2: Look for bare `json\n[...]` segments -----------------
  // Handles: "json\n[{...}]" where there are no backtick fences.
  const bareJsonRe = /\bjson\s*\n(\[[\.\s\S]*?\])/gi;
  while ((m = bareJsonRe.exec(text)) !== null) {
    const result = tryParse(m[1].trim());
    if (result) return result;
  }

  // ----- Strategy 3: Bracket slice (first `[` … last `]`) -----------------
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    const result = tryParse(text.slice(start, end + 1));
    if (result) return result;
  }

  // ----- Strategy 4: Walk all `[` positions and try each slice ------------
  // Handles corrupted text where the last `]` is part of a different array.
  let fromIdx = 0;
  while (true) {
    const s = text.indexOf('[', fromIdx);
    if (s === -1) break;
    // Find the matching close bracket respecting nesting
    let depth = 0;
    let e = -1;
    for (let i = s; i < text.length; i++) {
      if (text[i] === '[') depth++;
      else if (text[i] === ']') {
        depth--;
        if (depth === 0) { e = i; break; }
      }
    }
    if (e !== -1) {
      const result = tryParse(text.slice(s, e + 1));
      if (result) return result;
    }
    fromIdx = s + 1;
  }

  throw new Error(
    'No valid JSON array of objects found in AI response. ' +
    `First 200 chars: ${text.slice(0, 200)}`
  );
}

export function SidePanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [port, setPort] = useState<chrome.runtime.Port | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [view, setView] = useState<'chat' | 'settings' | 'batch'>('chat');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [provider, setProvider] = useState('openrouter');
  const [saveStatus, setSaveStatus] = useState('');

  // Category Cycling
  const [currentCategory, setCurrentCategory] = useState<Category>('technology');

  // Batch State
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchJson, setBatchJson] = useState('');
  const [batchTemplate, setBatchTemplate] = useState(`SYSTEM ROLE:
You are a JSON-only response generator.
You NEVER output markdown.
You NEVER output links in markdown format.
Your output is parsed by JSON.parse().

INPUT:
Topic: "\${headline}"
Summary: "\${summary}"
Category: "\${category}"
Tags: "\${tags}"
Language: "en"
Author: "sourav samanta"
AuthorId: "67effa37a489e2e948024db3"

PRIMARY OBJECTIVE:
Return ONE valid JSON object representing a full-length blog post.
The JSON must be safe for direct database insertion and production use.

HARD FAIL CONDITIONS:

* Any text outside JSON → FAIL
* Invalid JSON → FAIL
* Markdown-style links → FAIL
* Image URL not matching topic → FAIL
* Content below 300 words → FAIL
* Repetitive, robotic, or AI-patterned writing → FAIL
* Any banned word or pattern from the HUMANIZER RULES section below → FAIL

HUMAN WRITING RULES (CRITICAL):

* Write like an experienced human blogger or journalist
* Use natural sentence variation (short + long sentences mixed)
* Avoid generic AI phrases such as:
  "In today's fast-paced world", "It is worth noting", "Moreover", "Furthermore"
* Use context-aware wording, subtle opinions, and realistic explanations
* Do NOT sound promotional or overly formal
* Content must feel informative, grounded, and naturally flowing
* Paragraphs should feel intentional, not padded for word count

HUMANIZER RULES — BANNED WORDS AND PATTERNS (INSTANT FAIL IF PRESENT):

BANNED WORDS (never use these):
additionally, align with, crucial, delve, emphasizing, enduring, enhance,
fostering, garner, highlight (as a verb), interplay, intricate, intricacies,
landscape (used abstractly), pivotal, showcase, tapestry, testament,
underscore (as verb), valuable, vibrant, groundbreaking, nestled,
breathtaking, boasts, renowned, stands as, serves as, marks a, represents a shift,
key (as adjective meaning "important"), evolving landscape, thought leader,
cutting-edge, game-changer, game-changing, revolutionary, transformative,
seamless, robust, dynamic, innovative, synergy, leverage (as verb)

BANNED PATTERNS:

1. Significance inflation
   Do NOT write phrases like: "marking a pivotal moment", "setting the stage for",
   "reflects broader trends", "deeply rooted in", "shaping the future of",
   "underscores its importance", "symbolizing its enduring legacy"
   FIX: Just state the fact directly.

2. Promotional / advertisement-like language
   Do NOT write: "nestled in the heart of", "vibrant community", "rich cultural
   heritage", "stunning natural beauty", "must-visit", "breathtaking"
   FIX: Describe what the thing actually is or does.

3. Superficial -ing endings
   Do NOT end sentences with: "...symbolizing X", "...contributing to Y",
   "...reflecting Z", "...showcasing its...", "...highlighting the importance of"
   FIX: Cut the -ing tail or rewrite as a new sentence.

4. Vague attributions
   Do NOT write: "Experts argue", "Industry observers note", "Some critics believe",
   "According to reports", "Several sources suggest"
   FIX: Name the source or cut the claim.

5. Negative parallelism
   Do NOT write: "It's not just X, it's Y", "Not only X but also Y" as padding
   FIX: Just say what it is.

6. Rule of three as padding
   Do NOT list three synonyms or near-identical ideas: "innovative, dynamic, and
   transformative" or "fast, efficient, and reliable"
   FIX: Pick one or make each item genuinely distinct.

7. Synonym cycling (elegant variation)
   Do NOT refer to the same thing with different words each sentence to avoid
   repetition: "the platform... the tool... the solution... the system..."
   FIX: Pick one word and use it consistently.

8. Formulaic challenge/future sections
   Do NOT create sections titled or structured like: "Challenges and Future Prospects",
   "Despite these challenges...", "Future Outlook", "The Road Ahead",
   "Despite its... continues to thrive"
   FIX: Either cut or integrate the information naturally into other paragraphs.

9. Generic positive conclusions
   Do NOT end with: "The future looks bright", "exciting times lie ahead",
   "a major step in the right direction", "the journey toward excellence continues"
   FIX: End with a specific fact, stat, date, or concrete next development.

10. Em dash overuse
    Do NOT use em dashes (—) in paragraph.
    FIX: Use a comma, period, or rewrite the sentence.

11. Boldface overuse
    Do NOT bold mid-sentence phrases for emphasis: "This is **critically important**"
    FIX: If it matters, the sentence structure should make it clear without bolding.

12. False ranges
    Do NOT write: "from X to Y, from A to B" stacked constructions
    FIX: List the items plainly.

13. Knowledge-cutoff disclaimers
    Do NOT write: "as of my last update", "based on available information",
    "while specific details are limited"
    FIX: Either state the fact or omit it.

14. Title case in headings
    Do NOT capitalize every word in headings: "The Future Of Renewable Energy"
    FIX: Use sentence case: "The future of renewable energy"

15. Emojis in content
    Do NOT use emojis anywhere in the blog body or headings.

RHYTHM RULE:
Vary sentence length deliberately. Short sentences work. Then a longer one that
takes its time building up to the point. Never write three consecutive sentences
of the same length or structure.

SPECIFICITY RULE:
Every vague claim must be replaced with a concrete detail.
BAD: "Experts say it has a significant impact"
GOOD: "A 2023 Stanford study found it reduced processing time by 40%"

VOICE RULE:
The writing must have a point of view. State what something actually does,
costs, affects, or means — not what it "represents" or "symbolizes".
Neutral does not mean empty. Grounded, specific, and direct is the target.

INLINE IMAGE (CRITICAL – READ CAREFULLY):
The image MUST:

1. Be directly relevant to the TOPIC
2. Visually represent the subject (technology, product, people, location, concept)
3. Come ONLY from Unsplash
4. Use a CLEAN, RAW URL string

INLINE IMAGE URL RULES:

* Must start with: https://images.unsplash.com/photo-
* Must NOT contain:
  * [ ]
  * ( )
  * markdown
  * query descriptions

Example of CORRECT url:
"https://images.unsplash.com/photo-1504609813442-a8924e83f76e"

INLINE IMAGE STRUCTURE (EXACT):
{
  "type": "inlineImage",
  "data": {
    "caption": "",
    "stretched": false,
    "url": "https://images.unsplash.com/photo-XXXXXXXX",
    "withBackground": false,
    "withBorder": false
  }
}

IMAGE–TOPIC MATCHING RULE (VERY IMPORTANT):

* Determine the CORE VISUAL THEME of the topic before choosing an image.

Examples:
* Smartphone feature → phone, satellite, signal, space
* Politics → government buildings, leaders, flags
* AI → data centers, robotics, neural visuals
* Business → people working, charts, offices
* Food → the actual dish, cooking, ingredients
* Do NOT use generic landscapes, random people, or abstract images unless
  the topic itself is abstract.

THUMBNAIL RULE:
* thumbnail.image MUST be the SAME image URL as inlineImage.data.url

EDITORJS BODY RULES:
Allowed block types ONLY:
* "header"
* "paragraph"
* "inlineImage"

HEADER RULES:
* level 2 → Blog title (used once at the top)
* level 3 → Section headings only

CONTENT STRUCTURE RULES:
* Start with a strong opening that immediately explains why the topic matters
* Use multiple sections with clear, meaningful subheadings
* Each paragraph must add new information or perspective
* Avoid filler paragraphs
* Total content length must naturally exceed 300 words

SEO TITLE & DESCRIPTION RULES:

TITLE RULES:
* The title must be SEO-friendly and written for search engines and human readers.
* Length should ideally be between 55–70 characters.
* The main keyword (topic) must appear naturally in the title.
* Titles should feel like real news/blog headlines, not generic statements.
* Avoid clickbait phrases like:
  * "You Won't Believe"
  * "This Will Shock You"
* Use clear, natural wording that people would actually search for.

DESCRIPTION RULES (thumbnail.description):
* Must be 120–160 characters.
* Must summarize the article clearly in a natural sentence.
* Include the main keyword/topic naturally.
* Should encourage the reader to click while remaining factual.
* Avoid keyword stuffing.

FAQ SECTION RULES:
* After the article content, generate a "faqs" array.
* Include 3 to 5 FAQs that a real reader might ask after reading the article.
* Questions must be practical, natural, and topic-related.
* Avoid generic questions like "What is this topic?"
* Answers must be concise but informative (1–3 sentences).
* Do not repeat sentences from the article.
* FAQs should add extra clarity, context, or practical understanding.
* Each FAQ object must contain only:
  * "question"
  * "answer"
* Do NOT include "_id", "createdAt", or any database fields.

Example FAQ format:
{
  "faqs": [
    {
      "question": "Example question?",
      "answer": "Clear, helpful answer."
    }
  ]
}

STRICT RESPONSE SCHEMA:
{
  "author": string,
  "authorId": string,
  "body": array,
  "category": string,
  "editorType": "EDITORJS",
  "language": string,
  "tags": [string],
  "thumbnail": {
    "title": string,
    "description": string,
    "image": string
  },
  "title": string,
  "url": string,
  "videoUrl": "",
  "views": 0,
  "faqs": [
    {
      "question": string,
      "answer": string
    }
  ]
}

FINAL INTERNAL CHECK (DO NOT OUTPUT):

* JSON parses correctly
* inlineImage.url is a clean string (no brackets, no markdown)
* Image visually matches topic
* Word count > 300
* No banned words or patterns from HUMANIZER RULES are present
* Writing feels human: specific, varied rhythm, direct voice
* Title length roughly 55–70 characters
* Description length 120–160 characters
* Title contains the main topic keyword
* Description summarizes the article clearly and naturally
* "faqs" contains 3–5 relevant questions
* Each FAQ answer is clear and not copied from the article
* No em dash overuse, no boldface mid-sentence, no emojis, no title case headings
* Ready for production`);
  const [batchInterval, setBatchInterval] = useState(2.4);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchError, setBatchError] = useState('');
  const batchTimerRef = useRef<number | null>(null);
  const [batchCountdown, setBatchCountdown] = useState(0);
  const countdownTimerRef = useRef<number | null>(null);
  const [targetTabTitle, setTargetTabTitle] = useState('');

  // Ref that holds resolve/reject for an in-flight JSON-generation task.
  // When set, the next task_complete from the port is treated as a JSON-gen response.
  const jsonGenCallbackRef = useRef<{
    resolve: (text: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const stopBatch = () => {
    setIsBatchRunning(false);
    if (batchTimerRef.current) clearInterval(batchTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  // Advance to next category and persist
  const advanceCategory = () => {
    setCurrentCategory(prev => {
      const currentIdx = CATEGORIES.indexOf(prev);
      const nextIdx = (currentIdx + 1) % CATEGORIES.length;
      const next = CATEGORIES[nextIdx];
      chrome.storage.local.set({ batchCategory: next });
      return next;
    });
  };

  // ─── Auto-generate JSON Data Array from AI ─────────────────────────────────
  // Strategy: send the news-fetch prompt to the ACTIVE AI CHAT TAB via port
  // (exactly as batch does), then await the task_complete response.
  // The port onMessage listener checks jsonGenCallbackRef first and routes
  // accordingly — no direct fetch() to any API.
  const NEWS_FETCH_PROMPT = `You are a news aggregation AI operating in HARD SEARCH MODE.

TASK:
Fetch TODAY’S latest news related ONLY to the Indian Premier League (IPL).

CATEGORY:

* sports

CONTENT REQUIREMENTS (STRICT):

1. Return EXACTLY 5 news items.
2. ALL news MUST be from TODAY only.
3. ALL news items MUST be real, verifiable IPL-related events.

HARD SEARCH RULES (CRITICAL):

4. Actively search across:

* sports news platforms
* official IPL updates
* team announcements
* press releases
* verified match reports

5. Use both major and minor sources if needed.
6. Prefer factual updates over opinion pieces.

SEO NEWS SELECTION RULES (VERY IMPORTANT):

7. Prioritize IPL topics with high search demand such as:

* match results and scorecards
* player performances (centuries, wickets, records)
* team announcements and injuries
* toss results and playing XI
* controversies or rule changes
* points table updates

8. Prefer stories that include recognizable entities such as:

* IPL teams (e.g., Chennai Super Kings, Mumbai Indians)
* players (e.g., Virat Kohli, MS Dhoni)
* venues or match locations
* BCCI or IPL officials

9. Avoid:

* speculation or rumors
* opinion/editorial content
* non-IPL cricket news

HEADLINE QUALITY RULES (SEO CRITICAL):

10. Headlines MUST be clear, factual, and SEO-friendly.

11. Headlines MUST include strong keywords such as:

* team names
* player names
* “IPL 2026”
* match result keywords (wins, scores, records)

Examples of GOOD headlines:

* Mumbai Indians Beat Chennai Super Kings in IPL 2026 Thriller
* Virat Kohli Scores Century in IPL 2026 Match Against KKR

Examples of BAD headlines:

* Big Match Happened in IPL
* Exciting Game Today

SUMMARY RULES:

12. Summary must be 2–3 concise sentences.
13. Must clearly explain:

* what happened
* who was involved
* key outcome (score/result/decision)

UNIQUENESS RULES (MANDATORY):

14. Do NOT repeat:

* same match
* same player performance
* same event in different wording

FORMAT RULES (NON-NEGOTIABLE):

15. Output MUST be valid JSON.
16. Output MUST be a single flat JSON array.
17. Return ONLY the JSON array — no explanation.

FIXED OBJECT STRUCTURE (DO NOT MODIFY):

[
{
"headline": "",
"summary": "",
"category": "sports",
"tags": [],
"source": "",
"publishedDate": ""
}
]

FIELD RULES:

* "category" MUST be "sports"
* "publishedDate" MUST be in ISO format: YYYY-MM-DD

TAG RULES:

* lowercase only
* 2–5 tags
* include team names, player names, or keywords like "ipl 2026", "match result"

FINAL ENFORCEMENT:

* EXACTLY 5 items
* ONLY IPL-related news
* ONLY TODAY’s news
* NO duplicates
* NO fabrication
`;

  const generateJsonFromAI = async (): Promise<any[]> => {
    setBatchError('');

    if (!port) throw new Error('No background port connected');

    // Get the active tab — this is where the AI chat lives
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (!tabId) throw new Error('No active tab found');

    setIsGenerating(true);
    const prompt = NEWS_FETCH_PROMPT.replace('{TOPIC}', currentCategory);

    // Return a Promise that resolves when task_complete fires for this request
    return new Promise<any[]>((resolve, reject) => {
      // Register the callback — onMessage listener will call this
      jsonGenCallbackRef.current = {
        resolve: (rawText: string) => {
          try {
            const parsed = refineToValidJSON(rawText);
            setBatchJson(JSON.stringify(parsed, null, 2));
            setIsGenerating(false);
            resolve(parsed);
          } catch (e: any) {
            setIsGenerating(false);
            reject(new Error('Could not parse AI response as JSON: ' + e.message));
          } finally {
            jsonGenCallbackRef.current = null;
          }
        },
        reject: (err: Error) => {
          setIsGenerating(false);
          jsonGenCallbackRef.current = null;
          reject(err);
        },
      };

      // Send the news-fetch prompt to the active AI chat tab — same as batch
      port.postMessage({
        type: 'new_task',
        task: prompt,
        tabId,
        title: `Fetch ${currentCategory} news`,
      });
    });
  };

  // ─── Start Batch ──────────────────────────────────────────────────────────
  // Accepts pre-parsed data (from auto-generate) OR parses batchJson itself.
  const startBatch = async (preloadedData?: any[]) => {
    setBatchError('');

    let parsedData: any[];

    if (preloadedData) {
      parsedData = preloadedData;
    } else {
      if (!batchJson.trim()) {
        // No JSON provided — auto-generate via the active AI chat tab
        try {
          const generated = await generateJsonFromAI();
          await startBatch(generated);
        } catch (err: any) {
          setBatchError('Auto-generate failed: ' + (err.message || String(err)));
        }
        return;
      }
      try {
        parsedData = JSON.parse(batchJson);
        if (!Array.isArray(parsedData)) throw new Error('JSON must be an array of objects');
      } catch (err: any) {
        setBatchError('Invalid JSON: ' + err.message);
        return;
      }
      if (parsedData.length === 0) {
        setBatchError('JSON array is empty');
        return;
      }
    }

    if (!batchTemplate.trim()) {
      setBatchError('Please provide a prompt template');
      return;
    }

    // Capture the initial target tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const initialTabId = tabs[0]?.id;
    if (!initialTabId) {
      setBatchError('No active tab found to bind execution to');
      return;
    }
    setTargetTabTitle(tabs[0].title || 'Unknown Webpage');

    // Prepare
    setIsBatchRunning(true);
    setBatchProgress({ current: 0, total: parsedData.length });
    let currentIndex = 0;

    const executeNext = async () => {
      if (currentIndex >= parsedData.length) {
        // ✅ All items done — advance to next category before stopping
        advanceCategory();
        stopBatch();
        return;
      }

      setBatchProgress(prev => ({ ...prev, current: currentIndex + 1 }));
      setBatchCountdown(Math.floor(batchInterval * 60));

      const item = parsedData[currentIndex];
      // Interpolate template with ${key} placeholders
      let prompt = batchTemplate;
      Object.keys(item).forEach(key => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        prompt = prompt.replace(regex, String(item[key]));
      });

      // Verify the target tab still exists
      try {
        await chrome.tabs.get(initialTabId);
      } catch {
        setBatchError('Target tab was closed. Batch stopped.');
        stopBatch();
        return;
      }

      // Send to content script via background
      if (port) {
        port.postMessage({
          type: 'new_task',
          task: prompt,
          tabId: initialTabId,
          title: item.headline || item.title || item.name || 'Batch Task'
        });
      }

      currentIndex++;

      // Start countdown
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = setInterval(() => {
        setBatchCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // Execute first immediately
    await executeNext();

    // Then on interval
    batchTimerRef.current = setInterval(executeNext, Math.floor(batchInterval * 60 * 1000));
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // Load category from storage on mount
  useEffect(() => {
    chrome.storage.local.get(['batchCategory'], (data) => {
      if (data.batchCategory && CATEGORIES.includes(data.batchCategory as Category)) {
        setCurrentCategory(data.batchCategory as Category);
      } else {
        // First run: initialize to 'technology'
        chrome.storage.local.set({ batchCategory: 'technology' });
        setCurrentCategory('technology');
      }
    });
  }, []);

  // Load Settings on mount
  useEffect(() => {
    chrome.storage.local.get(['apiKeys', 'modelConfig'], (data) => {
      if (data.apiKeys?.openrouter) {
        setApiKey(data.apiKeys.openrouter);
      } else {
        setApiKey('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'); // default
      }

      if (data.modelConfig?.openrouterModel) {
        setModel(data.modelConfig.openrouterModel);
      } else {
        setModel('qwen/qwen3-235b-a22b-thinking-2507'); // default
      }

      if (data.modelConfig?.provider) {
        setProvider(data.modelConfig.provider);
      }
    });
  }, []);

  const handleOpenHistory = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('side-panel/history.html') });
  };

  const handleSaveSettings = () => {
    const apiKeys = { openrouter: apiKey };
    const modelConfig = { provider, openrouterModel: model };

    chrome.storage.local.set({ apiKeys, modelConfig }, () => {
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    });
  };

  useEffect(() => {
    // Connect to background script
    const connection = chrome.runtime.connect({ name: 'side-panel-connection' });
    setPort(connection);

    // Send heartbeat every 20 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      connection.postMessage({ type: 'heartbeat' });
    }, 20000);

    connection.onMessage.addListener((message) => {
      console.log('[SidePanel] Received message:', message.type);

      if (message.type === 'status_update') {
        setStatus(message.status);
      } else if (message.type === 'task_complete') {
        // Check if this task_complete is for a JSON-generation request
        if (jsonGenCallbackRef.current) {
          const result: ExecutionResult = message.result;

          // 1st priority: actual clipboard text from wait_for_chat_response
          const chatResponseEntry = result.results?.find(
            (r: any) => r?.action?.action === 'wait_for_chat_response'
          );
          const rawText: string =
            chatResponseEntry?.result?.responseText ||
            result.plan?.understanding ||
            result.results?.map((r: any) => r?.result?.responseText ?? r?.result?.message ?? '').join('') ||
            '';

          if (rawText.trim()) {
            jsonGenCallbackRef.current.resolve(rawText);
          } else if (result.error) {
            jsonGenCallbackRef.current.reject(new Error(result.error));
          } else {
            jsonGenCallbackRef.current.reject(new Error('AI returned no usable text'));
          }

          // Reset execution state so the UI is clean for the batch
          setIsExecuting(false);
          setStatus(null);
        } else {
          handleTaskComplete(message.result);
        }
      } else if (message.type === 'error') {
        setMessages(prev => [...prev, {
          type: 'error',
          content: message.error,
          timestamp: Date.now()
        }]);
        setIsExecuting(false);
        setStatus(null);
      } else if (message.type === 'task_cancelled') {
        setMessages(prev => [...prev, {
          type: 'system',
          content: 'Task cancelled',
          timestamp: Date.now()
        }]);
        setIsExecuting(false);
        setStatus(null);
      }
    });

    return () => {
      clearInterval(heartbeat);
      connection.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTaskComplete = (result: ExecutionResult) => {
    console.log('[SidePanel] Task complete:', result);

    if (result.success && result.plan) {
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: result.plan?.understanding || 'Task completed successfully',
        timestamp: Date.now()
      }]);
    } else if (result.error) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: result.error || 'Unknown error',
        timestamp: Date.now()
      }]);
    }

    setIsExecuting(false);
    setStatus(null);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !port || isExecuting) return;

    const userMessage: Message = {
      type: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsExecuting(true);

    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;

    if (!tabId) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'No active tab found',
        timestamp: Date.now()
      }]);
      setIsExecuting(false);
      return;
    }

    // Send task to background
    port.postMessage({
      type: 'new_task',
      task: input,
      tabId,
      title: input.length > 30 ? input.substring(0, 30) + '...' : input
    });
  };

  const handleCancelTask = () => {
    if (port) {
      port.postMessage({ type: 'cancel_task' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-100 font-sans selection:bg-white selection:text-black">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-md border-b border-zinc-900 p-4 flex justify-between items-center z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-lg shadow-white/5">
            <Activity className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-widest uppercase italic leading-none">PromptBridge</h1>
            <p className="text-[10px] text-zinc-500 mt-1 font-bold uppercase tracking-tighter">Automation Engine ( IPL )</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
          <button
            onClick={handleOpenHistory}
            className="p-2 hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-lg transition-colors"
            title="View History"
          >
            <History className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-zinc-800 mx-0.5" />
          {view === 'chat' ?
            <>
              <button
                onClick={() => setView('batch')}
                className={`p-2 rounded-lg transition-colors text-zinc-500 hover:text-white hover:bg-zinc-900`}
                title={"Batch Tasks"}
              >
                <ListTodo className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('settings')}
                className={`p-2 rounded-lg transition-colors text-zinc-500 hover:text-white hover:bg-zinc-900`}
                title={"Settings"}
              >
                <Settings className="w-4 h-4" />
              </button>
            </>
            :
            <button
              onClick={() => setView('chat')}
              className={`p-2 rounded-lg transition-all bg-white text-black shadow-md`}
              title={"Back to Chat"}
            >
              <X className="w-4 h-4" />
            </button>
          }

        </div>
      </header>

      {/* Main Content Area */}
      {view === 'settings' ? (
        <div className="flex-1 overflow-y-auto p-6 bg-black">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-black mb-8 text-zinc-500 border-b border-zinc-900 pb-4">AI Configuration</h2>

          <div className="space-y-8 max-w-sm">
            <div className="space-y-2.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-inner text-sm text-white focus:outline-none focus:border-white transition-all appearance-none cursor-pointer"
              >
                <option value="openrouter">OpenRouter Interface</option>
                <option value="gemini">Google Gemini AI</option>
                <option value="openai">OpenAI Systems</option>
              </select>
            </div>

            {provider === 'openrouter' && (
              <>
                <div className="space-y-2.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    API Authentication Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-inner focus:outline-none focus:border-white font-mono text-xs text-white placeholder:text-zinc-700 transition-all"
                  />
                  <p className="mt-2 text-[10px] text-zinc-500 font-medium italic">Keys are encrypted and stored locally.</p>
                </div>

                <div className="space-y-2.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    System Model ID
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. qwen/qwen-2.5-72b-instruct"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-inner focus:outline-none focus:border-white font-mono text-xs text-white placeholder:text-zinc-700 transition-all"
                  />
                </div>
              </>
            )}

            <div className="pt-8">
              <button
                onClick={handleSaveSettings}
                className="w-full flex justify-center py-4 px-4 rounded-xl text-[11px] font-black text-black bg-white hover:bg-zinc-200 focus:outline-none transition-all uppercase tracking-widest shadow-lg shadow-white/5 active:scale-[0.98]"
              >
                Initialize Config
              </button>
              {saveStatus && (
                <p className="mt-4 text-[10px] text-white text-center font-black uppercase tracking-widest bg-zinc-900 py-2 rounded-lg border border-zinc-800 animate-in zoom-in-95">{saveStatus}</p>
              )}
            </div>
          </div>
        </div>
      ) : view === 'batch' ? (
        <div className="flex-1 overflow-y-auto p-6 bg-black">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-black mb-8 text-zinc-500 border-b border-zinc-900 pb-4 flex items-center justify-between">
            <span>Batch Automation</span>
            {isBatchRunning && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-white animate-pulse flex items-center gap-1.5 font-black uppercase tracking-widest">
                  <Activity className="w-3 h-3" /> Active Stream
                </span>
                <span className="text-[9px] text-zinc-500 truncate max-w-[150px] font-bold uppercase" title={targetTabTitle}>
                  BIND: {targetTabTitle}
                </span>
              </div>
            )}
          </h2>

          <div className="space-y-8">
            {batchError && (
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex gap-3 text-white text-xs font-bold animate-in shake-in-1">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500" />
                <p>{batchError}</p>
              </div>
            )}

            {/* ── Category Badge ── */}
            <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800 rounded-2xl px-5 py-4 shadow-inner">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest font-black text-zinc-600">Sync Category</span>
                <span className="text-sm font-black text-white capitalize leading-none tracking-tight">{currentCategory}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-700">
                <RefreshCw className="w-3.5 h-3.5" />
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] uppercase tracking-widest font-black text-zinc-700">Queue</span>
                  <span className="text-xs text-zinc-600 font-bold capitalize leading-none">
                    {CATEGORIES[(CATEGORIES.indexOf(currentCategory) + 1) % CATEGORIES.length]}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex justify-between ml-1">
                <span>Payload Registry (JSON)</span>
                <span className="text-zinc-700 font-black">ARRAY_OBJECT</span>
              </label>
              <textarea
                value={batchJson}
                onChange={(e) => setBatchJson(e.target.value)}
                placeholder={`Leave empty for auto-generation\n[\n  { "headline": "...", "summary": "..." }\n]`}
                className="w-full h-32 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-inner text-xs text-white focus:outline-none focus:border-white transition-all font-mono leading-relaxed placeholder:text-zinc-800 resize-none"
                disabled={isBatchRunning || isGenerating}
              />
            </div>

            <div className="space-y-2.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                Execution Interval (Min)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={batchInterval}
                onChange={(e) => setBatchInterval(parseFloat(e.target.value) || 1)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-inner focus:outline-none focus:border-white font-mono text-xs text-white transition-all"
                disabled={isBatchRunning}
              />
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between ml-1">
                <span>Prompt Logic Template</span>
                <span className="text-zinc-600 font-black uppercase tracking-tighter">Interpolation: {"${key}"}</span>
              </label>
              <textarea
                value={batchTemplate}
                onChange={(e) => setBatchTemplate(e.target.value)}
                placeholder="PROMPT BRIDGE TEMPLATE..."
                className="w-full h-24 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-inner text-xs text-white focus:outline-none focus:border-white transition-all font-mono leading-relaxed placeholder:text-zinc-800 resize-none"
                disabled={isBatchRunning}
              />
            </div>

            <div className="pt-4">
              {isBatchRunning ? (
                <div className="space-y-6">
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
                    <div className="flex justify-between text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">
                      <span>Progress: {batchProgress.current} / {batchProgress.total}</span>
                      <span className="text-white">Next Pulse: {batchCountdown}s</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                      <div
                        className="h-full bg-white transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.4)] rounded-full"
                        style={{ width: `${(batchProgress.current / Math.max(1, batchProgress.total)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <button
                    onClick={stopBatch}
                    className="w-full flex justify-center items-center gap-3 py-4 px-4 rounded-xl text-[11px] font-black text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 focus:outline-none transition-all uppercase tracking-[0.2em]"
                  >
                    <Square className="w-4 h-4" />
                    Terminate Stream
                  </button>
                </div>
              ) : isGenerating ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center gap-4 p-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                    <span className="text-[10px] text-white font-black uppercase tracking-[0.2em] animate-pulse">
                      Synthesizing Data Feed…
                    </span>
                  </div>
                  <button
                    onClick={() => setIsGenerating(false)}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black text-zinc-500 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white transition-all uppercase tracking-widest"
                  >
                    Cancel Request
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startBatch()}
                  className="w-full flex justify-center items-center gap-3 py-4 px-4 rounded-xl text-[11px] font-black text-black bg-white hover:bg-zinc-200 focus:outline-none transition-all uppercase tracking-[0.2em] shadow-lg shadow-white/5 active:scale-[0.98]"
                >
                  {batchJson.trim() ? (
                    <><Play className="w-4 h-4 fill-black text-black" /> Initiate Batch</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Auto-Initialize Feed</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            {messages.length === 0 && (
              <main className="w-full h-[65dvh] flex justify-center items-center px-4 relative">
                <div className="relative flex flex-col items-center gap-12 py-4 animate-in fade-in zoom-in-95 duration-1000">
                  <div className="relative z-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-16 rounded-[2rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-110 duration-500">
                        <Activity className="w-8 h-8" />
                      </div>
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">System Standby</span>
                    </div>
                  </div>

                  <div className="space-y-4 text-center">
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic opacity-20 select-none">IPL</h1>
                    <div className="flex flex-col gap-2">
                       <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.1em]">Ready for Injection</p>
                       <div className="h-px w-12 bg-zinc-800 mx-auto" />
                    </div>
                  </div>

                  <div className="flex justify-center flex-wrap gap-2 w-full max-w-[280px]">
                    <button
                      onClick={() => setInput("Execute page source analysis.")}
                      className="px-4 py-3 text-nowrap bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest hover:text-white hover:border-zinc-500 active:scale-95"
                    >
                      Analyze Context
                    </button>
                    <button
                      onClick={() => setInput("Automate " + currentCategory + " news ingestion.")}
                      className="px-4 py-3 text-nowrap bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest hover:text-white hover:border-zinc-500 active:scale-95"
                    >
                      Init {currentCategory} Stream
                    </button>
                  </div>
                </div>
              </main>
            )}

            {messages && messages?.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-${msg.type === 'user' ? 'right' : 'left'}-4 duration-500`}
              >
                <div
                  className={`p-4 rounded-2xl text-sm relative group shadow-lg ${msg.type === 'user'
                    ? 'bg-white text-black font-bold max-w-[85%] rounded-tr-none'
                    : msg.type === 'error'
                      ? 'bg-zinc-900 border border-zinc-800 text-white max-w-[90%] rounded-tl-none font-bold italic'
                      : msg.type === 'system'
                        ? 'bg-black text-zinc-500 max-w-[85%] mx-auto text-center border border-zinc-900 uppercase text-[10px] font-black tracking-widest py-2 rounded-full'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-200 max-w-[90%] rounded-tl-none font-medium'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap leading-relaxed tracking-tight">{msg.content}</p>
                    </div>
                    {msg.type === 'assistant' && (
                      <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
                    )}
                    {msg.type === 'error' && (
                      <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    )}
                  </div>

                  {msg.timestamp && (
                    <div className={`mt-3 text-[9px] font-black uppercase tracking-widest opacity-30 text-right ${msg.type === 'user' ? 'text-black' : 'text-zinc-500'}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Status indicator */}
            {status && (
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 inline-block animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping absolute" />
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase">{status.message || status.status}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-transparent border-t border-zinc-900">
            <div className="flex flex-col gap-0 p-4 pb-3 bg-zinc-950 border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/40 focus-within:border-white/20 transition-all duration-300">

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Initialize instruction set..."
                disabled={isExecuting}
                rows={1}
                className="w-full bg-transparent text-sm focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-zinc-700 text-white resize-none min-h-[36px] max-h-[150px] overflow-y-auto leading-relaxed font-medium tracking-tight"
              />

              <div className="flex items-center justify-between mt-4">
                {isExecuting ? (
                  <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Streaming execution...
                  </div>
                ) : (
                  <span className="text-[9px] text-zinc-700 select-none font-black uppercase tracking-widest">↵ transmit · ⇧↵ newline</span>
                )}

                {isExecuting ? (
                  <button
                    onClick={handleCancelTask}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 transition-all duration-300 text-[10px] font-black uppercase tracking-widest shrink-0"
                  >
                    <Square className="w-3 h-3 fill-white" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim()}
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-white text-black hover:bg-zinc-200 disabled:opacity-5 disabled:cursor-not-allowed transition-all duration-300 shrink-0 shadow-lg shadow-white/5 active:scale-[0.9] border border-transparent"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
