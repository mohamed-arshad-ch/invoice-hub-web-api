"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Home, MoreHorizontal, Users } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export default function BottomNavigation() {
  const pathname = usePathname()
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/")
  }

  // Close the more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Close the more menu when navigating
  useEffect(() => {
    setShowMoreMenu(false)
  }, [pathname])

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 z-50">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-around items-center">
          <Link
            href="/admin/dashboard"
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-md transition-colors ${
              isActive("/admin/dashboard") ? "text-[#3A86FF]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1 font-poppins">Dashboard</span>
          </Link>

          <Link
            href="/admin/clients"
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-md transition-colors ${
              isActive("/admin/clients") ? "text-[#3A86FF]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs mt-1 font-poppins">Clients</span>
          </Link>

          <Link
            href="/admin/transactions"
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-md transition-colors ${
              isActive("/admin/transactions") ? "text-[#3A86FF]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-xs mt-1 font-poppins">Transactions</span>
          </Link>

          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded-md transition-colors ${
                showMoreMenu || isActive("/admin/staff") || isActive("/admin/products") || isActive("/admin/ledger")
                  ? "text-[#3A86FF]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              aria-label="More options"
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-xs mt-1 font-poppins">More</span>
            </button>

            {showMoreMenu && (
              <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden w-40 animate-in fade-in slide-in-from-bottom-5 duration-200">
                <div className="py-1">
                  <Link
                    href="/admin/staff"
                    className={`flex items-center px-4 py-2 text-sm ${
                      isActive("/admin/staff") ? "bg-gray-100 text-[#3A86FF]" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    <span className="font-poppins">Staff</span>
                  </Link>
                  <Link
                    href="/admin/products"
                    className={`flex items-center px-4 py-2 text-sm ${
                      isActive("/admin/products") ? "bg-gray-100 text-[#3A86FF]" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 mr-2"
                    >
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                      <path d="m3.3 7 8.7 5 8.7-5" />
                      <path d="M12 22V12" />
                    </svg>
                    <span className="font-poppins">Products</span>
                  </Link>
                  <Link
                    href="/admin/ledger"
                    className={`flex items-center px-4 py-2 text-sm ${
                      isActive("/admin/ledger") ? "bg-gray-100 text-[#3A86FF]" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 mr-2"
                    >
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                    <span className="font-poppins">Ledger</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
