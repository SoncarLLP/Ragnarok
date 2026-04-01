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
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center font-semibold tracking-wide text-lg mb-8" style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
          Ragnarök
        </Link>

        <h1 className="text-2xl font-semibold text-center">Sign in</h1>
        <p className="mt-2 text-sm text-center" style={{ color: "var(--nrs-text-muted)" }}>Welcome back</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--nrs-text-muted)" }}>Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="nrs-input"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--nrs-text-muted)" }}>Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="nrs-input"
            />
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="nrs-btn nrs-btn-primary w-full py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--nrs-text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="hover:underline" style={{ color: "var(--nrs-accent)" }}>
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
