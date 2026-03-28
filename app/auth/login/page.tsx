"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center font-semibold tracking-wide text-lg mb-8">
          SONCAR
        </Link>

        <h1 className="text-2xl font-semibold text-center">Sign in</h1>
        <p className="mt-2 text-neutral-400 text-sm text-center">Welcome back</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
            />
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-60 text-sm font-medium transition"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-400">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-white hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
