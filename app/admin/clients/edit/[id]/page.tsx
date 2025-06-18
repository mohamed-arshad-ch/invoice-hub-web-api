"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import DashboardHeader from "@/app/components/dashboard/header"
import BottomNavigation from "@/app/components/dashboard/bottom-navigation"
import { Toast } from "@/app/components/ui/toast"
import { checkAuthRole, type AuthUser } from "@/lib/auth"
import { apiPost } from "@/lib/api-client"

// Client form data type
export type ClientFormData = {
  businessName: string
  contactPerson: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zip: string
  paymentSchedule: string
  paymentTerms: string
  status: boolean
  notes: string
}

export default function EditClient() {
  const router = useRouter()
  const params = useParams()
  const clientId = Number(params.id)

  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientLoading, setClientLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

  // Form state
  const [formData, setFormData] = useState<ClientFormData>({
    businessName: "",
    contactPerson: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    paymentSchedule: "monthly",
    paymentTerms: "net30",
    status: true,
    notes: "",
  })

  // Form validation
  const [errors, setErrors] = useState({
    businessName: "",
    contactPerson: "",
    email: "",
    phone: "",
  })

  useEffect(() => {
    initializeComponent()
  }, [])

  const initializeComponent = async () => {
    try {
      setLoading(true)
      
      // Check authentication and role
      const userData = await checkAuthRole("admin", router)
      if (!userData) {
        return // checkAuthRole handles redirection
      }
      
      setUser(userData)
      
      // Fetch client data after authentication is confirmed
      if (clientId) {
        await fetchClient()
      }
    } catch (error) {
      console.error("Error initializing component:", error)
      setToast({ message: "Authentication error occurred", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const fetchClient = async () => {
    setClientLoading(true)
    try {
      const response = await apiPost('/api/clients/get-by-id', { id: clientId })

      if (response.success && response.data.client) {
        const client = response.data.client
        setFormData({
          businessName: client.business_name,
          contactPerson: client.contact_person,
          email: client.email,
          phone: client.phone,
          street: client.street || "",
          city: client.city || "",
          state: client.state || "",
          zip: client.zip || "",
          paymentSchedule: client.payment_schedule,
          paymentTerms: client.payment_terms,
          status: client.status,
          notes: client.notes || "",
        })
      } else {
        setToast({ message: response.error || "Client not found", type: "error" })
        // Redirect back to clients list after a short delay
        setTimeout(() => {
          router.push("/admin/clients")
        }, 1500)
      }
    } catch (error) {
      console.error("Error fetching client:", error)
      setToast({ message: "An unexpected error occurred", type: "error" })
    } finally {
      setClientLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const handleToggleChange = () => {
    setFormData({
      ...formData,
      status: !formData.status,
    })
  }

  const validateForm = () => {
    const newErrors = {
      businessName: formData.businessName ? "" : "Business name is required",
      contactPerson: formData.contactPerson ? "" : "Contact person is required",
      email: formData.email
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
          ? ""
          : "Please enter a valid email"
        : "Email is required",
      phone: formData.phone ? "" : "Phone number is required",
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some((error) => error)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await apiPost('/api/clients/update', {
        id: clientId,
        ...formData
      })

      if (response.success) {
        setToast({ message: response.data.message || "Client updated successfully", type: "success" })

        // Redirect after a short delay to allow the user to see the success message
        setTimeout(() => {
          router.push("/admin/clients")
        }, 1500)
      } else {
        setToast({ message: response.error || "Failed to update client", type: "error" })
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error("Error updating client:", error)
      setToast({ message: "An unexpected error occurred", type: "error" })
      setIsSubmitting(false)
    }
  }

  if (loading || clientLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading client data...</p>
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
          <Link href="/admin/clients" className="mr-4 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-poppins">Edit Client</h1>
            <p className="text-gray-600 font-poppins">Update client information</p>
          </div>
        </div>

        {/* Client Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Business Information */}
              <div className="md:col-span-2">
                <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Business Information</h2>
              </div>

              <div className="space-y-2">
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 font-poppins">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border ${
                    errors.businessName ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  placeholder="Acme Corporation"
                  disabled={isSubmitting}
                />
                {errors.businessName && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.businessName}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 font-poppins">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="contactPerson"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border ${
                    errors.contactPerson ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  placeholder="John Doe"
                  disabled={isSubmitting}
                />
                {errors.contactPerson && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.contactPerson}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 font-poppins">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  placeholder="john@acme.com"
                  disabled={isSubmitting}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 font-poppins">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border ${
                    errors.phone ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  placeholder="(555) 123-4567"
                  disabled={isSubmitting}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.phone}</p>}
              </div>

              {/* Address Information */}
              <div className="md:col-span-2 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Address Information</h2>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 font-poppins">
                  Street Address
                </label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                  placeholder="123 Main Street"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 font-poppins">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                  placeholder="New York"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 font-poppins">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                  placeholder="NY"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="zip" className="block text-sm font-medium text-gray-700 font-poppins">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                  placeholder="10001"
                  disabled={isSubmitting}
                />
              </div>

              {/* Payment Information */}
              <div className="md:col-span-2 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Payment Information</h2>
              </div>

              <div className="space-y-2">
                <label htmlFor="paymentSchedule" className="block text-sm font-medium text-gray-700 font-poppins">
                  Payment Schedule
                </label>
                <select
                  id="paymentSchedule"
                  name="paymentSchedule"
                  value={formData.paymentSchedule}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                  disabled={isSubmitting}
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 font-poppins">
                  Payment Terms
                </label>
                <select
                  id="paymentTerms"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                  disabled={isSubmitting}
                >
                  <option value="net15">Net 15</option>
                  <option value="net30">Net 30</option>
                  <option value="net45">Net 45</option>
                  <option value="net60">Net 60</option>
                  <option value="due-on-receipt">Due on Receipt</option>
                </select>
              </div>

              {/* Status and Notes */}
              <div className="md:col-span-2 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Additional Information</h2>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 font-poppins">
                  Status
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={handleToggleChange}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#3A86FF] focus:ring-offset-2 ${
                      formData.status ? "bg-[#3A86FF]" : "bg-gray-200"
                    }`}
                    disabled={isSubmitting}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.status ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="ml-3 text-sm font-poppins">
                    {formData.status ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 font-poppins">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                  placeholder="Additional notes about the client..."
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/admin/clients"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3A86FF] font-poppins"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-[#3A86FF] border border-transparent rounded-md shadow-sm hover:bg-[#2563EB] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3A86FF] disabled:opacity-50 disabled:cursor-not-allowed font-poppins"
              >
                {isSubmitting ? "Updating..." : "Update Client"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <BottomNavigation />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
