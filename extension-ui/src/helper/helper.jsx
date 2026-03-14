import { Check, AlertTriangle, Loader2, Zap } from 'lucide-react'


export const getStatusConfig = (statusType) => {
    const configs = {
        completed: {
            icon: <Check className="w-5 h-5" strokeWidth={2.5} />,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
            title: 'Task Completed',
            iconBg: 'bg-green-500/20'
        },
        error: {
            icon: <AlertTriangle className="w-5 h-5" />,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            title: 'Execution Error',
            iconBg: 'bg-red-500/20'
        },
        blocked: {
            icon: <AlertTriangle className="w-5 h-5" />,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            title: 'Attention Required',
            iconBg: 'bg-amber-500/20'
        },
        analyzing: {
            icon: <Loader2 className="w-5 h-5 animate-spin" />,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            title: 'Analyzing Page...',
            iconBg: 'bg-blue-500/20'
        },
        thinking: {
            icon: <Zap className="w-5 h-5 animate-pulse" />,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            title: 'AI is Planning...',
            iconBg: 'bg-purple-500/20'
        },
        executing: {
            icon: <Loader2 className="w-5 h-5 animate-spin" />,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            title: 'Executing Actions...',
            iconBg: 'bg-indigo-500/20'
        },
        info: {
            icon: <Zap className="w-5 h-5" />,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            title: 'AI info',
            iconBg: 'bg-indigo-500/20'
        }
    }
    return configs[statusType] || configs.executing
}
