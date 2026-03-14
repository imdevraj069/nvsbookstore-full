"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function LoginPage() {
  const { login, googleLogin, requestOTP, verifyOTP, user } = useAuth();
  const router = useRouter();
  
  // Email/Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP state
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [countdown, setCountdown] = useState(0);
  
  // UI state
  const [loginMethod, setLoginMethod] = useState("email"); // "email" or "otp"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  // Countdown timer for OTP
  useEffect(() => {
    if (!otpExpiry) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, otpExpiry - now);
      setCountdown(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        setOtpSent(false);
        setOtpExpiry(null);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [otpExpiry]);

  // Load Google Sign-In SDK
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });
      window.google?.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "outline", size: "large", width: "100%", text: "signin_with", shape: "pill" }
      );
    };
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  const handleGoogleCallback = async (response) => {
    setLoading(true);
    setError("");
    try {
      await googleLogin(response.credential);
      router.push("/");
    } catch (err) {
      setError(err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    if (!otpEmail) {
      setError("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      const res = await requestOTP(otpEmail);
      setOtpSent(true);
      setOtpExpiry(Date.now() + res.expiresIn * 1000); // expiresIn is in seconds
      setCountdown(res.expiresIn);
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      await verifyOTP(otpEmail, otp);
      router.push("/");
    } catch (err) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50 px-4 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-orange-300/20 to-amber-200/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-br from-purple-300/15 to-pink-200/15 rounded-full blur-3xl" />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-extrabold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            NVS BookStore
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-100/50 p-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => { setLoginMethod("email"); setError(""); }}
              className={`flex-1 py-3 font-medium text-sm border-b-2 transition-all ${
                loginMethod === "email"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Email & Password
            </button>
            <button
              onClick={() => { setLoginMethod("otp"); setError(""); }}
              className={`flex-1 py-3 font-medium text-sm border-b-2 transition-all ${
                loginMethod === "otp"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              OTP Login
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          {/* Email & Password Login */}
          {loginMethod === "email" && (
            <>
              {/* Google Sign-In */}
              <div className="mb-6">
                <div id="google-signin-btn" className="flex justify-center"></div>
                {!GOOGLE_CLIENT_ID && (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-400 cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"/></svg>
                    Google Sign-In (not configured)
                  </button>
                )}
              </div>

              <div className="relative flex items-center mb-6">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="px-4 text-xs text-gray-400 uppercase">or sign in with email</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium rounded-xl shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
                </button>
              </form>
            </>
          )}

          {/* OTP Login */}
          {loginMethod === "otp" && (
            <form onSubmit={otpSent ? handleVerifyOTP : handleRequestOTP} className="space-y-4">
              {!otpSent ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={otpSent}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">We&apos;ll send a 6-digit code to your email. Valid for 10 minutes.</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <p className="text-sm text-blue-900"><strong>✓ OTP sent to {otpEmail}</strong></p>
                    <p className="text-xs text-blue-700 mt-1">Check your email for the 6-digit code</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      One-Time Password (OTP)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength="6"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="000000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Expires in {countdown}s · {countdown <= 60 ? "🔴" : "🟢"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setOtpExpiry(null);
                    }}
                    className="text-xs text-orange-600 hover:text-orange-700 text-center w-full font-medium"
                  >
                    Use different email
                  </button>
                </>
              )}

              <button
                type="submit"
                disabled={loading || (otpSent && countdown <= 0)}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium rounded-xl shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {otpSent ? "Verify OTP" : "Send OTP"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-orange-600 hover:text-orange-700 font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
