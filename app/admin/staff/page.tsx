"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
  DollarSign,
} from "lucide-react"
import DashboardHeader from "@/app/components/dashboard/header"
import BottomNavigation from "@/app/components/dashboard/bottom-navigation"
import { formatCurrency } from "@/lib/utils-currency"
import { CredentialsModal } from "@/app/components/ui/credentials-modal"
import { ConfirmationModal } from "@/app/components/ui/confirmation-modal"
import { checkAuthRole, type AuthUser } from "@/lib/auth"
import { apiGet, apiPost } from "@/lib/api-client"
import Loading from "./loading"

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
  total_paid?: number
}

export default function AdminStaff() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [staff, setStaff] = useState<Staff[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<string | null>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(8) // Increased for card view

  // Credentials modal state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [portalCredentials, setPortalCredentials] = useState({ username: "", password: "" })
  const [isActivatingPortal, setIsActivatingPortal] = useState(false)

  // Confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await checkAuthRole("admin", router)
        if (userData) {
          setUser(userData)
          await fetchStaff()
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const fetchStaff = async () => {
    setLoading(true)
    try {
      const response = await apiGet('/api/staff')
      if (response.success && response.data?.success) {
        // Ensure payment_rate is a number for all staff members
        const formattedStaff = response.data.data.map((staff: any) => ({
          ...staff,
          payment_rate: Number(staff.payment_rate),
          total_paid: 0, // Will be calculated separately if needed
        }))

        setStaff(formattedStaff)
      } else {
        setToast({ message: response.data?.error || "Failed to fetch staff", type: "error" })
      }
    } catch (error) {
      console.error("Error fetching staff:", error)
      setToast({ message: "An error occurred while fetching staff", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchStaff()
      return
    }

    try {
      const response = await apiPost('/api/staff/search', { query: searchQuery })
      if (response.success && response.data?.success) {
        // Ensure payment_rate is a number for all staff members
        const formattedStaff = response.data.data.map((staff: any) => ({
          ...staff,
          payment_rate: Number(staff.payment_rate),
          total_paid: 0,
        }))

        setStaff(formattedStaff)
      } else {
        setToast({ message: response.data?.error || "Failed to search staff", type: "error" })
      }
    } catch (error) {
      console.error("Error searching staff:", error)
      setToast({ message: "An error occurred while searching staff", type: "error" })
    }
  }

  // Handle filter
  const handleFilter = async () => {
    try {
      const response = await apiPost('/api/staff/filter', { 
        roleFilter: roleFilter === 'all' ? '' : roleFilter,
        statusFilter: statusFilter === 'all' ? '' : statusFilter,
      })
      if (response.success && response.data?.success) {
        // Ensure payment_rate is a number for all staff members
        const formattedStaff = response.data.data.map((staff: any) => ({
          ...staff,
          payment_rate: Number(staff.payment_rate),
          total_paid: 0,
        }))

        setStaff(formattedStaff)
      } else {
        setToast({ message: response.data?.error || "Failed to filter staff", type: "error" })
      }
    } catch (error) {
      console.error("Error filtering staff:", error)
      setToast({ message: "An error occurred while filtering staff", type: "error" })
    }
  }

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Apply sorting to staff list
  const sortedStaff = [...staff].sort((a, b) => {
    if (!sortField) return 0

    let comparison = 0
    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "email":
        comparison = a.email.localeCompare(b.email)
        break
      case "position":
        comparison = a.position.localeCompare(b.position)
        break
      case "join_date":
        comparison = new Date(a.join_date).getTime() - new Date(b.join_date).getTime()
        break
      case "status":
        comparison = a.status.localeCompare(b.status)
        break
      case "total_paid":
        comparison = (a.total_paid || 0) - (b.total_paid || 0)
        break
      default:
        comparison = 0
    }

    return sortDirection === "asc" ? comparison : -comparison
  })

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentStaff = sortedStaff.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(sortedStaff.length / itemsPerPage)

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Status badge colors
  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
  }

  // Role badge colors
  const roleColors = {
    admin: "bg-purple-100 text-purple-800",
    support: "bg-blue-100 text-blue-800",
    finance: "bg-yellow-100 text-yellow-800",
  }

  // Handle staff actions
  const handleViewDetails = async (id: number) => {
    setShowPanel(true)
    setPanelLoading(true)
    try {
      const response = await apiPost('/api/staff/get-by-id', { id })
      if (response.success && response.data?.success) {
        setSelectedStaff(response.data.data)
      } else {
        setToast({ message: response.data?.error || "Failed to fetch staff details", type: "error" })
        setShowPanel(false)
      }
    } catch (error) {
      console.error(`Error fetching staff with ID ${id}:`, error)
      setToast({ message: "An error occurred while fetching staff details", type: "error" })
      setShowPanel(false)
    } finally {
      setPanelLoading(false)
    }
  }

  const handleRecordPayment = (id: number) => {
    router.push(`/admin/staff/payments/${id}/record`)
  }

  const handleEditStaff = (id: number) => {
    router.push(`/admin/staff/edit/${id}`)
  }

  // Updated to show confirmation modal
  const handleDeleteClick = (id: number) => {
    setStaffToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return

    try {
      const response = await apiPost('/api/staff/delete', { id: staffToDelete })
      if (response.success && response.data?.success) {
        setToast({ message: "Staff member deleted successfully", type: "success" })
        await fetchStaff() // Refresh the list
        if (selectedStaff?.id === staffToDelete) {
          setShowPanel(false)
          setSelectedStaff(null)
        }
      } else {
        setToast({ message: response.data?.error || "Failed to delete staff member", type: "error" })
      }
    } catch (error) {
      console.error(`Error deleting staff with ID ${staffToDelete}:`, error)
      setToast({ message: "An error occurred while deleting staff member", type: "error" })
    } finally {
      setShowDeleteModal(false)
      setStaffToDelete(null)
    }
  }

  const handleAddStaff = () => {
    router.push("/admin/staff/add")
  }

  const handleViewPayments = (id: number) => {
    router.push(`/admin/staff/payments/${id}`)
  }

  const closePanel = () => {
    setShowPanel(false)
    setTimeout(() => setSelectedStaff(null), 300) // Clear after animation
  }

  const handleActivatePortalAccess = async (staff: Staff) => {
    setIsActivatingPortal(true)
    try {
      const response = await apiPost('/api/staff/create-portal-access', {
        staffId: staff.id,
        name: staff.name,
        email: staff.email
      })

      if (response.success && response.data?.success) {
        setPortalCredentials({
          username: response.data.username,
          password: response.data.password
        })
        setShowCredentialsModal(true)
        setToast({ message: "Portal access activated successfully", type: "success" })
      } else {
        setToast({ message: response.data?.error || "Failed to activate portal access", type: "error" })
      }
    } catch (error) {
      console.error("Error activating portal access:", error)
      setToast({ message: "An error occurred while activating portal access", type: "error" })
    } finally {
      setIsActivatingPortal(false)
    }
  }

  useEffect(() => {
    if (searchQuery) {
      handleSearch()
    } else if (statusFilter !== "all" || roleFilter !== "all") {
      handleFilter()
    }
  }, [searchQuery, statusFilter, roleFilter])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-poppins">Staff Management</h1>
            <p className="text-gray-600 font-poppins">Manage your team members and their access</p>
          </div>
          <button
            onClick={handleAddStaff}
            className="bg-[#3A86FF] text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-[#3A86FF]/90 transition-colors font-poppins"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
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
                  placeholder="Search staff..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Status Filter */}
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Role Filter */}
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="support">Support</option>
                  <option value="finance">Finance</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Export Button */}
              <button
                onClick={() => console.log("Export staff data")}
                className="flex items-center gap-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              {/* Clear Filters */}
              <button
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm font-poppins"
                onClick={() => {
                  setStatusFilter("all")
                  setRoleFilter("all")
                  setSearchQuery("")
                  fetchStaff()
                }}
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Staff Cards Grid */}
        <div className="mb-6">
          {currentStaff.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1 font-poppins">No staff members found</h3>
                <p className="text-gray-500 font-poppins">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentStaff.map((staffMember) => (
                <div
                  key={staffMember.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md"
                >
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <img
                        src={staffMember.avatar || "/placeholder.svg"}
                        alt={staffMember.name}
                        className="w-12 h-12 rounded-full mr-3 bg-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate font-poppins">{staffMember.name}</h3>
                        <p className="text-sm text-gray-500 truncate font-poppins">{staffMember.position}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          statusColors[staffMember.status]
                        } font-poppins capitalize`}
                      >
                        {staffMember.status}
                      </span>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          roleColors[staffMember.role]
                        } font-poppins capitalize`}
                      >
                        {staffMember.role}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-poppins">
                        Joined: {formatDate(staffMember.join_date)}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(staffMember.id)}
                          className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-[#3A86FF] hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewPayments(staffMember.id)}
                          className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-[#8338EC]/70 hover:text-white transition-colors"
                          title="View Payments"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRecordPayment(staffMember.id)}
                          className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-green-500 hover:text-white transition-colors"
                          title="Record Payment"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditStaff(staffMember.id)}
                          className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-[#8338EC] hover:text-white transition-colors"
                          title="Edit Staff"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(staffMember.id)}
                          className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-[#FF006E] hover:text-white transition-colors"
                          title="Delete Staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {sortedStaff.length > 0 && (
            <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-500 font-poppins">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                <span className="font-medium">{Math.min(indexOfLastItem, sortedStaff.length)}</span> of{" "}
                <span className="font-medium">{sortedStaff.length}</span> staff members
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === page
                        ? "bg-[#3A86FF] text-white"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    } font-medium font-poppins`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right Side Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-1/2 lg:w-1/3 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          showPanel ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {panelLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : selectedStaff ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 font-poppins">Staff Details</h2>
              <button
                onClick={closePanel}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center mb-8">
                <img
                  src={selectedStaff.avatar || "/placeholder.svg"}
                  alt={selectedStaff.name}
                  className="w-24 h-24 rounded-full mb-4 bg-gray-200"
                />
                <h3 className="text-2xl font-bold text-gray-900 font-poppins">{selectedStaff.name}</h3>
                <p className="text-gray-600 font-poppins">{selectedStaff.position}</p>

                <div className="flex gap-2 mt-2">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[selectedStaff.status]
                    } font-poppins capitalize`}
                  >
                    {selectedStaff.status}
                  </span>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      roleColors[selectedStaff.role]
                    } font-poppins capitalize`}
                  >
                    {selectedStaff.role}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3 font-poppins">Contact Information</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 font-poppins">Email</p>
                    <p className="text-gray-900 font-poppins">{selectedStaff.email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3 font-poppins">Employment Details</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 font-poppins">Join Date</p>
                    <p className="text-gray-900 font-poppins">{formatDate(selectedStaff.join_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-poppins">Payment Rate</p>
                    <p className="text-gray-900 font-poppins">{formatCurrency(selectedStaff.payment_rate)}/hr</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleViewPayments(selectedStaff.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-poppins"
                >
                  <FileText className="w-4 h-4" />
                  View Payments
                </button>
                <button
                  onClick={() => handleRecordPayment(selectedStaff.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#3A86FF] text-white rounded-md hover:bg-[#3A86FF]/90 transition-colors font-poppins"
                >
                  <DollarSign className="w-4 h-4" />
                  Record Payment
                </button>
                <button
                  onClick={() => handleEditStaff(selectedStaff.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#8338EC] text-white rounded-md hover:bg-[#8338EC]/90 transition-colors font-poppins"
                >
                  <Edit className="w-4 h-4" />
                  Edit Staff
                </button>
                <button
                  onClick={() => handleDeleteClick(selectedStaff.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#FF006E] text-white rounded-md hover:bg-[#FF006E]/90 transition-colors font-poppins"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Staff
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteStaff}
        title="Delete Staff Member"
        message="Are you sure you want to delete this staff member? This action cannot be undone."
        confirmText="Delete Staff Member"
        type="danger"
      />

      <CredentialsModal
        isOpen={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        username={portalCredentials.username}
        password={portalCredentials.password}
      />

      <BottomNavigation />
    </div>
  )
}
