/**
 * Action Result Class
 * Represents the result of an action execution
 */
export class ActionResult {
  constructor({
    isDone = false,
    success = false,
    extractedContent = null,
    error = null,
    includeInMemory = false,
    interactedElement = null
  } = {}) {
    this.isDone = isDone
    this.success = success
    this.extractedContent = extractedContent
    this.error = error
    this.includeInMemory = includeInMemory
    this.interactedElement = interactedElement
  }
}

/**
 * Agent Step Info
 */
export class AgentStepInfo {
  constructor({ stepNumber, maxSteps }) {
    this.stepNumber = stepNumber
    this.maxSteps = maxSteps
  }
}

/**
 * Simple validation helper (Zod-like)
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Schema validator helper
 */
export const SchemaValidator = {
  /**
   * Validate input against schema
   */
  validate(input, schema) {
    const errors = []
    
    // Check required fields
    for (const [key, config] of Object.entries(schema)) {
      if (config.required && !(key in input)) {
        errors.push(`Missing required field: ${key}`)
      }
      
      // Type validation
      if (key in input && input[key] !== null && input[key] !== undefined) {
        const value = input[key]
        const expectedType = config.type
        
        if (expectedType === 'string' && typeof value !== 'string') {
          errors.push(`Field '${key}' must be a string`)
        } else if (expectedType === 'number' && typeof value !== 'number') {
          errors.push(`Field '${key}' must be a number`)
        } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Field '${key}' must be a boolean`)
        }
        
        // Min/max validation for numbers
        if (expectedType === 'number') {
          if (config.min !== undefined && value < config.min) {
            errors.push(`Field '${key}' must be >= ${config.min}`)
          }
          if (config.max !== undefined && value > config.max) {
            errors.push(`Field '${key}' must be <= ${config.max}`)
          }
        }
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '))
    }
    
    // Apply defaults
    const result = { ...input }
    for (const [key, config] of Object.entries(schema)) {
      if (!(key in result) && 'default' in config) {
        result[key] = config.default
      }
    }
    
    return result
  }
}
