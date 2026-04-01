"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ConversationList from "./ConversationList";
import ConversationView from "./ConversationView";
import NewConversationModal from "./NewConversationModal";
import DarkModeToggle from "@/components/DarkModeToggle";

export type CurrentUser = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
};

export type ConversationParticipant = {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  joined_at?: string;
  last_read_at?: string;
  is_self?: boolean;
};

export type LastMessage = {
  id: string;
  content: string | null;
  message_type: string;
  deleted: boolean;
  created_at: string;
  sender_name: string;
} | null;

export type Conversation = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  participants: ConversationParticipant[];
  other_participants: ConversationParticipant[];
  last_message: LastMessage;
  unread_count: number;
};

export default function MessagesClient({
  currentUser,
  initialConversationId,
}: {
  currentUser: CurrentUser;
  initialConversationId: string | null;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId);
  const [mobileView, setMobileView] = useState<"list" | "conversation">(
    initialConversationId ? "conversation" : "list"
  );
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/messages/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime: listen for new messages to update conversation list
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("messages-list-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          // Re-fetch conversations to update last message + unread counts
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  function handleSelectConversation(id: string) {
    setSelectedId(id);
    setMobileView("conversation");
    // Update unread count locally
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
    // Update browser URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set("conversation", id);
    window.history.replaceState({}, "", url.toString());
  }

  function handleBackToList() {
    setMobileView("list");
  }

  function handleConversationCreated(id: string) {
    setShowNewModal(false);
    fetchConversations();
    handleSelectConversation(id);
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
      {/* Header */}
      <header className="nrs-header shrink-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold tracking-wide text-sm" style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
              Ragnarök
            </Link>
            <span style={{ color: "var(--nrs-border)" }}>/</span>
            <span className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>Messages</span>
            {totalUnread > 0 && (
              <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentUser.role === "super_admin" && (
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                </svg>
                New
              </button>
            )}
            {currentUser.role === "admin" && (
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                </svg>
                New DM
              </button>
            )}
            <Link
              href="/account"
              className="nrs-nav-link px-2"
            >
              Account
            </Link>
            <DarkModeToggle isSignedIn={true} />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — conversation list */}
        <div
          className={`shrink-0 w-full md:w-80 flex flex-col overflow-hidden ${mobileView === "list" ? "flex" : "hidden md:flex"}`}
          style={{ borderRight: "1px solid var(--nrs-border)" }}
        >
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            currentUserId={currentUser.id}
            loading={loading}
            onSelect={handleSelectConversation}
          />
        </div>

        {/* Right panel — conversation view */}
        <div
          className={`
            flex-1 flex flex-col overflow-hidden
            ${mobileView === "conversation" ? "flex" : "hidden md:flex"}
          `}
        >
          {selectedConversation ? (
            <ConversationView
              key={selectedId!}
              conversation={selectedConversation}
              currentUser={currentUser}
              onBack={handleBackToList}
              onConversationDeleted={() => {
                setSelectedId(null);
                setMobileView("list");
                fetchConversations();
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--nrs-text-muted)" }}>
              <div className="text-center">
                <div className="text-4xl mb-3">💬</div>
                <p>Select a conversation to start messaging</p>
                <p className="mt-1 text-xs text-neutral-600">
                  Only admins and super admins can use this feature
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New conversation modal */}
      {showNewModal && (
        <NewConversationModal
          currentUser={currentUser}
          onClose={() => setShowNewModal(false)}
          onCreated={handleConversationCreated}
        />
      )}
    </div>
  );
}
