"use client"

import type React from "react"

import { useState } from "react"
import { X, Calendar } from "lucide-react"

type RecordPaymentModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (paymentData: any) => void
  staffId: string
  staffName: string
}

export default function RecordPaymentModal({ isOpen, onClose, onSubmit, staffId, staffName }: RecordPaymentModalProps) {
  const [formData, setFormData] = useState({
    periodStart: "",
    periodEnd: "",
    amount: "",
    datePaid: new Date().toISOString().split("T")[0], // Today's date
    notes: "",
  })

  const [errors, setErrors] = useState({
    periodStart: "",
    periodEnd: "",
    amount: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      periodStart: formData.periodStart ? "" : "Start date is required",
      periodEnd: formData.periodEnd
        ? new Date(formData.periodEnd) < new Date(formData.periodStart)
          ? "End date must be after start date"
          : ""
        : "End date is required",
      amount: formData.amount
        ? isNaN(Number(formData.amount)) || Number(formData.amount) <= 0
          ? "Please enter a valid amount"
          : ""
        : "Amount is required",
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some((error) => error)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Format the data
    const paymentData = {
      ...formData,
      amount: Number(formData.amount),
      staffId,
      id: `pay-${Date.now().toString(36)}`, // Generate a unique ID
    }

    onSubmit(paymentData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 font-poppins">Record Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-gray-700 font-poppins">
              Recording payment for: <span className="font-semibold">{staffName}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="periodStart" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Period Start <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="periodStart"
                    name="periodStart"
                    value={formData.periodStart}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      errors.periodStart ? "border-red-500" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  />
                </div>
                {errors.periodStart && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.periodStart}</p>}
              </div>

              <div>
                <label htmlFor="periodEnd" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                  Period End <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="periodEnd"
                    name="periodEnd"
                    value={formData.periodEnd}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      errors.periodEnd ? "border-red-500" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  />
                </div>
                {errors.periodEnd && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.periodEnd}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {/* Update the currency symbol in the amount input */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-poppins">₹</span>
                </div>
                <input
                  type="text"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className={`block w-full pl-8 pr-3 py-2 border ${
                    errors.amount ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.amount}</p>}
            </div>

            <div>
              <label htmlFor="datePaid" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                Date Paid
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
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 font-poppins mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                placeholder="Add any notes about this payment..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3A86FF] text-sm font-medium font-poppins transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#3A86FF] hover:bg-[#3A86FF]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3A86FF] font-poppins transition-colors"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
