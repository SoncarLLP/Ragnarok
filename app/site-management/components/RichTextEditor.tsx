"use client";

import { useRef, useEffect, useCallback } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  minHeight = "120px",
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  // Sync external value changes (e.g. loading draft) without clobbering cursor
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const exec = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (isComposing.current) return;
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle tab key for indentation
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const ToolBtn = ({
    onClick,
    title,
    children,
    active,
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    active?: boolean;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Don't blur editor
        onClick();
      }}
      title={title}
      className={`px-2 py-1 rounded text-sm transition ${
        active
          ? "bg-white/20 text-white"
          : "text-neutral-400 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl border border-white/15 overflow-hidden focus-within:border-white/30 transition">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-white/10 bg-white/[0.03]">
        <ToolBtn onClick={() => exec("bold")} title="Bold (Ctrl+B)">
          <strong>B</strong>
        </ToolBtn>
        <ToolBtn onClick={() => exec("italic")} title="Italic (Ctrl+I)">
          <em>I</em>
        </ToolBtn>
        <ToolBtn onClick={() => exec("underline")} title="Underline (Ctrl+U)">
          <u>U</u>
        </ToolBtn>
        <div className="w-px h-4 bg-white/15 mx-1" />
        <ToolBtn onClick={() => exec("formatBlock", "h2")} title="Heading 2">
          H2
        </ToolBtn>
        <ToolBtn onClick={() => exec("formatBlock", "h3")} title="Heading 3">
          H3
        </ToolBtn>
        <ToolBtn onClick={() => exec("formatBlock", "p")} title="Paragraph">
          ¶
        </ToolBtn>
        <div className="w-px h-4 bg-white/15 mx-1" />
        <ToolBtn onClick={() => exec("insertUnorderedList")} title="Bullet list">
          • List
        </ToolBtn>
        <ToolBtn onClick={() => exec("insertOrderedList")} title="Numbered list">
          1. List
        </ToolBtn>
        <div className="w-px h-4 bg-white/15 mx-1" />
        <ToolBtn
          onClick={() => {
            const url = window.prompt("Link URL:");
            if (url) exec("createLink", url);
          }}
          title="Insert link"
        >
          🔗
        </ToolBtn>
        <ToolBtn onClick={() => exec("removeFormat")} title="Clear formatting">
          Tx
        </ToolBtn>
        <div className="w-px h-4 bg-white/15 mx-1" />
        <ToolBtn onClick={() => exec("undo")} title="Undo">
          ↩
        </ToolBtn>
        <ToolBtn onClick={() => exec("redo")} title="Redo">
          ↪
        </ToolBtn>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => {
          isComposing.current = false;
          if (editorRef.current) onChange(editorRef.current.innerHTML);
        }}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className={`
          px-4 py-3 text-sm text-neutral-100 bg-transparent outline-none
          prose prose-invert prose-sm max-w-none
          [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4
          [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-3
          [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2
          [&_a]:text-amber-300 [&_a]:underline
          empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-600
        `}
      />
    </div>
  );
}
