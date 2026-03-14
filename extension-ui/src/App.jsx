import { useEffect, useState, useCallback } from 'react'
import { Loader2, Zap, Settings, X, Save } from 'lucide-react'
import EmptyState from './components/emptyState'
import { getStatusConfig } from './helper/helper'

export default function App() {
  const [status, setStatus] = useState(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [fieldProgress, setFieldProgress] = useState({ current: 0, total: 0 })
  const [showSettings, setShowSettings] = useState(false)
  const [command, setCommand] = useState('')
  const [userMemory, setUserMemory] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    country: '',
    zipcode: ''
  })

  // Handle incoming messages from background/content scripts
  const handleMessage = useCallback((message) => {
    switch (message.type) {
      case 'STATUS_UPDATE':
        setStatus(message.payload)
        setIsExecuting(message.payload.status === 'analyzing' || 
                      message.payload.status === 'thinking' || 
                      message.payload.status === 'executing')
        
        if (message.payload.status === 'completed' || message.payload.status === 'error') {
          setIsExecuting(false)
        }
        break

      case 'EXECUTION_STATUS':
        setStatus({
          status: message.payload.status,
          message: message.payload.message
        })
        if (message.payload.progress) {
          setFieldProgress(message.payload.progress)
        }
        break
    }
  }, [])

  // Initialize and check status
  useEffect(() => {
    // Check current status on mount
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (response?.isExecuting) {
        setIsExecuting(true)
        setStatus({ status: 'executing', message: response.currentTask })
      }
    })

    // Load user memory
    chrome.runtime.sendMessage({ type: 'GET_USER_MEMORY' }, (response) => {
      if (response?.userMemory) {
        setUserMemory(response.userMemory)
      }
    })

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [handleMessage])

  const saveUserMemory = () => {
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_USER_MEMORY', 
      payload: userMemory 
    }, () => {
      setShowSettings(false)
    })
  }

  const handleCommandSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!command.trim() || isExecuting) return

    setIsExecuting(true)
    setStatus({ status: 'analyzing', message: 'Analyzing page and understanding command...' })
    setFieldProgress({ current: 0, total: 0 })

    chrome.runtime.sendMessage({
      type: 'EXECUTE_COMMAND',
      payload: { command: command.trim() }
    }, (response) => {
      if (response?.error) {
        setStatus({ status: 'error', message: response.error })
        setIsExecuting(false)
      } else {
        setCommand('')
      }
    })
  }

  const renderStatus = () => {
    if (!status) return null

    const config = getStatusConfig(status.status)

    return (
      <div className={`p-3.5 ${config?.bg} border ${config?.border} rounded-lg transition-all duration-300`}>
        <div className="w-full flex flex-col items-start gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-9 h-9 ${config?.iconBg} rounded-lg flex items-center justify-center ${config?.color}`}>
              {config?.icon}
            </div>
            <h4 className={`text-sm font-semibold ${config?.color}`}>
              {status?.title || config?.title}
            </h4>
          </div>
          {status?.message && (
            <p
              dangerouslySetInnerHTML={{ __html: status?.message }}
              className="w-full text-start text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap"
            />
          )}
        </div>
      </div>
    )
  }

  const [manualResponse, setManualResponse] = useState('')

  const handleManualTrigger = () => {
    if (!manualResponse.trim()) return
    
    setIsExecuting(true)
    setStatus({ status: 'analyzing', message: 'Processing manual response...' })

    chrome.runtime.sendMessage({
      type: 'EXECUTE_MANUAL_RESPONSE',
      payload: { response: manualResponse.trim() }
    }, (response) => {
      if (response?.error) {
        setStatus({ status: 'error', message: response.error })
        setIsExecuting(false)
      } else {
        setManualResponse('')
        setShowSettings(false)
      }
    })
  }

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col relative min-h-[400px] text-zinc-100">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">Mini Bot AI</h1>
            <p className="text-[10px] text-zinc-400">Universal Browser Assistant</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${showSettings ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-zinc-800 text-zinc-500'}`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute inset-0 bg-zinc-950 z-20 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="px-5 pt-5 pb-4 border-b border-zinc-900 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Settings & Developer Tools</h2>
            <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-zinc-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* User Memory Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-tight flex items-center gap-2">
                User Memory (Autofill)
              </h3>
              <div className="space-y-4">
                {Object.keys(userMemory).map((key) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{key}</label>
                    <input
                      type="text"
                      value={userMemory[key]}
                      onChange={(e) => setUserMemory({ ...userMemory, [key]: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder={`Enter ${key}...`}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={saveUserMemory}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                Save Configuration
              </button>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Manual Trigger Section */}
            <div className="space-y-4 pb-4">
              <h3 className="text-xs font-bold text-red-600 uppercase tracking-tight flex items-center gap-2">
                Developer Tools (Bypass AI)
              </h3>
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Paste AI JSON Response</label>
                <textarea
                  value={manualResponse}
                  onChange={(e) => setManualResponse(e.target.value)}
                  className="w-full h-32 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-mono focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  placeholder='{"understanding": "...", "actions": [...]}'
                />
              </div>
              <button
                onClick={handleManualTrigger}
                disabled={!manualResponse.trim() || isExecuting}
                className="w-full py-2.5 bg-zinc-100 text-zinc-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-white transition-colors shadow-sm disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                Trigger Manual Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-5 py-6 overflow-auto">
        {/* Empty State */}
        {!status && !isExecuting && (
          <EmptyState
            command={command}
            setCommand={setCommand}
            isAutofilling={isExecuting}
            handleCommandSubmit={handleCommandSubmit}
          />
        )}

        {/* Status Messages */}
        {status && (
          <div className="animate-in slide-in-from-bottom-2 fade-in duration-200">
            {renderStatus()}
          </div>
        )}

        {/* Progress Indicator */}
        {isExecuting && fieldProgress.total > 0 && (
          <div className="mt-6 p-4 bg-blue-500/10/50 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-tighter">Execution Progress</span>
              <span className="text-xs font-bold text-blue-300 tabular-nums">
                {fieldProgress.current} / {fieldProgress.total}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(fieldProgress.current / fieldProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <footer className="p-4 border-t border-zinc-900">
        {(status || isExecuting) && (
          <form onSubmit={handleCommandSubmit} className="relative">
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              disabled={isExecuting}
              placeholder="How can I help you today?"
              className="w-full h-12 pl-4 pr-12 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-500 resize-none"
            />
            <button
              type="submit"
              disabled={isExecuting || !command?.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-colors disabled:bg-zinc-700 disabled:text-zinc-500 shadow-sm"
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            </button>
          </form>
        )}

        <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 font-medium px-1">
          <span>v2.2.0 (Orchestrated)</span>
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
            AI Engine Online
          </span>
        </div>
      </footer>
    </div>
  )
}