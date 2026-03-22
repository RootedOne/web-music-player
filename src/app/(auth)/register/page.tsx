"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        // Auto-login after successful registration
        const loginRes = await signIn("credentials", {
          redirect: false,
          username,
          password,
        });

        if (loginRes?.error) {
          setError(loginRes.error);
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        const data = await res.json();
        setError(data.error || "An error occurred");
      }
    } catch (err: unknown) {
      setError("An error occurred");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-[#121212] p-10 rounded-xl shadow-2xl w-full max-w-md border border-white/10">
        <h1 className="text-4xl font-extrabold text-white mb-2 text-center tracking-tighter">Sepatifay</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">Create a new account</p>

        {error && <p className="text-red-400 bg-red-900/20 p-3 rounded-md mb-4 text-center text-sm font-medium border border-red-900/50">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#242424] text-white rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-white transition-all placeholder-gray-500"
              placeholder="Choose a username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#242424] text-white rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-white transition-all placeholder-gray-500"
              placeholder="Create a password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white text-black font-bold py-3.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform mt-4"
          >
            Sign Up
          </button>
        </form>
        <p className="text-gray-400 mt-8 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-white font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
