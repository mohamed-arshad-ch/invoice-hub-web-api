"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react"
import { logoutUser } from "@/app/actions/auth-actions"
import { useRouter } from "next/navigation"

export default function StaffDashboardHeader() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } catch (e) {
        console.error("Error parsing user data:", e)
      }
    }
  }, [])

  const handleLogout = async () => {
    // Clear localStorage
    localStorage.removeItem("user")

    // Call server action to clear cookies
    await logoutUser()

    // Redirect to home page
    router.push("/")
  }

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-4 md:px-6">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/staff/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#3A86FF] to-[#8338EC] flex items-center justify-center text-white font-bold text-lg">
              IH
            </div>
            <h1 className="text-xl font-semibold text-gray-900 font-poppins hidden md:block">InvoiceHub</h1>
          </Link>
        </div>

        {/* Right Side - Notifications and Profile */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#8338EC]/10 flex items-center justify-center text-[#8338EC]">
                <User className="h-4 w-4" />
              </div>
              {user && (
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium font-poppins">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 font-poppins capitalize">{user.role}</p>
                </div>
              )}
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                <Link
                  href="/staff/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-poppins flex items-center gap-2"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 font-poppins flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
