"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  X,
  DollarSign,
  ArrowUp,
  ArrowDown,
  FileText,
  Calendar,
  RefreshCw,
  Eye,
  User,
  Building,
  Tag,
} from "lucide-react"
import DashboardHeader from "@/app/components/dashboard/header"
import BottomNavigation from "@/app/components/dashboard/bottom-navigation"
import { checkAuthRole, type AuthUser } from "@/lib/auth"
import { apiPost } from "@/lib/api-client"
import { formatCurrency } from "@/lib/utils-currency"
import { toast } from "@/hooks/use-toast"

// Type definitions
type LedgerEntry = {
  id: number
  entry_date: string
  entry_type: "income" | "expense"
  amount: number
  description: string
  reference_id: string
  reference_type: "client_transaction" | "staff_payment"
  client_id: number | null
  staff_id: number | null
  client_name?: string
  staff_name?: string
  created_at: string
  updated_at: string
}

type YearlySummary = {
  year: number
  income: number
  expense: number
  profit: number
}

export default function AdminLedger() {
  const router = useRouter()

  // Get current date information
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-indexed

  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [allEntries, setAllEntries] = useState<LedgerEntry[]>([])
  const [yearlySummary, setYearlySummary] = useState<YearlySummary[]>([
    // Default data for the last 5 years
    ...Array.from({ length: 5 }, (_, i) => ({
      year: currentYear - 4 + i,
      income: 0,
      expense: 0,
      profit: 0,
    })),
  ])
  const [currentMonthTotals, setCurrentMonthTotals] = useState({
    income: 0,
    expense: 0,
    profit: 0,
  })

  // Filter state - default to current month and year
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredEntries, setFilteredEntries] = useState<LedgerEntry[]>([])

  // Selected entry for details panel
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null)
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6) // Reduced for card view

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await checkAuthRole("admin", router)
        if (userData) {
          setUser(userData)
          await Promise.all([
            fetchCurrentMonthData(),
            fetchYearlySummary()
          ])
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

  // Apply filters when filter criteria change
  useEffect(() => {
    if (selectedYear !== currentYear || selectedMonth !== currentMonth) {
      fetchFilteredEntries()
    } else if (allEntries.length > 0) {
      applyClientSideFilters()
    }
  }, [selectedYear, selectedMonth, searchQuery, allEntries])

  const fetchCurrentMonthData = async () => {
    try {
      const response = await apiPost('/api/ledger', { action: "get-current-month-summary" })
      
      if (response.success && response.data?.success) {
        setCurrentMonthTotals(response.data.summary)
        // For current month, we also get entries for quick display
        await fetchFilteredEntries()
      } else {
        toast({
          title: "Error",
          description: response.data?.error || "Failed to fetch current month data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching current month data:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const fetchYearlySummary = async () => {
    try {
      const response = await apiPost('/api/ledger', { action: "get-yearly-summary" })
      
      if (response.success && response.data?.success && response.data.summary.length > 0) {
        setYearlySummary(response.data.summary)
      }
    } catch (error) {
      console.error("Error fetching yearly summary:", error)
    }
  }

  const fetchFilteredEntries = async () => {
    try {
      const response = await apiPost('/api/ledger', {
        action: "get-entries",
        year: selectedYear,
        month: selectedMonth
      })

      if (response.success && response.data?.success) {
        const entries = response.data.entries
        setAllEntries(entries)
        setFilteredEntries(entries)
        applyClientSideFilters(entries)
      } else {
        toast({
          title: "Error",
          description: response.data?.error || "Failed to fetch ledger entries",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching filtered entries:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching entries",
        variant: "destructive",
      })
    }
  }

  // Client-side filtering for search query only
  const applyClientSideFilters = (entries?: LedgerEntry[]) => {
    const entriesToFilter = entries || allEntries
    let filtered = [...entriesToFilter]

    // Filter by search query
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(
        (entry) =>
          entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (entry.client_name && entry.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (entry.staff_name && entry.staff_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          entry.reference_id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    setFilteredEntries(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Get month name
  const getMonthName = (monthNumber: number) => {
    const date = new Date()
    date.setMonth(monthNumber - 1)
    return date.toLocaleString("default", { month: "long" })
  }

  // Calculate totals for the filtered entries
  const calculateTotals = () => {
    let totalIncome = 0
    let totalExpense = 0

    filteredEntries.forEach((entry) => {
      if (entry.entry_type === "income") {
        totalIncome += entry.amount
      } else {
        totalExpense += entry.amount
      }
    })

    return {
      income: totalIncome,
      expense: totalExpense,
      profit: totalIncome - totalExpense,
    }
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentEntries = filteredEntries.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)

  // Filter handlers
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(Number.parseInt(e.target.value))
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(Number.parseInt(e.target.value))
  }

  const clearFilters = () => {
    setSelectedYear(currentYear)
    setSelectedMonth(currentMonth)
    setSearchQuery("")
    setCurrentPage(1)
  }

  const refreshData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchCurrentMonthData(),
        fetchYearlySummary()
      ])
      toast({
        title: "Success",
        description: "Ledger data refreshed",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (entry: LedgerEntry) => {
    setSelectedEntry(entry)
    setShowDetailsPanel(true)
  }

  const closeDetailsPanel = () => {
    setShowDetailsPanel(false)
    setTimeout(() => setSelectedEntry(null), 300) // Clear after animation
  }

  const totals = calculateTotals()

  if (loading && allEntries.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading ledger data...</p>
        </div>
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
            <h1 className="text-2xl font-bold text-gray-900 font-poppins">Financial Ledger</h1>
            <p className="text-gray-600 font-poppins">Track and manage all financial transactions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refreshData}
              disabled={loading}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-200 transition-colors font-poppins disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => console.log("Export ledger data")}
              className="bg-[#3A86FF] text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-[#3A86FF]/90 transition-colors font-poppins"
            >
              <Download className="w-4 h-4" />
              Export Ledger
            </button>
          </div>
        </div>

        {/* Current Month Summary */}
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 mb-6">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-[#3A86FF] mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 font-poppins">
              Current Month: {getMonthName(currentMonth)} {currentYear}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <ArrowUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 font-poppins">Total Income</h3>
                  <p className="text-2xl font-bold text-gray-900 font-poppins">
                    {formatCurrency(currentMonthTotals.income)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                  <ArrowDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 font-poppins">Total Expenses</h3>
                  <p className="text-2xl font-bold text-gray-900 font-poppins">
                    {formatCurrency(currentMonthTotals.expense)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 font-poppins">Net Profit</h3>
                  <p
                    className={`text-2xl font-bold ${
                      currentMonthTotals.profit >= 0 ? "text-green-600" : "text-red-600"
                    } font-poppins`}
                  >
                    {formatCurrency(currentMonthTotals.profit)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simplified Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Year Filter */}
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
                  value={selectedYear}
                  onChange={handleYearChange}
                >
                  {yearlySummary.map((summary) => (
                    <option key={summary.year} value={summary.year}>
                      {summary.year}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Month Filter */}
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Clear Filters */}
              <button
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm font-poppins"
                onClick={clearFilters}
              >
                <X className="h-4 w-4" />
                Reset to Current Month
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Entries Cards */}
        <div className="mb-6">
          {filteredEntries.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2 font-poppins">No ledger entries found</h3>
              <p className="text-gray-500 font-poppins mb-4">
                No entries match your current filters. Try adjusting your search or filter criteria.
              </p>
              <button
                onClick={clearFilters}
                className="bg-[#3A86FF] text-white px-4 py-2 rounded-md inline-flex items-center gap-2 hover:bg-[#3A86FF]/90 transition-colors font-poppins"
              >
                <X className="w-4 h-4" />
                Reset to Current Month
              </button>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <ArrowUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 font-poppins">
                        Income ({getMonthName(selectedMonth)} {selectedYear})
                      </h3>
                      <p className="text-lg font-bold text-gray-900 font-poppins">
                        {formatCurrency(totals.income)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
                      <ArrowDown className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 font-poppins">
                        Expenses ({getMonthName(selectedMonth)} {selectedYear})
                      </h3>
                      <p className="text-lg font-bold text-gray-900 font-poppins">
                        {formatCurrency(totals.expense)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 font-poppins">
                        Net Profit ({getMonthName(selectedMonth)} {selectedYear})
                      </h3>
                      <p className={`text-lg font-bold ${totals.profit >= 0 ? "text-green-600" : "text-red-600"} font-poppins`}>
                        {formatCurrency(totals.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Entries List */}
              <div className="grid gap-4">
                {currentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            entry.entry_type === "income" ? "bg-green-500" : "bg-red-500"
                          }`}></div>
                          <h3 className="text-sm font-semibold text-gray-900 font-poppins">{entry.description}</h3>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entry.entry_type === "income" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {entry.entry_type === "income" ? "Income" : "Expense"}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{formatDate(entry.entry_date)}</span>
                          </div>
                          
                          {entry.client_name && (
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-1" />
                              <span>{entry.client_name}</span>
                            </div>
                          )}
                          
                          {entry.staff_name && (
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-1" />
                              <span>{entry.staff_name}</span>
                            </div>
                          )}
                          
                          {entry.reference_id && (
                            <div className="flex items-center">
                              <Tag className="w-4 h-4 mr-1" />
                              <span>{entry.reference_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            entry.entry_type === "income" ? "text-green-600" : "text-red-600"
                          } font-poppins`}>
                            {entry.entry_type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => handleViewDetails(entry)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500 font-poppins">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredEntries.length)} of {filteredEntries.length} entries
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
        </div>

        {/* Entry Details Panel */}
        {showDetailsPanel && selectedEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 font-poppins">Entry Details</h3>
                <button
                  onClick={closeDetailsPanel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 font-poppins">Description</label>
                  <p className="text-gray-900 font-poppins">{selectedEntry.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 font-poppins">Type</label>
                    <p className="text-gray-900 font-poppins capitalize">{selectedEntry.entry_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 font-poppins">Amount</label>
                    <p className={`text-lg font-bold ${
                      selectedEntry.entry_type === "income" ? "text-green-600" : "text-red-600"
                    } font-poppins`}>
                      {formatCurrency(selectedEntry.amount)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 font-poppins">Date</label>
                  <p className="text-gray-900 font-poppins">{formatDate(selectedEntry.entry_date)}</p>
                </div>
                
                {selectedEntry.reference_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 font-poppins">Reference ID</label>
                    <p className="text-gray-900 font-poppins">{selectedEntry.reference_id}</p>
                  </div>
                )}
                
                {selectedEntry.client_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 font-poppins">Client</label>
                    <p className="text-gray-900 font-poppins">{selectedEntry.client_name}</p>
                  </div>
                )}
                
                {selectedEntry.staff_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 font-poppins">Staff Member</label>
                    <p className="text-gray-900 font-poppins">{selectedEntry.staff_name}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={closeDetailsPanel}
                  className="px-4 py-2 bg-[#3A86FF] text-white rounded-lg hover:bg-blue-600 font-poppins"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  )
} 