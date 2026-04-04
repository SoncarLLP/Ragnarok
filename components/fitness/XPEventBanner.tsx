"use client";

import { useEffect, useState } from "react";

interface XPEvent {
  id: string;
  name: string;
  description?: string;
  event_type: string;
  multiplier: number;
  end_date: string;
}

interface XPEventBannerProps {
  events: XPEvent[];
}

function useCountdown(endDate: string) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h >= 24) {
        const d = Math.floor(h / 24);
        setTimeLeft(`${d}d ${h % 24}h remaining`);
      } else {
        setTimeLeft(`${h}h ${m}m ${s}s remaining`);
      }
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  return timeLeft;
}

function EventItem({ event }: { event: XPEvent }) {
  const countdown = useCountdown(event.end_date);
  const multiplierText = event.multiplier >= 2 ? "🎉 Double XP" : `×${event.multiplier} XP`;

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg px-4 py-3"
      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
    >
      <div>
        <div className="text-sm font-semibold text-red-400 flex items-center gap-2">
          <span>⚡ {event.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-400/30 text-red-300">
            {multiplierText}
          </span>
        </div>
        {event.description && (
          <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>{event.description}</div>
        )}
        <div className="text-xs mt-1 text-red-300/70">{countdown}</div>
      </div>
    </div>
  );
}

export default function XPEventBanner({ events }: XPEventBannerProps) {
  if (!events || events.length === 0) return null;

  return (
    <div className="space-y-2">
      {events.map((ev) => (
        <EventItem key={ev.id} event={ev} />
      ))}
    </div>
  );
}
