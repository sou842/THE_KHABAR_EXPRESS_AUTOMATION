// ==================================================
// DOM TREE BUILDER - Index-based Element Identification
// ==================================================

/**
 * Builds an indexed tree of interactive elements on the page
 * Adapted from chrome-extension reference for mini-bot
 */

(function() {
  'use strict'

  // Configuration
  const CONFIG = {
    interactiveSelectors: [
      'a[href]',
      'button',
      'input:not([type="hidden"])',
      'textarea',
      'select',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="textbox"]',
      '[onclick]',
      '[contenteditable="true"]'
    ],
    maxElements: 500
  }

  /**
   * Check if element is visible and interactable
   */
  function isInteractable(element) {
    if (!element) return false

    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetParent !== null &&
      rect.width > 0 &&
      rect.height > 0 &&
      !element.disabled &&
      !element.readOnly
    )
  }

  /**
   * Get XPath for an element
   */
  function getXPath(element) {
    if (!element) return ''
    if (element.id) return `//*[@id="${element.id}"]`

    const parts = []
    let current = element

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 0
      let sibling = current.previousSibling

      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
          index++
        }
        sibling = sibling.previousSibling
      }

      const tagName = current.nodeName.toLowerCase()
      const part = index > 0 ? `${tagName}[${index + 1}]` : tagName
      parts.unshift(part)

      current = current.parentNode
    }

    return '/' + parts.join('/')
  }

  /**
   * Get descriptive label for element
   */
  function getElementLabel(element) {
    // Try aria-label
    if (element.getAttribute('aria-label')) {
      return element.getAttribute('aria-label').trim()
    }

    // Try associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`)
      if (label) return label.textContent.trim()
    }

    // Try parent label
    const parentLabel = element.closest('label')
    if (parentLabel) {
      return parentLabel.textContent.trim()
    }

    // Try placeholder
    if (element.placeholder) {
      return element.placeholder.trim()
    }

    // Try button/link text
    if (element.textContent && element.textContent.trim().length < 100) {
      return element.textContent.trim()
    }

    // Try name attribute
    if (element.name) {
      return element.name
    }

    // Try value for buttons
    if (element.value && (element.tagName === 'BUTTON' || element.type === 'submit')) {
      return element.value
    }

    return ''
  }

  /**
   * Build element tree with indices
   */
  function buildElementTree() {
    const elements = []
    const selectorMap = new Map()
    let index = 0

    // Find all interactive elements
    const selector = CONFIG.interactiveSelectors.join(', ')
    const allElements = document.querySelectorAll(selector)

    for (const element of allElements) {
      if (!isInteractable(element)) continue
      if (index >= CONFIG.maxElements) break

      const elementData = {
        index: index,
        tagName: element.tagName.toLowerCase(),
        type: element.type || '',
        xpath: getXPath(element),
        label: getElementLabel(element),
        id: element.id || '',
        name: element.name || '',
        className: element.className || '',
        href: element.href || '',
        placeholder: element.placeholder || '',
        value: element.value || '',
        textContent: element.textContent?.trim().substring(0, 100) || '',
        rect: {
          x: element.getBoundingClientRect().x,
          y: element.getBoundingClientRect().y,
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height
        }
      }

      elements.push(elementData)
      selectorMap.set(index, element)
      
      // Store index on element for quick lookup
      element.setAttribute('data-minibot-index', index)

      index++
    }

    return {
      elements,
      selectorMap,
      count: elements.length,
      timestamp: Date.now()
    }
  }

  /**
   * Get element by index
   */
  function getElementByIndex(index) {
    const element = document.querySelector(`[data-minibot-index="${index}"]`)
    return element && isInteractable(element) ? element : null
  }

  /**
   * Highlight element by index
   */
  function highlightElement(index, type = 'default') {
    const element = getElementByIndex(index)
    if (!element) return false

    // Remove previous highlights
    document.querySelectorAll('.minibot-highlight').forEach(el => {
      el.classList.remove('minibot-highlight', 'minibot-highlight-success', 'minibot-highlight-error')
    })

    // Add highlight
    const className = type === 'success' 
      ? 'minibot-highlight-success'
      : type === 'error'
        ? 'minibot-highlight-error'
        : 'minibot-highlight'

    element.classList.add(className)
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })

    return true
  }

  /**
   * Clear all highlights
   */
  function clearHighlights() {
    document.querySelectorAll('.minibot-highlight, .minibot-highlight-success, .minibot-highlight-error')
      .forEach(el => {
        el.classList.remove('minibot-highlight', 'minibot-highlight-success', 'minibot-highlight-error')
      })
  }

  /**
   * Get element tree as JSON for AI context
   */
  function getElementTreeForAI() {
    const tree = buildElementTree()
    
    // Format for AI consumption
    const formatted = tree.elements.map(el => {
      let desc = `[${el.index}] ${el.tagName}`
      
      if (el.type) desc += `[${el.type}]`
      if (el.label) desc += ` "${el.label}"`
      else if (el.textContent) desc += ` "${el.textContent}"`
      else if (el.placeholder) desc += ` placeholder="${el.placeholder}"`
      
      if (el.name) desc += ` name="${el.name}"`
      if (el.id) desc += ` id="${el.id}"`

      return desc
    })

    return {
      summary: `Found ${tree.count} interactive elements`,
      elements: formatted.join('\n'),
      count: tree.count
    }
  }

  // Expose API to content script
  window.MiniBotDOMTree = {
    build: buildElementTree,
    getByIndex: getElementByIndex,
    highlight: highlightElement,
    clearHighlights: clearHighlights,
    getForAI: getElementTreeForAI
  }

  console.log('[MiniBotDOMTree] DOM tree builder loaded')
})()
