"use client";

import type React from "react";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import eylogo from "../public/images/EY-logo.png";
import { api } from "@/services/api";
import Cookies from "js-cookie";

// Submit button with pending state
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-[#ffe500] px-6 py-2 font-medium text-[#2e2e38] hover:bg-[#f5dc00] disabled:opacity-70"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

// Login form with React 19 features
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [step, setStep] = useState(1); // 1 = email, 2 = password
  const router = useRouter();

  // Form submission for email step
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      // Validate email
      if (!email.includes("@")) {
        setErrorMessage("Please enter a valid email address");
        return;
      }

      // Move to password step
      setStep(2);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
      console.error("Login error:", error);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const response = await api.login(email, password);

      if (!response.success) {
        throw new Error(response.message);
      }

      Cookies.set("token", response.data?.token || "", {
        expires: 7, // Token expires in 7 days
        secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
        sameSite: "Strict", // Cookie is only sent for same-site requests
      });

      router.push("/dashboard");
    } catch (error) {
      setErrorMessage("Invalid email or password. Please try again.");
      console.error("Login error:", error);
    }
  }

  // Go back to email step
  function handleBack() {
    setStep(1);
    setErrorMessage("");
  }

  return (
    <div className="w-full max-w-md rounded bg-white p-8 shadow-lg">
      {/* EY Logo */}
      <div className="mb-6 flex items-center">
        <Image src={eylogo} alt="EY Logo" width={100} height={60} />
      </div>

      {/* Form heading */}
      <h2 className="mb-6 text-2xl font-medium text-[#2e2e38]">
        {step === 1 ? "Sign in to EY Boards" : "Enter password"}
      </h2>

      {/* Email step */}
      {step === 1 && (
        <form onSubmit={handleEmailSubmit}>
          <div className="mb-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border-b border-gray-300 pb-2 pt-1 outline-none focus:border-[#007aff]"
              required
            />
            {errorMessage && (
              <p className="mt-2 text-sm text-red-500">{errorMessage}</p>
            )}
          </div>

          {/* Help text */}
          <div className="mb-8 space-y-2">
            <a
              href="#"
              className="block text-sm text-[#007aff] hover:underline"
            >
              Can&apos;t access your account ?
            </a>
            <a
              href="#"
              className="block text-sm text-[#007aff] hover:underline"
            >
              Sign in with EY account or a security key
            </a>
          </div>

          {/* Next button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-[#ffe500] px-6 py-2 font-medium text-[#2e2e38] hover:bg-[#f5dc00]"
            >
              Next
            </button>
          </div>
        </form>
      )}

      {/* Password step */}
      {step === 2 && (
        <form onSubmit={handlePasswordSubmit}>
          <div className="mb-6">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full border-b border-gray-300 pb-2 pt-1 outline-none focus:border-[#007aff]"
                required
                autoFocus
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errorMessage && (
              <p className="mt-2 text-sm text-red-500">{errorMessage}</p>
            )}
          </div>

          {/* Help links */}
          <div className="mb-8 space-y-2">
            <a
              href="#"
              className="block text-sm text-[#007aff] hover:underline"
            >
              Forgotten my password
            </a>
            <a
              href="#"
              className="block text-sm text-[#007aff] hover:underline"
            >
              Sign in with another account
            </a>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="rounded bg-gray-200 px-6 py-2 font-medium text-gray-700 hover:bg-gray-300"
            >
              Back
            </button>
            <SubmitButton />
          </div>
        </form>
      )}
    </div>
  );
}
