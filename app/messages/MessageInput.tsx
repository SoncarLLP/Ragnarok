"use client";

import { useState, useRef, useCallback } from "react";
import type { Message, ReplyTo } from "./MessageBubble";

export default function MessageInput({
  conversationId,
  replyTo,
  onCancelReply,
  onMessageSent,
  editingMessage,
  onCancelEdit,
}: {
  conversationId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
  onMessageSent: () => void;
  editingMessage: Message | null;
  onCancelEdit: () => void;
}) {
  const [content, setContent] = useState(editingMessage?.content ?? "");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update content when editingMessage changes
  useState(() => {
    setContent(editingMessage?.content ?? "");
  });

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  async function handleSend() {
    if (sending || uploading) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);

    try {
      if (editingMessage) {
        // Edit existing message
        const res = await fetch(
          `/api/messages/conversations/${conversationId}/messages/${editingMessage.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: trimmed }),
          }
        );
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to edit message");
          return;
        }
        onCancelEdit();
        onMessageSent();
      } else {
        // Send new message
        const res = await fetch(
          `/api/messages/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: trimmed,
              message_type: "text",
              reply_to_message_id: replyTo?.id ?? null,
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to send message");
          return;
        }
        setContent("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        if (replyTo) onCancelReply();
        onMessageSent();
      }
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/messages/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        setError(data.error ?? "Upload failed");
        return;
      }

      const { url, file_name, file_size, message_type } = await uploadRes.json();

      const sendRes = await fetch(
        `/api/messages/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message_type,
            file_url: url,
            file_name,
            file_size,
            reply_to_message_id: replyTo?.id ?? null,
          }),
        }
      );

      if (!sendRes.ok) {
        const data = await sendRes.json();
        setError(data.error ?? "Failed to send file");
        return;
      }

      if (replyTo) onCancelReply();
      onMessageSent();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      if (editingMessage) onCancelEdit();
      if (replyTo) onCancelReply();
    }
  }

  return (
    <div className="shrink-0 border-t border-white/10 bg-neutral-950">
      {/* Reply preview */}
      {replyTo && !editingMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/10">
          <div className="flex-1 min-w-0 border-l-2 border-amber-500/60 pl-2">
            <p className="text-[11px] font-semibold text-amber-400">
              Replying to {replyTo.sender_name}
            </p>
            <p className="text-[11px] text-neutral-500 truncate">
              {replyTo.message_type === "image"
                ? "📷 Image"
                : replyTo.message_type === "file"
                ? "📎 File"
                : replyTo.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-neutral-500 hover:text-white transition p-1"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Edit mode banner */}
      {editingMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-400 shrink-0">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          <span className="text-xs text-amber-400 flex-1">Editing message</span>
          <button
            onClick={onCancelEdit}
            className="text-neutral-500 hover:text-white transition p-1"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="px-4 py-1 text-xs text-red-400">{error}</p>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* File upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !!editingMessage}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
          title="Attach file or image"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          placeholder={editingMessage ? "Edit your message…" : "Message… (Enter to send, Shift+Enter for newline)"}
          rows={1}
          className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-white/25 transition overflow-hidden"
          style={{ minHeight: "36px", maxHeight: "120px" }}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition text-neutral-950"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-neutral-950/20 border-t-neutral-950 rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
