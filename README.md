# PromptBridge

**PromptBridge** is a powerful AI-driven automation engine built as a Chrome Extension. It leverages existing AI chat interfaces (ChatGPT, Claude, etc.) to fetch news, generate blog posts, and automate repetitive tasks directly within your browser.

---

## 🚀 Main Features

### 1. AI Batch Automation
- **Auto-Generate News**: Automatically fetches the latest news for specific categories using any active AI chat tab.
- **Task Orchestration**: Sends multiple prompts to the AI sequentially and intercepts the output for processing.
- **Robust Extraction**: Features a multi-strategy JSON parser that extracts data from even the messiest AI responses (handling prose, markdown fences, citations, and unescaped newlines).

### 2. Intelligent Category Cycling
- Automatically cycles through 10 predefined categories: `technology`, `food`, `politics`, `business`, `science`, `health`, `entertainment`, `sports`, `travel`, and `finance`.
- Persistently tracks the current category in local storage to ensure a continuous loop of fresh content.

### 3. Integrated Blog Ingestion
- Automatically posts generated articles to a production ingest API (`thekhabarexpress.com`).
- Handles data sanitization (stripping markdown artifacts, fixing URLs) before transmission.

### 4. Developer Tools & UI
- Built with **React** and **DaisyUI** for a premium, modern experience.
- Full execution history and status monitoring in the side panel.

---

## 🛠️ Technology Stack
- **Framework**: Vite + React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **Build System**: Turborepo + pnpm
- **Communication**: Chrome extension Messaging / Ports

---

## 📁 Project Architecture

- **`chrome-extension/`**: The core background script, service worker, and extension manifest.
- **`pages/side-panel/`**: The primary UI of the application, running as a Chrome Side Panel.
- **`pages/content/`**: Content scripts responsible for interacting with AI chat textareas and extracting responses.
- **`packages/shared/`**: Shared types, configurations, and utility functions used across all modules.
- **`dist/`**: The final production-ready build output.

---

## ⚙️ Development & Build

### Prerequisites
- [Node.js](https://nodejs.org/) (>= 22.12.0)
- [pnpm](https://pnpm.io/) (>= 9.15.1)

### Setup
```bash
# Install dependencies
pnpm install

# Start development mode (with hot-reload)
pnpm dev
```

### Production Build
```bash
# Build the entire project
pnpm build

# Zip the build for distribution
zip -r mini-bot.zip dist
```

---

## 📦 How to Load in Chrome

1. Build the project using `pnpm build`.
2. Open your browser and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked**.
5. Select the `dist/` folder in the project root.
6. Look for the **PromptBridge** icon in your extension bar and click it to open the Side Panel.

---

## 📝 License
This project is private and intended for specific internal use.
