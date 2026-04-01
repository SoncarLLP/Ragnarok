"use client";

import { useState } from "react";
import ModerationSection from "./ModerationSection";
import FlaggedTab from "./FlaggedTab";
import MembersTab from "./MembersTab";
import BannedTab from "./BannedTab";
import WarningsLog from "./WarningsLog";
import BlockAuthTab from "./BlockAuthTab";
import PinnedPostsTab from "./PinnedPostsTab";
import MessagesTab from "./MessagesTab";
import PromotionHistoryTab from "./PromotionHistoryTab";
import type { BlockAuthRecord, MemberOption } from "./BlockAuthTab";
import type { PinnedPostRecord } from "./PinnedPostsTab";

type Post = {
  id: string; type: string; content: string | null; image_url: string | null;
  categories: string[]; created_at: string;
  profiles: { full_name: string | null; username: string | null; display_name_preference?: string | null } | { full_name: string | null; username: string | null; display_name_preference?: string | null }[] | null;
};
type Comment = {
  id: string; content: string; created_at: string; post_id: string;
  profiles: { full_name: string | null; username: string | null; display_name_preference?: string | null } | { full_name: string | null; username: string | null; display_name_preference?: string | null }[] | null;
};
export type FlagRecord = {
  id: string; post_id: string; reason: string | null; created_at: string;
  post_content: string | null; post_type: string; post_image_url: string | null; post_author: string;
};
export type MemberRecord = {
  id: string; email: string; member_id: number | null;
  full_name: string | null; username: string | null;
  role: "member" | "admin" | "super_admin"; status: "active" | "banned" | "suspended";
  created_at: string;
  tier?: string | null;
  moderation_strikes?: number | null;
  cumulative_points?: number | null;
};
export type WarningRecord = {
  id: string; message: string; created_at: string; read_at: string | null;
  recipient_name: string; recipient_member_id: number | null; sender_name: string;
};

type Props = {
  currentUserRole: "admin" | "super_admin";
  posts: Post[];
  comments: Comment[];
  flags: FlagRecord[];
  members: MemberRecord[];
  warnings: WarningRecord[];
  pinnedPosts?: PinnedPostRecord[];
  blockAuths?: BlockAuthRecord[];
  allMemberOptions?: MemberOption[];
  adminOptions?: MemberOption[];
  pendingMessageReports?: number;
};

const BASE_TABS = [
  { key: "moderation", label: "Moderation" },
  { key: "flagged",    label: "Flagged" },
  { key: "pinned",     label: "Pinned Posts" },
  { key: "members",    label: "Members" },
  { key: "banned",     label: "Banned" },
  { key: "warnings",   label: "Warnings" },
];
const SUPER_ADMIN_TABS = [
  ...BASE_TABS,
  { key: "messages", label: "Messages" },
  { key: "block_auth", label: "Block Auth" },
  { key: "promotion_history", label: "Promotion Log" },
];

export default function AdminTabs({
  currentUserRole, posts, comments, flags, members, warnings,
  pinnedPosts = [], blockAuths = [], allMemberOptions = [], adminOptions = [],
  pendingMessageReports = 0,
}: Props) {
  const [active, setActive] = useState("moderation");

  const banned = members.filter((m) => m.status === "banned");
  const TABS = currentUserRole === "super_admin" ? SUPER_ADMIN_TABS : BASE_TABS;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6" style={{ borderBottom: "1px solid var(--nrs-border-subtle)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className="shrink-0 px-4 py-2 text-sm rounded-t transition"
            style={
              active === t.key
                ? { background: "var(--nrs-accent-dim)", color: "var(--nrs-text)", borderBottom: "2px solid var(--nrs-accent)" }
                : { color: "var(--nrs-text-muted)" }
            }
          >
            {t.label}
            {t.key === "flagged" && flags.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full" style={{ background: "rgba(220,38,38,0.20)", color: "var(--nrs-text-body)" }}>
                {flags.length}
              </span>
            )}
            {t.key === "banned" && banned.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full" style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }}>
                {banned.length}
              </span>
            )}
            {t.key === "pinned" && pinnedPosts.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full" style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }}>
                {pinnedPosts.length}
              </span>
            )}
            {t.key === "messages" && pendingMessageReports > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full" style={{ background: "rgba(220,38,38,0.20)", color: "var(--nrs-text-body)" }}>
                {pendingMessageReports}
              </span>
            )}
          </button>
        ))}
      </div>

      {active === "moderation" && (
        <ModerationSection
          posts={posts}
          comments={comments}
          currentUserRole={currentUserRole}
        />
      )}
      {active === "flagged" && (
        <FlaggedTab flags={flags} />
      )}
      {active === "pinned" && (
        <PinnedPostsTab
          posts={pinnedPosts}
          currentUserRole={currentUserRole}
        />
      )}
      {active === "members" && (
        <MembersTab members={members} currentUserRole={currentUserRole} />
      )}
      {active === "banned" && (
        <BannedTab members={banned} />
      )}
      {active === "warnings" && (
        <WarningsLog warnings={warnings} />
      )}
      {active === "messages" && currentUserRole === "super_admin" && (
        <MessagesTab />
      )}
      {active === "block_auth" && currentUserRole === "super_admin" && (
        <BlockAuthTab
          auths={blockAuths}
          members={allMemberOptions}
          admins={adminOptions}
        />
      )}
      {active === "promotion_history" && currentUserRole === "super_admin" && (
        <PromotionHistoryTab />
      )}
    </div>
  );
}
