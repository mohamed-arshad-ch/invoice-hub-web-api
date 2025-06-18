"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Building,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Search,
  Trash2,
  X,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  CalendarIcon,
  Info,
  User,
  FileText,
  History,
} from "lucide-react"
import DashboardHeader from "@/app/components/dashboard/header"
import BottomNavigation from "@/app/components/dashboard/bottom-navigation"
import { Toast } from "@/app/components/ui/toast"
import { ConfirmationModal } from "@/app/components/ui/confirmation-modal"
import { CredentialsModal } from "@/app/components/ui/credentials-modal"
import { AddButton } from "@/app/components/ui/floating-action-button"

// Import API client and auth utilities
import { apiGet, apiPost } from "@/lib/api-client"
import { checkAuthRole, AuthUser } from "@/lib/auth"

// Client type definition
export type Client = {
  id: number
  client_id: string
  business_name: string
  contact_person: string
  email: string
  phone: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  payment_schedule: string
  payment_terms: string
  status: boolean
  notes: string | null
  total_spent: number
  last_payment: string | null
  upcoming_payment: string | null
  joined_date: string
  created_by: number
  created_at: string
  updated_at: string
}

// Transaction type
type Transaction = {
  id: number
  transactionId: string
  date: string
  dueDate: string
  amount: number
  status: string
  description: string
  referenceNumber: string
}

// Payment type
type Payment = {
  id: number
  transaction_id: number
  amount: number
  payment_date: string
  payment_method?: string
  reference_number?: string
  notes?: string
  created_by: number
  created_at: string
  updated_at: string
  // Additional fields for client payment history
  transactionId?: string
  transactionDescription?: string
  transactionAmount?: number
}

export default function AdminClients() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [scheduleFilter, setScheduleFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isActivatingPortal, setIsActivatingPortal] = useState(false)

  // Confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<number | null>(null)

  // Portal credentials modal state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [portalCredentials, setPortalCredentials] = useState({ username: "", password: "" })

  // Transaction viewing state
  const [viewingTransactions, setViewingTransactions] = useState<number | null>(null)
  const [clientTransactions, setClientTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  // Payment history viewing state
  const [viewingPaymentHistory, setViewingPaymentHistory] = useState<number | null>(null)
  const [clientPaymentHistory, setClientPaymentHistory] = useState<Payment[]>([])
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false)

  useEffect(() => {
    const initializeClients = async () => {
      try {
        // Check authentication and get user data
        const userData = await checkAuthRole("admin", router)
        
        if (!userData) {
          // User is not authenticated or not admin, checkAuthRole handles redirect
          return
        }

        setUser(userData)

        // Fetch clients data
        await fetchClients()

      } catch (error) {
        console.error("Error initializing clients page:", error)
        router.push("/admin/login")
      } finally {
        setLoading(false)
      }
    }

    initializeClients()
  }, [router])

  const fetchClients = async () => {
    try {
      const response = await apiGet('/api/clients')
      
      if (response.success) {
        setClients(response.data.clients || [])
      } else {
        setToast({ 
          message: response.error || "Failed to fetch clients", 
          type: "error" 
        })
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
      setToast({ 
        message: "An unexpected error occurred while fetching clients", 
        type: "error" 
      })
    }
  }

  // Filter clients based on selected filters and search query
  const filteredClients = clients.filter((client) => {
    // Status filter
    if (statusFilter !== "all" && String(client.status) !== statusFilter) {
      return false
    }

    // Payment schedule filter
    if (scheduleFilter !== "all" && client.payment_schedule !== scheduleFilter) {
      return false
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        client.business_name.toLowerCase().includes(query) ||
        client.contact_person.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query)
      )
    }

    return true
  })

  const handleViewClient = (client: Client) => {
    setSelectedClient(client)
    setShowClientDetails(true)
  }

  const handleEditClient = (clientId: number) => {
    router.push(`/admin/clients/edit/${clientId}`)
  }

  const handleDeleteClick = (clientId: number) => {
    setClientToDelete(clientId)
    setShowDeleteModal(true)
  }

  const handleDeleteClient = async () => {
    if (!clientToDelete) return

    setIsDeleting(true)
    try {
      const response = await apiPost('/api/clients/delete', { id: clientToDelete })
      
      if (response.success) {
        setToast({ 
          message: response.data.message || "Client deleted successfully", 
          type: "success" 
        })
        
        // Close the client details panel if it's open
        if (selectedClient && selectedClient.id === clientToDelete) {
          setShowClientDetails(false)
        }
        
        // Refresh the client list
        await fetchClients()
      } else {
        setToast({ 
          message: response.error || "Failed to delete client", 
          type: "error" 
        })
      }
    } catch (error) {
      console.error("Error deleting client:", error)
      setToast({ 
        message: "An unexpected error occurred while deleting client", 
        type: "error" 
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
      setClientToDelete(null)
    }
  }

  // Function to get the appropriate icon for payment schedule
  const getScheduleIcon = (schedule: string) => {
    switch (schedule) {
      case "daily":
        return <Clock className="w-4 h-4 text-orange-500" />
      case "monthly":
        return <Calendar className="w-4 h-4 text-blue-500" />
      case "yearly":
        return <Calendar className="w-4 h-4 text-green-500" />
      default:
        return <Calendar className="w-4 h-4 text-gray-500" />
    }
  }

  const handleActivatePortalAccess = async (client: Client) => {
    setIsActivatingPortal(true)
    try {
      const response = await apiPost('/api/clients/create-portal-access', { 
        clientId: client.id 
      })
      
      if (response.success) {
        setPortalCredentials({
          username: client.email,
          password: response.data.password,
        })
        setShowCredentialsModal(true)
      } else {
        setToast({ 
          message: response.error || "Failed to activate portal access", 
          type: "error" 
        })
      }
    } catch (error) {
      console.error("Error activating portal access:", error)
      setToast({ 
        message: "An unexpected error occurred while activating portal access", 
        type: "error" 
      })
    } finally {
      setIsActivatingPortal(false)
    }
  }

  const handleViewTransactions = async (clientId: number) => {
    setLoadingTransactions(true)
    setViewingTransactions(clientId)

    try {
      const response = await apiPost('/api/clients/transactions', { 
        clientId: clientId 
      })

      if (response.success) {
        setClientTransactions(response.data.transactions || [])
      } else {
        setToast({ 
          message: response.error || "Failed to fetch transactions", 
          type: "error" 
        })
        setClientTransactions([])
      }
    } catch (error) {
      console.error("Error fetching client transactions:", error)
      setToast({ 
        message: "An unexpected error occurred while fetching transactions", 
        type: "error" 
      })
      setClientTransactions([])
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleViewPaymentHistory = async (clientId: number) => {
    setLoadingPaymentHistory(true)
    setViewingPaymentHistory(clientId)

    try {
      // First get client transactions
      const transactionsResponse = await apiPost('/api/clients/transactions', { 
        clientId: clientId 
      })

      if (transactionsResponse.success) {
        const transactions = transactionsResponse.data.transactions || []
        const allPayments: Payment[] = []

        // For each transaction, get its payment history
        for (const transaction of transactions) {
          try {
            const paymentsResponse = await apiPost('/api/transactions/payments', {
              action: 'get-payments',
              transactionId: transaction.transactionId
            })

            if (paymentsResponse.success && paymentsResponse.data && paymentsResponse.data.data) {
              const payments = paymentsResponse.data.data.payments || []
              
              // Add transaction context to each payment
              payments.forEach((payment: any) => {
                allPayments.push({
                  ...payment,
                  transactionId: transaction.transactionId,
                  transactionDescription: transaction.description,
                  transactionAmount: transaction.amount
                })
              })
            }
          } catch (error) {
            console.error(`Error fetching payments for transaction ${transaction.transactionId}:`, error)
          }
        }

        // Sort payments by date (newest first)
        allPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
        setClientPaymentHistory(allPayments)
      } else {
        setToast({ 
          message: transactionsResponse.error || "Failed to fetch payment history", 
          type: "error" 
        })
        setClientPaymentHistory([])
      }
    } catch (error) {
      console.error("Error fetching client payment history:", error)
      setToast({ 
        message: "An unexpected error occurred while fetching payment history", 
        type: "error" 
      })
      setClientPaymentHistory([])
    } finally {
      setLoadingPaymentHistory(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading clients...</p>
        </div>
      </div>
    )
  }

  // User should be defined at this point, but safety check
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 font-poppins">Client Management</h1>
          <p className="text-gray-600 font-poppins">Manage your client relationships</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 md:max-w-xs">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search clients..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
                  value={scheduleFilter}
                  onChange={(e) => setScheduleFilter(e.target.value)}
                >
                  <option value="all">All Payment Schedules</option>
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="relative">
                <input
                  type="date"
                  className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <button
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm font-poppins"
                onClick={() => {
                  setStatusFilter("all")
                  setScheduleFilter("all")
                  setDateFilter("")
                  setSearchQuery("")
                }}
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Clients Card Grid */}
        <div className="mb-6">
          {clients.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Building className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 font-poppins mb-2">No Clients Found</h3>
              <p className="text-gray-500 font-poppins mb-4">You haven't added any clients yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#3A86FF]/10 flex items-center justify-center mr-3">
                        <Building className="w-5 h-5 text-[#3A86FF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 font-poppins truncate">
                          {client.business_name}
                        </h3>
                        <p className="text-sm text-gray-500 font-poppins truncate">{client.contact_person}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        {getScheduleIcon(client.payment_schedule)}
                        <span className="ml-1.5 text-sm text-gray-700 font-poppins capitalize">
                          {client.payment_schedule}
                        </span>
                      </div>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          client.status ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        } font-poppins capitalize`}
                      >
                        {client.status ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Total Paid Amount */}
                    <div className="flex items-center justify-between mb-3 pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-500 font-poppins">Total Paid:</span>
                      <span className="font-medium text-gray-900 font-poppins">
                        ₹{(client.total_spent || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleViewClient(client)}
                        className="p-1.5 text-gray-500 hover:text-[#3A86FF] transition-colors rounded-full hover:bg-[#3A86FF]/10"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleViewTransactions(client.id)}
                        className="p-1.5 text-gray-500 hover:text-[#FF006E] transition-colors rounded-full hover:bg-[#FF006E]/10"
                        title="View Transactions"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleViewPaymentHistory(client.id)}
                        className="p-1.5 text-gray-500 hover:text-[#06D6A0] transition-colors rounded-full hover:bg-[#06D6A0]/10"
                        title="View Payment History"
                      >
                        <History className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEditClient(client.id)}
                        className="p-1.5 text-gray-500 hover:text-[#8338EC] transition-colors rounded-full hover:bg-[#8338EC]/10"
                        title="Edit Client"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(client.id)}
                        className="p-1.5 text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                        title="Delete Client"
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {clients.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 font-poppins">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">{filteredClients.length}</span> of{" "}
              <span className="font-medium">{filteredClients.length}</span> clients
            </p>
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                disabled
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="px-3 py-1 rounded-md bg-[#3A86FF] text-white font-medium font-poppins">1</button>
              <button
                className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                disabled
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Client Details Sidebar */}
      {showClientDetails && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto pb-20">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 font-poppins">Client Details</h2>
                <button
                  onClick={() => setShowClientDetails(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#3A86FF]/10 flex items-center justify-center mr-4">
                    <Building className="w-6 h-6 text-[#3A86FF]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 font-poppins">{selectedClient.business_name}</h3>
                    <p className="text-gray-500 font-poppins">Client ID: {selectedClient.client_id}</p>
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      selectedClient.status ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    } font-poppins capitalize`}
                  >
                    {selectedClient.status ? "Active" : "Inactive"}
                  </span>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="text-gray-500 font-poppins capitalize">
                    {selectedClient.payment_schedule} payments
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 font-poppins flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Contact Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <User className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500 font-poppins">Contact Person</p>
                        <p className="font-medium text-gray-900 font-poppins">{selectedClient.contact_person}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Mail className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500 font-poppins">Email</p>
                        <p className="font-medium text-gray-900 font-poppins">{selectedClient.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Phone className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500 font-poppins">Phone</p>
                        <p className="font-medium text-gray-900 font-poppins">{selectedClient.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {(selectedClient.street || selectedClient.city || selectedClient.state) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 font-poppins flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Address
                    </h4>
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                      <div>
                        {selectedClient.street && (
                          <p className="font-medium text-gray-900 font-poppins">{selectedClient.street}</p>
                        )}
                        {(selectedClient.city || selectedClient.state || selectedClient.zip) && (
                          <p className="font-medium text-gray-900 font-poppins">
                            {[selectedClient.city, selectedClient.state, selectedClient.zip].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 font-poppins flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payment Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500 font-poppins">Payment Schedule</p>
                        <p className="font-medium text-gray-900 font-poppins capitalize">
                          {selectedClient.payment_schedule}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Info className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500 font-poppins">Payment Terms</p>
                        <p className="font-medium text-gray-900 font-poppins">{selectedClient.payment_terms}</p>
                      </div>
                    </div>
                    {selectedClient.total_spent > 0 && (
                      <div className="flex items-start">
                        <CreditCard className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500 font-poppins">Total Spent</p>
                          <p className="font-medium text-gray-900 font-poppins">
                            ₹{Number(selectedClient.total_spent).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedClient.last_payment && (
                      <div className="flex items-start">
                        <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500 font-poppins">Last Payment</p>
                          <p className="font-medium text-gray-900 font-poppins">
                            {new Date(selectedClient.last_payment).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedClient.upcoming_payment && (
                      <div className="flex items-start">
                        <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500 font-poppins">Upcoming Payment</p>
                          <p className="font-medium text-gray-900 font-poppins">
                            {new Date(selectedClient.upcoming_payment).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 font-poppins flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    Additional Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500 font-poppins">Joined Date</p>
                        <p className="font-medium text-gray-900 font-poppins">
                          {new Date(selectedClient.joined_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {selectedClient.notes && (
                      <div className="flex items-start">
                        <Info className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500 font-poppins">Notes</p>
                          <p className="text-gray-900 font-poppins">{selectedClient.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => handleEditClient(selectedClient.id)}
                  className="flex-1 bg-[#3A86FF] text-white px-4 py-2 rounded-md hover:bg-[#3A86FF]/90 transition-colors font-poppins flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Client
                </button>
                <button
                  onClick={() => handleDeleteClick(selectedClient.id)}
                  className="flex-1 border border-red-500 text-red-500 px-4 py-2 rounded-md hover:bg-red-50 transition-colors font-poppins flex items-center justify-center gap-2"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Client
                </button>
              </div>

              {/* Portal Access Button */}
              <div className="mt-4">
                <button
                  onClick={() => handleActivatePortalAccess(selectedClient)}
                  className="w-full bg-[#8338EC] text-white px-4 py-2 rounded-md hover:bg-[#8338EC]/90 transition-colors font-poppins flex items-center justify-center gap-2"
                  disabled={isActivatingPortal}
                >
                  <User className="w-4 h-4" />
                  {isActivatingPortal ? "Activating..." : "Activate Portal Access"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction List Sidebar */}
      {viewingTransactions !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto pb-20">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 font-poppins">Transaction History</h2>
                <button
                  onClick={() => setViewingTransactions(null)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingTransactions ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : clientTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-poppins">No transactions found for this client.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clientTransactions.map((transaction) => (
                    <div key={transaction.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900 font-poppins">{transaction.transactionId}</h3>
                          <p className="text-sm text-gray-500 font-poppins">{transaction.date}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : transaction.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : transaction.status === "overdue"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          } font-poppins capitalize`}
                        >
                          {transaction.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-poppins">{transaction.description}</span>
                        <span className="font-medium text-gray-900 font-poppins">
                          ₹{transaction.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                        <button
                          onClick={() => router.push(`/admin/transactions/edit/${transaction.transactionId}`)}
                          className="text-[#3A86FF] text-sm font-poppins hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment History Sidebar */}
      {viewingPaymentHistory !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto pb-20">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 font-poppins">Payment History</h2>
                <button
                  onClick={() => setViewingPaymentHistory(null)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingPaymentHistory ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : clientPaymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-poppins">No payment history found for this client.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clientPaymentHistory.map((payment) => (
                    <div key={payment.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900 font-poppins">{payment.transactionId}</h3>
                          <p className="text-sm text-gray-500 font-poppins">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-green-600 font-poppins">
                            ₹{payment.amount.toLocaleString()}
                          </span>
                          <p className="text-xs text-gray-500 font-poppins">
                            {payment.payment_method || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-poppins">
                          {payment.transactionDescription || 'Payment'}
                        </span>
                        <span className="text-sm text-gray-600 font-poppins">
                          From: ₹{(payment.transactionAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      {payment.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 font-poppins">{payment.notes}</p>
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-xs text-gray-400 font-poppins">
                          Ref: {payment.reference_number || 'N/A'}
                        </span>
                        <button
                          onClick={() => router.push(`/admin/transactions/edit/${payment.transactionId}`)}
                          className="text-[#3A86FF] text-sm font-poppins hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View Transaction
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CredentialsModal
        isOpen={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        username={portalCredentials.username}
        password={portalCredentials.password}
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteClient}
        title="Delete Client"
        message="Are you sure you want to delete this client? This action cannot be undone and will remove all associated data."
        confirmText="Delete Client"
        type="danger"
      />

      <BottomNavigation />
      <AddButton />

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
