"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FileText, Home, Settings, DollarSign } from "lucide-react"
import StaffDashboardHeader from "@/app/components/dashboard/staff-header"
import StaffBottomNavigation from "@/app/components/dashboard/staff-bottom-navigation"
import { formatCurrency } from "@/lib/utils-currency"

// Mock data - in a real app, this would come from an API
const mockPayments = [
  {
    id: "PAY-2025-001",
    date: "Apr 10, 2025",
    amount: 2450.0,
    status: "paid",
  },
  {
    id: "PAY-2025-002",
    date: "Mar 15, 2025",
    amount: 1890.0,
    status: "pending",
  },
  {
    id: "PAY-2025-003",
    date: "Feb 28, 2025",
    amount: 3200.0,
    status: "paid",
  },
]

export default function StaffDashboard() {
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

  // Calculate total paid amount
  const totalPaid = mockPayments.filter((t) => t.status === "paid").reduce((sum, t) => sum + t.amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#8338EC] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <StaffDashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 font-poppins">Dashboard</h1>
          <p className="text-gray-600 font-poppins">
            Welcome, {user?.firstName} {user?.lastName}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Total Paid */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-green-100 rounded-md">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-2 font-poppins">Total Paid</h3>
            <p className="text-2xl font-bold text-gray-900 font-poppins">{formatCurrency(totalPaid)}</p>
          </div>

          {/* Total Transactions */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-100 rounded-md">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-2 font-poppins">Total Transactions</h3>
            <p className="text-2xl font-bold text-gray-900 font-poppins">{mockPayments.length}</p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Home Card */}
          <Link href="/staff/dashboard" className="group">
            <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
              <div className="w-12 h-12 rounded-full bg-[#8338EC]/10 flex items-center justify-center mb-4">
                <Home className="w-6 h-6 text-[#8338EC]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">Home</h3>
              <p className="text-gray-600 mb-4 flex-grow font-poppins">View your dashboard and recent activity</p>
              <div className="flex items-center text-[#8338EC] font-medium">
                <span className="font-poppins">Go to Home</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Payments Card */}
          <Link href="/staff/payments" className="group">
            <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
              <div className="w-12 h-12 rounded-full bg-[#3A86FF]/10 flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-[#3A86FF]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">Payments</h3>
              <p className="text-gray-600 mb-4 flex-grow font-poppins">View your payment history and details</p>
              <div className="flex items-center text-[#3A86FF] font-medium">
                <span className="font-poppins">View Payments</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Settings Card */}
          <Link href="/staff/settings" className="group">
            <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-gray-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">Settings</h3>
              <p className="text-gray-600 mb-4 flex-grow font-poppins">Manage your account settings and preferences</p>
              <div className="flex items-center text-gray-700 font-medium">
                <span className="font-poppins">Edit Settings</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </main>

      <StaffBottomNavigation />
    </div>
  )
}
