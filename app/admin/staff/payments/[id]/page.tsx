"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Edit,
  Eye,
  Plus,
  Trash2,
  X,
  FileText,
  User,
  Info,
  CreditCard,
  TrendingUp,
} from "lucide-react"
import DashboardHeader from "@/app/components/dashboard/header"
import BottomNavigation from "@/app/components/dashboard/bottom-navigation"
import { checkAuthRole, type AuthUser } from "@/lib/auth"
import { apiPost } from "@/lib/api-client"
import { formatCurrency } from "@/lib/utils-currency"
import { toast } from "@/hooks/use-toast"

// Staff type definition
type Staff = {
  id: number
  name: string
  email: string
  position: string
  join_date: string
  status: "active" | "inactive"
  avatar: string
  role: "admin" | "support" | "finance"
  payment_rate: number
}

// Payment type definition
type Payment = {
  id: number
  staff_id: number
  amount: number
  date_paid: string
  notes: string
}

export default function StaffPayments() {
  const router = useRouter()
  const params = useParams()
  const staffId = Number.parseInt(params.id as string)

  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [totalPaid, setTotalPaid] = useState(0)
  const [paymentStats, setPaymentStats] = useState<{ month: string; total: number }[]>([])
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [deletingPayment, setDeletingPayment] = useState<number | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await checkAuthRole("admin", router)
        if (userData) {
          setUser(userData)
          await fetchStaffData()
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        toast({
          title: "Error",
          description: "Authentication failed. Please login again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, staffId])

  const fetchStaffData = async () => {
    try {
      // Fetch staff details
      const staffResponse = await apiPost('/api/staff/get-by-id', { id: staffId })
      if (staffResponse.success && staffResponse.data?.success) {
        setStaff(staffResponse.data.data)
      } else {
        toast({
          title: "Error",
          description: staffResponse.data?.error || "Failed to fetch staff details",
          variant: "destructive",
        })
        router.push("/admin/staff")
        return
      }

      // Fetch staff payments
      const paymentsResponse = await apiPost('/api/staff/payments', { 
        staffId, 
        action: "get-payments" 
      })
      if (paymentsResponse.success && paymentsResponse.data?.success) {
        setPayments(paymentsResponse.data.data)
      } else {
        toast({
          title: "Error",
          description: paymentsResponse.data?.error || "Failed to fetch staff payments",
          variant: "destructive",
        })
      }

      // Fetch total paid amount
      const totalPaidResponse = await apiPost('/api/staff/payments', { 
        staffId, 
        action: "get-total-paid" 
      })
      if (totalPaidResponse.success && totalPaidResponse.data?.success) {
        setTotalPaid(totalPaidResponse.data.data)
      } else {
        setTotalPaid(0)
      }

      // Fetch payment statistics
      const statsResponse = await apiPost('/api/staff/payments', { 
        staffId, 
        action: "get-stats" 
      })
      if (statsResponse.success && statsResponse.data?.success) {
        setPaymentStats(statsResponse.data.data)
      }
    } catch (error) {
      console.error("Error fetching staff data:", error)
      toast({
        title: "Error",
        description: "An error occurred while fetching staff data",
        variant: "destructive",
      })
    }
  }

  // Calculate total amount paid from payments
  const calculateTotalPaid = () => {
    return payments.reduce((sum, payment) => {
      const amount = typeof payment.amount === "number" ? payment.amount : Number.parseFloat(payment.amount) || 0
      return sum + amount
    }, 0)
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentPayments = payments.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(payments.length / itemsPerPage)

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Handle payment actions
  const handleViewPaymentDetails = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowPaymentDetails(true)
  }

  const handleEditPayment = (id: number) => {
    router.push(`/admin/staff/payments/${staffId}/edit/${id}`)
  }

  const handleDeletePayment = async (id: number) => {
    if (!confirm("Are you sure you want to delete this payment? This action cannot be undone.")) {
      return
    }

    setDeletingPayment(id)
    try {
      const response = await apiPost('/api/staff/payments/delete', { paymentId: id })
      
      if (response.success && response.data?.success) {
        toast({
          title: "Success",
          description: "Payment deleted successfully",
        })
        // Refresh the data
        await fetchStaffData()
      } else {
        toast({
          title: "Error",
          description: response.data?.error || "Failed to delete payment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting payment:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the payment",
        variant: "destructive",
      })
    } finally {
      setDeletingPayment(null)
    }
  }

  const handleRecordNewPayment = () => {
    router.push(`/admin/staff/payments/${staffId}/record`)
  }

  if (loading || !staff) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading staff payment data...</p>
        </div>
      </div>
    )
  }

  // Calculate total amount from current payments
  const calculatedTotalPaid = calculateTotalPaid()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link
              href="/admin/staff"
              className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-poppins">Staff Payments</h1>
              <p className="text-gray-600 font-poppins">Payment history for {staff.name}</p>
            </div>
          </div>
          <button
            onClick={handleRecordNewPayment}
            className="bg-[#3A86FF] text-white px-4 py-2 rounded-lg font-poppins flex items-center hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </button>
        </div>

        {/* Staff Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-[#3A86FF] rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 font-poppins">{staff.name}</h2>
                <p className="text-gray-600 font-poppins">{staff.position}</p>
                <p className="text-sm text-gray-500 font-poppins">{staff.email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 font-poppins">Payment Rate</p>
              <p className="text-2xl font-bold text-[#3A86FF] font-poppins">
                {formatCurrency(staff.payment_rate)}/hr
              </p>
            </div>
          </div>
        </div>

        {/* Payment Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-poppins">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900 font-poppins">
                  {formatCurrency(calculatedTotalPaid || totalPaid)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-poppins">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900 font-poppins">{payments.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-poppins">Avg Payment</p>
                <p className="text-2xl font-bold text-gray-900 font-poppins">
                  {payments.length > 0 ? formatCurrency((calculatedTotalPaid || totalPaid) / payments.length) : formatCurrency(0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 font-poppins">Payment History</h2>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 font-poppins mb-2">No payments found</h3>
              <p className="text-gray-500 font-poppins mb-4">No payment records found for this staff member.</p>
              <button
                onClick={handleRecordNewPayment}
                className="bg-[#3A86FF] text-white px-4 py-2 rounded-lg font-poppins hover:bg-blue-600 transition-colors"
              >
                Record First Payment
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-poppins">
                        Payment Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-poppins">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-poppins">
                        Notes
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-poppins">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900 font-poppins">{formatDate(payment.date_paid)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 font-poppins">
                            {formatCurrency(payment.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500 font-poppins">
                            {payment.notes || "No notes"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleViewPaymentDetails(payment)}
                              className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditPayment(payment.id)}
                              className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded transition-colors"
                              title="Edit Payment"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(payment.id)}
                              disabled={deletingPayment === payment.id}
                              className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="Delete Payment"
                            >
                              {deletingPayment === payment.id ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-500 font-poppins">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, payments.length)} of {payments.length} payments
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-700 font-poppins">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Payment Details Modal */}
        {showPaymentDetails && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 font-poppins">Payment Details</h3>
                <button
                  onClick={() => setShowPaymentDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 font-poppins">Payment Date</label>
                  <p className="text-gray-900 font-poppins">{formatDate(selectedPayment.date_paid)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 font-poppins">Amount</label>
                  <p className="text-2xl font-bold text-[#3A86FF] font-poppins">
                    {formatCurrency(selectedPayment.amount)}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 font-poppins">Notes</label>
                  <p className="text-gray-900 font-poppins">
                    {selectedPayment.notes || "No notes provided"}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPaymentDetails(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-poppins"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPaymentDetails(false)
                    handleEditPayment(selectedPayment.id)
                  }}
                  className="px-4 py-2 bg-[#3A86FF] text-white rounded-lg hover:bg-blue-600 font-poppins"
                >
                  Edit Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  )
}
