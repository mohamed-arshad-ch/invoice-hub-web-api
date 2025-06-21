"use client"

import React, { useState, useEffect } from 'react'
import { X, Plus, Edit, Trash2, Zap, User, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils-currency'
import { toast } from '@/hooks/use-toast'

interface QuickTransactionTemplate {
  id: number
  name: string
  description?: string
  client_id: number
  product_id?: number
  quantity: number
  unit_price: number
  tax_rate: number
  payment_method: string
  notes?: string
  is_active: boolean
  client_name?: string
  product_name?: string
}

interface Client {
  id: number
  business_name: string
}

interface Product {
  id: number
  name: string
  description: string
  price: number
}

interface QuickTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function QuickTransactionModal({ isOpen, onClose, onSuccess }: QuickTransactionModalProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'create'>('templates')
  const [templates, setTemplates] = useState<QuickTransactionTemplate[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    product_id: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 0,
    payment_method: 'Bank Transfer',
    notes: ''
  })
  const [editingTemplate, setEditingTemplate] = useState<QuickTransactionTemplate | null>(null)

  useEffect(() => {
    if (isOpen) {
      setFetchingData(true)
      Promise.all([
        fetchTemplates(),
        fetchClients(),
        fetchProducts()
      ]).finally(() => {
        setFetchingData(false)
      })
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    try {
      const response: any = await apiGet('/api/quick-transactions')
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

  const fetchClients = async () => {
    try {
      const response: any = await apiGet('/api/clients')
      if (response.data.success && response.data.clients) {
        setClients(response.data.clients)
      } else {
        setClients([])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      setClients([])
    }
  }

  const fetchProducts = async () => {
    try {
      const response: any = await apiGet('/api/products')
      if (response.data.success && response.data.products) {
        setProducts(response.data.products)
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    }
  }

  const handleExecuteTemplate = async (templateId: number) => {
    setLoading(true)
    try {
      const response: any = await apiPost('/api/quick-transactions', {
        action: 'execute-template',
        template_id: templateId
      })

      if (response.success) {
        toast({
          title: "Success",
          description: `Quick transaction created: ${response.transaction_id || 'Transaction ID not available'}`,
        })
        onSuccess?.()
        onClose()
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to create transaction",
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
      const response = await apiPost('/api/quick-transactions', {
        action: editingTemplate ? 'update-template' : 'create-template',
        template_id: editingTemplate?.id,
        ...formData,
        client_id: parseInt(formData.client_id),
        product_id: formData.product_id ? parseInt(formData.product_id) : null,
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

  const handleEditTemplate = (template: QuickTransactionTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      client_id: template.client_id.toString(),
      product_id: template.product_id?.toString() || '',
      quantity: template.quantity,
      unit_price: template.unit_price,
      tax_rate: template.tax_rate,
      payment_method: template.payment_method,
      notes: template.notes || ''
    })
    setActiveTab('create')
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await apiPost('/api/quick-transactions', {
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
      client_id: '',
      product_id: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      payment_method: 'Bank Transfer',
      notes: ''
    })
    setEditingTemplate(null)
  }

  const calculateTotal = () => {
    const subtotal = formData.quantity * formData.unit_price
    const tax = subtotal * (formData.tax_rate / 100)
    return subtotal + tax
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 font-poppins">Quick Transactions</h2>
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
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No quick transaction templates found</p>
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
                        <span>{template.client_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatCurrency(template.unit_price * template.quantity * (1 + template.tax_rate / 100))}</span>
                      </div>
                      {template.product_name && (
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>{template.product_name}</span>
                        </div>
                      )}
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
                    Client *
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A86FF]"
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.business_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product (Optional)
                  </label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => {
                      const productId = e.target.value
                      const product = products.find(p => p.id === parseInt(productId))
                      setFormData({ 
                        ...formData, 
                        product_id: productId,
                        unit_price: product ? product.price : formData.unit_price
                      })
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A86FF]"
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A86FF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A86FF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A86FF]"
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
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cheque">Cheque</option>
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

              {(formData.quantity > 0 && formData.unit_price > 0) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Template Preview</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Subtotal: {formatCurrency(formData.quantity * formData.unit_price)}</div>
                    <div>Tax ({formData.tax_rate}%): {formatCurrency(formData.quantity * formData.unit_price * (formData.tax_rate / 100))}</div>
                    <div className="font-semibold text-gray-900">Total: {formatCurrency(calculateTotal())}</div>
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