"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import DashboardHeader from "@/app/components/dashboard/header"
import BottomNavigation from "@/app/components/dashboard/bottom-navigation"
import { checkAuthRole, type AuthUser } from "@/lib/auth"
import { apiPost } from "@/lib/api-client"
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

export default function EditStaffPage() {
  const router = useRouter()
  const params = useParams()
  const staffId = Number.parseInt(params.id as string)

  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [staffData, setStaffData] = useState<Staff | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    role: "support",
    status: "active",
    paymentRate: "",
    joinDate: "",
  })

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    position: "",
    paymentRate: "",
  })

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
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, staffId])

  const fetchStaffData = async () => {
    try {
      const response = await apiPost('/api/staff/get-by-id', { id: staffId })
      if (response.success && response.data?.success) {
        const staff = response.data.data
        setStaffData(staff)
        setFormData({
          name: staff.name,
          email: staff.email,
          position: staff.position,
          role: staff.role,
          status: staff.status,
          paymentRate: staff.payment_rate.toString(),
          joinDate: staff.join_date,
        })
      } else {
        toast({
          title: "Error",
          description: response.data?.error || "Failed to fetch staff details",
          variant: "destructive",
        })
        router.push("/admin/staff")
      }
    } catch (error) {
      console.error(`Error fetching staff with ID ${staffId}:`, error)
      toast({
        title: "Error",
        description: "An error occurred while fetching staff details",
        variant: "destructive",
      })
      router.push("/admin/staff")
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }
  }

  const validateForm = () => {
    const newErrors = {
      name: formData.name ? "" : "Name is required",
      email: formData.email
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
          ? ""
          : "Please enter a valid email"
        : "Email is required",
      position: formData.position ? "" : "Position is required",
      paymentRate: formData.paymentRate
        ? isNaN(Number(formData.paymentRate)) || Number(formData.paymentRate) <= 0
          ? "Please enter a valid payment rate"
          : ""
        : "Payment rate is required",
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some((error) => error)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !staffData) {
      return
    }

    setSubmitting(true)
    try {
      const response = await apiPost('/api/staff/update', {
        id: staffId,
        name: formData.name,
        email: formData.email,
        position: formData.position,
        role: formData.role,
        status: formData.status,
        paymentRate: formData.paymentRate,
        joinDate: formData.joinDate,
      })
      
      if (response.success && response.data?.success) {
        toast({
          title: "Success",
          description: "Staff member updated successfully",
        })
        router.push("/admin/staff")
      } else {
        toast({
          title: "Error",
          description: response.data?.error || "Failed to update staff member",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Error updating staff with ID ${staffId}:`, error)
      toast({
        title: "Error",
        description: "An error occurred while updating staff member",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !staffData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading staff data...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // checkAuthRole will handle redirection
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center mb-6">
          <Link href="/admin/staff" className="mr-4 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-poppins">Edit Staff Member</h1>
            <p className="text-gray-600 font-poppins">Update information for {staffData.name}</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
          <div className="flex items-center mb-6">
            <img
              src={staffData.avatar || "/placeholder.svg"}
              alt={staffData.name}
              className="w-16 h-16 rounded-full mr-4 bg-gray-200"
            />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 font-poppins">{staffData.name}</h2>
              <p className="text-gray-500 text-sm font-poppins">
                Joined: {new Date(staffData.join_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2 border ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  placeholder="John Doe"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2 border ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  placeholder="john.doe@example.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Position <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2 border ${
                    errors.position ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  placeholder="Senior Developer"
                />
                {errors.position && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.position}</p>}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                >
                  <option value="admin">Admin</option>
                  <option value="support">Support</option>
                  <option value="finance">Finance</option>
                </select>
              </div>

              <div>
                <label htmlFor="paymentRate" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Payment Rate ($/hr) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="paymentRate"
                  name="paymentRate"
                  value={formData.paymentRate}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className={`block w-full px-3 py-2 border ${
                    errors.paymentRate ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  placeholder="25.00"
                />
                {errors.paymentRate && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.paymentRate}</p>}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label htmlFor="joinDate" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Join Date
                </label>
                <input
                  type="date"
                  id="joinDate"
                  name="joinDate"
                  value={formData.joinDate}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <Link
                href="/admin/staff"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3A86FF] font-poppins"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#3A86FF] hover:bg-[#3A86FF]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3A86FF] disabled:opacity-50 disabled:cursor-not-allowed font-poppins"
              >
                {submitting ? "Updating..." : "Update Staff Member"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <BottomNavigation />
    </div>
  )
}
