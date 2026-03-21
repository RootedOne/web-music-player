"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      username,
      password,
    });

    if (res?.error) {
      setError(res.error);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-[#121212] p-10 rounded-xl shadow-2xl w-full max-w-md border border-white/10">
        <h1 className="text-4xl font-extrabold text-white mb-2 text-center tracking-tighter">Sepatifay</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">Sign in to your account</p>

        {error && <p className="text-red-400 bg-red-900/20 p-3 rounded-md mb-4 text-center text-sm font-medium border border-red-900/50">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#242424] text-white rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-white transition-all placeholder-gray-500"
              placeholder="Username"
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
              placeholder="Password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white text-black font-bold py-3.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform mt-4"
          >
            Sign In
          </button>
        </form>
        <p className="text-gray-400 mt-8 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-white font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
