import React, { useEffect, useState } from 'react';
import { RefreshCw, Trash2, History as HistoryIcon, CheckCircle2, XCircle, Code, MessageSquare, Search, ChevronDown, ChevronUp, Copy, Check, Play, Activity, X } from 'lucide-react';
import { executionHistoryStore } from '@extension/storage';
import type { ExecutionHistoryItem } from '@extension/storage';
import { CopyBlock, dracula } from "react-code-blocks";

export const HistoryDashboard = () => {
  const [history, setHistory] = useState<ExecutionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await executionHistoryStore.get();
      // Sort newest first
      setHistory(data.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Failed to load history', error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all execution logs? This cannot be undone.')) {
      await executionHistoryStore.clear();
      setHistory([]);
      setExpandedItems(new Set());
    }
  };

  const deleteSingleItem = async (timestamp: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this execution log?')) {
      await executionHistoryStore.delete(timestamp);
      setHistory(prev => prev.filter(item => item.timestamp !== timestamp));
    }
  };

  const toggleExpand = (timestamp: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(timestamp)) {
        next.delete(timestamp);
      } else {
        next.add(timestamp);
      }
      return next;
    });
  };

  const filteredHistory = history.filter(item =>
    item.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.resultText || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black font-sans">
        <div className="flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-white animate-spin" />
          <p className="text-zinc-400 font-medium text-sm tracking-wide">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-6 py-10 w-full font-display text-zinc-100 selection:bg-white selection:text-black">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        <header className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
          {/* Top bar with title + actions */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-widest uppercase italic leading-none">Execution Logs</h1>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mt-1">Industrial Grade Process Monitoring</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-white transition-all duration-150 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 transition-all duration-150 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search bar — full width, prominent */}
          <div className="px-6 py-3 bg-white/[0.02]">
            <div className="relative group">
              <Search className="w-4 h-4 text-zinc-600 group-focus-within:text-white absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-150" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter logs by command, result, or status..."
                className="w-full bg-zinc-950/50 border border-zinc-800/60 focus:border-white focus:bg-zinc-950 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none transition-all duration-150 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed shadow-sm">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-5 border border-zinc-800 shadow-xl">
              <Activity className="w-8 h-8 text-zinc-700" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Zero Cycles Recorded</h3>
            <p className="text-zinc-500 text-xs font-medium mt-2 max-w-sm text-center leading-relaxed italic">The interface is idle. Run a task to initialize the stream.</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed shadow-sm">
            <Search className="w-12 h-12 text-zinc-800 mb-4" />
            <h3 className="text-lg font-black text-zinc-400 uppercase">Input mismatch</h3>
            <p className="text-zinc-600 text-xs mt-2 uppercase font-bold tracking-widest">No matching logs found in registry</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredHistory?.map((item, index) => {
              const isExpanded = expandedItems.has(item.timestamp);

              return (
                <div key={item.timestamp + index} className="flex flex-col bg-zinc-900/40 border border-zinc-800/60 rounded-2xl shadow-sm overflow-hidden hover:border-white/20 transition-all group/card">

                  {/* Meta details & Accordion Header */}
                  <div
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-transparent hover:bg-white/[0.03] px-5 py-5 cursor-pointer gap-4 transition-colors"
                    onClick={() => toggleExpand(item.timestamp)}
                  >
                    <div className="flex items-start gap-4 flex-1 w-full overflow-hidden">
                      <div className="flex flex-col gap-2 shrink-0">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs font-black font-mono shadow-inner group-hover/card:border-white/20 transition-colors">
                          {history.length - history.indexOf(item)}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black tracking-widest text-zinc-500 shrink-0 uppercase">
                            {formatDate(item.timestamp)}
                          </span>

                          {item.success === true && <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-white text-black shrink-0"><CheckCircle2 className="w-3 h-3" />Complete</span>}
                          {item.success === false && <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0"><XCircle className="w-3 h-3" />Interrupt</span>}

                          <span className="truncate max-w-[120px] text-[9px] font-black text-white uppercase bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 hidden sm:block shrink-0 group-hover/card:border-zinc-600 transition-colors" title={item.url}>{new URL(item.url).hostname.replace('www.', '')}</span>
                        </div>

                        {/* Snippet Preview in collapsed state */}
                        <p className={`text-sm text-zinc-300 font-semibold ${isExpanded ? '' : 'truncate w-full'} leading-relaxed tracking-tight`}>
                          {item?.command}
                        </p>
                      </div>
                    </div>

                    {/* Actions right side */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={(e) => deleteSingleItem(item.timestamp, e)}
                        className="p-2 text-zinc-600 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        title="Delete log entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="p-2 text-zinc-600 group-hover/card:text-white transition-all">
                        {isExpanded ? <ChevronUp className="w-5 h-5 shadow-2xl" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="flex flex-col border-t border-white/5 bg-black/40 p-6 animate-in slide-in-from-top-2 fade-in duration-300">

                      {/* Response side */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-5">
                          <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-white opacity-50" />
                            Data Extraction Feed
                          </h4>
                          {item.resultText && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(item.resultText!, item.timestamp);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all border border-zinc-800 hover:border-zinc-600 uppercase tracking-widest"
                            >
                              {copiedId === item.timestamp ? (
                                <><Check className="w-3.5 h-3.5" /> <span>Captured</span></>
                              ) : (
                                <><Copy className="w-3.5 h-3.5" /> <span>Copy</span></>
                              )}
                            </button>
                          )}
                        </div>
                        {item.resultText ? (
                          <div className="bg-zinc-950 border text-xs border-zinc-800 rounded-2xl overflow-hidden shadow-2xl custom-scrollbar font-mono ring-1 ring-white/5">
                            <CopyBlock
                              text={item.resultText}
                              language="js"
                              showLineNumbers={true}
                              codeBlock={true}
                              theme={dracula}
                            />
                          </div>
                        ) : (
                          item.error ? (
                            <div className="p-5 bg-black border border-white/10 text-white rounded-2xl text-xs font-bold leading-relaxed max-w-2xl italic">
                              <span className="text-zinc-500 uppercase tracking-[0.2em] block mb-2 font-black">Exception Alert:</span> {item.error}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-12 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-950/50 max-w-2xl">
                              <div className="flex items-center gap-4 text-white text-[10px] font-black uppercase tracking-[0.35em]">
                                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping opacity-50"></span>
                                Streaming output
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  );
};
