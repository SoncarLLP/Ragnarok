"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, CurrentUser } from "./MessagesClient";
import MessageBubble, { type Message } from "./MessageBubble";
import MessageInput from "./MessageInput";
import GroupSettingsModal from "./GroupSettingsModal";

function SearchBar({
  query,
  onChange,
  results,
  onJump,
  onClose,
}: {
  query: string;
  onChange: (q: string) => void;
  results: { id: string; content: string | null; sender_name: string; created_at: string }[];
  onJump: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-white/10 bg-neutral-900 px-4 py-2">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-neutral-500 shrink-0">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search messages…"
          className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none"
        />
        <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {results.length > 0 && (
        <div className="mt-2 max-h-48 overflow-y-auto space-y-0.5">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => onJump(r.id)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-white/10 transition"
            >
              <p className="text-xs font-semibold text-neutral-400">{r.sender_name}</p>
              <p className="text-xs text-neutral-300 truncate">{r.content}</p>
            </button>
          ))}
        </div>
      )}
      {query.length >= 2 && results.length === 0 && (
        <p className="text-xs text-neutral-600 mt-1">No results found</p>
      )}
    </div>
  );
}

function ReportModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm px-4">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-base font-semibold mb-1">Report Conversation</h3>
        <p className="text-sm text-neutral-400 mb-4">
          Describe why you are reporting this conversation. Super admins will review it.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe the issue…"
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-white/25 resize-none"
        />
        <div className="flex gap-2 mt-4 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onSubmit(reason.trim())}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-40 transition"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

function getConversationTitle(conv: Conversation, currentUserId: string) {
  if (conv.type === "group") return conv.name ?? "Group Chat";
  const other = conv.other_participants[0];
  return other?.display_name ?? "Unknown";
}

export default function ConversationView({
  conversation,
  currentUser,
  onBack,
  onConversationDeleted,
}: {
  conversation: Conversation;
  currentUser: CurrentUser;
  onBack: () => void;
  onConversationDeleted: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; content: string | null; sender_name: string; created_at: string }[]>([]);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = currentUser.role === "super_admin";

  const fetchMessages = useCallback(async (before?: string) => {
    const url = `/api/messages/conversations/${conversation.id}/messages${before ? `?before=${before}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (before) {
      setMessages((prev) => [...(data.messages ?? []), ...prev]);
    } else {
      setMessages(data.messages ?? []);
      setHasMore(data.has_more ?? false);
      setLoading(false);
    }
    setHasMore(data.has_more ?? false);
  }, [conversation.id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages().then(() => {
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
    });

    // Mark as read
    fetch(`/api/messages/mark-read/${conversation.id}`, { method: "POST" });
  }, [conversation.id, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conv-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            fetchMessages().then(() => {
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            });
            // Mark read if viewing
            fetch(`/api/messages/mark-read/${conversation.id}`, { method: "POST" });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Record<string, unknown>;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === updated.id
                  ? {
                      ...m,
                      content: updated.deleted_at ? null : (updated.content as string | null),
                      edited_at: updated.edited_at as string | null,
                      deleted_at: updated.deleted_at as string | null,
                      is_deleted: !!updated.deleted_at,
                    }
                  : m
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          // Re-fetch to update reactions
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, fetchMessages]);

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/messages/conversations/${conversation.id}/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results ?? []);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, conversation.id]);

  function scrollToMessage(msgId: string) {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-amber-500/10");
      setTimeout(() => el.classList.remove("bg-amber-500/10"), 1500);
    }
  }

  async function handleReact(msgId: string, emoji: string) {
    await fetch(
      `/api/messages/conversations/${conversation.id}/messages/${msgId}/reactions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      }
    );
    fetchMessages();
  }

  async function handleDelete(msg: Message) {
    if (!confirm("Delete this message?")) return;
    await fetch(
      `/api/messages/conversations/${conversation.id}/messages/${msg.id}`,
      { method: "DELETE" }
    );
    fetchMessages();
  }

  async function handleReport(reason: string) {
    const res = await fetch(
      `/api/messages/conversations/${conversation.id}/report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }
    );
    setShowReport(false);
    if (res.ok) {
      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 4000);
    }
  }

  async function handleLeave() {
    if (!confirm("Leave this group chat?")) return;
    const res = await fetch(
      `/api/messages/conversations/${conversation.id}/leave`,
      { method: "POST" }
    );
    if (res.ok) onConversationDeleted();
  }

  async function handleDeleteConversation() {
    if (!confirm("Permanently delete this conversation and all its messages?")) return;
    const res = await fetch(`/api/messages/conversations/${conversation.id}`, {
      method: "DELETE",
    });
    if (res.ok) onConversationDeleted();
  }

  async function loadOlderMessages() {
    if (!messages.length || loadingMore) return;
    setLoadingMore(true);
    const oldest = messages[0].created_at;
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    await fetchMessages(oldest);
    setLoadingMore(false);
    // Restore scroll position
    if (container) {
      container.scrollTop = container.scrollHeight - prevScrollHeight;
    }
  }

  const title = getConversationTitle(conversation, currentUser.id);
  const otherParticipant = conversation.other_participants[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Conversation header */}
      <div className="shrink-0 border-b border-white/10 bg-neutral-950/90 backdrop-blur px-4 py-3 flex items-center gap-3">
        {/* Back button (mobile) */}
        <button
          onClick={onBack}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Avatar */}
        {conversation.type === "group" ? (
          <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
            {title.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-semibold text-neutral-300 shrink-0 overflow-hidden">
            {otherParticipant?.avatar_url ? (
              <img src={otherParticipant.avatar_url} alt={title} className="w-full h-full object-cover" />
            ) : (
              title.charAt(0).toUpperCase()
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          <p className="text-xs text-neutral-500 truncate">
            {conversation.type === "group"
              ? `${conversation.participants.length} participants`
              : otherParticipant?.role === "super_admin"
              ? "Super Admin"
              : "Admin"}
          </p>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
            title="Search messages"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>

          {conversation.type === "group" && isSuperAdmin && (
            <button
              onClick={() => setShowGroupSettings(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
              title="Group settings"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {conversation.type === "group" && !isSuperAdmin && (
            <button
              onClick={handleLeave}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
              title="Leave group"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={handleDeleteConversation}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
              title="Delete conversation"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          <button
            onClick={() => setShowReport(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-orange-400 hover:bg-orange-500/10 transition"
            title="Report conversation"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 7l2.55 2.4A1 1 0 0116 11H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <SearchBar
          query={searchQuery}
          onChange={setSearchQuery}
          results={searchResults}
          onJump={(id) => { scrollToMessage(id); setShowSearch(false); setSearchQuery(""); }}
          onClose={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}
        />
      )}

      {/* Report success */}
      {reportSuccess && (
        <div className="shrink-0 px-4 py-2 bg-green-500/10 border-b border-green-500/20 text-xs text-green-400">
          Report submitted. Super admins will review this conversation.
        </div>
      )}

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto py-2"
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadOlderMessages}
              disabled={loadingMore}
              className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
            No messages yet — say hello!
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === currentUser.id}
                currentUserId={currentUser.id}
                onReact={handleReact}
                onReply={(m) => setReplyTo(m)}
                onEdit={(m) => setEditingMessage(m)}
                onDelete={handleDelete}
                onScrollToMessage={scrollToMessage}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <MessageInput
        conversationId={conversation.id}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onMessageSent={() => {
          fetchMessages().then(() => {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          });
        }}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />

      {/* Group settings modal */}
      {showGroupSettings && (
        <GroupSettingsModal
          conversation={conversation}
          currentUser={currentUser}
          onClose={() => setShowGroupSettings(false)}
          onDeleted={onConversationDeleted}
        />
      )}

      {/* Report modal */}
      {showReport && (
        <ReportModal
          onSubmit={handleReport}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
