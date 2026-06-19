"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { Eye, EyeOff, User, Lock, LogIn, Loader2, Mail, UserPlus } from "lucide-react";
export default function LoginPage() {
    const router = useRouter();
    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    
    const lowerEmail = email.toLowerCase().trim();
    // 1. Check created users database in localStorage
    let registeredUsers = [];
    try {
      const storedUsers = localStorage.getItem("doc_tracking_users");
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        registeredUsers = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Error loading registered users", e);
    }
    const matchedUser = registeredUsers.find(
      (u) => u.email.toLowerCase().trim() === lowerEmail && u.password === password
    );
    if (matchedUser) {
      sessionStorage.setItem("isAdminAuthenticated", matchedUser.role === "System Admin" ? "true" : "false");
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({
          username: `${matchedUser.firstName} ${matchedUser.lastName}`,
          email: matchedUser.email,
          role: matchedUser.role,
          department: matchedUser.department || "ITC",
        })
      );
      router.push("/content");
      return;
    }
    // 2. Fallback to hardcoded testing accounts
    if (password === "admin1234") {
      if (lowerEmail === "admin" || lowerEmail === "admin@rupp.edu.kh" || lowerEmail === "sysadmin") {
        sessionStorage.setItem("isAdminAuthenticated", "true");
        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({
            username: "System Admin",
            email: "admin@rupp.edu.kh",
            role: "System Admin",
            department: "Global",
          })
        );
        router.push("/content");
        return;
      }
      if (lowerEmail === "itcsuper" || lowerEmail === "admin@rupp.edu.kh") {
        sessionStorage.setItem("isAdminAuthenticated", "false");
        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({
            username: "ITC Super Admin",
            email: "itcsuper@rupp.edu.kh",
            role: "ITC Super Admin",
            department: "ITC",
          })
        );
        router.push("/content");
        return;
      }
      if (lowerEmail === "itcadmin" || lowerEmail === "itcadmin@rupp.edu.kh") {
        sessionStorage.setItem("isAdminAuthenticated", "false");
        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({
            username: "ITC Admin User",
            email: "itcadmin@rupp.edu.kh",
            role: "ITC Admin",
            department: "ITC",
          })
        );
        router.push("/content");
        return;
      }
      if (lowerEmail === "itcstaff" || lowerEmail === "itcstaff@rupp.edu.kh") {
        sessionStorage.setItem("isAdminAuthenticated", "false");
        sessionStorage.setItem(
          "currentUser",
          JSON.stringify({
            username: "ITC Staff User",
            email: "itcstaff@rupp.edu.kh",
            role: "ITC Staff",
            department: "ITC",
          })
        );
        router.push("/content");
        return;
      }
    }
    // 3. Fallback failed, show invalid credentials error
    setError("Invalid email or password.");
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
                        {/* Soft warm green ambient glow */}
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
                {/* Right Side: Form (1/2 width) */}
                <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-between bg-white min-h-[400px] md:min-h-0">
                    <div className="my-auto w-full">
                        <div className="mb-6 text-center">
                            <h3 className="text-lg md:text-xl font-extrabold text-[#0c3f0d] uppercase">
                                Document Tracking System
                            </h3>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <span className="inline-block bg-green-50 text-green-700 text-[12px] font-bold px-2.5 py-0.5 rounded-full border border-green-100">
                                    Sign In
                                </span>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} noValidate className="space-y-4">
                            <div className="fade-up fade-up-2">
                                <label className="block text-[13px] font-semibold text-green-800 mb-1">
                                    Email Address / Username
                                </label>
                                <div className="relative">
                                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />
                                    <input
                                        type="email"
                                        className="inp"
                                        placeholder="Enter your email or username"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>
                            <div className="fade-up fade-up-3">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-[13px] font-semibold text-green-800">
                                        Password
                                    </label>
                                    
                                </div>
                                <div className="relative">
                                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none" />
                                    <input
                                        type={showPw ? "text" : "password"}
                                        className="inp"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        style={{ paddingRight: "42px" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-400 hover:text-green-700 transition-colors"
                                        aria-label="Toggle password visibility"
                                    >
                                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                <div className="flex justify-end mt-1.5">
                                    <a href="#" className="text-[11px] text-green-600 hover:text-green-800 font-semibold transition-colors">
                                        Forgot password?
                                    </a>
                                </div>
                            </div>
                            {error && (
                                <p className="text-[11px] text-red-600 mt-1 mb-1 fade-up font-medium">{error}</p>
                            )}
                            <div className="fade-up fade-up-4 flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    className="w-3 h-3 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    style={{ accentColor: "#15803d" }}
                                />
                                <label htmlFor="remember" className="text-[12px] text-gray-600 cursor-pointer select-none font-medium">
                                    Keep me signed in
                                </label>
                            </div>
                            <div className="fade-up fade-up-5 space-y-3 pt-2">
                                <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 cursor-pointer py-2.5 text-xs">
                                    {loading ? (
                                        <><Loader2 size={14} className="spin" /> Signing in…</>
                                    ) : (
                                        <><LogIn size={13} /> Sign In</>
                                    )}
                                </button>
                                <div className="flex items-center justify-center my-3">
                                    <div className="w-full border-t border-gray-100"></div>
                                    <span className="px-2.5 text-gray-300 text-[12px] font-semibold lowercase">or</span>
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.push("/register")}
                                    className="w-full py-2.5 bg-white border border-gray-200 hover:border-[#16a34a]/30 hover:bg-[#16a34a]/5 text-[#0c3f0d] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    <UserPlus size={14} className="text-[#16a34a]" />
                                    Create an account
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="pt-6 text-center border-t border-gray-50">
                        <p className="text-[10px] text-gray-400">
                            © {new Date().getFullYear()} Royal University of Phnom Penh. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
  }