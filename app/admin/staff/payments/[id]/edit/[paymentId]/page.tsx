"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, CreditCard, DollarSign, Receipt, User } from "lucide-react"
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

export default function EditPaymentPage() {
  const router = useRouter()
  const params = useParams()
  const staffId = Number.parseInt(params.id as string)
  const paymentId = Number.parseInt(params.paymentId as string)

  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [formData, setFormData] = useState({
    amount: "",
    datePaid: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await checkAuthRole("admin", router)
        if (userData) {
          setUser(userData)
          await fetchData()
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
  }, [router, staffId, paymentId])

  const fetchData = async () => {
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

      // Fetch payment details
      const paymentResponse = await apiPost('/api/staff/payments', { 
        action: "get-payment-by-id",
        paymentId 
      })
      if (paymentResponse.success && paymentResponse.data?.success) {
        const paymentData = paymentResponse.data.data
        setPayment(paymentData)
        setFormData({
          amount: paymentData.amount.toString(),
          datePaid: paymentData.date_paid,
          notes: paymentData.notes || "",
        })
      } else {
        toast({
          title: "Error",
          description: paymentResponse.data?.error || "Failed to fetch payment details",
          variant: "destructive",
        })
        router.push(`/admin/staff/payments/${staffId}`)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "An error occurred while fetching data",
        variant: "destructive",
      })
      router.push(`/admin/staff/payments/${staffId}`)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error for the field being edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    // Validate amount
    if (!formData.amount) {
      newErrors.amount = "Amount is required"
    } else if (isNaN(Number.parseFloat(formData.amount)) || Number.parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Amount must be a positive number"
    }

    // Validate date paid
    if (!formData.datePaid) {
      newErrors.datePaid = "Payment date is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await apiPost('/api/staff/payments', {
        action: "update-payment",
        paymentId,
        amount: formData.amount,
        datePaid: formData.datePaid,
        notes: formData.notes,
      })

      if (response.success && response.data?.success) {
        toast({
          title: "Success",
          description: "Payment updated successfully",
        })
        // Redirect to staff payments page after a short delay
        setTimeout(() => {
          router.push(`/admin/staff/payments/${staffId}`)
        }, 1000)
      } else {
        toast({
          title: "Error",
          description: response.data?.error || "Failed to update payment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating payment:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading || !staff || !payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading payment data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center mb-6">
          <Link
            href={`/admin/staff/payments/${staffId}`}
            className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-poppins">Edit Payment</h1>
            <p className="text-gray-600 font-poppins">Update payment details for {staff.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Staff Info Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-[#3A86FF] rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 font-poppins">{staff.name}</h2>
                <p className="text-gray-600 font-poppins">{staff.position}</p>
                <p className="text-sm text-gray-500 font-poppins">{staff.email}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2 font-poppins">Staff Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 font-poppins">Hourly Rate:</span>
                  <span className="text-sm font-medium text-gray-900 font-poppins">
                    {formatCurrency(staff.payment_rate)}/hr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 font-poppins">Status:</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                    staff.status === "active" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  } font-poppins`}>
                    {staff.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2 font-poppins">Current Payment</h3>
              <div className="space-y-1">
                <p className="text-sm text-blue-800 font-poppins">
                  Payment ID: #{payment.id}
                </p>
                <p className="text-sm text-blue-800 font-poppins">
                  Original Amount: {formatCurrency(payment.amount)}
                </p>
                <p className="text-sm text-blue-800 font-poppins">
                  Original Date: {formatDate(payment.date_paid)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center mb-6">
              <Receipt className="w-6 h-6 text-[#3A86FF] mr-3" />
              <h2 className="text-lg font-semibold text-gray-900 font-poppins">Update Payment Details</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins ${
                      errors.amount ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="0.00"
                    required
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600 font-poppins">{errors.amount}</p>
                )}
              </div>

              <div>
                <label htmlFor="datePaid" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="datePaid"
                    name="datePaid"
                    value={formData.datePaid}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins ${
                      errors.datePaid ? "border-red-300" : "border-gray-300"
                    }`}
                    required
                  />
                </div>
                {errors.datePaid && (
                  <p className="mt-1 text-sm text-red-600 font-poppins">{errors.datePaid}</p>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                  placeholder="Add any notes about this payment..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Link
                  href={`/admin/staff/payments/${staffId}`}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-poppins transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#3A86FF] text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-poppins flex items-center transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Update Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  )
}
