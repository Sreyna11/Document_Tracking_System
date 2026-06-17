"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, User, Lock, Mail, UserPlus, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSuccess(true);
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: "#0c3f0d" }}
    >
      <div className="w-full max-w-[420px]">
        <div
          className="rounded-2xl shadow-xl overflow-hidden animate-fade-in"
          style={{ backgroundColor: "#ffffff" }}
        >
          <div className="px-8 pt-8 pb-6">
            <div className="fade-up">
              
            </div>

            <div className="fade-up fade-up-1 mb-5 text-center">
              <span className="inline-block bg-green-50 text-green-700 text-[11px] font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full border border-green-100">
                Create Account
              </span>
            </div>

            {success ? (
              <div className="fade-up text-center py-6">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="text-green-600 w-14 h-14 animate-bounce" />
                </div>
                <h3 className="text-lg font-bold text-green-900 mb-1">Registration Successful!</h3>
                <p className="text-sm text-green-700 mb-6">Your account has been created successfully.</p>
                <Link href="/" className="btn-primary flex items-center justify-center gap-2">
                  <ArrowLeft size={15} /> Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="fade-up fade-up-2 mb-4">
                  <label className="block text-[12px] font-semibold text-green-800 mb-1.5 uppercase tracking-wider">
                    Username
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />
                    <input
                      type="text"
                      className="inp"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="fade-up fade-up-2 mb-4">
                  <label className="block text-[12px] font-semibold text-green-800 mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />
                    <input
                      type="email"
                      className="inp"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="fade-up fade-up-3 mb-4">
                  <label className="block text-[12px] font-semibold text-green-800 mb-1.5 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />
                    <input
                      type={showPw ? "text" : "password"}
                      className="inp"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      style={{ paddingRight: "42px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-400 hover:text-green-700 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="fade-up fade-up-3 mb-5">
                  <label className="block text-[12px] font-semibold text-green-800 mb-1.5 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      className="inp"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      style={{ paddingRight: "42px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-400 hover:text-green-700 transition-colors"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-[12px] text-red-600 mb-3 fade-up">{error}</p>
                )}

                <div className="fade-up fade-up-4 mt-2">
                  <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
                    {loading ? (
                      <><Loader2 size={16} className="spin" /> Registering…</>
                    ) : (
                      <><UserPlus size={15} /> Sign Up</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 text-center">
            <p className="text-[13px] text-green-700">
              Already have an account?{" "}
              <Link href="/" className="font-semibold text-green-800 hover:text-green-900 underline underline-offset-2 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-green-100 mt-5 opacity-70">
          © {new Date().getFullYear()} Royal University of Phnom Penh. All rights reserved.
        </p>
      </div>
    </main>
  );
}