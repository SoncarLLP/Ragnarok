"use client";

import { useState, useRef } from "react";

export type MessageReaction = {
  emoji: string;
  count: number;
  user_reacted: boolean;
};

export type ReplyTo = {
  id: string;
  content: string | null;
  message_type: string;
  deleted: boolean;
  sender_name: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  sender_role: string;
  content: string | null;
  message_type: "text" | "image" | "file";
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  reply_to_message_id: string | null;
  reply_to: ReplyTo | null;
  edited_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  created_at: string;
  reactions: MessageReaction[];
};

const EMOJIS = ["👍", "❤️", "💪", "🔥", "😮", "😂", "😢"] as const;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, src }: { name: string; src?: string | null }) {
  if (src) {
    return (
      <img src={src} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-semibold text-neutral-300 shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function MessageBubble({
  message,
  isOwn,
  currentUserId,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onScrollToMessage,
}: {
  message: Message;
  isOwn: boolean;
  currentUserId: string;
  onReact: (msgId: string, emoji: string) => void;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onScrollToMessage: (msgId: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const pickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startClose() {
    pickerTimerRef.current = setTimeout(() => setShowPicker(false), 220);
  }
  function cancelClose() {
    if (pickerTimerRef.current) {
      clearTimeout(pickerTimerRef.current);
      pickerTimerRef.current = null;
    }
  }

  if (message.is_deleted) {
    return (
      <div id={`msg-${message.id}`} className="flex items-start gap-2 group px-4 py-1">
        <Avatar name={message.sender_name} src={message.sender_avatar} />
        <div>
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-xs font-semibold text-neutral-400">{message.sender_name}</span>
            <span className="text-[10px] text-neutral-600">{formatTime(message.created_at)}</span>
          </div>
          <p className="text-xs text-neutral-600 italic px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
            Message deleted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`msg-${message.id}`}
      className="flex items-start gap-2 group px-4 py-1 hover:bg-white/[0.02] relative"
    >
      <Avatar name={message.sender_name} src={message.sender_avatar} />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xs font-semibold text-neutral-200">{message.sender_name}</span>
          <span className="text-[10px] text-neutral-600">{formatTime(message.created_at)}</span>
          {message.edited_at && (
            <span className="text-[10px] text-neutral-600 italic">(edited)</span>
          )}
        </div>

        {/* Reply preview */}
        {message.reply_to && (
          <button
            onClick={() => onScrollToMessage(message.reply_to!.id)}
            className="flex items-center gap-2 mb-1 px-2 py-1 rounded bg-white/5 border-l-2 border-amber-500/50 text-left hover:bg-white/10 transition w-full max-w-md"
          >
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-amber-400">
                {message.reply_to.sender_name}
              </span>
              <p className="text-[11px] text-neutral-500 truncate">
                {message.reply_to.deleted
                  ? "Message deleted"
                  : message.reply_to.message_type === "image"
                  ? "📷 Image"
                  : message.reply_to.message_type === "file"
                  ? "📎 File"
                  : message.reply_to.content}
              </p>
            </div>
          </button>
        )}

        {/* Message content */}
        <div className="max-w-lg">
          {message.message_type === "text" && message.content && (
            <p className="text-sm text-neutral-100 whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {message.message_type === "image" && message.file_url && (
            <a href={message.file_url} target="_blank" rel="noopener noreferrer">
              <img
                src={message.file_url}
                alt="Shared image"
                className="max-w-sm max-h-64 rounded-lg object-cover border border-white/10 hover:opacity-90 transition"
              />
            </a>
          )}

          {message.message_type === "file" && message.file_url && (
            <a
              href={message.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition max-w-xs"
            >
              <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-200 truncate">{message.file_name ?? "File"}</p>
                {message.file_size && (
                  <p className="text-xs text-neutral-500">{formatFileSize(message.file_size)}</p>
                )}
              </div>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-neutral-500 shrink-0">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          )}
        </div>

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(message.id, r.emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition
                  ${r.user_reacted
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                  }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute right-4 top-1 hidden group-hover:flex items-center gap-0.5 bg-neutral-800 border border-white/10 rounded-lg shadow-lg p-0.5">
        {/* Reaction picker */}
        <div
          className="relative"
          onMouseEnter={cancelClose}
          onMouseLeave={startClose}
        >
          <button
            onMouseEnter={() => setShowPicker(true)}
            onClick={() => setShowPicker((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-white/10 transition text-base"
            title="Add reaction"
          >
            😊
          </button>
          {showPicker && (
            <div
              className="absolute bottom-full right-0 mb-1 flex gap-0.5 bg-neutral-800 border border-white/15 rounded-2xl shadow-2xl px-1.5 py-1.5 z-50"
              onMouseEnter={cancelClose}
              onMouseLeave={startClose}
            >
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => { onReact(message.id, e); setShowPicker(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:scale-125 hover:bg-white/10 transition-all"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reply */}
        <button
          onClick={() => onReply(message)}
          className="w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-white/10 transition"
          title="Reply"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Edit (own messages only) */}
        {isOwn && message.message_type === "text" && (
          <button
            onClick={() => { onEdit(message); setShowMenu(false); }}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-white/10 transition"
            title="Edit"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        )}

        {/* Delete (own messages only) */}
        {isOwn && (
          <button
            onClick={() => { onDelete(message); setShowMenu(false); }}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Delete"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Close menu backdrop */}
      {showMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
}
