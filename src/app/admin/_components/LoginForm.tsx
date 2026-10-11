"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (res.ok) {
      router.refresh();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError(body.error ?? "Login failed.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-sm border-2 border-sfl-black bg-white p-6">
      <h1 className="font-display text-2xl font-bold uppercase">Log in</h1>
      <label className="mt-4 block text-sm font-semibold" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1 w-full border-2 border-sfl-black px-3 py-2"
      />
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full bg-sfl-gold px-4 py-2 font-display font-bold uppercase disabled:opacity-60"
      >
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
