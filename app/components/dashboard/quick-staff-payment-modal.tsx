"use client"

import React, { useState, useEffect } from 'react'
import { X, Plus, Edit, Trash2, Zap, User, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils-currency'
import { toast } from '@/hooks/use-toast'

interface QuickStaffPaymentTemplate {
  id: number
  name: string
  description?: string
  staff_id: number
  amount: number
  payment_method: string
  notes?: string
  is_active: boolean
  staff_name?: string
}

interface Staff {
  id: number
  name: string
  position: string
  payment_rate: number
}

interface QuickStaffPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function QuickStaffPaymentModal({ isOpen, onClose, onSuccess }: QuickStaffPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'create'>('templates')
  const [templates, setTemplates] = useState<QuickStaffPaymentTemplate[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    staff_id: '',
    amount: 0,
    payment_method: 'Bank Transfer',
    notes: ''
  })
  const [editingTemplate, setEditingTemplate] = useState<QuickStaffPaymentTemplate | null>(null)

  useEffect(() => {
    if (isOpen) {
      setFetchingData(true)
      Promise.all([
        fetchTemplates(),
        fetchStaff()
      ]).finally(() => {
        setFetchingData(false)
      })
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    try {
      const response: any = await apiGet('/api/quick-staff-payments')
      if (response.data.success && response.data.templates) {
        setTemplates(response.data.templates)
      } else {
        setTemplates([])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      setTemplates([])
    }
  }

  const fetchStaff = async () => {
    try {
      const response: any = await apiGet('/api/staff')
      if (response.data.success && response.data.data) {
        setStaff(response.data.data)
      } else {
        setStaff([])
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
      setStaff([])
    }
  }

  const handleExecuteTemplate = async (templateId: number) => {
    setLoading(true)
    try {
      const response: any = await apiPost('/api/quick-staff-payments', {
        action: 'execute-template',
        template_id: templateId
      })

      if (response.success) {
        toast({
          title: "Success",
          description: `Quick staff payment recorded: Payment ID ${response.payment_id || 'Payment ID not available'}`,
        })
        onSuccess?.()
        onClose()
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to record payment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error executing template:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await apiPost('/api/quick-staff-payments', {
        action: editingTemplate ? 'update-template' : 'create-template',
        template_id: editingTemplate?.id,
        ...formData,
        staff_id: parseInt(formData.staff_id),
      })

      if (response.success) {
        toast({
          title: "Success",
          description: editingTemplate ? "Template updated successfully" : "Template created successfully",
        })
        resetForm()
        fetchTemplates()
        setActiveTab('templates')
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to save template",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditTemplate = (template: QuickStaffPaymentTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      staff_id: template.staff_id.toString(),
      amount: template.amount,
      payment_method: template.payment_method,
      notes: template.notes || ''
    })
    setActiveTab('create')
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await apiPost('/api/quick-staff-payments', {
        action: 'delete-template',
        template_id: templateId
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Template deleted successfully",
        })
        fetchTemplates()
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to delete template",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      staff_id: '',
      amount: 0,
      payment_method: 'Bank Transfer',
      notes: ''
    })
    setEditingTemplate(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 font-poppins">Quick Staff Payments</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => {
              setActiveTab('templates')
              resetForm()
            }}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'templates'
                ? 'text-[#3A86FF] border-b-2 border-[#3A86FF]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-[#3A86FF] border-b-2 border-[#3A86FF]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {editingTemplate ? 'Edit Template' : 'Create Template'}
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'templates' ? (
            <div className="space-y-4">
              {fetchingData ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No quick staff payment templates found</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-4 bg-[#3A86FF] text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Create Your First Template
                  </button>
                </div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleExecuteTemplate(template.id)}
                          disabled={loading}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors flex items-center space-x-1"
                        >
                          <Zap className="w-4 h-4" />
                          <span>Execute</span>
                        </button>
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{template.staff_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatCurrency(template.amount)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4" />
                        <span>{template.payment_method}</span>
                      </div>
                    </div>
                    
                    {template.description && (
                      <p className="mt-2 text-sm text-gray-500">{template.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateTemplate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A86FF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Member *
                  </label>
                  <select
                    value={formData.staff_id}
                    onChange={(e) => {
                      const staffId = e.target.value
                      const selectedStaff = staff.find(s => s.id === parseInt(staffId))
                      setFormData({ 
                        ...formData, 
                        staff_id: staffId,
                        amount: selectedStaff ? selectedStaff.payment_rate * 8 : formData.amount // Default to 8 hours
                      })
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A86FF]"
                    required
                  >
                    <option value="">Select Staff Member</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} - {member.position} ({formatCurrency(member.payment_rate)}/hr)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A86FF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A86FF]"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Direct Deposit">Direct Deposit</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A86FF]"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A86FF]"
                    rows={3}
                  />
                </div>
              </div>

              {formData.amount > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Payment Preview</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="font-semibold text-gray-900">Amount: {formatCurrency(formData.amount)}</div>
                    <div>Payment Method: {formData.payment_method}</div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm()
                    setActiveTab('templates')
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#3A86FF] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
} 