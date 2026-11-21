import React, { useState, useRef, useEffect } from 'react';
import { Portal } from './Portal';
import { CHARACTERS, getChannelIdentity } from '../data/channelIdentities';
import { getChannelTheme } from '../data/channelThemes';
import { useWorkspace } from '../context/WorkspaceContext';
import { SwipeToReply } from './SwipeToReply';
import { findMentions, mentionAtCaret, renderWithMentions } from '../lib/mentions';
import { Message } from '../types';
import {
  Settings2,
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
  Trash2,
  Reply,
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
    deleteMessage,
    canDeleteMessage,
    highlightedMessageId,
    setHighlightedMessageId,
    getChannelAdminId,
    isProjectOwner,
    setActiveTab,
    teamMembers,
    setMyChannelCharacter,
    currentUser,
    isChannelGuest,
    jumpToMessage,
  } = useWorkspace();

  const [inputContent, setInputContent] = useState('');
  const [savingCharacter, setSavingCharacter] = useState(false);
  const [showCodeSnippetModal, setShowCodeSnippetModal] = useState(false);
  const [snippetLanguage, setSnippetLanguage] = useState('python');
  const [snippetCode, setSnippetCode] = useState('');
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ---- reply (swipe right / Reply button) ----
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const startReply = (msg: Message) => {
    setReplyTo(msg);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // ---- @mention picker ----
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionCandidates = mention
    ? teamMembers
        .filter((m) => m.id !== currentUser.id && m.name.toLowerCase().includes(mention.query.toLowerCase()))
        .slice(0, 6)
    : [];
  const updateMention = (text: string, caret: number) => {
    setMention(mentionAtCaret(text, caret));
    setMentionIndex(0);
  };
  const pickMention = (memberName: string) => {
    if (!mention) return;
    const caret = inputRef.current?.selectionStart ?? inputContent.length;
    const insert = `@${memberName} `;
    const next = inputContent.slice(0, mention.start) + insert + inputContent.slice(caret);
    setInputContent(next);
    setMention(null);
    const pos = mention.start + insert.length;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    });
  };

  // Mentions + reply info sent along with a message
  const messageExtras = (text: string) => ({
    mentions: findMentions(text, teamMembers),
    replyTo: replyTo
      ? {
          messageId: replyTo.id,
          senderId: replyTo.senderId,
          senderName: replyTo.senderName,
          snippet: (replyTo.content || (replyTo.codeSnippet ? 'Code snippet' : '')).slice(0, 140),
        }
      : undefined,
  });
  const channel = channels.find((c) => c.id === activeChannelId);
  const theme = getChannelTheme(channel?.theme);
  const characterChoices = new Map(teamMembers.map((member) => [member.id, member.channelCharacters]));
  const identityFor = (memberId: string) =>
    getChannelIdentity(theme?.id, memberId, theme ? characterChoices.get(memberId)?.[theme.id] : undefined);
  const myIdentity = identityFor(currentUser.id);
  const adminId = channel ? getChannelAdminId(channel) : '';
  const canChangeTheme = Boolean(channel && adminId === currentUser.id);
  const currentMessages = messages[activeChannelId] || [];

  // Filter messages based on search query
  const filteredMessages = currentMessages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    const identity = identityFor(m.senderId);
    return (
      m.content.toLowerCase().includes(query) ||
      m.senderName.toLowerCase().includes(query) ||
      m.senderRole.toLowerCase().includes(query) ||
      identity?.username.includes(query) ||
      identity?.name.toLowerCase().includes(query)
    );
  });

  // Auto-scroll to the newest message, except while a jump-to-message is in progress
  useEffect(() => {
    if (highlightedMessageId) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMessages.length, activeChannelId]);

  // Jump-to-message: in cloud mode the channel's messages arrive a moment after switching,
  // so wait until the target is actually rendered (re-runs whenever messages change).
  useEffect(() => {
    if (!highlightedMessageId) return;
    const el = document.getElementById(`msg-${highlightedMessageId}`);
    if (!el) return; // not rendered yet
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const clearTimer = setTimeout(() => setHighlightedMessageId(null), 3000);
    return () => clearTimeout(clearTimer);
  }, [highlightedMessageId, activeChannelId, currentMessages.length, setHighlightedMessageId]);

  // Give up if the message never shows up (deleted, or older than the last 500 loaded)
  useEffect(() => {
    if (!highlightedMessageId) return;
    const giveUp = setTimeout(() => {
      if (!document.getElementById(`msg-${highlightedMessageId}`)) setHighlightedMessageId(null);
    }, 8000);
    return () => clearTimeout(giveUp);
  }, [highlightedMessageId, setHighlightedMessageId]);

  // A reply belongs to one channel; drop it when switching
  useEffect(() => {
    setReplyTo(null);
    setMention(null);
  }, [activeChannelId]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim()) return;
    sendMessage(inputContent, undefined, messageExtras(inputContent));
    setInputContent('');
    setReplyTo(null);
    setMention(null);
  };

  const handleSendSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetCode.trim()) return;
    const text = inputContent || 'Shared a code snippet:';
    sendMessage(
      text,
      { language: snippetLanguage, code: snippetCode.trim() },
      messageExtras(text)
    );
    setSnippetCode('');
    setInputContent('');
    setReplyTo(null);
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
    <div className="channel-chat flex-1 min-w-0 flex flex-col h-full bg-slate-900 overflow-hidden relative">
      {/* Channel Header Bar */}
      <div className="min-h-14 py-2 px-3 sm:px-5 flex-wrap border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/70 backdrop-blur-sm z-10 flex-shrink-0">
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

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
          {channel && (canChangeTheme || isProjectOwner) && (
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 hover:border-emerald-500"
              onClick={() => setActiveTab('channel-settings')}
            >
              <Settings2 size={14} aria-hidden="true" /> <span className="hidden sm:inline">Channel settings</span>
            </button>
          )}
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
            onClick={() => analyzeCurrentChannel()}
            disabled={isChannelGuest || isAnalyzing || currentMessages.length === 0}
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
      <div className="channel-messages flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Welcome Message Card */}
        <div className="channel-welcome p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 border border-slate-800/80 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                {theme ? theme.greeting : 'Welcome to'} #{channel?.name}
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
            const identity = identityFor(msg.senderId);
            const isDecisionMention =
              msg.content.toLowerCase().includes('decision confirmed') ||
              msg.content.toLowerCase().includes('settled');
            const mentionsMe = (msg.mentions || []).includes(currentUser.id);

            return (
              <SwipeToReply key={msg.id} onReply={() => startReply(msg)}>
              <div
                id={`msg-${msg.id}`}
                 className={`group animate-pop-in flex items-start gap-3.5 p-2 rounded-2xl transition-colors relative hover:bg-slate-850 ${
                  isDecisionMention ? 'bg-emerald-500/5 border border-emerald-500/20' : ''
                } ${mentionsMe ? 'border-l-2 border-amber-400 bg-amber-500/5' : ''} ${
                  highlightedMessageId === msg.id ? 'ring-2 ring-emerald-400 bg-emerald-500/10' : ''
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
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
                    <span className="text-xs font-bold text-slate-200">
                      {identity?.username ?? msg.senderName}
                    </span>
                    {identity && (
                      <span className="text-[10px] text-slate-400">
                        <span aria-hidden="true">{identity.symbol} </span>{identity.name} · {msg.senderName}
                      </span>
                    )}
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

                  {/* Quoted message this one replies to (click to jump to it) */}
                  {msg.replyTo && (
                    <button
                      type="button"
                      onClick={() => jumpToMessage(msg.replyTo!.messageId, msg.channelId)}
                      className="mb-1.5 block w-full max-w-md text-left border-l-2 border-emerald-400 bg-slate-950/70 hover:bg-slate-950 rounded-r-lg px-2.5 py-1 cursor-pointer"
                      title="Go to the original message"
                    >
                      <span className="block text-[10px] font-semibold text-emerald-400">
                        {identityFor(msg.replyTo.senderId)?.username ?? msg.replyTo.senderName}
                      </span>
                      <span className="block text-[11px] text-slate-400 truncate">{msg.replyTo.snippet}</span>
                    </button>
                  )}

                  {/* Text Content */}
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans break-words">
                    {renderWithMentions(msg.content, teamMembers, currentUser.id)}
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
                  <button
                    onClick={() => startReply(msg)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Reply (or swipe right)"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  {canDeleteMessage(msg) && (
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this message? This cannot be undone.')) deleteMessage(msg.id);
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
              </SwipeToReply>
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
        {theme && myIdentity && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <p>
              <span aria-hidden="true">{myIdentity.symbol} </span>
              Posting as <strong className="text-emerald-400">{myIdentity.username}</strong>
            </p>
            <label className="flex items-center gap-2">
              Character
              <select
                value={myIdentity.handle}
                disabled={savingCharacter}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                onChange={async (event) => {
                  setSavingCharacter(true);
                  try {
                    await setMyChannelCharacter(theme.id, event.target.value);
                  } finally {
                    setSavingCharacter(false);
                  }
                }}
              >
                {CHARACTERS[theme.id].map((character) => (
                  <option key={character.handle} value={character.handle}>{character.name}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        {/* Replying-to preview */}
        {replyTo && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
            <Reply className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <button
              type="button"
              onClick={() => jumpToMessage(replyTo.id, replyTo.channelId)}
              className="flex-1 min-w-0 text-left border-l-2 border-emerald-400 pl-2 cursor-pointer"
            >
              <span className="block text-[10px] font-semibold text-emerald-400">
                Replying to {identityFor(replyTo.senderId)?.username ?? replyTo.senderName}
              </span>
              <span className="block text-[11px] text-slate-400 truncate">
                {replyTo.content || (replyTo.codeSnippet ? 'Code snippet' : '')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-slate-500 hover:text-slate-200"
              title="Cancel reply (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="relative">
          {/* @mention picker */}
          {mention && mentionCandidates.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-30 overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                Tag a teammate
              </div>
              {mentionCandidates.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // keep focus in the textarea
                  onClick={() => pickMention(m.name)}
                  onMouseEnter={() => setMentionIndex(i)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs cursor-pointer ${
                    i === mentionIndex ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <img src={m.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{m.name}</span>
                    <span className="block truncate text-[10px] text-slate-500">{m.role}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-emerald-500/80 transition-colors p-2.5 shadow-inner">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputContent}
              onChange={(e) => {
                setInputContent(e.target.value);
                updateMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
              }}
              onClick={(e) => updateMention(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
              onBlur={() => setMention(null)}
              onKeyDown={(e) => {
                // Keyboard control for the @mention list
                if (mention && mentionCandidates.length > 0) {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const step = e.key === 'ArrowDown' ? 1 : -1;
                    setMentionIndex((i) => (i + step + mentionCandidates.length) % mentionCandidates.length);
                    return;
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    pickMention(mentionCandidates[mentionIndex]?.name || mentionCandidates[0].name);
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setMention(null);
                    return;
                  }
                }
                if (e.key === 'Escape' && replyTo) {
                  e.preventDefault();
                  setReplyTo(null);
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message #${channel?.name || 'channel'} (Enter to send, Shift+Enter for newline, @ to tag someone)...`}
              className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none leading-relaxed font-sans"
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
                  Type @ to tag · swipe a message right to reply
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
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1b1640]/30 backdrop-blur-md animate-fade-up">
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
        </Portal>
      )}
    </div>
  );
};
