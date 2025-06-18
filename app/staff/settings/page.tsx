"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import StaffDashboardHeader from "@/app/components/dashboard/staff-header"
import StaffBottomNavigation from "@/app/components/dashboard/staff-bottom-navigation"

export default function StaffSettings() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.role !== "staff") {
        router.push("/")
        return
      }
      setUser(parsedUser)
    } catch (e) {
      console.error("Error parsing user data:", e)
      router.push("/")
      return
    }

    setLoading(false)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <StaffDashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 font-poppins">Settings</h1>
          <p className="text-gray-600 font-poppins">Manage your account settings</p>
        </div>

        {/* Settings Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <p className="text-gray-600 font-poppins">Settings page is under construction.</p>
        </div>
      </main>

      <StaffBottomNavigation />
    </div>
  )
}
