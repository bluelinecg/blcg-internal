'use client';

// Emails page — unified multi-account inbox with split-view layout.
// Left panel: filterable thread list (by account and folder).
// Right panel: full thread detail with message history and reply box.
// Threads are fetched live from Gmail API via /api/emails.
// Full message bodies are loaded on demand when a thread is selected.

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Select, Badge, ConfirmDialog, Spinner } from '@/components/ui';
import { ComposeEmailModal } from '@/components/modules';
import type { EmailThread, EmailAccount, EmailFolder } from '@/lib/types/emails';

const ACCOUNT_OPTIONS = [
  { value: 'all', label: 'All Accounts' },
  { value: 'ryan@bluelinecg.com', label: 'ryan@bluelinecg.com' },
  { value: 'nick@bluelinecg.com', label: 'nick@bluelinecg.com' },
  { value: 'bluelinecgllc@gmail.com', label: 'bluelinecgllc@gmail.com' },
];

const FOLDER_OPTIONS = [
  { value: 'all', label: 'All Folders' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'sent', label: 'Sent' },
  { value: 'drafts', label: 'Drafts' },
];

const ACCOUNT_COLORS: Record<EmailAccount, string> = {
  'ryan@bluelinecg.com':     'bg-brand-blue text-white',
  'nick@bluelinecg.com':     'bg-brand-navy text-white',
  'bluelinecgllc@gmail.com': 'bg-red-500 text-white',
};

const ACCOUNT_SHORT: Record<EmailAccount, string> = {
  'ryan@bluelinecg.com':     'R',
  'nick@bluelinecg.com':     'N',
  'bluelinecgllc@gmail.com': 'G',
};

export function EmailsPage() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);

  const [accountFilter, setAccountFilter] = useState<EmailAccount | 'all'>('all');
  const [folderFilter, setFolderFilter] = useState<EmailFolder | 'all'>('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmailThread | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch thread list on mount
  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/emails');
      const json = await res.json() as { data: EmailThread[] | null; error: string | null };
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to load emails');
      setThreads(json.data ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadThreads(); }, [loadThreads]);

  // Load full thread content when a thread is selected
  async function handleSelectThread(thread: EmailThread) {
    // Optimistically show the thread with metadata while full content loads
    setSelectedThread(thread);
    setIsLoadingThread(true);
    setThreadError(null);
    try {
      const res = await fetch(`/api/emails/${thread.id}`);
      const json = await res.json() as { data: EmailThread | null; error: string | null };
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to load thread');
      setSelectedThread(json.data);

      // Mark as read if unread
      if (!thread.isRead) {
        setThreads((prev) =>
          prev.map((t) => (t.id === thread.id ? { ...t, isRead: true } : t))
        );
        await fetch(`/api/emails/${thread.id}/read`, { method: 'PATCH' });
      }
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : 'Failed to load thread');
    } finally {
      setIsLoadingThread(false);
    }
  }

  async function handleSend(data: {
    from: EmailAccount;
    to: string;
    cc: string;
    subject: string;
    body: string;
  }) {
    await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // Reload list to pick up the sent thread
    void loadThreads();
  }

  async function handleReply(threadId: string, body: string) {
    await fetch(`/api/emails/${threadId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    // Reload the thread to show the sent reply
    if (selectedThread) await handleSelectThread(selectedThread);
  }

  async function confirmDeleteThread() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/emails/${deleteTarget.id}`, { method: 'DELETE' });
      setThreads((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      if (selectedThread?.id === deleteTarget.id) setSelectedThread(null);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  const filteredThreads = useMemo(() => {
    return threads
      .filter((t) => {
        const matchesAccount = accountFilter === 'all' || t.account === accountFilter;
        const matchesFolder = folderFilter === 'all' || t.folder === folderFilter;
        return matchesAccount && matchesFolder;
      })
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [threads, accountFilter, folderFilter]);

  const unreadCount = threads.filter((t) => !t.isRead).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Emails</h2>
          <p className="mt-1 text-sm text-gray-500">
            Unified inbox across all accounts
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-brand-blue px-2 py-0.5 text-xs font-semibold text-white">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setComposeOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 transition-colors"
        >
          + Compose
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Select
          options={ACCOUNT_OPTIONS}
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value as EmailAccount | 'all')}
          className="w-52"
        />
        <Select
          options={FOLDER_OPTIONS}
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value as EmailFolder | 'all')}
          className="w-36"
        />
        <span className="text-xs text-gray-400">{filteredThreads.length} threads</span>
        <button
          onClick={() => void loadThreads()}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ↺ Refresh
        </button>
      </div>

      {/* Loading / error states */}
      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}
      {!isLoading && fetchError && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-red-500">{fetchError}</p>
        </div>
      )}

      {/* Split view */}
      {!isLoading && !fetchError && (
        <div className="flex flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {/* Thread list */}
          <div className="flex flex-col w-80 flex-shrink-0 overflow-y-auto border-r border-gray-200">
            {filteredThreads.length === 0 ? (
              <div className="flex items-center justify-center flex-1 py-16">
                <p className="text-sm text-gray-400">No threads found.</p>
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => void handleSelectThread(thread)}
                  className={`flex flex-col gap-1 px-4 py-3.5 text-left border-b border-gray-100 transition-colors hover:bg-gray-50 cursor-pointer ${
                    selectedThread?.id === thread.id
                      ? 'bg-brand-blue/5 border-l-2 border-l-brand-blue'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${ACCOUNT_COLORS[thread.account]}`}
                        title={thread.account}
                      >
                        {ACCOUNT_SHORT[thread.account]}
                      </span>
                      <span
                        className={`text-sm truncate ${
                          !thread.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {thread.subject}
                      </span>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      {formatRelativeTime(thread.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-7">
                    <p className="text-xs text-gray-400 truncate">{thread.preview}</p>
                    {!thread.isRead && (
                      <span className="flex-shrink-0 h-2 w-2 rounded-full bg-brand-blue" />
                    )}
                  </div>
                  <div className="pl-7 flex items-center justify-between">
                    <Badge variant="gray">{thread.folder}</Badge>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(thread);
                      }}
                      className="text-gray-300 hover:text-red-400 transition-colors text-xs px-1"
                      title="Delete thread"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Thread detail */}
          <div className="flex flex-col flex-1 overflow-y-auto">
            {isLoadingThread ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : threadError ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-red-500">{threadError}</p>
              </div>
            ) : selectedThread ? (
              <ThreadDetail
                thread={selectedThread}
                onReply={(body) => void handleReply(selectedThread.id, body)}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-gray-400">Select a thread to read it.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose modal */}
      <ComposeEmailModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={handleSend}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteThread()}
        title="Delete Thread"
        description={`Are you sure you want to delete "${deleteTarget?.subject}"? It will be moved to trash.`}
      />
    </div>
  );
}

export default EmailsPage;

// --- Thread detail panel ---

interface ThreadDetailProps {
  thread: EmailThread;
  onReply: (body: string) => void;
}

function ThreadDetail({ thread, onReply }: ThreadDetailProps) {
  const [replyBody, setReplyBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSendReply() {
    if (!replyBody.trim()) return;
    setIsSending(true);
    setSendError(null);
    try {
      onReply(replyBody);
      setReplyBody('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Thread header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{thread.subject}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{thread.participants.join(', ')}</span>
          <Badge variant="gray">{thread.folder}</Badge>
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold ${ACCOUNT_COLORS[thread.account]}`}
            title={thread.account}
          >
            {ACCOUNT_SHORT[thread.account]}
          </span>
          <span className="text-xs text-gray-400">{thread.account}</span>
        </div>
      </div>

      {/* Messages */}
      {thread.messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <p className="text-sm text-gray-400">Loading messages…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-6">
          {thread.messages.map((msg, index) => {
            const isFromUs =
              msg.from.includes('bluelinecg.com') ||
              msg.from.includes('bluelinecgllc@gmail.com');

            return (
              <div key={msg.id} className={`flex flex-col ${isFromUs ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-xl rounded-lg px-4 py-3 ${
                    isFromUs
                      ? 'bg-brand-blue/10 border border-brand-blue/20'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-xs font-semibold text-gray-700">{msg.from}</span>
                    <span className="text-xs text-gray-400">{formatDateTime(msg.timestamp)}</span>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {msg.body}
                  </div>
                  <div className="mt-2 flex flex-col gap-0.5">
                    <span className="text-xs text-gray-400">To: {msg.to.join(', ')}</span>
                    {msg.cc && msg.cc.length > 0 && (
                      <span className="text-xs text-gray-400">CC: {msg.cc.join(', ')}</span>
                    )}
                  </div>
                </div>
                {index < thread.messages.length - 1 && (
                  <div className="flex items-center gap-2 my-1">
                    <div className="w-px h-4 bg-gray-200 mx-auto" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply box */}
      <div className="mt-auto px-6 pb-6">
        {sendError && <p className="text-xs text-red-500 mb-2">{sendError}</p>}
        <div className="rounded-lg border border-gray-200 p-3">
          <textarea
            className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none outline-none min-h-20"
            placeholder="Reply to this thread…"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            disabled={isSending}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => void handleSendReply()}
              disabled={isSending || !replyBody.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending…' : 'Send Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
