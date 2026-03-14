/**
 * Action Schemas
 * Defines all available actions with their validation schemas
 * Ported from chrome-extension/src/background/agent/actions/schemas.ts
 */

// ==================================================
// TASK COMPLETION
// ==================================================

export const doneActionSchema = {
  name: 'done',
  description: 'Complete task and return final result',
  schema: {
    text: {
      type: 'string',
      required: true,
      description: 'Summary of what was accomplished'
    },
    success: {
      type: 'boolean',
      required: true,
      description: 'Whether the task was successful'
    }
  }
}

// ==================================================
// NAVIGATION ACTIONS
// ==================================================

export const searchGoogleActionSchema = {
  name: 'search_google',
  description: 'Search the query in Google in the current tab. Query should be concrete and not vague or super long.',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    query: {
      type: 'string',
      required: true,
      description: 'Search query'
    }
  }
}

export const goToUrlActionSchema = {
  name: 'go_to_url',
  description: 'Navigate to URL in the current tab',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    url: {
      type: 'string',
      required: true,
      description: 'URL to navigate to'
    }
  }
}

export const goBackActionSchema = {
  name: 'go_back',
  description: 'Go back to the previous page',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    }
  }
}

// ==================================================
// ELEMENT INTERACTION ACTIONS
// ==================================================

export const clickElementActionSchema = {
  name: 'click_element',
  description: 'Click element by index',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    index: {
      type: 'number',
      required: true,
      description: 'Index of the element to click'
    },
    xpath: {
      type: 'string',
      required: false,
      description: 'XPath of the element (optional)'
    }
  }
}

export const inputTextActionSchema = {
  name: 'input_text',
  description: 'Input text into an interactive input element',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    index: {
      type: 'number',
      required: true,
      description: 'Index of the input element'
    },
    text: {
      type: 'string',
      required: true,
      description: 'Text to input'
    },
    xpath: {
      type: 'string',
      required: false,
      description: 'XPath of the element (optional)'
    }
  }
}

// ==================================================
// TAB MANAGEMENT ACTIONS
// ==================================================

export const switchTabActionSchema = {
  name: 'switch_tab',
  description: 'Switch to tab by tab id',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    tab_id: {
      type: 'number',
      required: true,
      description: 'ID of the tab to switch to'
    }
  }
}

export const openTabActionSchema = {
  name: 'open_tab',
  description: 'Open URL in new tab',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    url: {
      type: 'string',
      required: true,
      description: 'URL to open in new tab'
    }
  }
}

export const closeTabActionSchema = {
  name: 'close_tab',
  description: 'Close tab by tab id',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    tab_id: {
      type: 'number',
      required: true,
      description: 'ID of the tab to close'
    }
  }
}

// ==================================================
// SCROLLING ACTIONS
// ==================================================

export const scrollToPercentActionSchema = {
  name: 'scroll_to_percent',
  description: 'Scrolls to a particular vertical percentage of the document or an element. If no index is specified, scroll the whole document.',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    yPercent: {
      type: 'number',
      required: true,
      min: 0,
      max: 100,
      description: 'Percentage to scroll to (0 = top, 100 = bottom)'
    },
    index: {
      type: 'number',
      required: false,
      description: 'Index of element to scroll (optional)'
    }
  }
}

export const scrollToTopActionSchema = {
  name: 'scroll_to_top',
  description: 'Scroll the document in the window or an element to the top',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    index: {
      type: 'number',
      required: false,
      description: 'Index of element to scroll (optional)'
    }
  }
}

export const scrollToBottomActionSchema = {
  name: 'scroll_to_bottom',
  description: 'Scroll the document in the window or an element to the bottom',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    index: {
      type: 'number',
      required: false,
      description: 'Index of element to scroll (optional)'
    }
  }
}

export const previousPageActionSchema = {
  name: 'previous_page',
  description: 'Scroll the document in the window or an element to the previous page. If no index is specified, scroll the whole document.',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    index: {
      type: 'number',
      required: false,
      description: 'Index of element to scroll (optional)'
    }
  }
}

export const nextPageActionSchema = {
  name: 'next_page',
  description: 'Scroll the document in the window or an element to the next page. If no index is specified, scroll the whole document.',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    index: {
      type: 'number',
      required: false,
      description: 'Index of element to scroll (optional)'
    }
  }
}

export const scrollToTextActionSchema = {
  name: 'scroll_to_text',
  description: 'If you dont find something which you want to interact with in current viewport, try to scroll to it',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    text: {
      type: 'string',
      required: true,
      description: 'Text to scroll to'
    },
    nth: {
      type: 'number',
      required: false,
      default: 1,
      min: 1,
      description: 'Which occurrence of the text to scroll to (1-indexed)'
    }
  }
}

// ==================================================
// KEYBOARD ACTIONS
// ==================================================

export const sendKeysActionSchema = {
  name: 'send_keys',
  description: 'Send strings of special keys like Backspace, Insert, PageDown, Delete, Enter. Shortcuts such as Control+o, Control+Shift+T are supported as well.',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    keys: {
      type: 'string',
      required: true,
      description: 'Keys to send (e.g., "Control+C", "Enter")'
    }
  }
}

// ==================================================
// DROPDOWN ACTIONS
// ==================================================

export const getDropdownOptionsActionSchema = {
  name: 'get_dropdown_options',
  description: 'Get all options from a native dropdown',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    index: {
      type: 'number',
      required: true,
      description: 'Index of the dropdown element'
    }
  }
}

export const selectDropdownOptionActionSchema = {
  name: 'select_dropdown_option',
  description: 'Select dropdown option for interactive element index by the text of the option you want to select',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    index: {
      type: 'number',
      required: true,
      description: 'Index of the dropdown element'
    },
    text: {
      type: 'string',
      required: true,
      description: 'Text of the option to select'
    }
  }
}

// ==================================================
// CONTENT ACTIONS
// ==================================================

export const cacheContentActionSchema = {
  name: 'cache_content',
  description: 'Cache what you have found so far from the current page for future use',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    content: {
      type: 'string',
      required: true,
      description: 'Content to cache'
    }
  }
}

// ==================================================
// UTILITY ACTIONS
// ==================================================

export const waitActionSchema = {
  name: 'wait',
  description: 'Wait for x seconds (default 3). Do NOT use this action unless user asks to wait explicitly.',
  schema: {
    intent: {
      type: 'string',
      required: false,
      default: '',
      description: 'Purpose of this action'
    },
    seconds: {
      type: 'number',
      required: false,
      default: 3,
      description: 'Amount of seconds to wait'
    }
  }
}

// ==================================================
// EXPORT ALL SCHEMAS
// ==================================================

export const ALL_ACTION_SCHEMAS = [
  doneActionSchema,
  searchGoogleActionSchema,
  goToUrlActionSchema,
  goBackActionSchema,
  clickElementActionSchema,
  inputTextActionSchema,
  switchTabActionSchema,
  openTabActionSchema,
  closeTabActionSchema,
  scrollToPercentActionSchema,
  scrollToTopActionSchema,
  scrollToBottomActionSchema,
  previousPageActionSchema,
  nextPageActionSchema,
  scrollToTextActionSchema,
  sendKeysActionSchema,
  getDropdownOptionsActionSchema,
  selectDropdownOptionActionSchema,
  cacheContentActionSchema,
  waitActionSchema
]
