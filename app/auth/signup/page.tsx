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
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="block font-semibold tracking-wide text-lg mb-8">
            SONCAR
          </Link>
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="mt-4 text-neutral-400 text-sm leading-relaxed">
            We sent a confirmation link to{" "}
            <span className="text-white">{email}</span>. Click it to
            activate your account and claim your 50 welcome points.
          </p>
          <Link href="/" className="mt-8 inline-block text-xs text-neutral-500 hover:text-white">
            ← Back to shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center font-semibold tracking-wide text-lg mb-8">
          SONCAR
        </Link>

        <h1 className="text-2xl font-semibold text-center">Create account</h1>
        <p className="mt-2 text-neutral-400 text-sm text-center">
          Join SONCAR and earn 50 welcome points
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Full name</label>
            <input
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
            />
          </div>
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
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/30"
            />
            <p className="mt-1 text-xs text-neutral-500">Minimum 6 characters</p>
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-60 text-sm font-medium transition"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-400">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
