"use client";

import type { Conversation } from "./MessagesClient";

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const day = 1000 * 60 * 60 * 24;

  if (diff < 60 * 1000) return "now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m`;
  if (diff < day) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * day) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${dim} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full bg-neutral-700 flex items-center justify-center font-semibold text-neutral-300 shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function getConversationLabel(conv: Conversation, currentUserId: string) {
  if (conv.type === "group") return conv.name ?? "Group Chat";
  const other = conv.other_participants[0];
  return other?.display_name ?? "Unknown";
}

function getConversationAvatar(conv: Conversation, currentUserId: string) {
  if (conv.type === "group") return { name: conv.name ?? "G", src: null };
  const other = conv.other_participants[0];
  return { name: other?.display_name ?? "?", src: other?.avatar_url ?? null };
}

function getLastMessagePreview(conv: Conversation) {
  const msg = conv.last_message;
  if (!msg) return "No messages yet";
  if (msg.deleted) return "Message deleted";
  if (msg.message_type === "image") return "📷 Image";
  if (msg.message_type === "file") return "📎 File";
  return msg.content ?? "";
}

export default function ConversationList({
  conversations,
  selectedId,
  currentUserId,
  loading,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  currentUserId: string;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <div>
          <div className="text-3xl mb-2">💬</div>
          <p className="text-sm text-neutral-400">No conversations yet</p>
          <p className="text-xs text-neutral-600 mt-1">Start a new message above</p>
        </div>
      </div>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto py-1" aria-label="Conversations">
      {conversations.map((conv) => {
        const label = getConversationLabel(conv, currentUserId);
        const avatar = getConversationAvatar(conv, currentUserId);
        const preview = getLastMessagePreview(conv);
        const isSelected = conv.id === selectedId;
        const hasUnread = conv.unread_count > 0;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition
              ${isSelected
                ? "bg-white/10 border-r-2 border-amber-400"
                : "hover:bg-white/5"
              }`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              {conv.type === "group" ? (
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm font-bold">
                  {(conv.name ?? "G").charAt(0).toUpperCase()}
                </div>
              ) : (
                <Avatar name={avatar.name} src={avatar.src} />
              )}
              {conv.type === "group" && (
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-neutral-900 flex items-center justify-center text-[9px]">
                  👥
                </span>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-sm truncate ${
                    hasUnread ? "font-semibold text-white" : "font-medium text-neutral-200"
                  }`}
                >
                  {label}
                </span>
                <span className="text-[11px] text-neutral-500 shrink-0">
                  {conv.last_message ? formatTime(conv.last_message.created_at) : ""}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <p
                  className={`text-xs truncate flex-1 ${
                    hasUnread ? "text-neutral-300" : "text-neutral-500"
                  }`}
                >
                  {conv.last_message?.sender_name &&
                    conv.last_message.sender_name !== conv.other_participants[0]?.display_name && (
                      <span className="text-neutral-600 mr-1">
                        {conv.last_message.sender_name}:
                      </span>
                    )}
                  {preview}
                </p>
                {hasUnread && (
                  <span className="shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {conv.unread_count > 99 ? "99+" : conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
