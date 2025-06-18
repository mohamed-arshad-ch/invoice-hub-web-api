"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, DollarSign, TrendingUp, CheckCircle, AlertCircle, Clock } from "lucide-react"
import ClientDashboardHeader from "@/app/components/dashboard/client-header"
import ClientBottomNavigation from "@/app/components/dashboard/client-bottom-navigation"
import { formatCurrency } from "@/lib/utils-currency"
import { getClientTransactions } from "@/app/actions/client-transactions-actions"

// Status badge colors and icons
const statusInfo = {
  paid: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-4 h-4" /> },
  pending: { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-4 h-4" /> },
  overdue: { color: "bg-red-100 text-red-800", icon: <AlertCircle className="w-4 h-4" /> },
}

export default function ClientDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [totalPaid, setTotalPaid] = useState<number>(0)

  useEffect(() => {
    // Check if user is authenticated
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.role !== "client") {
        router.push("/")
        return
      }
      setUser(parsedUser)

      // Fetch transactions for this client
      fetchTransactions(parsedUser.client_id)
    } catch (e) {
      console.error("Error parsing user data:", e)
      router.push("/")
      return
    }
  }, [router])

  const fetchTransactions = async (clientId: number) => {
    setLoading(true)
    try {
      const result = await getClientTransactions(clientId)
      if (result.success) {
        setTransactions(result.transactions)
        // Calculate total paid amount
        const paidAmount = result.transactions.filter((t) => t.status === "paid").reduce((sum, t) => sum + t.amount, 0)
        setTotalPaid(paidAmount)
      } else {
        console.error("Error loading transactions:", result.error)
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <ClientDashboardHeader />

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
              <div className="flex items-center text-green-500 text-sm font-medium font-poppins">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+12.5%</span>
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-2 font-poppins">Total Paid</h3>
            <p className="text-2xl font-bold text-gray-900 font-poppins">{formatCurrency(totalPaid)}</p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 font-poppins">Recent Transactions</h3>
            <button
              onClick={() => router.push("/client/transactions")}
              className="text-[#3A86FF] text-sm font-medium hover:underline font-poppins flex items-center"
            >
              View All
              <ArrowUpRight className="ml-1 w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b border-gray-200">
                  <th className="pb-3 font-medium font-poppins">Invoice ID</th>
                  <th className="pb-3 font-medium font-poppins">Date</th>
                  <th className="pb-3 font-medium font-poppins">Amount</th>
                  <th className="pb-3 font-medium font-poppins">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 6).map((transaction, index) => (
                  <tr key={transaction.id} className={`text-sm ${index !== 5 ? "border-b border-gray-100" : ""}`}>
                    <td className="py-4 font-medium text-gray-900 font-poppins">{transaction.id}</td>
                    <td className="py-4 text-gray-700 font-poppins">{transaction.date}</td>
                    <td className="py-4 font-medium text-gray-900 font-poppins">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          statusInfo[transaction.status as keyof typeof statusInfo].color
                        } font-poppins capitalize`}
                      >
                        {statusInfo[transaction.status as keyof typeof statusInfo].icon}
                        <span>{transaction.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <ClientBottomNavigation />
    </div>
  )
}
