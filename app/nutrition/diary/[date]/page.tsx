import { redirect } from "next/navigation";

// Redirect /nutrition/diary/[date] to /nutrition/diary with date param
// This allows direct URL sharing of specific dates
export default async function DiaryDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  redirect(`/nutrition/diary?date=${date}`);
}
