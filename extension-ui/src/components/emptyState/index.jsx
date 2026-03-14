// Import required icons from lucide-react
import {
    Zap,
    Bot,
    Sparkles,
    FileText,
    Lightbulb,
    Loader2,
} from 'lucide-react'

export default function EmptyState({ handleCommandSubmit, command, setCommand, isAutofilling }) {

    return (
        <div>
            <div className="text-center px-4">
                {/* Icon Grid - Shows multiple capabilities */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-12 h-12 bg-blue-500/100/10 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-sm">
                        <Zap className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="w-12 h-12 bg-purple-500/100/10 rounded-xl flex items-center justify-center border border-purple-500/20 shadow-sm">
                        <Bot className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/100/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-sm">
                        <Sparkles className="w-6 h-6 text-emerald-400" />
                    </div>
                </div>

                {/* Main Heading */}
                <h3 className="text-sm font-semibold text-zinc-100 mb-2">
                    AI-Powered Web Automation testing
                </h3>

                {/* Description */}
                <p className="text-xs text-zinc-400 leading-relaxed max-w-[300px] mx-auto mb-4">
                    Intelligently fill forms, automate workflows, and interact with any website using AI-driven automation.
                </p>

                <form onSubmit={handleCommandSubmit} className="relative mb-3">
                    <textarea
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        disabled={isAutofilling}
                        placeholder="How can I help you today?"
                        className="w-full h-12 pl-3 pr-10 py-3.5 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-full text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-500"
                    />
                    <button
                        type="submit"
                        disabled={isAutofilling || !command?.trim()}
                        className="absolute right-1 top-1 bottom-1 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:bg-gray-200 disabled:text-zinc-500"
                    >
                        {isAutofilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    </button>
                </form>

                {/* Capability Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-[320px] mx-auto">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-medium rounded-full border border-blue-500/20">
                        <FileText className="w-3 h-3" />
                        Smart Forms
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-medium rounded-full border border-purple-500/20">
                        <Zap className="w-3 h-3" />
                        Auto Actions
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium rounded-full border border-emerald-500/20">
                        <Lightbulb className="w-3 h-3" />
                        AI Insights
                    </span>
                </div>
            </div>
        </div>
    )
}