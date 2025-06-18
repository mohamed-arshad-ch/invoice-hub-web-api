"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, ChevronDown, LogOut, Search, Settings, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiGet, logout, isAuthenticated } from "@/lib/api-client"
import { AuthUser } from "@/lib/auth"

export default function DashboardHeader() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Check if user is authenticated
        if (!isAuthenticated()) {
          return
        }

        // Get user data from session API
        const sessionResponse = await apiGet('/api/auth/session')
        
        if (sessionResponse.success) {
          setUser(sessionResponse.data.user)
        } else {
          console.error("Failed to fetch user session:", sessionResponse.error)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchUserData()
  }, [])

  const handleLogout = async () => {
    try {
      // Use API client logout function which handles token removal and API call
      await logout()
      // logout() function already redirects to login page
    } catch (error) {
      console.error("Error during logout:", error)
      // Fallback redirect
      router.push("/admin/login")
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-4 md:px-6">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#3A86FF] to-[#8338EC] flex items-center justify-center text-white font-bold text-lg">
              IH
            </div>
            <h1 className="text-xl font-semibold text-gray-900 font-poppins hidden md:block">InvoiceHub</h1>
          </Link>
        </div>

        {/* Search Bar - Hidden on mobile */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
            />
          </div>
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
              <div className="w-8 h-8 rounded-full bg-[#3A86FF]/10 flex items-center justify-center text-[#3A86FF]">
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
                  href="/admin/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-poppins flex items-center gap-2"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href="/admin/settings"
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
