// ==================================================
// BACKGROUND SERVICE WORKER - Orchestrator
// ==================================================
console.log('--- Mini Bot Background Loading ---');

import aiEngine from './ai-engine.js'

/**
 * State management
 */
const state = {
  activeTab: null,
  isExecuting: false,
  currentTask: null,
  executionHistory: []
}

/**
 * Initialize on install
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Mini Bot AI installed')

  // Set default user memory
  const existing = await chrome.storage.local.get(['userMemory'])
  if (!existing.userMemory) {
    await chrome.storage.local.set({
      userMemory: {
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        city: '',
        country: '',
        zipcode: ''
      }
    })
  }

  // Initialize AI engine
  await aiEngine.initialize()
})

/**
 * Configure side panel behavior at top level for more reliability
 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

/**
 * Open side panel when clicking the action button (as a backup)
 */
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId })
})

/**
 * Handle messages from popup/content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse)
  return true // Keep channel open for async
})

/**
 * Main message router
 */
async function handleMessage(message, sender, sendResponse) {
  console.log('Background received message:', message)
  
  try {
    // Ensure engine is initialized
    await aiEngine.initialize()

    switch (message.type) {
      case 'EXECUTE_COMMAND':
        await handleExecuteCommand(message.payload, sender.tab)
        sendResponse({ success: true })
        break

      case 'EXECUTE_MANUAL_RESPONSE':
        await handleExecuteManualResponse(message.payload, sender.tab)
        sendResponse({ success: true })
        break

      case 'GET_PAGE_CONTEXT':
        const context = await getPageContext(sender.tab?.id || message.tabId)
        sendResponse({ context })
        break

      case 'STOP_EXECUTION':
        state.isExecuting = false
        sendResponse({ success: true })
        break

      case 'GET_STATUS':
        sendResponse({ 
          isExecuting: state.isExecuting,
          currentTask: state.currentTask
        })
        break

      case 'GET_USER_MEMORY':
        const memory = await chrome.storage.local.get(['userMemory'])
        sendResponse({ userMemory: memory.userMemory || {} })
        break

      case 'UPDATE_USER_MEMORY':
        await chrome.storage.local.set({ userMemory: message.payload })
        sendResponse({ success: true })
        break

      case 'GET_SETTINGS':
        const settings = await chrome.storage.local.get(['aiProvider', 'apiKeys', 'preferences'])
        sendResponse({ settings })
        break

      case 'UPDATE_SETTINGS':
        await chrome.storage.local.set(message.payload)
        await aiEngine.initialize() 
        sendResponse({ success: true })
        break

      case 'GET_HISTORY':
        sendResponse({ history: state.executionHistory.slice(-50) })
        break

      case 'CLEAR_HISTORY':
        state.executionHistory = []
        aiEngine.clearHistory()
        sendResponse({ success: true })
        break

      default:
        console.warn('Unknown message type:', message.type)
        sendResponse({ error: `Unknown message type: ${message.type}` })
    }
  } catch (error) {
    console.error('Background error:', error)
    sendResponse({ error: error.message })
  }
}

/**
 * Execute AI command on active tab
 */
async function handleExecuteCommand(payload, tab) {
  if (state.isExecuting) {
    throw new Error('Already executing a task. Please wait.')
  }

  state.isExecuting = true
  state.currentTask = payload.command

  try {
    // Get current tab if not provided
    if (!tab) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      tab = tabs[0]
    }

    // Notify popup that we're starting
    broadcastStatus({
      status: 'analyzing',
      message: 'Analyzing page and understanding command...'
    }, tab.id)

    // Get page context
    const context = await getPageContext(tab.id)

    // Process command with AI
    broadcastStatus({
      status: 'thinking',
      message: 'AI is planning the actions...'
    }, tab.id)

    const actionPlan = await aiEngine.processCommand(payload.command, context)

    // Log to history
    state.executionHistory.push({
      timestamp: Date.now(),
      command: payload.command,
      url: tab.url,
      actionPlan,
      success: null
    })

    // Send understanding to user
    broadcastStatus({
      status: 'executing',
      message: actionPlan.understanding,
      totalSteps: actionPlan.actions.length
    }, tab.id)

    // Execute actions on content script
    if (actionPlan.actions.length > 0) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'EXECUTE_ACTION_PLAN',
        payload: {
          actions: actionPlan.actions,
          reasoning: actionPlan.reasoning
        }
      })
    } else {
      broadcastStatus({
      status: 'completed',
      message: actionPlan.reasoning || 'No actions needed'
    }, tab.id)
    }

    // Mark success in history
    state.executionHistory[state.executionHistory.length - 1].success = true

  } catch (error) {
    console.error('Command execution error:', error)
    
    broadcastStatus({
      status: 'error',
      message: error.message
    })

    // Mark failure in history
    if (state.executionHistory.length > 0) {
      state.executionHistory[state.executionHistory.length - 1].success = false
      state.executionHistory[state.executionHistory.length - 1].error = error.message
    }

  } finally {
    state.isExecuting = false
    state.currentTask = null
  }
}

/**
 * Handle manual AI response bypass
 */
async function handleExecuteManualResponse(payload, tab) {
  if (state.isExecuting) {
    throw new Error('Already executing a task. Please wait.')
  }

  state.isExecuting = true
  state.currentTask = 'Manual JSON Execution'

  try {
    if (!tab) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      tab = tabs[0]
    }

    // Parse the manual response
    let actionPlan
    try {
      actionPlan = aiEngine.parseResponse(payload.response)
    } catch (e) {
      throw new Error('Invalid JSON format: ' + e.message)
    }

    if (!actionPlan || !actionPlan.actions) {
      throw new Error('Invalid Action Plan structure')
    }

    // Log to history
    state.executionHistory.push({
      timestamp: Date.now(),
      command: 'MANUAL_TRIGGER',
      url: tab.url,
      actionPlan,
      success: null
    })

    // Brief thinking status
    broadcastStatus({
      status: 'executing',
      message: actionPlan.understanding || 'Executing manual actions...',
      totalSteps: actionPlan.actions.length
    }, tab.id)

    // Execute actions
    if (actionPlan.actions.length > 0) {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'EXECUTE_ACTION_PLAN',
        payload: {
          actions: actionPlan.actions,
          reasoning: actionPlan.reasoning
        }
      })
    } else {
      broadcastStatus({
      status: 'completed',
      message: 'No actions found in manual response'
    }, tab.id)
    }

    state.executionHistory[state.executionHistory.length - 1].success = true

  } catch (error) {
    console.error('Manual execution error:', error)
    broadcastStatus({
      status: 'error',
      message: error.message
    })
  } finally {
    state.isExecuting = false
    state.currentTask = null
  }
}

/**
 * Get comprehensive page context for AI
 */
async function getPageContext(tabId) {
  try {
    // Get basic tab info
    const tab = await chrome.tabs.get(tabId)

    // Request context from content script
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'GET_FULL_CONTEXT'
    })

    // Get user memory
    const storage = await chrome.storage.local.get(['userMemory'])

    return {
      url: tab.url,
      title: tab.title,
      formFields: response.formFields || [],
      pageText: response.pageText || '',
      visibleButtons: response.visibleButtons || [],
      visibleLinks: response.visibleLinks || [],
      userMemory: storage.userMemory || {}
    }

  } catch (error) {
    console.error('Failed to get page context:', error)
    return {
      url: '',
      title: '',
      formFields: [],
      pageText: '',
      userMemory: {}
    }
  }
}

/**
 * Broadcast status to all connected UIs
 */
function broadcastStatus(status, tabId) {
  // Broadcast to connection-based UIs
  chrome.runtime.sendMessage({
    type: 'STATUS_UPDATE',
    payload: status
  }).catch(() => {});

  // Broadcast to content script HUD if tabId is available
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {
      type: 'HUD_STATUS_UPDATE',
      payload: status
    }).catch(() => {});
  }
}

/**
 * Handle keyboard shortcuts
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-command') {
    // Open side panel
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab) {
      chrome.sidePanel.open({ windowId: tab.windowId })
    }
  }
})

console.log('Mini Bot AI background service worker ready')
