import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/search/analytics
// Super-admin only. Returns aggregated search analytics.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const weekAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [weekLogs, monthLogs, zeroResultLogs, dailyLogs] = await Promise.all([
    // All logs from last 7 days
    admin.from("search_logs").select("query, result_count")
      .gte("created_at", weekAgo),
    // All logs from last 30 days
    admin.from("search_logs").select("query, result_count")
      .gte("created_at", monthAgo),
    // Zero-result searches from last 30 days
    admin.from("search_logs").select("query, created_at")
      .eq("result_count", 0)
      .gte("created_at", monthAgo)
      .order("created_at", { ascending: false }),
    // Daily counts for the last 30 days (for chart)
    admin.from("search_logs").select("created_at")
      .gte("created_at", monthAgo)
      .order("created_at", { ascending: true }),
  ]);

  // Top queries this week
  const topWeek = aggregateTopQueries(weekLogs.data ?? [], 20);
  // Top queries this month
  const topMonth = aggregateTopQueries(monthLogs.data ?? [], 20);
  // Zero-result queries (unique, most recent)
  const zeroResults = dedupeZeroResults(zeroResultLogs.data ?? []);
  // Daily volume for chart
  const dailyVolume = buildDailyVolume(dailyLogs.data ?? []);

  return NextResponse.json({ topWeek, topMonth, zeroResults, dailyVolume });
}

type LogRow = { query: string; result_count?: number };

function aggregateTopQueries(rows: LogRow[], limit: number) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const q = row.query.toLowerCase().trim();
    if (q.length >= 2) counts[q] = (counts[q] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([query, count]) => ({ query, count }));
}

function dedupeZeroResults(rows: { query: string; created_at: string }[]) {
  const seen = new Set<string>();
  const result: { query: string; last_searched: string }[] = [];
  for (const row of rows) {
    const q = row.query.toLowerCase().trim();
    if (!seen.has(q) && q.length >= 2) {
      seen.add(q);
      result.push({ query: row.query, last_searched: row.created_at });
    }
    if (result.length >= 50) break;
  }
  return result;
}

function buildDailyVolume(rows: { created_at: string }[]) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const day = row.created_at.slice(0, 10); // YYYY-MM-DD
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));
}
