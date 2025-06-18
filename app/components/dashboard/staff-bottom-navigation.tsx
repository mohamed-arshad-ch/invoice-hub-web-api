"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Settings, DollarSign } from "lucide-react"

export default function StaffBottomNavigation() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/")
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 z-50">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex justify-around items-center">
          <Link
            href="/staff/dashboard"
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-md transition-colors ${
              isActive("/staff/dashboard") ? "text-[#8338EC]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1 font-poppins">Dashboard</span>
          </Link>

          <Link
            href="/staff/payments"
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-md transition-colors ${
              isActive("/staff/payments") ? "text-[#3A86FF]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-xs mt-1 font-poppins">Payments</span>
          </Link>

          <Link
            href="/staff/settings"
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-md transition-colors ${
              isActive("/staff/settings") ? "text-[#FF006E]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs mt-1 font-poppins">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
