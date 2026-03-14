// ==================================================
// BROWSER CONTROLLER - Puppeteer Integration
// ==================================================

/**
 * Manages browser automation via Puppeteer and Chrome DevTools Protocol
 * Adapted from chrome-extension reference for mini-bot
 */

class BrowserController {
  constructor() {
    this.browser = null
    this.page = null
    this.tabId = null
    this.attached = false
  }

  /**
   * Attach Puppeteer to a specific tab
   */
  async attachToTab(tabId) {
    if (this.attached && this.tabId === tabId) {
      return true
    }

    try {
      // Detach from previous tab if any
      if (this.attached) {
        await this.detach()
      }

      this.tabId = tabId

      // Use Chrome debugger API to attach
      await chrome.debugger.attach({ tabId }, '1.3')

      console.log(`[BrowserController] Attached to tab ${tabId}`)
      this.attached = true

      // Add anti-detection scripts
      await this.injectAntiDetectionScripts()

      return true
    } catch (error) {
      console.error('[BrowserController] Failed to attach:', error)
      this.attached = false
      return false
    }
  }

  /**
   * Detach from current tab
   */
  async detach() {
    if (!this.attached || !this.tabId) return

    try {
      await chrome.debugger.detach({ tabId: this.tabId })
      console.log(`[BrowserController] Detached from tab ${this.tabId}`)
    } catch (error) {
      console.error('[BrowserController] Detach error:', error)
    }

    this.attached = false
    this.tabId = null
    this.browser = null
    this.page = null
  }

  /**
   * Inject anti-detection scripts to avoid bot detection
   */
  async injectAntiDetectionScripts() {
    if (!this.tabId) return

    try {
      await chrome.scripting.executeScript({
        target: { tabId: this.tabId },
        func: () => {
          // Hide webdriver property
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
          })

          // Override permissions query
          const originalQuery = window.navigator.permissions.query
          window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
              Promise.resolve({ state: Notification.permission }) :
              originalQuery(parameters)
          )

          // Force open shadow DOM
          const originalAttachShadow = Element.prototype.attachShadow
          Element.prototype.attachShadow = function attachShadow(options) {
            return originalAttachShadow.call(this, { ...options, mode: "open" })
          }
        }
      })
    } catch (error) {
      console.warn('[BrowserController] Failed to inject anti-detection scripts:', error)
    }
  }

  /**
   * Take screenshot of current page
   */
  async takeScreenshot(fullPage = false) {
    if (!this.tabId) {
      throw new Error('No tab attached')
    }

    try {
      const screenshot = await chrome.tabs.captureVisibleTab(null, {
        format: 'jpeg',
        quality: 80
      })

      return screenshot
    } catch (error) {
      console.error('[BrowserController] Screenshot failed:', error)
      throw error
    }
  }

  /**
   * Navigate to URL
   */
  async navigateTo(url) {
    if (!this.tabId) {
      throw new Error('No tab attached')
    }

    await chrome.tabs.update(this.tabId, { url })
    
    // Wait for page load
    await this.waitForPageLoad()
  }

  /**
   * Go back in history
   */
  async goBack() {
    if (!this.tabId) {
      throw new Error('No tab attached')
    }

    await chrome.tabs.goBack(this.tabId)
    await this.waitForPageLoad()
  }

  /**
   * Wait for page to load
   */
  async waitForPageLoad(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Page load timeout'))
      }, timeout)

      const listener = (tabId, changeInfo) => {
        if (tabId === this.tabId && changeInfo.status === 'complete') {
          clearTimeout(timeoutId)
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }

      chrome.tabs.onUpdated.addListener(listener)
    })
  }

  /**
   * Execute script in page context
   */
  async executeScript(func, args = []) {
    if (!this.tabId) {
      throw new Error('No tab attached')
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: this.tabId },
        func: func,
        args: args
      })

      return results[0]?.result
    } catch (error) {
      console.error('[BrowserController] Script execution failed:', error)
      throw error
    }
  }

  /**
   * Get scroll information
   */
  async getScrollInfo() {
    return await this.executeScript(() => {
      return [
        window.scrollY,
        window.visualViewport?.height || window.innerHeight,
        document.documentElement.scrollHeight
      ]
    })
  }

  /**
   * Scroll to percentage
   */
  async scrollToPercent(yPercent) {
    await this.executeScript((percent) => {
      const scrollHeight = document.documentElement.scrollHeight
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const scrollTop = (scrollHeight - viewportHeight) * (percent / 100)
      
      window.scrollTo({
        top: scrollTop,
        left: window.scrollX,
        behavior: 'smooth'
      })
    }, [yPercent])

    // Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 600))
  }

  /**
   * Scroll to text
   */
  async scrollToText(text, nth = 1) {
    return await this.executeScript((searchText, occurrence) => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      )

      let count = 0
      let node

      while (node = walker.nextNode()) {
        if (node.textContent.includes(searchText)) {
          count++
          if (count === occurrence) {
            const element = node.parentElement
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return true
          }
        }
      }

      return false
    }, [text, nth])
  }

  /**
   * Send keyboard keys
   */
  async sendKeys(keys) {
    if (!this.tabId) {
      throw new Error('No tab attached')
    }

    // Parse key combination (e.g., "Control+C")
    const parts = keys.split('+')
    const modifiers = parts.slice(0, -1).map(k => k.toLowerCase())
    const mainKey = parts[parts.length - 1]

    await this.executeScript((key, mods) => {
      const event = new KeyboardEvent('keydown', {
        key: key,
        code: key,
        bubbles: true,
        cancelable: true,
        ctrlKey: mods.includes('control') || mods.includes('ctrl'),
        shiftKey: mods.includes('shift'),
        altKey: mods.includes('alt'),
        metaKey: mods.includes('meta') || mods.includes('command')
      })

      document.activeElement.dispatchEvent(event)
    }, [mainKey, modifiers])
  }

  /**
   * Check if attached
   */
  isAttached() {
    return this.attached
  }

  /**
   * Get current tab ID
   */
  getTabId() {
    return this.tabId
  }
}

// Export singleton instance
const browserController = new BrowserController()

export default browserController
