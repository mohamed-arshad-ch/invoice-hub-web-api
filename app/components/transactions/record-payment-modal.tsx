"use client"

import { useState } from "react"
import { X, DollarSign, Calendar, FileText, CreditCard } from "lucide-react"
import { formatCurrency } from "@/lib/utils-currency"

type Transaction = {
  id: number
  transactionId: string
  clientId: string | number
  clientName: string
  transactionDate: string
  dueDate: string
  totalAmount: number
  status: string
  referenceNumber?: string
}

type RecordPaymentModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (paymentData: any) => void
  transaction: Transaction
  isSubmitting: boolean
  existingPayments?: any[]
  paymentSummary?: any
}

const paymentMethods = [
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cash", label: "Cash" },
  { value: "Credit Card", label: "Credit Card" },
  { value: "UPI", label: "UPI" },
  { value: "Cheque", label: "Cheque" },
  { value: "PayPal", label: "PayPal" },
]

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  transaction,
  isSubmitting,
  existingPayments = [],
  paymentSummary,
}: RecordPaymentModalProps) {
  const [formData, setFormData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "UPI",
    referenceNumber: "",
    notes: "",
  })

  const [errors, setErrors] = useState({
    amount: "",
    paymentDate: "",
  })

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
      amount: "",
      paymentDate: "",
    }

    // Validate amount
    const amount = Number.parseFloat(formData.amount)
    const maxAllowedAmount = isPartialStatus ? remainingBalance : transaction.totalAmount
    
    if (!formData.amount) {
      newErrors.amount = "Amount is required"
    } else if (isNaN(amount) || amount <= 0) {
      newErrors.amount = "Please enter a valid amount"
    } else if (amount > maxAllowedAmount) {
      if (isPartialStatus) {
        newErrors.amount = `Amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`
      } else {
        newErrors.amount = `Amount cannot exceed transaction total of ${formatCurrency(transaction.totalAmount)}`
      }
    }

    // Validate payment date
    if (!formData.paymentDate) {
      newErrors.paymentDate = "Payment date is required"
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some((error) => error)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    onSubmit({
      amount: formData.amount,
      paymentDate: formData.paymentDate,
      paymentMethod: formData.paymentMethod,
      referenceNumber: formData.referenceNumber,
      notes: formData.notes,
    })
  }

  const resetForm = () => {
    setFormData({
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "UPI",
      referenceNumber: "",
      notes: "",
    })
    setErrors({
      amount: "",
      paymentDate: "",
    })
  }

  if (!isOpen) return null

  // Calculate payment totals
  const totalPaid = paymentSummary ? paymentSummary.totalPaid : existingPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const remainingBalance = paymentSummary ? paymentSummary.remainingAmount : transaction.totalAmount - totalPaid
  const isPartialStatus = transaction.status === 'partial'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 font-poppins">Record Payment</h2>
          <button 
            onClick={() => {
              resetForm()
              onClose()
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Transaction Info */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <FileText className="w-5 h-5 text-[#3A86FF] mr-2" />
              <h3 className="font-medium text-gray-900 font-poppins">{transaction.transactionId}</h3>
            </div>
            <p className="text-sm text-gray-600 font-poppins mb-3">{transaction.clientName}</p>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-poppins">Total Amount:</span>
                <span className="font-medium text-gray-900 font-poppins">
                  {formatCurrency(transaction.totalAmount)}
                </span>
              </div>
              
              {isPartialStatus && existingPayments.length > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 font-poppins">Amount Paid:</span>
                    <span className="font-medium text-green-600 font-poppins">
                      {formatCurrency(totalPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-700 font-poppins">Remaining Balance:</span>
                    <span className="font-bold text-red-600 font-poppins">
                      {formatCurrency(remainingBalance)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1 font-poppins">
                Payment Amount *
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
                  max={isPartialStatus ? remainingBalance : transaction.totalAmount}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md text-sm font-poppins focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] ${
                    errors.amount ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600 font-poppins">{errors.amount}</p>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-1 font-poppins">
                Payment Date *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="paymentDate"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md text-sm font-poppins focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] ${
                    errors.paymentDate ? "border-red-300" : "border-gray-300"
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.paymentDate && (
                <p className="mt-1 text-sm text-red-600 font-poppins">{errors.paymentDate}</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1 font-poppins">
                Payment Method
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm font-poppins focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF]"
                  disabled={isSubmitting}
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reference Number */}
            <div>
              <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700 mb-1 font-poppins">
                Reference Number
              </label>
              <input
                type="text"
                id="referenceNumber"
                name="referenceNumber"
                value={formData.referenceNumber}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-poppins focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF]"
                placeholder="Transaction reference, cheque no, etc."
                disabled={isSubmitting}
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1 font-poppins">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-poppins focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF]"
                placeholder="Additional notes about this payment..."
                disabled={isSubmitting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  onClose()
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-poppins"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#3A86FF] text-white rounded-md hover:bg-[#3A86FF]/90 transition-colors font-poppins disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 