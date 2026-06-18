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
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 select-none"
      style={{ backgroundColor: "#0c3f0d" }}
    >
      <div className="w-full max-w-[820px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px] md:min-h-[550px] fade-up animate-fade-in">
        {/* Left Side: Branding / Logo (Friendly, fitting, 1/2 width) */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-10 flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-r border-gray-100">
          <div className="relative flex justify-center items-center mb-6">
            <div className="absolute w-36 h-36 md:w-44 md:h-44 bg-green-500/5 rounded-full blur-2xl pointer-events-none" />
            <img
              src="/rupp-logo-transparent.png"
              alt="Royal University of Phnom Penh Logo"
              className="relative w-40 h-40 md:w-48 md:h-48 object-contain"
            />
          </div>
          <div className="space-y-3.5 max-w-[280px]">
            <div className="space-y-1.5">
              <h2 className="text-[#0c3f0d] text-base md:text-lg font-bold leading-tight font-moul" style={{ fontFamily: "'Moul', 'Inter', sans-serif" }}>
                សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ
              </h2>
              <h1 className="text-gray-600 text-xs md:text-sm font-semibold leading-tight">
                Royal University of Phnom Penh
              </h1>
            </div>
          </div>
        </div>
        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-between bg-white min-h-[400px] md:min-h-0">
          <div className="my-auto w-full">
            <div className="mb-6 text-center">
              <h3 className="text-lg md:text-xl font-extrabold text-[#0c3f0d] uppercase">
                Document Tracking System
              </h3>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="inline-block bg-green-50 text-green-700 text-[12px] font-bold px-2.5 py-0.5 rounded-full border border-green-100">
                  Create Account
                </span>
              </div>
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
                  <label className="block text-[14px] font-semibold text-green-800 mb-1.5">
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
                  <label className="block text-[14px] font-semibold text-green-800 mb-1.5">
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
                  <label className="block text-[14px] font-semibold text-green-800 mb-1.5">
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
                  <label className="block text-[14px] font-semibold text-green-800 mb-1.5">
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

          <div className="fade-up fade-up-4 mt-6 text-center">
            <p className="text-[13px] text-green-800">
              Already have an account?{" "}
              <Link href="/" className="font-bold text-[#0c3f0d] hover:text-green-700 underline underline-offset-2 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Subtle Footer */}
      <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none">
        <p className="text-[11px] font-medium text-green-100/60">
          © {new Date().getFullYear()} Royal University of Phnom Penh. All rights reserved.
        </p>
      </div>
    </main>
  );
}