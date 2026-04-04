"use client";

/**
 * Stores the authenticated user's ID in localStorage so offline-capable
 * pages can reference it when IndexedDB is used without an active session.
 */
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UserIdSync() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) {
        localStorage.setItem("ragnarok_user_id", data.user.id);
      } else {
        localStorage.removeItem("ragnarok_user_id");
      }
    }).catch(() => {});
  }, []);
  return null;
}
