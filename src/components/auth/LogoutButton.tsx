"use client";

import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/network";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Clear any local storage data
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      // Redirect to login
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if logout API call fails
      router.push('/auth/login');
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
      title="Logout"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
    </button>
  );
}

