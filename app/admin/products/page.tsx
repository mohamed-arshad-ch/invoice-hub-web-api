"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Grid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Package,
  Tag,
  Percent,
  User,
  DollarSign,
  Layers,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import DashboardHeader from "@/app/components/dashboard/header"
import BottomNavigation from "@/app/components/dashboard/bottom-navigation"
import { checkAuthRole, type AuthUser } from "@/lib/auth"
import { apiPost, apiGet } from "@/lib/api-client"
import { formatCurrency } from "@/lib/utils-currency"
import { toast } from "@/hooks/use-toast"
import { ConfirmationModal } from "@/app/components/ui/confirmation-modal"

// Product type definition
type Product = {
  id: string | number
  name: string
  description: string
  category: "service" | "product" | "subscription"
  price: number
  taxRate: number
  status: "active" | "inactive"
  createdAt?: string
  updatedAt?: string
}

export default function AdminProducts() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<string | null>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"card" | "grid">("card")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showProductDetails, setShowProductDetails] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | number | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(8)
  const [totalProducts, setTotalProducts] = useState(0)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await checkAuthRole("admin", router)
        if (userData) {
          setUser(userData)
          await loadProducts()
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
  }, [router])

  // Load products with filters
  const loadProducts = async () => {
    setLoading(true)
    try {
      let filteredProducts: Product[] = []

      if (searchQuery) {
        // Search by query
        const response = await apiPost('/api/products', { 
          action: "search", 
          query: searchQuery 
        })
        if (response.success && response.data?.success) {
          filteredProducts = response.data.products
        } else {
          throw new Error(response.data?.error || "Failed to search products")
        }
      } else if (categoryFilter !== "all" || statusFilter !== "all") {
        // Filter by category and status
        const response = await apiPost('/api/products', {
          action: "filter",
          categoryFilter,
          statusFilter
        })
        if (response.success && response.data?.success) {
          filteredProducts = response.data.products
        } else {
          throw new Error(response.data?.error || "Failed to filter products")
        }
      } else {
        // Get all products
        const response = await apiGet('/api/products')
        if (response.success && response.data?.success) {
          filteredProducts = response.data.products
        } else {
          throw new Error(response.data?.error || "Failed to fetch products")
        }
      }

      // Sort products
      if (sortField) {
        filteredProducts = filteredProducts.sort((a, b) => {
          let comparison = 0
          switch (sortField) {
            case "name":
              comparison = a.name.localeCompare(b.name)
              break
            case "price":
              comparison = a.price - b.price
              break
            case "category":
              comparison = a.category.localeCompare(b.category)
              break
            default:
              comparison = 0
          }

          return sortDirection === "asc" ? comparison : -comparison
        })
      }

      setProducts(filteredProducts)
      setTotalProducts(filteredProducts.length)
    } catch (error) {
      console.error("Error loading products:", error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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

  // Apply filters
  useEffect(() => {
    if (!loading && user) {
      loadProducts()
    }
  }, [categoryFilter, statusFilter, searchQuery, sortField, sortDirection])

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentProducts = products.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(totalProducts / itemsPerPage)

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
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

  // Category icons and colors
  const categoryInfo = {
    service: { icon: "🔧", color: "bg-blue-100 text-blue-800" },
    product: { icon: "📦", color: "bg-purple-100 text-purple-800" },
    subscription: { icon: "🔄", color: "bg-amber-100 text-amber-800" },
  }

  // Handle product actions
  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product)
    setShowProductDetails(true)
  }

  const handleEditProduct = (id: string | number) => {
    router.push(`/admin/products/edit/${id}`)
  }

  // Updated to show confirmation modal
  const handleDeleteClick = (id: string | number) => {
    setProductToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeleteProduct = async () => {
    if (!productToDelete) return

    setIsDeleting(true)
    try {
      const response = await apiPost('/api/products/delete', { id: productToDelete })
      
      if (response.success && response.data?.success) {
        toast({
          title: "Success",
          description: "Product deleted successfully",
        })
        // Refresh the products list
        await loadProducts()
      } else {
        toast({
          title: "Error",
          description: response.data?.error || "Failed to delete product",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the product",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
      setProductToDelete(null)
    }
  }

  const handleAddProduct = () => {
    router.push("/admin/products/add")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-gray-900 font-poppins">Products & Services</h1>
            <p className="text-gray-600 font-poppins">Manage your product catalog and services</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAddProduct}
              className="bg-[#3A86FF] text-white px-4 py-2 rounded-lg font-poppins flex items-center hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              {/* Category Filter */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === "category" ? null : "category")}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-poppins"
                >
                  <Tag className="w-4 h-4" />
                  <span>Category</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {activeDropdown === "category" && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="py-1">
                      {["all", "service", "product", "subscription"].map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            setCategoryFilter(category)
                            setActiveDropdown(null)
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 font-poppins ${
                            categoryFilter === category ? "bg-blue-50 text-blue-700" : ""
                          }`}
                        >
                          {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-poppins"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Status</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {activeDropdown === "status" && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="py-1">
                      {["all", "active", "inactive"].map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setStatusFilter(status)
                            setActiveDropdown(null)
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 font-poppins ${
                            statusFilter === status ? "bg-blue-50 text-blue-700" : ""
                          }`}
                        >
                          {status === "all" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-gray-300 rounded-md">
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-2 ${viewMode === "card" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Content */}
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 font-poppins mb-2">No products found</h3>
            <p className="text-gray-500 font-poppins mb-6">
              {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                ? "No products match your current filters."
                : "Get started by adding your first product or service."}
            </p>
            {!searchQuery && categoryFilter === "all" && statusFilter === "all" && (
              <button
                onClick={handleAddProduct}
                className="bg-[#3A86FF] text-white px-4 py-2 rounded-lg font-poppins hover:bg-blue-600 transition-colors"
              >
                Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Products List/Grid */}
            <div className={viewMode === "card" ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
              {currentProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  {viewMode === "card" ? (
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 font-poppins">{product.name}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              categoryInfo[product.category]?.color
                            }`}>
                              {categoryInfo[product.category]?.icon} {product.category}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[product.status]
                            }`}>
                              {product.status}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm font-poppins mb-3 line-clamp-2">{product.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              <span className="font-medium text-gray-900">{formatCurrency(product.price)}</span>
                            </div>
                            {product.taxRate > 0 && (
                              <div className="flex items-center">
                                <Percent className="w-4 h-4 mr-1" />
                                <span>{product.taxRate}% tax</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleViewDetails(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditProduct(product.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          categoryInfo[product.category]?.color
                        }`}>
                          {categoryInfo[product.category]?.icon} {product.category}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[product.status]
                        }`}>
                          {product.status}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 font-poppins mb-2">{product.name}</h3>
                      <p className="text-gray-600 text-sm font-poppins mb-4 line-clamp-3">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                          <span className="font-semibold text-gray-900 font-poppins">{formatCurrency(product.price)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleViewDetails(product)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditProduct(product.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Edit Product"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(product.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500 font-poppins">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalProducts)} of {totalProducts} products
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700 font-poppins">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Product Details Modal */}
        {showProductDetails && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 font-poppins">Product Details</h3>
                <button
                  onClick={() => setShowProductDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 font-poppins">Product Name</label>
                  <p className="text-gray-900 font-poppins">{selectedProduct.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 font-poppins">Description</label>
                  <p className="text-gray-900 font-poppins">{selectedProduct.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 font-poppins">Category</label>
                    <p className="text-gray-900 font-poppins capitalize">{selectedProduct.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 font-poppins">Status</label>
                    <p className="text-gray-900 font-poppins capitalize">{selectedProduct.status}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 font-poppins">Price</label>
                    <p className="text-2xl font-bold text-[#3A86FF] font-poppins">
                      {formatCurrency(selectedProduct.price)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 font-poppins">Tax Rate</label>
                    <p className="text-gray-900 font-poppins">{selectedProduct.taxRate}%</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowProductDetails(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-poppins"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowProductDetails(false)
                    handleEditProduct(selectedProduct.id)
                  }}
                  className="px-4 py-2 bg-[#3A86FF] text-white rounded-lg hover:bg-blue-600 font-poppins"
                >
                  Edit Product
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteProduct}
          title="Delete Product"
          message="Are you sure you want to delete this product? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={isDeleting}
        />
      </main>

      <BottomNavigation />
    </div>
  )
}
