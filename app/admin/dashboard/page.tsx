"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowUpRight, DollarSign, FileText, TrendingUp, User, Users, BookOpen } from "lucide-react"
import DashboardHeader from "@/app/components/dashboard/header"
import BottomNavigation from "@/app/components/dashboard/bottom-navigation"
import { Chart, registerables } from "chart.js"

// Import the currency utility
import { formatCurrency } from "@/lib/utils-currency"

// Import API client functions and auth utilities
import { apiGet } from "@/lib/api-client"
import { checkAuthRole, AuthUser } from "@/lib/auth"

// Register Chart.js components
Chart.register(...registerables)

// Import loading component
import Loading from "./loading"

// Dashboard stats type
interface DashboardStats {
  totalRevenue: number
  activeClientCount: number
  pendingInvoiceCount: number
  totalStaffCount: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    activeClientCount: 0,
    pendingInvoiceCount: 0,
    totalStaffCount: 0
  })

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Check authentication and get user data
        const userData = await checkAuthRole("admin", router)
        
        if (!userData) {
          // User is not authenticated or not admin, checkAuthRole handles redirect
          return
        }

        setUser(userData)

        // Fetch dashboard statistics
        const dashboardResponse = await apiGet('/api/dashboard')
        
        if (dashboardResponse.success) {
          setStats(dashboardResponse.data.stats)
        } else {
          console.error("Error fetching dashboard data:", dashboardResponse.error)
        }

      } catch (error) {
        console.error("Error initializing dashboard:", error)
        router.push("/admin/login")
      } finally {
        setLoading(false)
      }
    }

    initializeDashboard()
  }, [router])

  // Show loading spinner while checking authentication and fetching data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
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
          <h1 className="text-2xl font-bold text-gray-900 font-poppins">Dashboard</h1>
          <p className="text-gray-600 font-poppins">
            Welcome back, {user.firstName} {user.lastName}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-[#3A86FF]/10 rounded-md">
                <DollarSign className="h-6 w-6 text-[#3A86FF]" />
              </div>
              <div className="flex items-center text-green-500 text-sm font-medium font-poppins">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+12.5%</span>
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-2 font-poppins">Total Revenue</h3>
            <p className="text-2xl font-bold text-gray-900 font-poppins">{formatCurrency(stats.totalRevenue)}</p>
          </div>

          {/* Active Clients */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-[#8338EC]/10 rounded-md">
                <Users className="h-6 w-6 text-[#8338EC]" />
              </div>
              <div className="flex items-center text-green-500 text-sm font-medium font-poppins">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+4.2%</span>
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-2 font-poppins">Active Clients</h3>
            <p className="text-2xl font-bold text-gray-900 font-poppins">{stats.activeClientCount}</p>
          </div>

          {/* Pending Invoices */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-[#FF006E]/10 rounded-md">
                <FileText className="h-6 w-6 text-[#FF006E]" />
              </div>
              <div className="flex items-center text-yellow-500 text-sm font-medium font-poppins">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                <span>+2</span>
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-2 font-poppins">Pending Invoices</h3>
            <p className="text-2xl font-bold text-gray-900 font-poppins">{stats.pendingInvoiceCount}</p>
          </div>

          {/* Total Staff */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gray-100 rounded-md">
                <User className="h-6 w-6 text-gray-700" />
              </div>
              <div className="flex items-center text-green-500 text-sm font-medium font-poppins">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+1</span>
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-2 font-poppins">Total Staff</h3>
            <p className="text-2xl font-bold text-gray-900 font-poppins">{stats.totalStaffCount}</p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Transactions Card */}
          <Link href="/admin/transactions" className="group">
            <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
              <div className="w-12 h-12 rounded-full bg-[#3A86FF]/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-[#3A86FF]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">Transactions</h3>
              <p className="text-gray-600 mb-4 flex-grow font-poppins">
                Manage client invoices and financial transactions
              </p>
              <div className="flex items-center text-[#3A86FF] font-medium">
                <span className="font-poppins">View Transactions</span>
                <ArrowUpRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Staff Card */}
          <Link href="/admin/staff" className="group">
            <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
              <div className="w-12 h-12 rounded-full bg-[#8338EC]/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[#8338EC]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">Staff</h3>
              <p className="text-gray-600 mb-4 flex-grow font-poppins">
                Manage staff members and their payment records
              </p>
              <div className="flex items-center text-[#8338EC] font-medium">
                <span className="font-poppins">View Staff</span>
                <ArrowUpRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Ledger Card */}
          <Link href="/admin/ledger" className="group">
            <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
              <div className="w-12 h-12 rounded-full bg-[#FF006E]/10 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-[#FF006E]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">Financial Ledger</h3>
              <p className="text-gray-600 mb-4 flex-grow font-poppins">
                View comprehensive financial records for clients and staff
              </p>
              <div className="flex items-center text-[#FF006E] font-medium">
                <span className="font-poppins">View Ledger</span>
                <ArrowUpRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>
      </main>

      <BottomNavigation />
    </div>
  )
}
