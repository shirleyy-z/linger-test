"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();

      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { display_name: displayName.trim() || "Linger user" }
          }
        });

        if (error) throw error;
        setMessage("Account created. Check your email if confirmation is enabled.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        window.location.href = "/dashboard";
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Google sign-in failed.");
    }
  }

  return (
    <div className="paper rounded-[28px] p-6 md:p-8">
      <div className="mb-6 grid grid-cols-2 rounded-full border p-1" style={{ borderColor: "var(--line)" }}>
        <button
          type="button"
          className="rounded-full px-4 py-2 font-bold"
          style={{
            background: mode === "sign-in" ? "var(--fern)" : "transparent",
            color: mode === "sign-in" ? "white" : "var(--muted)"
          }}
          onClick={() => {
            setMode("sign-in");
            setMessage("");
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className="rounded-full px-4 py-2 font-bold"
          style={{
            background: mode === "sign-up" ? "var(--fern)" : "transparent",
            color: mode === "sign-up" ? "white" : "var(--muted)"
          }}
          onClick={() => {
            setMode("sign-up");
            setMessage("");
          }}
        >
          Create account
        </button>
      </div>

      <button
        type="button"
        className="secondary-button w-full"
        onClick={signInWithGoogle}
        disabled={busy}
      >
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-sm text-[var(--muted)]">
        <span className="h-px flex-1 bg-[var(--line)]" />
        or use email
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "sign-up" && (
          <div>
            <label className="label" htmlFor="display-name">
              Display name
            </label>
            <input
              className="input"
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              maxLength={60}
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            className="input"
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            className="input"
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          />
          {mode === "sign-up" && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Use at least eight characters.
            </p>
          )}
        </div>

        <button className="primary-button w-full" type="submit" disabled={busy}>
          {busy && <LoaderCircle className="animate-spin" size={17} />}
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      {message && (
        <p
          className="mt-5 rounded-xl border p-3 text-sm"
          style={{ background: "var(--fennel)", borderColor: "var(--pistachio)" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
