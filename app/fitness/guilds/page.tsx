"use client";

import { useState, useEffect } from "react";

interface Guild {
  id: string;
  name: string;
  description?: string;
  fitness_classes?: { name: string; icon: string; slug: string } | null;
  guild_master_id: string;
  max_members: number;
  memberCount: number;
  isMember: boolean;
  userRole?: string | null;
}

export default function GuildsPage() {
  const [guilds, setGuilds]         = useState<Guild[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [message, setMessage]       = useState("");

  // Create form
  const [guildName, setGuildName] = useState("");
  const [guildDesc, setGuildDesc] = useState("");

  function loadGuilds() {
    fetch("/api/fitness/guilds")
      .then((r) => r.json())
      .then((d) => { setGuilds(d.guilds ?? []); setLoading(false); });
  }

  useEffect(loadGuilds, []);

  async function createGuild() {
    if (!guildName.trim()) return;
    setCreating(true);
    setMessage("");
    const res = await fetch("/api/fitness/guilds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: guildName.trim(), description: guildDesc.trim() }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setMessage("Guild created successfully!");
      setShowCreate(false);
      setGuildName("");
      setGuildDesc("");
      loadGuilds();
    } else {
      setMessage(data.error ?? "Failed to create guild");
    }
  }

  const myGuilds    = guilds.filter((g) => g.isMember);
  const otherGuilds = guilds.filter((g) => !g.isMember);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--nrs-text)" }}>Guilds</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>
            Join a guild to compete together and earn bonus rewards
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition"
          style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
        >
          Create Guild
        </button>
      </div>

      {message && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{
          background: message.includes("Failed") || message.includes("taken") ? "rgba(239,68,68,0.1)" : "rgba(52,211,153,0.1)",
          border: `1px solid ${message.includes("Failed") || message.includes("taken") ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.3)"}`,
          color: message.includes("Failed") || message.includes("taken") ? "#f87171" : "#34d399",
        }}>
          {message}
        </div>
      )}

      {/* Create guild form */}
      {showCreate && (
        <div className="rounded-xl p-5 space-y-4" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
          <h2 className="font-semibold" style={{ color: "var(--nrs-text)" }}>Create a New Guild</h2>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>Guild Name *</label>
            <input
              type="text"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              maxLength={50}
              placeholder="Enter guild name..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--nrs-text-muted)" }}>Description (optional)</label>
            <textarea
              value={guildDesc}
              onChange={(e) => setGuildDesc(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="What is your guild about?"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: "var(--nrs-panel)", border: "1px solid var(--nrs-border)", color: "var(--nrs-text)" }}
            />
          </div>
          <div className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
            Guild masters can invite and manage up to 20 members.
          </div>
          <button
            onClick={createGuild}
            disabled={creating || !guildName.trim()}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            style={{ background: "var(--nrs-accent)", color: "var(--nrs-bg)" }}
          >
            {creating ? "Creating..." : "Create Guild 🛡️"}
          </button>
        </div>
      )}

      {/* My guilds */}
      {myGuilds.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3" style={{ color: "var(--nrs-text)" }}>My Guilds</h2>
          <div className="space-y-3">
            {myGuilds.map((g) => (
              <GuildCard key={g.id} guild={g} />
            ))}
          </div>
        </div>
      )}

      {/* All guilds */}
      {!loading && (
        <div>
          <h2 className="font-semibold mb-3" style={{ color: "var(--nrs-text)" }}>
            {myGuilds.length > 0 ? "Other Guilds" : "All Guilds"} ({otherGuilds.length})
          </h2>
          {otherGuilds.length === 0 ? (
            <div className="text-center py-6" style={{ color: "var(--nrs-text-muted)" }}>
              No other guilds yet. Create the first one!
            </div>
          ) : (
            <div className="space-y-3">
              {otherGuilds.map((g) => (
                <GuildCard key={g.id} guild={g} />
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-8" style={{ color: "var(--nrs-text-muted)" }}>Loading guilds...</div>
      )}
    </div>
  );
}

function GuildCard({ guild }: { guild: Guild }) {
  const isFull = guild.memberCount >= guild.max_members;
  const roleLabel: Record<string, string> = {
    master: "🛡️ Guild Master",
    officer: "⚔️ Officer",
    member: "Member",
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: `1px solid ${guild.isMember ? "var(--nrs-accent-border)" : "var(--nrs-border-subtle)"}`,
        background: guild.isMember ? "var(--nrs-accent-dim)" : "var(--nrs-card)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: "var(--nrs-text)" }}>{guild.name}</span>
            {guild.fitness_classes && (
              <span className="text-xs" style={{ color: "var(--nrs-text-muted)" }}>
                {guild.fitness_classes.icon} {guild.fitness_classes.name}
              </span>
            )}
            {guild.isMember && guild.userRole && (
              <span className="text-xs" style={{ color: "var(--nrs-accent)" }}>
                {roleLabel[guild.userRole] ?? guild.userRole}
              </span>
            )}
          </div>
          {guild.description && (
            <p className="text-xs mt-1" style={{ color: "var(--nrs-text-muted)" }}>{guild.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "var(--nrs-text-muted)" }}>
            <span>👥 {guild.memberCount}/{guild.max_members} members</span>
            {isFull && <span className="text-amber-400">Full</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
