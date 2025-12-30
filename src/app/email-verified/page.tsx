"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function EmailVerifiedPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      <div className="w-full px-8 py-8 lg:px-12">
        <div className="flex items-center gap-3">
          <Image
            src="/images/Logo.png"
            alt="TecTerminal"
            width={160}
            height={40}
            className="object-contain"
          />
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 flex items-start justify-center px-4 pt-10">
        <div className="w-full max-w-155">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 lg:p-6">
            {/* Illustration Area with Gray Background */}
            <div className="flex justify-center mb-8">
              <div className="w-full bg-[#F3F4F6] rounded-2xl py-3 flex items-center justify-center">
                <div className="relative">
                  <Image
                    src="/images/email open.png"
                    alt="Email Icon"
                    width={80}
                    height={80}
                    className="object-contain"
                  />

                  <div className="absolute top-7 right-1 w-5 h-5 bg-[#458957] rounded-full flex items-center justify-center shadow-sm">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Email Verified
              </h1>

              <div className="space-y-4 mb-10">
                <p className="text-gray-500 text-sm leading-relaxed max-w-100 mx-auto">
                  Your email has been verified successfully! You can now access
                  your account and the portal.
                </p>
              </div>

              {/* Action Button */}
              <div className="space-y-6">
                <button
                  onClick={handleLogin}
                  className="w-full bg-[#6366F1] text-white py-3 rounded-xl font-bold hover:bg-[#5558E3] transition-all shadow-md active:scale-[0.99]"
                >
                  Log in
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer  */}
      <div className="px-8 lg:px-16 py-8 flex justify-between items-center">
        <p className="text-[13px] text-gray-400">
          2026 TT Showcase Student Portal. All rights reserved.
        </p>
        <Link href="#" className="text-[13px] text-gray-400 hover:underline">
          Contact Support
        </Link>
      </div>
    </div>
  );
}
