/**
 * Action Context for ActionBuilder
 * Provides all necessary methods for action handlers
 */

// Import action system
import('./actions/builder.js').then(({ ActionBuilder }) => {
  import('./actions/types.js').then(({ ActionResult }) => {
    
    // Create action context
    const ActionContext = {
      /**
       * Get element by index from DOM tree
       */
      getElementByIndex(index) {
        return DOMTreeManager.getByIndex(index)
      },

      /**
       * Highlight element
       */
      highlightElement(index, type = 'default') {
        DOMTreeManager.highlight(index, type)
      },

      /**
       * Show tooltip on element
       */
      showTooltip(element, text) {
        Utils.showTooltip(element, text)
      },

      /**
       * Sleep for milliseconds
       */
      async sleep(ms) {
        return Utils.sleep(ms)
      },

      /**
       * Send message to background script
       */
      async sendMessage(type, payload) {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type, payload }, response => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError)
            } else {
              resolve(response)
            }
          })
        })
      },

      /**
       * Log message
       */
      log(message) {
        console.log(`[ActionContext] ${message}`)
      }
    }

    // Build actions
    const actionBuilder = new ActionBuilder(ActionContext)
    const actionRegistry = actionBuilder.buildDefaultActions()

    console.log(`[Mini Bot] Loaded ${actionRegistry.getAll().length} actions`)

    // Replace old executor with new one
    window.MiniBotExecutor = {
      /**
       * Execute action plan using new action system
       */
      async executeActionPlan(actions, reasoning) {
        console.log(`[Executor] Starting execution of ${actions.length} actions`)
        console.log(`[Executor] Reasoning: ${reasoning}`)

        const results = []
        let isDone = false

        // Send initial status
        chrome.runtime.sendMessage({
          type: 'EXECUTION_STATUS',
          payload: {
            status: 'executing',
            message: `Executing ${actions.length} actions...`,
            progress: { current: 0, total: actions.length }
          }
        })

        for (let i = 0; i < actions.length && !isDone; i++) {
          const actionData = actions[i]
          const actionName = actionData.action

          console.log(`[Executor] Step ${i + 1}/${actions.length}: ${actionName}`, actionData)

          // Send progress update
          chrome.runtime.sendMessage({
            type: 'EXECUTION_STATUS',
            payload: {
              status: 'executing',
              message: `Executing: ${actionName}`,
              progress: { current: i + 1, total: actions.length }
            }
          })

          try {
            // Get action from registry
            const action = actionRegistry.get(actionName)

            if (!action) {
              const error = `Unknown action: ${actionName}`
              console.error(`[Executor] ${error}`)
              results.push(new ActionResult({
                success: false,
                error
              }))
              continue
            }

            // Execute action
            const result = await action.call(actionData)
            results.push(result)

            console.log(`[Executor] ✅ Action succeeded:`, result)

            // Check if task is done
            if (result.isDone) {
              isDone = true
              console.log(`[Executor] Task marked as done`)
            }

          } catch (error) {
            console.error(`[Executor] ❌ Action failed:`, error)
            results.push(new ActionResult({
              success: false,
              error: error.message
            }))
          }

          // Small delay between actions
          await Utils.sleep(CONFIG.delays.betweenActions)
        }

        // Clear highlights
        DOMTreeManager.clearHighlights()

        // Build completion message
        const successCount = results.filter(r => r.success !== false && !r.error).length
        const failCount = results.filter(r => r.success === false || r.error).length

        let detailedMessage = `<div style="margin-bottom: 8px; font-weight: bold; color: ${failCount > 0 ? '#ef4444' : '#10b981'}">`
        detailedMessage += `Execution ${failCount > 0 ? 'Completed with issues' : 'Finished successfully'}`
        detailedMessage += `</div>`

        detailedMessage += `<div style="display: flex; flex-direction: column; gap: 4px;">`
        results.forEach((res, idx) => {
          const color = (res.success !== false && !res.error) ? '#059669' : '#dc2626'
          const icon = (res.success !== false && !res.error) ? '✓' : '✗'
          const actionName = actions[idx]?.action || 'unknown'
          const desc = res.extractedContent || actionName

          detailedMessage += `
            <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 11px;">
              <span style="color: ${color}; font-weight: bold; flex-shrink: 0;">${icon}</span>
              <span style="color: #4b5563;">${desc}</span>
              ${res.error ? `<div style="color: #ef4444; font-size: 10px; margin-left: 14px; margin-top: -2px;">${res.error}</div>` : ''}
            </div>`
        })
        detailedMessage += `</div>`

        // Send completion status
        chrome.runtime.sendMessage({
          type: 'EXECUTION_STATUS',
          payload: {
            status: 'completed',
            message: detailedMessage,
            results
          }
        })

        console.log(`[Executor] Execution complete: ${successCount} succeeded, ${failCount} failed`)

        return results
      },

      /**
       * Stop execution
       */
      stop() {
        console.log(`[Executor] Stop requested`)
        // TODO: Implement stop logic
      }
    }

    console.log('[Mini Bot] New action system initialized')
  })
})
