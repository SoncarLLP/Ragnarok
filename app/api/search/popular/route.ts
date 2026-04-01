import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/search/popular
// Returns top popular search terms from the last 30 days.
// Used by SearchBar to show suggestions when the input is empty.
export async function GET() {
  const admin = createAdminClient();

  try {
    // Aggregate top queries from last 30 days
    const { data } = await admin
      .from("search_logs")
      .select("query")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(500);

    if (!data || data.length === 0) {
      return NextResponse.json({ popular: DEFAULT_POPULAR });
    }

    // Count frequency of each lowercased query
    const counts: Record<string, number> = {};
    for (const row of data) {
      const q = (row.query as string).toLowerCase().trim();
      if (q.length >= 2) counts[q] = (counts[q] ?? 0) + 1;
    }

    const popular = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query]) => query);

    return NextResponse.json({ popular: popular.length >= 3 ? popular : DEFAULT_POPULAR });
  } catch {
    return NextResponse.json({ popular: DEFAULT_POPULAR });
  }
}

const DEFAULT_POPULAR = [
  "freyja's bloom",
  "protein",
  "recovery",
  "hydration",
  "workout",
];
