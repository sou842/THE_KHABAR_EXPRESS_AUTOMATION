import { Action, ActionRegistry } from './action.js'
import { ActionResult } from './types.js'
import * as schemas from './schemas.js'

/**
 * Action Builder
 * Creates and registers all available actions with their handlers
 */
export class ActionBuilder {
  constructor(context) {
    this.context = context
    this.registry = new ActionRegistry()
  }

  /**
   * Build and register all default actions
   */
  buildDefaultActions() {
    // Task completion
    this.registry.register(new Action(
      this.handleDone.bind(this),
      schemas.doneActionSchema
    ))

    // Navigation actions
    this.registry.register(new Action(
      this.handleSearchGoogle.bind(this),
      schemas.searchGoogleActionSchema
    ))

    this.registry.register(new Action(
      this.handleGoToUrl.bind(this),
      schemas.goToUrlActionSchema
    ))

    this.registry.register(new Action(
      this.handleGoBack.bind(this),
      schemas.goBackActionSchema
    ))

    // Element interaction actions
    this.registry.register(new Action(
      this.handleClickElement.bind(this),
      schemas.clickElementActionSchema,
      true // hasIndex
    ))

    this.registry.register(new Action(
      this.handleInputText.bind(this),
      schemas.inputTextActionSchema,
      true // hasIndex
    ))

    // Tab management actions
    this.registry.register(new Action(
      this.handleSwitchTab.bind(this),
      schemas.switchTabActionSchema
    ))

    this.registry.register(new Action(
      this.handleOpenTab.bind(this),
      schemas.openTabActionSchema
    ))

    this.registry.register(new Action(
      this.handleCloseTab.bind(this),
      schemas.closeTabActionSchema
    ))

    // Scrolling actions
    this.registry.register(new Action(
      this.handleScrollToPercent.bind(this),
      schemas.scrollToPercentActionSchema
    ))

    this.registry.register(new Action(
      this.handleScrollToTop.bind(this),
      schemas.scrollToTopActionSchema
    ))

    this.registry.register(new Action(
      this.handleScrollToBottom.bind(this),
      schemas.scrollToBottomActionSchema
    ))

    this.registry.register(new Action(
      this.handlePreviousPage.bind(this),
      schemas.previousPageActionSchema
    ))

    this.registry.register(new Action(
      this.handleNextPage.bind(this),
      schemas.nextPageActionSchema
    ))

    this.registry.register(new Action(
      this.handleScrollToText.bind(this),
      schemas.scrollToTextActionSchema
    ))

    // Keyboard actions
    this.registry.register(new Action(
      this.handleSendKeys.bind(this),
      schemas.sendKeysActionSchema
    ))

    // Dropdown actions
    this.registry.register(new Action(
      this.handleGetDropdownOptions.bind(this),
      schemas.getDropdownOptionsActionSchema,
      true // hasIndex
    ))

    this.registry.register(new Action(
      this.handleSelectDropdownOption.bind(this),
      schemas.selectDropdownOptionActionSchema,
      true // hasIndex
    ))

    // Content actions
    this.registry.register(new Action(
      this.handleCacheContent.bind(this),
      schemas.cacheContentActionSchema
    ))

    // Utility actions
    this.registry.register(new Action(
      this.handleWait.bind(this),
      schemas.waitActionSchema
    ))

    return this.registry
  }

  // ==================================================
  // ACTION HANDLERS
  // ==================================================

  /**
   * Handle done action
   */
  async handleDone(input) {
    this.context.log(`✅ Task complete: ${input.text}`)
    
    return new ActionResult({
      isDone: true,
      success: input.success,
      extractedContent: input.text,
      includeInMemory: true
    })
  }

  /**
   * Handle search Google action
   */
  async handleSearchGoogle(input) {
    const { query, intent } = input
    this.context.log(intent || `🔍 Searching Google for: ${query}`)

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
    window.location.href = searchUrl

    const msg = `Searched Google for: ${query}`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle go to URL action
   */
  async handleGoToUrl(input) {
    const { url, intent } = input
    this.context.log(intent || `🌐 Navigating to: ${url}`)

    window.location.href = url

    const msg = `Navigated to: ${url}`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle go back action
   */
  async handleGoBack(input) {
    const { intent } = input
    this.context.log(intent || `⬅️ Going back`)

    window.history.back()

    const msg = `Went back to previous page`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle click element action
   */
  async handleClickElement(input) {
    const { index, intent } = input
    this.context.log(intent || `👆 Clicking element ${index}`)

    const element = this.context.getElementByIndex(index)
    if (!element) {
      throw new Error(`Element with index ${index} not found`)
    }

    // Highlight element
    this.context.highlightElement(index)
    this.context.showTooltip(element, `Clicking element ${index}...`)

    await this.context.sleep(200)

    // Click element
    element.click()
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    this.context.highlightElement(index, 'success')
    await this.context.sleep(500)

    const msg = `Clicked element ${index}`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true,
      interactedElement: { index, xpath: input.xpath }
    })
  }

  /**
   * Handle input text action
   */
  async handleInputText(input) {
    const { index, text, intent } = input
    this.context.log(intent || `⌨️ Typing into element ${index}`)

    const element = this.context.getElementByIndex(index)
    if (!element) {
      throw new Error(`Element with index ${index} not found`)
    }

    // Highlight and focus
    this.context.highlightElement(index)
    this.context.showTooltip(element, `Typing: ${text}`)
    
    element.focus()
    await this.context.sleep(100)

    // Clear existing value
    element.value = ''
    element.dispatchEvent(new Event('input', { bubbles: true }))

    // Type text character by character
    for (const char of text) {
      element.value += char
      element.dispatchEvent(new Event('input', { bubbles: true }))
      await this.context.sleep(50)
    }

    // Trigger change event
    element.dispatchEvent(new Event('change', { bubbles: true }))
    element.blur()

    this.context.highlightElement(index, 'success')
    await this.context.sleep(300)

    const msg = `Typed "${text}" into element ${index}`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true,
      interactedElement: { index, xpath: input.xpath }
    })
  }

  /**
   * Handle switch tab action
   */
  async handleSwitchTab(input) {
    const { tab_id, intent } = input
    this.context.log(intent || `🔄 Switching to tab ${tab_id}`)

    await this.context.sendMessage('SWITCH_TAB', { tabId: tab_id })

    const msg = `Switched to tab ${tab_id}`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle open tab action
   */
  async handleOpenTab(input) {
    const { url, intent } = input
    this.context.log(intent || `➕ Opening new tab: ${url}`)

    await this.context.sendMessage('OPEN_TAB', { url })

    const msg = `Opened new tab with: ${url}`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle close tab action
   */
  async handleCloseTab(input) {
    const { tab_id, intent } = input
    this.context.log(intent || `❌ Closing tab ${tab_id}`)

    await this.context.sendMessage('CLOSE_TAB', { tabId: tab_id })

    const msg = `Closed tab ${tab_id}`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle scroll to percent action
   */
  async handleScrollToPercent(input) {
    const { yPercent, index, intent } = input
    this.context.log(intent || `📜 Scrolling to ${yPercent}%`)

    if (index !== undefined && index !== null) {
      // Scroll within element
      const element = this.context.getElementByIndex(index)
      if (!element) {
        throw new Error(`Element with index ${index} not found`)
      }

      const scrollHeight = element.scrollHeight
      const clientHeight = element.clientHeight
      const scrollTop = (scrollHeight - clientHeight) * (yPercent / 100)

      element.scrollTo({
        top: scrollTop,
        left: element.scrollLeft,
        behavior: 'smooth'
      })
    } else {
      // Scroll page
      const scrollHeight = document.documentElement.scrollHeight
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const scrollTop = (scrollHeight - viewportHeight) * (yPercent / 100)

      window.scrollTo({
        top: scrollTop,
        left: window.scrollX,
        behavior: 'smooth'
      })
    }

    await this.context.sleep(800)

    const msg = `Scrolled to ${yPercent}%`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle scroll to top action
   */
  async handleScrollToTop(input) {
    const { index, intent } = input
    this.context.log(intent || `⬆️ Scrolling to top`)

    if (index !== undefined && index !== null) {
      const element = this.context.getElementByIndex(index)
      if (element) {
        element.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    await this.context.sleep(500)

    const msg = `Scrolled to top`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle scroll to bottom action
   */
  async handleScrollToBottom(input) {
    const { index, intent } = input
    this.context.log(intent || `⬇️ Scrolling to bottom`)

    if (index !== undefined && index !== null) {
      const element = this.context.getElementByIndex(index)
      if (element) {
        element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
      }
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
    }

    await this.context.sleep(500)

    const msg = `Scrolled to bottom`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle previous page action
   */
  async handlePreviousPage(input) {
    const { index, intent } = input
    this.context.log(intent || `⬆️ Scrolling to previous page`)

    const scrollAmount = -(window.visualViewport?.height || window.innerHeight)

    if (index !== undefined && index !== null) {
      const element = this.context.getElementByIndex(index)
      if (element) {
        element.scrollBy({ top: scrollAmount, behavior: 'smooth' })
      }
    } else {
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' })
    }

    await this.context.sleep(500)

    const msg = `Scrolled to previous page`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle next page action
   */
  async handleNextPage(input) {
    const { index, intent } = input
    this.context.log(intent || `⬇️ Scrolling to next page`)

    const scrollAmount = window.visualViewport?.height || window.innerHeight

    if (index !== undefined && index !== null) {
      const element = this.context.getElementByIndex(index)
      if (element) {
        element.scrollBy({ top: scrollAmount, behavior: 'smooth' })
      }
    } else {
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' })
    }

    await this.context.sleep(500)

    const msg = `Scrolled to next page`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle scroll to text action
   */
  async handleScrollToText(input) {
    const { text, nth, intent } = input
    this.context.log(intent || `🔍 Scrolling to text: ${text}`)

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )

    let count = 0
    let node

    while (node = walker.nextNode()) {
      if (node.textContent.includes(text)) {
        count++
        if (count === nth) {
          const element = node.parentElement
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          await this.context.sleep(500)

          const msg = `Scrolled to text: "${text}"`
          return new ActionResult({
            success: true,
            extractedContent: msg,
            includeInMemory: true
          })
        }
      }
    }

    throw new Error(`Text "${text}" not found (occurrence ${nth})`)
  }

  /**
   * Handle send keys action
   */
  async handleSendKeys(input) {
    const { keys, intent } = input
    this.context.log(intent || `⌨️ Sending keys: ${keys}`)

    // Parse key combination (e.g., "Control+C")
    const parts = keys.split('+')
    const modifiers = parts.slice(0, -1).map(k => k.toLowerCase())
    const mainKey = parts[parts.length - 1]

    const event = new KeyboardEvent('keydown', {
      key: mainKey,
      code: mainKey,
      bubbles: true,
      cancelable: true,
      ctrlKey: modifiers.includes('control') || modifiers.includes('ctrl'),
      shiftKey: modifiers.includes('shift'),
      altKey: modifiers.includes('alt'),
      metaKey: modifiers.includes('meta') || modifiers.includes('command')
    })

    document.activeElement.dispatchEvent(event)
    await this.context.sleep(100)

    const msg = `Sent keys: ${keys}`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle get dropdown options action
   */
  async handleGetDropdownOptions(input) {
    const { index, intent } = input
    this.context.log(intent || `📋 Getting dropdown options from element ${index}`)

    const element = this.context.getElementByIndex(index)
    if (!element || element.tagName !== 'SELECT') {
      throw new Error(`Element ${index} is not a dropdown`)
    }

    const options = Array.from(element.options).map((opt, idx) => ({
      index: idx,
      text: opt.text,
      value: opt.value
    }))

    const msg = `Found ${options.length} options in dropdown ${index}`
    return new ActionResult({
      success: true,
      extractedContent: JSON.stringify(options),
      includeInMemory: true
    })
  }

  /**
   * Handle select dropdown option action
   */
  async handleSelectDropdownOption(input) {
    const { index, text, intent } = input
    this.context.log(intent || `📋 Selecting "${text}" from dropdown ${index}`)

    const element = this.context.getElementByIndex(index)
    if (!element || element.tagName !== 'SELECT') {
      throw new Error(`Element ${index} is not a dropdown`)
    }

    this.context.highlightElement(index)
    this.context.showTooltip(element, `Selecting: ${text}`)

    // Find matching option
    const options = Array.from(element.options)
    const match = options.find(opt =>
      opt.value === text ||
      opt.text === text ||
      opt.text.toLowerCase().includes(text.toLowerCase())
    )

    if (!match) {
      throw new Error(`Option "${text}" not found in dropdown ${index}`)
    }

    element.value = match.value
    element.dispatchEvent(new Event('change', { bubbles: true }))

    this.context.highlightElement(index, 'success')
    await this.context.sleep(300)

    const msg = `Selected "${text}" from dropdown ${index}`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true,
      interactedElement: { index }
    })
  }

  /**
   * Handle cache content action
   */
  async handleCacheContent(input) {
    const { content, intent } = input
    this.context.log(intent || `💾 Caching content`)

    // Store in session storage
    const cached = JSON.parse(sessionStorage.getItem('minibot_cache') || '[]')
    cached.push({
      content,
      timestamp: Date.now(),
      url: window.location.href
    })
    sessionStorage.setItem('minibot_cache', JSON.stringify(cached))

    const msg = `Cached content`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }

  /**
   * Handle wait action
   */
  async handleWait(input) {
    const { seconds, intent } = input
    this.context.log(intent || `⏳ Waiting ${seconds} seconds`)

    await this.context.sleep(seconds * 1000)

    const msg = `Waited ${seconds} seconds`
    return new ActionResult({
      success: true,
      extractedContent: msg,
      includeInMemory: true
    })
  }
}
