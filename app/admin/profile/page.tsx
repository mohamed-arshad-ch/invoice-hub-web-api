"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/app/components/dashboard/header"
import BottomNavigation from "@/app/components/dashboard/bottom-navigation"
import { checkAuthRole, AuthUser } from "@/lib/auth"

export default function AdminProfile() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        // Check authentication and get user data
        const userData = await checkAuthRole("admin", router)
        
        if (!userData) {
          // User is not authenticated or not admin, checkAuthRole handles redirect
          return
        }

        setUser(userData)
      } catch (error) {
        console.error("Error initializing profile:", error)
        router.push("/admin/login")
      } finally {
        setLoading(false)
      }
    }

    initializeProfile()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading profile...</p>
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
          <h1 className="text-2xl font-bold text-gray-900 font-poppins">Profile</h1>
          <p className="text-gray-600 font-poppins">Manage your account information</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                First Name
              </label>
              <p className="text-gray-900 font-poppins">{user.firstName}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                Last Name
              </label>
              <p className="text-gray-900 font-poppins">{user.lastName}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                Email
              </label>
              <p className="text-gray-900 font-poppins">{user.email}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                Role
              </label>
              <p className="text-gray-900 font-poppins capitalize">{user.role}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                User ID
              </label>
              <p className="text-gray-900 font-poppins">{user.userId}</p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 font-poppins">
              Profile editing functionality will be available in a future update.
            </p>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  )
}
