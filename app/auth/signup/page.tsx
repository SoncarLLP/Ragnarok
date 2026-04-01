"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="block font-semibold tracking-wide text-lg mb-8" style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
            Ragnarök
          </Link>
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--nrs-text-muted)" }}>
            We sent a confirmation link to{" "}
            <span style={{ color: "var(--nrs-text)" }}>{email}</span>. Click it to
            activate your account and claim your 50 welcome points.
          </p>
          <Link href="/" className="mt-8 inline-block text-xs hover:underline" style={{ color: "var(--nrs-text-muted)" }}>
            ← Back to shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center font-semibold tracking-wide text-lg mb-8" style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
          Ragnarök
        </Link>

        <h1 className="text-2xl font-semibold text-center">Create account</h1>
        <p className="mt-2 text-sm text-center" style={{ color: "var(--nrs-text-muted)" }}>
          Join Ragnarök and earn 50 welcome points
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: "var(--nrs-text-muted)" }}>Full name</label>
            <input
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="nrs-input"
            />
          </div>
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
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="nrs-input"
            />
            <p className="mt-1 text-xs" style={{ color: "var(--nrs-text-muted)" }}>Minimum 6 characters</p>
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="nrs-btn nrs-btn-primary w-full py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--nrs-text-muted)" }}>
          Already have an account?{" "}
          <Link href="/auth/login" className="hover:underline" style={{ color: "var(--nrs-accent)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
