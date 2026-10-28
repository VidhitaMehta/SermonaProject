import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  Sparkles,
  Search,
  Send,
  Hash,
  Smile,
  Code2,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Terminal,
  Paperclip,
  Flame,
  Check,
  TrendingUp,
  X,
  Loader2,
} from 'lucide-react';

export const ChatWorkspace: React.FC = () => {
  const {
    channels,
    activeChannelId,
    messages,
    sendMessage,
    addReaction,
    analyzeCurrentChannel,
    isAnalyzing,
    searchQuery,
    setSearchQuery,
    project,
  } = useWorkspace();

  const [inputContent, setInputContent] = useState('');
  const [showCodeSnippetModal, setShowCodeSnippetModal] = useState(false);
  const [snippetLanguage, setSnippetLanguage] = useState('python');
  const [snippetCode, setSnippetCode] = useState('');
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channel = channels.find((c) => c.id === activeChannelId);
  const currentMessages = messages[activeChannelId] || [];

  // Filter messages based on search query
  const filteredMessages = currentMessages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.content.toLowerCase().includes(query) ||
      m.senderName.toLowerCase().includes(query) ||
      m.senderRole.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length, activeChannelId]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim()) return;
    sendMessage(inputContent);
    setInputContent('');
  };

  const handleSendSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetCode.trim()) return;
    sendMessage(inputContent || 'Shared code benchmark snippet:', {
      language: snippetLanguage,
      code: snippetCode.trim(),
    });
    setSnippetCode('');
    setInputContent('');
    setShowCodeSnippetModal(false);
  };

  const commonEmojis = ['✅', '🔥', '👀', '📊', '🚀', '🙌'];

  const quickPromptTemplates = [
    {
      label: 'Decision Confirmed',
      text: 'Decision confirmed: We are going to lock this architecture and proceed with implementation.',
    },
    {
      label: 'Volunteer for Task',
      text: 'I will take this task and commit the results to the repo by tomorrow 3 PM.',
    },
    {
      label: 'Raise Open Question',
      text: 'Open question for the team: What specific metric threshold are we aiming for on the test set?',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden relative">
      {/* Channel Header Bar */}
      <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/70 backdrop-blur-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
            <Hash className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="truncate">{channel?.name || 'channel'}</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <p className="text-xs text-slate-400 truncate hidden sm:block">
            {channel?.topic || 'Discussion topic'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in channel..."
              className="w-36 md:w-52 pl-8 pr-7 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:w-60 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Analyze Conversation Button */}
          <button
            onClick={analyzeCurrentChannel}
            disabled={isAnalyzing || currentMessages.length === 0}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span className="hidden sm:inline">Analyzing with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Analyze Conversation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Welcome Message Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 border border-slate-800/80 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Welcome to #{channel?.name}
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {channel?.topic}
              </p>
              <div className="flex items-center gap-2 mt-3 text-[11px] text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tip: Click "Analyze Conversation" above to turn these discussions into decisions and actionable tasks!</span>
              </div>
            </div>
          </div>
        </div>

        {searchQuery && (
          <div className="text-xs text-slate-400 pb-2 border-b border-slate-800 flex items-center justify-between">
            <span>
              Showing {filteredMessages.length} results for "<strong className="text-slate-200">{searchQuery}</strong>"
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-emerald-400 hover:underline"
            >
              Clear filter
            </button>
          </div>
        )}

        {filteredMessages.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            No messages found in this channel.
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isDecisionMention =
              msg.content.toLowerCase().includes('decision confirmed') ||
              msg.content.toLowerCase().includes('settled');

            return (
              <div
                key={msg.id}
                className={`group flex items-start gap-3.5 p-2 rounded-2xl transition-colors relative hover:bg-slate-850/60 ${
                  isDecisionMention ? 'bg-emerald-500/5 border border-emerald-500/20' : ''
                }`}
              >
                {/* Sender Avatar */}
                <img
                  src={msg.senderAvatar}
                  alt={msg.senderName}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-slate-700 mt-0.5"
                />

                {/* Message Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-200 hover:underline cursor-pointer">
                      {msg.senderName}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                      {msg.senderRole}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isDecisionMention && (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5" /> Key Decision
                      </span>
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-['Plus_Jakarta_Sans'] break-words">
                    {msg.content}
                  </div>

                  {/* Code snippet if present */}
                  {msg.codeSnippet && (
                    <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                      <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] font-mono text-emerald-400 flex items-center justify-between">
                        <span>{msg.codeSnippet.language}</span>
                        <Terminal className="w-3 h-3 text-slate-500" />
                      </div>
                      <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto">
                        <code>{msg.codeSnippet.code}</code>
                      </pre>
                    </div>
                  )}

                  {/* Reactions */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {Object.entries(msg.reactions).map(([emoji, uids]) => (
                        <button
                          key={emoji}
                          onClick={() => addReaction(msg.id, emoji)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 text-xs transition-colors cursor-pointer"
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] font-semibold text-slate-400">{uids.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover Quick Action toolbar */}
                <div className="absolute right-3 top-2 hidden group-hover:flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-750 shadow-lg">
                  {commonEmojis.slice(0, 3).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addReaction(msg.id, emoji)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-800 text-xs transition-colors cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      setActiveReactionPickerMsgId(
                        activeReactionPickerMsgId === msg.id ? null : msg.id
                      )
                    }
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Add reaction"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Reaction Picker Dropdown */}
                {activeReactionPickerMsgId === msg.id && (
                  <div className="absolute right-3 top-10 flex items-center gap-1 p-1.5 rounded-xl bg-slate-900 border border-slate-750 shadow-2xl z-20">
                    {commonEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          addReaction(msg.id, emoji);
                          setActiveReactionPickerMsgId(null);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-sm transition-colors cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Helper */}
      <div className="px-5 pb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-semibold text-slate-500 uppercase flex-shrink-0">
          Quick Snippets:
        </span>
        {quickPromptTemplates.map((template, idx) => (
          <button
            key={idx}
            onClick={() => setInputContent(template.text)}
            className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-lg bg-slate-950/70 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            {template.label}
          </button>
        ))}
      </div>

      {/* Input Composer */}
      <div className="p-4 bg-slate-950/90 border-t border-slate-800">
        <form onSubmit={handleSend} className="relative">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-emerald-500/80 transition-colors p-2.5 shadow-inner">
            <textarea
              rows={2}
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message #${channel?.name || 'channel'} (Press Enter to send, Shift+Enter for newline)...`}
              className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none leading-relaxed font-['Plus_Jakarta_Sans']"
            />

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 mt-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowCodeSnippetModal(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Attach code snippet"
                >
                  <Code2 className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-slate-500 pl-2 hidden md:inline">
                  Markdown formatting supported
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!inputContent.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Code Snippet Modal */}
      {showCodeSnippetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCodeSnippetModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
              <Code2 className="w-4 h-4 text-emerald-400" />
              Attach Code Snippet
            </h3>
            <form onSubmit={handleSendSnippet} className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Language
                </label>
                <select
                  value={snippetLanguage}
                  onChange={(e) => setSnippetLanguage(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="python">Python</option>
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="json">JSON</option>
                  <option value="sql">SQL</option>
                  <option value="bash">Bash / Shell</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Code
                </label>
                <textarea
                  rows={8}
                  required
                  value={snippetCode}
                  onChange={(e) => setSnippetCode(e.target.value)}
                  placeholder="Paste benchmark code or query here..."
                  className="w-full p-3 font-mono text-xs rounded-xl bg-slate-950 border border-slate-750 text-emerald-400 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCodeSnippetModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Post Snippet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
