"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import StaffDashboardHeader from "@/app/components/dashboard/staff-header"
import StaffBottomNavigation from "@/app/components/dashboard/staff-bottom-navigation"
import { formatCurrency } from "@/lib/utils-currency"
import { Printer, Eye } from "lucide-react"
import { getStaffPaymentsList } from "@/app/actions/staff-actions"

// Payment type definition
type Payment = {
  id: number
  staff_id: number
  period_start: string
  period_end: string
  amount: number
  date_paid: string
  notes: string
}

export default function StaffPayments() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])

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

      // Fetch payments for this staff member
      fetchPayments(parsedUser.staff_id)
    } catch (e) {
      console.error("Error parsing user data:", e)
      router.push("/")
      return
    }
  }, [router])

  const fetchPayments = async (staffId: number) => {
    setLoading(true)
    try {
      const response = await getStaffPaymentsList(staffId)
      if (response.success) {
        setPayments(response.data)
      } else {
        console.error("Error fetching payments:", response.error)
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#8338EC] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading payments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <StaffDashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 font-poppins">Payments</h1>
          <p className="text-gray-600 font-poppins">View your payment history</p>
        </div>

        {/* Payment Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">Payment #{payment.id}</h3>
                <p className="text-gray-600 mb-4 font-poppins">Date: {formatDate(payment.date_paid)}</p>
                <p className="text-gray-600 mb-4 font-poppins">Amount: {formatCurrency(payment.amount)}</p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => console.log(`View details for payment ${payment.id}`)}
                    className="p-2 rounded-full bg-blue-50 text-[#3A86FF] hover:bg-blue-100 transition-colors"
                    aria-label="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => console.log(`Print slip for payment ${payment.id}`)}
                    className="p-2 rounded-full bg-purple-50 text-[#8338EC] hover:bg-purple-100 transition-colors"
                    aria-label="Print slip"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <StaffBottomNavigation />
    </div>
  )
}
