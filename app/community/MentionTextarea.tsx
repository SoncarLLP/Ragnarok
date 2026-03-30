"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getDisplayName } from "@/lib/display-name";

interface Member {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  display_name_preference?: string | null;
}

/**
 * Drop-in textarea replacement that shows a member picker when the
 * user types @. Selecting a member inserts @username into the text.
 * Uses position:fixed for the dropdown so it escapes overflow:hidden parents.
 */
export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows,
  className,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  required?: boolean;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Character offset in `value` where the current @token starts
  const mentionStartRef = useRef<number>(-1);
  const fetchControllerRef = useRef<AbortController | null>(null);

  // Fetch members whenever query changes
  useEffect(() => {
    if (fetchControllerRef.current) fetchControllerRef.current.abort();
    const ctrl = new AbortController();
    fetchControllerRef.current = ctrl;

    fetch(`/api/community/members/search?q=${encodeURIComponent(query)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((data: Member[]) => {
        setMembers(data);
        setSelectedIdx(0);
      })
      .catch(() => {});

    return () => ctrl.abort();
  }, [query]);

  function computeDropdownPos() {
    if (!textareaRef.current) return null;
    const rect = textareaRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.min(rect.width, 320),
    };
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVal = e.target.value;
    onChange(newVal);

    const cursor = e.target.selectionStart ?? 0;
    const before = newVal.slice(0, cursor);
    // Match a @ followed by word chars at the very end of the text-before-cursor
    const match = before.match(/@([a-zA-Z0-9_.-]*)$/);

    if (match) {
      mentionStartRef.current = cursor - match[0].length;
      setQuery(match[1]);
      const pos = computeDropdownPos();
      if (pos) {
        setDropdownPos(pos);
        setShowDropdown(true);
      }
    } else {
      setShowDropdown(false);
      mentionStartRef.current = -1;
    }
  }

  const selectMember = useCallback(
    (member: Member) => {
      if (!textareaRef.current) return;
      const start = mentionStartRef.current;
      if (start === -1) return;

      const cursor = textareaRef.current.selectionStart ?? 0;
      const before = value.slice(0, start);
      const after = value.slice(cursor);
      const inserted = `@${member.username} `;
      const newVal = before + inserted + after;

      onChange(newVal);
      setShowDropdown(false);
      mentionStartRef.current = -1;

      // Restore focus and advance cursor past the inserted mention
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        textareaRef.current.focus();
        const newCursor = start + inserted.length;
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      });
    },
    [value, onChange]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!showDropdown || members.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, members.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      const m = members[selectedIdx];
      if (m) {
        e.preventDefault();
        selectMember(m);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  // Close on blur with delay so mousedown on dropdown fires first
  function handleBlur() {
    setTimeout(() => setShowDropdown(false), 150);
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className={className}
      />

      {showDropdown && members.length > 0 && dropdownPos && (
        <div
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
          }}
          // mousedown (not click) so it fires before textarea blur
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="bg-neutral-800 border border-white/15 rounded-xl shadow-2xl overflow-hidden">
            {members.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={() => selectMember(m)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition ${
                  i === selectedIdx ? "bg-white/15" : "hover:bg-white/8"
                }`}
              >
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {getDisplayName(m).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-neutral-100 truncate font-medium">
                    {getDisplayName(m)}
                  </div>
                  <div className="text-xs text-neutral-500 truncate">@{m.username}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
