"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();

      const body = new URLSearchParams();
      body.set("email", email);
      body.set("csrfToken", csrfToken);
      body.set("callbackUrl", "/");

      const res = await fetch("/api/auth/signin/resend", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        redirect: "manual",
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Too many login attempts. Try again later.");
      } else {
        setSent(email);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSent(null);
    setEmail("");
    setError("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Charles CMS</h1>

          {sent ? (
            <>
              <p className="text-sm text-gray-600 mb-6">Check your email</p>
              <p className="text-sm text-gray-700 mb-2">
                If <strong>{sent}</strong> is authorized, a sign-in link has been sent to it.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                The link expires in 15 minutes.
              </p>
              <button
                type="button"
                onClick={reset}
                className="text-sm text-purple-600 hover:underline"
              >
                Wrong address? Try again
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-6">
                Enter your email and we&apos;ll send you a sign-in link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send login link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
