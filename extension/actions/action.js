import { SchemaValidator, ValidationError } from './types.js'

/**
 * Invalid Input Error
 */
export class InvalidInputError extends Error {
  constructor(message) {
    super(message)
    this.name = 'InvalidInputError'
  }
}

/**
 * Action Class
 * Represents a single executable action with validation
 */
export class Action {
  constructor(handler, schema, hasIndex = false) {
    this.handler = handler
    this.schema = schema
    this.hasIndex = hasIndex
  }

  /**
   * Call the action with input validation
   */
  async call(input) {
    try {
      // Validate input against schema
      const validated = SchemaValidator.validate(input, this.schema.schema)
      
      // Call the handler with validated input
      return await this.handler(validated)
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new InvalidInputError(error.message)
      }
      throw error
    }
  }

  /**
   * Get action name
   */
  name() {
    return this.schema.name
  }

  /**
   * Get action description
   */
  description() {
    return this.schema.description
  }

  /**
   * Generate prompt for AI
   */
  prompt() {
    const schemaFields = Object.entries(this.schema.schema).map(([key, config]) => {
      const required = config.required ? 'required' : 'optional'
      const type = config.type
      const desc = config.description || ''
      return `  - ${key} (${type}, ${required}): ${desc}`
    }).join('\n')

    return `${this.schema.name}: ${this.schema.description}\n${schemaFields}`
  }

  /**
   * Get index argument from input if this action has an index
   */
  getIndexArg(input) {
    if (!this.hasIndex) {
      return null
    }
    if (input && typeof input === 'object' && 'index' in input) {
      return input.index
    }
    return null
  }

  /**
   * Set index argument in input if this action has an index
   */
  setIndexArg(input, newIndex) {
    if (!this.hasIndex) {
      return false
    }
    if (input && typeof input === 'object') {
      input.index = newIndex
      return true
    }
    return false
  }
}

/**
 * Action Registry
 * Manages a collection of actions
 */
export class ActionRegistry {
  constructor() {
    this.actions = new Map()
  }

  /**
   * Register an action
   */
  register(action) {
    this.actions.set(action.name(), action)
  }

  /**
   * Get action by name
   */
  get(name) {
    return this.actions.get(name)
  }

  /**
   * Get all actions
   */
  getAll() {
    return Array.from(this.actions.values())
  }

  /**
   * Check if action exists
   */
  has(name) {
    return this.actions.has(name)
  }

  /**
   * Generate prompts for all actions
   */
  generatePrompts() {
    return this.getAll()
      .map(action => action.prompt())
      .join('\n\n')
  }
}
