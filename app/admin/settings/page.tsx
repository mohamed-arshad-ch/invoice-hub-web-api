"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/app/components/dashboard/header"
import BottomNavigation from "@/app/components/dashboard/bottom-navigation"
import { checkAuthRole, AuthUser } from "@/lib/auth"

export default function AdminSettings() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Check authentication and get user data
        const userData = await checkAuthRole("admin", router)
        
        if (!userData) {
          // User is not authenticated or not admin, checkAuthRole handles redirect
          return
        }

        setUser(userData)
      } catch (error) {
        console.error("Error initializing settings:", error)
        router.push("/admin/login")
      } finally {
        setLoading(false)
      }
    }

    initializeSettings()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading settings...</p>
        </div>
      </div>
    )
  }

  // User should be defined at this point, but safety check
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 font-poppins">Settings</h1>
          <p className="text-gray-600 font-poppins">Manage your account settings</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-poppins mb-1">Logged in as</p>
                <p className="text-gray-900 font-poppins">{user.firstName} {user.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-poppins mb-1">Email</p>
                <p className="text-gray-900 font-poppins">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-poppins mb-1">Role</p>
                <p className="text-gray-900 font-poppins capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-poppins mb-1">User ID</p>
                <p className="text-gray-900 font-poppins">{user.userId}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <p className="text-gray-600 font-poppins">
              Settings page is under construction. Advanced settings and preferences will be available in a future update.
            </p>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  )
}
