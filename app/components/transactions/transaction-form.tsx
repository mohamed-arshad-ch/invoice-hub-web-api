"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, ChevronDown, CreditCard, FileText, Plus, Trash2, User, Edit } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { apiGet, apiPost } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"

// Import the currency utility
import { formatCurrency } from "@/lib/utils-currency"

// Types
type Product = {
  id: string | number
  name: string
  description: string
  price: number
  taxRate: number
}

type Client = {
  id: string | number
  name: string
  email: string
  address: string
  contactPerson: string
  phone: string
}

type LineItem = {
  id: string
  productId: string | number
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  total: number
  productSearch?: string
  isEditing?: boolean
}

type TransactionFormProps = {
  mode: "create" | "edit"
  initialData?: any
}

// Payment methods
const paymentMethods = [
  { id: "Credit Card", name: "Credit Card" },
  { id: "Bank Transfer", name: "Bank Transfer" },
  { id: "PayPal", name: "PayPal" },
  { id: "Cash", name: "Cash" },
  { id: "Check", name: "Check" },
  { id: "UPI", name: "UPI" },
]

// Transaction statuses
const transactionStatuses = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
]

export default function TransactionForm({ mode, initialData }: TransactionFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [userId, setUserId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    transactionId: "",
    clientId: "",
    transactionDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    referenceNumber: "",
    lineItems: [] as LineItem[],
    notes: "",
    terms: "Payment is due within 30 days of invoice date. Late payments are subject to a 1.5% monthly fee.",
    paymentMethod: "UPI",
    status: "paid", // Default to 'paid' as specified
  })

  // Calculations
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    taxAmount: 0,
    total: 0,
  })

  // Form validation
  const [errors, setErrors] = useState({
    clientId: "",
    dueDate: "",
    lineItems: "",
  })

  // Get user session - not needed anymore as API handles authentication
  useEffect(() => {
    // UserId is now handled by the API authentication
    setUserId(1) // Placeholder - actual user ID is managed by JWT tokens
  }, [])

  // Load clients
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoadingClients(true)
      try {
        const response = await apiGet('/api/clients')
        if (response.success && response.data?.success) {
          const clientsData = response.data.clients.map((client: any) => ({
            id: client.id,
            name: client.business_name || '',
            email: client.email || '',
            address: client.street 
              ? `${client.street}, ${client.city || ""}, ${client.state || ""} ${client.zip || ""}`.trim()
              : "No address provided",
            contactPerson: client.contact_person || '',
            phone: client.phone || '',
          }))
          setClients(clientsData)
        } else {
          console.error("Error loading clients:", response.data?.error)
        }
      } catch (error) {
        console.error("Error loading clients:", error)
      } finally {
        setIsLoadingClients(false)
      }
    }

    fetchClients()
  }, [])

  // Load products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiGet('/api/products')
        if (response.success && response.data?.success) {
          setProducts(response.data.products)
        } else {
          console.error("Error loading products:", response.data?.error)
        }
      } catch (error) {
        console.error("Error loading products:", error)
      }
    }

    fetchProducts()
  }, [])

  // Initialize form with example data or edit data
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData({
        transactionId: initialData.transactionId,
        clientId: initialData.clientId.toString(),
        transactionDate: initialData.transactionDate,
        dueDate: initialData.dueDate,
        referenceNumber: initialData.referenceNumber || "",
        lineItems: initialData.lineItems.map((item: any) => ({
          id: item.id.toString(),
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          total: item.quantity * item.unitPrice, // Ensure total is calculated correctly
        })),
        notes: initialData.notes || "",
        terms:
          initialData.terms ||
          "Payment is due within 30 days of invoice date. Late payments are subject to a 1.5% monthly fee.",
        paymentMethod: initialData.paymentMethod || "method-001",
        status: initialData.status || "paid", // Default to 'paid' if not specified
      })

      const client = clients.find((c) => c.id.toString() === initialData.clientId.toString())
      if (client) {
        setSelectedClient(client)
      }
    } else {
      // Set due date to 30 days from now
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      setFormData({
        ...formData,
        dueDate: dueDate.toISOString().split("T")[0],
        referenceNumber: `PO-${Math.floor(10000 + Math.random() * 90000)}`,
        status: "paid", // Ensure default status is 'paid'
      })
    }
  }, [mode, initialData, clients])

  // Calculate totals whenever line items change
  useEffect(() => {
    const subtotal = formData.lineItems.reduce((sum, item) => sum + item.total, 0)
    const taxAmount = formData.lineItems.reduce((sum, item) => sum + item.total * (item.taxRate / 100), 0)
    const total = subtotal + taxAmount

    setCalculations({
      subtotal,
      taxAmount,
      total,
    })
  }, [formData.lineItems])

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

  const handleClientSelect = (clientId: string | number) => {
    const client = clients.find((c) => c.id === clientId)
    if (client) {
      setSelectedClient(client)
      setFormData({
        ...formData,
        clientId: clientId.toString(),
      })
      setSearchQuery("")

      // Clear client error
      if (errors.clientId) {
        setErrors({
          ...errors,
          clientId: "",
        })
      }
    }
  }

  const handleAddLineItem = () => {
    const newLineItem: LineItem = {
      id: uuidv4(),
      productId: "",
      description: "",
      quantity: 1, // Default quantity to 1 as specified
      unitPrice: 0,
      taxRate: 0,
      total: 0,
      productSearch: "",
      isEditing: true,
    }

    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, newLineItem],
    })
  }

  const handleRemoveLineItem = (id: string) => {
    setFormData({
      ...formData,
      lineItems: formData.lineItems.filter((item) => item.id !== id),
    })
  }

  const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
    const updatedLineItems = formData.lineItems.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }

        // If product is selected, update description and unit price
        if (field === "productId") {
          const product = products.find((p) => p.id === value)
          if (product) {
            updatedItem.description = product.description
            updatedItem.unitPrice = product.price
            updatedItem.taxRate = product.taxRate
            updatedItem.isEditing = false
            updatedItem.productSearch = product.name
            updatedItem.quantity = 1 // Set default quantity to 1 when product is selected
            updatedItem.total = product.price // Calculate initial total as 1 * unit price
          }
        }

        // Recalculate total whenever quantity or unitPrice changes
        if (field === "quantity" || field === "unitPrice") {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice
        }

        return updatedItem
      }
      return item
    })

    setFormData({
      ...formData,
      lineItems: updatedLineItems,
    })

    // Clear line items error if any
    if (errors.lineItems) {
      setErrors({
        ...errors,
        lineItems: "",
      })
    }
  }

  const toggleEditLineItem = (id: string) => {
    const updatedLineItems = formData.lineItems.map((item) => {
      if (item.id === id) {
        return { ...item, isEditing: !item.isEditing }
      }
      return item
    })

    setFormData({
      ...formData,
      lineItems: updatedLineItems,
    })
  }

  const handleProductSearch = async (id: string, query: string) => {
    // Update the search query in the line item
    const updatedLineItems = formData.lineItems.map((item) => {
      if (item.id === id) {
        return { ...item, productSearch: query }
      }
      return item
    })

    setFormData({
      ...formData,
      lineItems: updatedLineItems,
    })

    if (query.length > 1) {
      setIsLoadingProducts(true)
      try {
        // Filter products locally for search functionality
        const filteredProducts = products.filter(product => 
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.description.toLowerCase().includes(query.toLowerCase())
        )
        setProductSearchResults(filteredProducts)
      } catch (error) {
        console.error("Error searching products:", error)
        setProductSearchResults([])
      } finally {
        setIsLoadingProducts(false)
      }
    } else {
      // If query is too short, show all products instead of empty results
      setProductSearchResults(products)
    }
  }

  const handleAddNewProduct = () => {
    // Store current form data in session storage
    sessionStorage.setItem("transactionFormData", JSON.stringify(formData))

    // Navigate to add product page
    router.push("/admin/products/add")
  }

  const validateForm = () => {
    const newErrors = {
      clientId: formData.clientId ? "" : "Client is required",
      dueDate: formData.dueDate ? "" : "Due date is required",
      lineItems:
        formData.lineItems.length > 0
          ? formData.lineItems.some((item) => !item.productId)
            ? "All line items must have a product selected"
            : ""
          : "At least one line item is required",
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some((error) => error)
  }

  const handleSubmit = async (action: "save") => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare transaction data
      const transactionData = {
        clientId: formData.clientId,
        transactionDate: formData.transactionDate,
        dueDate: formData.dueDate,
        referenceNumber: formData.referenceNumber,
        notes: formData.notes,
        terms: formData.terms,
        paymentMethod: formData.paymentMethod,
        status: formData.status, // Use the selected status
        subtotal: calculations.subtotal,
        taxAmount: calculations.taxAmount,
        totalAmount: calculations.total,
        lineItems: formData.lineItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          total: item.total,
        })),
      }

      let response
      if (mode === "create") {
        // Create new transaction
        response = await apiPost('/api/transactions', transactionData)
      } else {
        // Update existing transaction
        response = await apiPost('/api/transactions/update', {
          ...transactionData,
          transactionId: formData.transactionId,
        })
      }

      if (response.success && response.data?.success) {
        toast({
          title: "Success",
          description: response.data.message || `Transaction ${mode === "create" ? "created" : "updated"} successfully`,
        })
        router.push("/admin/transactions")
      } else {
        toast({
          title: "Error",
          description: response.data?.error || response.error || `Failed to ${mode} transaction`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Error ${mode === "create" ? "creating" : "updating"} transaction:`, error)
      toast({
        title: "Error",
        description: `An unexpected error occurred while ${mode === "create" ? "creating" : "updating"} the transaction`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get product details
  const getProductDetails = (productId: string | number) => {
    return products.find((p) => p.id === productId)
  }

  // Check for saved form data on component mount
  useEffect(() => {
    const savedFormData = sessionStorage.getItem("transactionFormData")
    if (savedFormData && mode === "create") {
      try {
        const parsedData = JSON.parse(savedFormData)
        setFormData(parsedData)

        if (parsedData.clientId) {
          const client = clients.find((c) => c.id === parsedData.clientId)
          if (client) {
            setSelectedClient(client)
          }
        }

        // Clear the saved data
        sessionStorage.removeItem("transactionFormData")
      } catch (error) {
        console.error("Error parsing saved form data:", error)
      }
    }
  }, [mode, clients])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
      <div className="p-6">
        {/* Client Selection Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Client Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="clientSearch" className="block text-sm font-medium text-gray-700 font-poppins">
                Select Client <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="clientSearch"
                  placeholder={isLoadingClients ? "Loading clients..." : "Search clients..."}
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    errors.clientId ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isSubmitting || isLoadingClients}
                />
                {isLoadingClients && (
                  <div className="absolute right-3 top-2">
                    <div className="w-5 h-5 border-2 border-t-transparent border-[#3A86FF] rounded-full animate-spin"></div>
                  </div>
                )}
                {searchQuery && !isLoadingClients && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                    {clients && clients.length > 0 ? clients
                      .filter(
                        (client) =>
                          (client.name && client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (client.contactPerson &&
                            client.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())),
                      )
                      .map((client) => (
                        <div
                          key={client.id}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleClientSelect(client.id)}
                        >
                          <p className="font-medium text-gray-900 font-poppins">{client.name}</p>
                          <p className="text-sm text-gray-500 font-poppins">
                            {client.contactPerson ? `${client.contactPerson} • ` : ""}
                            {client.email}
                          </p>
                        </div>
                      )) : (
                        <div className="px-4 py-2 text-sm text-gray-500 font-poppins">
                          No clients available. Please create a client first.
                        </div>
                      )}
                    {clients && clients.length > 0 && clients.filter(
                      (client) =>
                        (client.name && client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (client.contactPerson &&
                          client.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())),
                    ).length === 0 && (
                      <div className="px-4 py-2 text-sm text-gray-500 font-poppins">
                        No clients found. Please try a different search term.
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.clientId && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.clientId}</p>}
            </div>

            {selectedClient && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium text-gray-900 font-poppins mb-2">{selectedClient.name}</h3>
                {selectedClient.contactPerson && (
                  <p className="text-sm text-gray-600 font-poppins mb-1">Contact: {selectedClient.contactPerson}</p>
                )}
                <p className="text-sm text-gray-600 font-poppins mb-1">{selectedClient.email}</p>
                {selectedClient.phone && (
                  <p className="text-sm text-gray-600 font-poppins mb-1">Phone: {selectedClient.phone}</p>
                )}
                <p className="text-sm text-gray-600 font-poppins">{selectedClient.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Details Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Transaction Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="transactionDate" className="block text-sm font-medium text-gray-700 font-poppins">
                Transaction Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="transactionDate"
                  name="transactionDate"
                  value={formData.transactionDate}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 font-poppins">
                Due Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    errors.dueDate ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.dueDate && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.dueDate}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700 font-poppins">
                Reference/PO Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="referenceNumber"
                  name="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                  placeholder="PO-12345"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Line Items</h2>

          {errors.lineItems && <p className="mb-2 text-xs text-red-500 font-poppins">{errors.lineItems}</p>}

          <div className="space-y-4">
            {formData.lineItems.map((item, index) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm animate-fadeIn"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {item.isEditing || !item.productId ? (
                  // Product selection mode
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-full">
                      <div className="space-y-2 mb-4">
                        <label className="block text-sm font-medium text-gray-700 font-poppins">Select Product</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search products..."
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                            value={item.productSearch || ""}
                            onChange={(e) => handleProductSearch(item.id, e.target.value)}
                            disabled={isSubmitting || isLoadingProducts}
                          />
                          {isLoadingProducts && (
                            <div className="absolute right-3 top-2">
                              <div className="w-5 h-5 border-2 border-t-transparent border-[#3A86FF] rounded-full animate-spin"></div>
                            </div>
                          )}
                          {item.productSearch && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                              {productSearchResults.length > 0 ? (
                                <>
                                  {productSearchResults.map((product) => (
                                    <div
                                      key={product.id}
                                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                      onClick={() => {
                                        handleLineItemChange(item.id, "productId", product.id)
                                      }}
                                    >
                                      <p className="font-medium text-gray-900 font-poppins">{product.name}</p>
                                      <div className="flex justify-between">
                                        <p className="text-sm text-gray-500 font-poppins">{product.description}</p>
                                        <p className="text-sm font-medium text-gray-900 font-poppins">
                                          {formatCurrency(product.price)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="border-t border-gray-100"></div>
                                  <div className="p-3">
                                    <button
                                      type="button"
                                      onClick={handleAddNewProduct}
                                      className="w-full text-sm text-[#3A86FF] hover:text-[#3A86FF]/80 font-medium font-poppins flex items-center justify-center py-1"
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Create New Product
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="p-4">
                                  {isLoadingProducts ? (
                                    <div className="flex justify-center py-2">
                                      <div className="w-5 h-5 border-2 border-t-transparent border-[#3A86FF] rounded-full animate-spin"></div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm text-gray-500 font-poppins mb-2">
                                        {item.productSearch.length <= 1
                                          ? "Type to search products"
                                          : "No products found"}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={handleAddNewProduct}
                                        className="text-sm text-[#3A86FF] hover:text-[#3A86FF]/80 font-medium font-poppins flex items-center"
                                      >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Create New Product
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(item.id)}
                      className="ml-4 text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  // Product selected mode - card view
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        {/* Product info */}
                        <div className="flex items-center mb-2">
                          <div className="w-10 h-10 rounded-full bg-[#3A86FF]/10 flex items-center justify-center mr-3">
                            <FileText className="w-5 h-5 text-[#3A86FF]" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 font-poppins">
                              {getProductDetails(item.productId)?.name || "Product"}
                            </h3>
                            <p className="text-sm text-gray-500 font-poppins">{item.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => toggleEditLineItem(item.id)}
                          className="text-gray-500 hover:text-[#3A86FF] transition-colors mr-2"
                          disabled={isSubmitting}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Quantity, Price, Tax, Total */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-3 rounded-md">
                      <div>
                        <p className="text-xs text-gray-500 font-poppins mb-1">Quantity</p>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(item.id, "quantity", Number(e.target.value))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 font-poppins mb-1">Unit Price</p>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 font-poppins">₹</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(item.id, "unitPrice", Number(e.target.value))}
                            className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 font-poppins mb-1">Tax</p>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.taxRate}
                            onChange={(e) => handleLineItemChange(item.id, "taxRate", Number(e.target.value))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
                            disabled={isSubmitting}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 font-poppins">%</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 font-poppins mb-1">Total</p>
                        <div className="bg-white px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-900 font-poppins">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddLineItem}
            className="mt-4 flex items-center gap-1 text-[#3A86FF] hover:text-[#3A86FF]/80 font-medium font-poppins transition-colors"
            disabled={isSubmitting}
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-poppins">Subtotal:</span>
                <span className="font-medium text-gray-900 font-poppins">{formatCurrency(calculations.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-poppins">Tax:</span>
                <span className="font-medium text-gray-900 font-poppins">{formatCurrency(calculations.taxAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-lg font-medium text-gray-900 font-poppins">Total:</span>
                <span className="text-lg font-bold text-gray-900 font-poppins">
                  {formatCurrency(calculations.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes/Terms Section */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 font-poppins">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
              placeholder="Add any notes for the client..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="terms" className="block text-sm font-medium text-gray-700 font-poppins">
              Terms & Conditions
            </label>
            <textarea
              id="terms"
              name="terms"
              rows={4}
              value={formData.terms}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Payment Details Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 font-poppins">
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
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins appearance-none"
                  disabled={isSubmitting}
                >
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 font-poppins">
                Status
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins appearance-none"
                  disabled={isSubmitting}
                >
                  {transactionStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => handleSubmit("save")}
            disabled={isSubmitting}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#3A86FF] hover:bg-[#3A86FF]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3A86FF] font-poppins transition-colors ${
              isSubmitting ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Saving..." : "Save Transaction"}
          </button>
        </div>
      </div>
    </div>
  )
}
