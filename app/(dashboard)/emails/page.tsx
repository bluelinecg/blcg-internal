'use client';

// Emails page — unified multi-account inbox with split-view layout.
// Left panel: filterable thread list (by account and folder).
// Right panel: full thread detail with message history.
// Accounts: ryan@bluelinecg.com | nick@bluelinecg.com | bluelinecgllc@gmail.com

import { useState, useMemo } from 'react';
import { PageShell } from '@/components/layout';
import { Select, Badge, ConfirmDialog } from '@/components/ui';
import { ComposeEmailModal } from '@/components/modules';
import { MOCK_EMAIL_THREADS } from '@/lib/mock/emails';
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
  'ryan@bluelinecg.com':    'bg-brand-blue text-white',
  'nick@bluelinecg.com':    'bg-brand-navy text-white',
  'bluelinecgllc@gmail.com': 'bg-red-500 text-white',
};

const ACCOUNT_SHORT: Record<EmailAccount, string> = {
  'ryan@bluelinecg.com':    'R',
  'nick@bluelinecg.com':    'N',
  'bluelinecgllc@gmail.com': 'G',
};

export function EmailsPage() {
  const [threads, setThreads] = useState<EmailThread[]>(MOCK_EMAIL_THREADS);
  const [accountFilter, setAccountFilter] = useState<EmailAccount | 'all'>('all');
  const [folderFilter, setFolderFilter] = useState<EmailFolder | 'all'>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    MOCK_EMAIL_THREADS[0]?.id ?? null
  );
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmailThread | null>(null);

  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      const matchesAccount = accountFilter === 'all' || t.account === accountFilter;
      const matchesFolder = folderFilter === 'all' || t.folder === folderFilter;
      return matchesAccount && matchesFolder;
    }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [threads, accountFilter, folderFilter]);

  const selectedThread = threads.find((t) => t.id === selectedThreadId) ?? null;

  function handleSend(data: { from: EmailAccount; to: string; cc: string; subject: string; body: string }) {
    const now = new Date().toISOString();
    const newThread: EmailThread = {
      id: `thread_${Date.now()}`,
      subject: data.subject,
      participants: [data.from, data.to, ...(data.cc ? [data.cc] : [])],
      messages: [{
        id: `msg_${Date.now()}`,
        threadId: `thread_${Date.now()}`,
        from: data.from,
        to: [data.to],
        cc: data.cc ? [data.cc] : undefined,
        subject: data.subject,
        body: data.body,
        timestamp: now,
        isRead: true,
        folder: 'sent',
        account: data.from,
      }],
      lastMessageAt: now,
      isRead: true,
      account: data.from,
      folder: 'sent',
      preview: data.body.slice(0, 120),
    };
    setThreads((prev) => [newThread, ...prev]);
    setSelectedThreadId(newThread.id);
  }

  function confirmDeleteThread() {
    if (!deleteTarget) return;
    setThreads((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    if (selectedThreadId === deleteTarget.id) setSelectedThreadId(null);
    setDeleteTarget(null);
  }

  const unreadCount = threads.filter((t) => !t.isRead).length;

  return (
    // Override PageShell overflow to allow the split view to fill height
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
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Thread list */}
        <div className="flex flex-col w-80 flex-shrink-0 overflow-y-auto border-r border-gray-200">
          {filteredThreads.length === 0 ? (
            <div className="flex items-center justify-center flex-1 py-16">
              <p className="text-sm text-gray-400">No threads found.</p>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className={`flex flex-col gap-1 px-4 py-3.5 text-left border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                  selectedThreadId === thread.id ? 'bg-brand-blue/5 border-l-2 border-l-brand-blue' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Account dot */}
                    <span
                      className={`flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${ACCOUNT_COLORS[thread.account]}`}
                      title={thread.account}
                    >
                      {ACCOUNT_SHORT[thread.account]}
                    </span>
                    <span className={`text-sm truncate ${!thread.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
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
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(thread); }}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xs px-1"
                    title="Delete thread"
                  >✕</button>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Thread detail */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {selectedThread ? (
            <ThreadDetail thread={selectedThread} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-gray-400">Select a thread to read it.</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      <ComposeEmailModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={handleSend}
      />

      {/* Delete thread confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteThread}
        title="Delete Thread"
        description={`Are you sure you want to delete the thread "${deleteTarget?.subject}"? This cannot be undone.`}
      />
    </div>
  );
}

export default EmailsPage;

// --- Thread detail panel ---

interface ThreadDetailProps {
  thread: EmailThread;
}

function ThreadDetail({ thread }: ThreadDetailProps) {
  return (
    <div className="flex flex-col">
      {/* Thread header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{thread.subject}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">
            {thread.participants.join(', ')}
          </span>
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
      <div className="flex flex-col gap-4 p-6">
        {thread.messages.map((msg, index) => {
          const isFromUs = msg.from.includes('bluelinecg.com') || msg.from.includes('bluelinecgllc@gmail.com');

          return (
            <div key={msg.id} className={`flex flex-col ${isFromUs ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-xl rounded-lg px-4 py-3 ${
                  isFromUs
                    ? 'bg-brand-blue/10 border border-brand-blue/20'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {/* Sender + time */}
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-xs font-semibold text-gray-700">{msg.from}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(msg.timestamp)}</span>
                </div>

                {/* Body */}
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {msg.body}
                </div>

                {/* To/CC */}
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

      {/* Reply box */}
      <div className="mt-auto px-6 pb-6">
        <div className="rounded-lg border border-gray-200 p-3">
          <textarea
            className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none outline-none min-h-20"
            placeholder="Reply to this thread..."
          />
          <div className="flex justify-end mt-2">
            <button className="inline-flex items-center gap-2 rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 transition-colors">
              Send Reply
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
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
