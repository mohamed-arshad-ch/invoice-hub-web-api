"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Search,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Printer,
  Loader2,
} from "lucide-react"
import ClientDashboardHeader from "@/app/components/dashboard/client-header"
import ClientBottomNavigation from "@/app/components/dashboard/client-bottom-navigation"
import { formatCurrency } from "@/lib/utils-currency"
import {
  getClientTransactions,
  getClientTransactionById,
  type ClientTransaction,
} from "@/app/actions/client-transactions-actions"
import { generateInvoice } from "@/app/actions/invoice-actions"

// Status badge colors and icons
const statusInfo = {
  draft: { color: "bg-gray-100 text-gray-800", icon: <FileText className="w-4 h-4" /> },
  paid: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-4 h-4" /> },
  pending: { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-4 h-4" /> },
  partial: { color: "bg-blue-100 text-blue-800", icon: <Clock className="w-4 h-4" /> },
  overdue: { color: "bg-red-100 text-red-800", icon: <AlertCircle className="w-4 h-4" /> },
}

export default function ClientTransactions() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<ClientTransaction[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [startDateFilter, setStartDateFilter] = useState("")
  const [endDateFilter, setEndDateFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null)
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(4)

  useEffect(() => {
    // Check if user is authenticated
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.role !== "client") {
        router.push("/")
        return
      }
      setUser(parsedUser)

      // Fetch transactions for this client
      fetchTransactions(parsedUser.client_id)
    } catch (e) {
      console.error("Error parsing user data:", e)
      router.push("/")
      return
    }
  }, [router])

  const fetchTransactions = async (clientId: number) => {
    setLoading(true)
    try {
      const result = await getClientTransactions(clientId)
      if (result.success) {
        setTransactions(result.transactions)
      } else {
        setError(result.error || "Failed to fetch transactions")
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactionDetails = async (transaction: ClientTransaction) => {
    if (!user || !user.client_id) {
      console.error("User or client_id not available")
      return
    }

    setDetailsLoading(true)
    try {
      // Use the same client_id that we used to fetch the transactions list
      const result = await getClientTransactionById(transaction.transactionId, user.client_id)

      if (result.success) {
        setSelectedTransaction(result.transaction)
        setShowTransactionDetails(true)
      } else {
        // If we can't get the details, use the list item data as a fallback
        console.warn("Couldn't fetch detailed transaction data, using list data instead:", result.error)
        setSelectedTransaction({
          ...transaction,
          lineItems: [],
        })
        setShowTransactionDetails(true)
      }
    } catch (error) {
      console.error("Error fetching transaction details:", error)
      // Still show the transaction with the data we have from the list
      setSelectedTransaction({
        ...transaction,
        lineItems: [],
      })
      setShowTransactionDetails(true)
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleDownloadInvoice = async (transaction: ClientTransaction) => {
    if (!user || !user.client_id) {
      console.error("User or client_id not available")
      return
    }

    setDownloadingInvoice(transaction.id)
    try {
      const result = await generateInvoice(transaction.transactionId, user.client_id)

      if (result.success && result.pdfBase64) {
        // Create a link element and trigger download
        const link = document.createElement("a")
        link.href = result.pdfBase64
        link.download = result.fileName || `Invoice_${transaction.id}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        console.error("Failed to generate invoice:", result.error)
        alert("Failed to generate invoice. Please try again later.")
      }
    } catch (error) {
      console.error("Error downloading invoice:", error)
      alert("An error occurred while generating the invoice. Please try again later.")
    } finally {
      setDownloadingInvoice(null)
    }
  }

  // Filter transactions based on selected filters and search query
  const filteredTransactions = transactions.filter((transaction) => {
    // Status filter
    if (statusFilter !== "all" && transaction.status !== statusFilter) {
      return false
    }

    // Date range filter
    if (startDateFilter) {
      const transactionDate = new Date(transaction.date)
      const filterDate = new Date(startDateFilter)
      if (transactionDate < filterDate) {
        return false
      }
    }

    if (endDateFilter) {
      const transactionDate = new Date(transaction.date)
      const filterDate = new Date(endDateFilter)
      if (transactionDate > filterDate) {
        return false
      }
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        transaction.id.toLowerCase().includes(query) ||
        transaction.description.toLowerCase().includes(query) ||
        (transaction.referenceNumber && transaction.referenceNumber.toLowerCase().includes(query))
      )
    }

    return true
  })

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

  const handleViewTransaction = (transaction: ClientTransaction) => {
    fetchTransactionDetails(transaction)
  }

  const handlePrintInvoice = (transaction: ClientTransaction) => {
    // First download the invoice, then open print dialog
    handleDownloadInvoice(transaction).then(() => {
      // In a real app, we would use a print-specific API or library
      alert("Print functionality would open the print dialog for the downloaded PDF")
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading transactions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <ClientDashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 font-poppins">Transactions</h1>
          <p className="text-gray-600 font-poppins">View your transaction history</p>
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
                  placeholder="Search transactions..."
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
                  <option value="draft">Draft</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="date"
                    className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    placeholder="Start Date"
                  />
                </div>
                <span className="text-gray-500">to</span>
                <div className="relative">
                  <input
                    type="date"
                    className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] font-poppins"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    placeholder="End Date"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <button
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm font-poppins"
                onClick={() => {
                  setStatusFilter("all")
                  setStartDateFilter("")
                  setEndDateFilter("")
                  setSearchQuery("")
                }}
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            <p className="font-poppins">{error}</p>
          </div>
        )}

        {/* Transactions Card View */}
        <div className="mb-6">
          {currentTransactions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center text-gray-500 font-poppins">
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-500 max-w-md mb-6">
                  {transactions.length === 0
                    ? "You don't have any transactions yet."
                    : "No transactions match your current filters. Try adjusting your search or filter criteria."}
                </p>
                {transactions.length > 0 && (
                  <button
                    onClick={() => {
                      setStatusFilter("all")
                      setStartDateFilter("")
                      setEndDateFilter("")
                      setSearchQuery("")
                    }}
                    className="bg-[#3A86FF] text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-[#3A86FF]/90 transition-colors font-poppins"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentTransactions.map((transaction) => (
                <div
                  key={transaction.transactionId}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900 font-poppins text-lg">{transaction.id}</h3>
                        <p className="text-sm text-gray-500 font-poppins">{transaction.description}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          statusInfo[transaction.status as keyof typeof statusInfo]?.color ||
                          "bg-gray-100 text-gray-800"
                        } font-poppins capitalize`}
                      >
                        {statusInfo[transaction.status as keyof typeof statusInfo]?.icon || (
                          <FileText className="w-4 h-4" />
                        )}
                        <span>{transaction.status}</span>
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-poppins">Amount:</span>
                        <span className="font-bold text-gray-900 font-poppins">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-poppins">Date:</span>
                        <span className="text-gray-900 font-poppins">{transaction.date}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-poppins">Due Date:</span>
                        <span className="text-gray-900 font-poppins">{transaction.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 p-4 bg-gray-50 flex justify-end space-x-3">
                    <button
                      onClick={() => handleViewTransaction(transaction)}
                      className="p-2 rounded-full bg-blue-50 text-[#3A86FF] hover:bg-blue-100 transition-colors"
                      aria-label="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePrintInvoice(transaction)}
                      className="p-2 rounded-full bg-purple-50 text-[#8338EC] hover:bg-purple-100 transition-colors"
                      aria-label="Print invoice"
                      disabled={downloadingInvoice === transaction.id}
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadInvoice(transaction)}
                      className="p-2 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      aria-label="Download invoice"
                      disabled={downloadingInvoice === transaction.id}
                    >
                      {downloadingInvoice === transaction.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredTransactions.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500 font-poppins">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                <span className="font-medium">{Math.min(indexOfLastItem, filteredTransactions.length)}</span> of{" "}
                <span className="font-medium">{filteredTransactions.length}</span> transactions
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

        {/* Transaction Details Side Panel */}
        {showTransactionDetails && selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
            <div className="bg-white w-full max-w-md h-full overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 font-poppins">Transaction Details</h2>
                  <button
                    onClick={() => setShowTransactionDetails(false)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {detailsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#3A86FF]/10 flex items-center justify-center mr-4">
                          <FileText className="w-6 h-6 text-[#3A86FF]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 font-poppins">{selectedTransaction.id}</h3>
                          <p className="text-gray-500 font-poppins">{selectedTransaction.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center mb-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            statusInfo[selectedTransaction.status as keyof typeof statusInfo]?.color ||
                            "bg-gray-100 text-gray-800"
                          } font-poppins capitalize`}
                        >
                          {statusInfo[selectedTransaction.status as keyof typeof statusInfo]?.icon || (
                            <FileText className="w-4 h-4" />
                          )}
                          <span>{selectedTransaction.status}</span>
                        </span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-gray-500 font-poppins">{formatCurrency(selectedTransaction.amount)}</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 font-poppins">
                          Transaction Details
                        </h4>
                        <div className="bg-gray-50 rounded-md p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600 font-poppins">Invoice ID</p>
                            <p className="font-medium text-gray-900 font-poppins">{selectedTransaction.id}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600 font-poppins">Date</p>
                            <p className="font-medium text-gray-900 font-poppins">{selectedTransaction.date}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600 font-poppins">Due Date</p>
                            <p className="font-medium text-gray-900 font-poppins">{selectedTransaction.dueDate}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600 font-poppins">Amount</p>
                            <p className="font-medium text-gray-900 font-poppins">
                              {formatCurrency(selectedTransaction.amount)}
                            </p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600 font-poppins">Status</p>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                statusInfo[selectedTransaction.status as keyof typeof statusInfo]?.color ||
                                "bg-gray-100 text-gray-800"
                              } font-poppins capitalize`}
                            >
                              {statusInfo[selectedTransaction.status as keyof typeof statusInfo]?.icon || (
                                <FileText className="w-4 h-4" />
                              )}
                              <span>{selectedTransaction.status}</span>
                            </span>
                          </div>
                          {selectedTransaction.referenceNumber && (
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-gray-600 font-poppins">Reference</p>
                              <p className="font-medium text-gray-900 font-poppins">
                                {selectedTransaction.referenceNumber}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedTransaction.lineItems && selectedTransaction.lineItems.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 font-poppins">
                            Items
                          </h4>
                          <div className="bg-gray-50 rounded-md p-4">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left pb-2 font-medium text-gray-600 font-poppins">Description</th>
                                  <th className="text-right pb-2 font-medium text-gray-600 font-poppins">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedTransaction.lineItems.map((item: any) => (
                                  <tr key={item.id} className="border-b border-gray-100 last:border-0">
                                    <td className="py-2 text-gray-700 font-poppins">
                                      {item.description}
                                      {item.quantity > 1 && (
                                        <span className="text-gray-500 text-xs"> (x{item.quantity})</span>
                                      )}
                                    </td>
                                    <td className="py-2 text-right text-gray-700 font-poppins">
                                      {formatCurrency(item.total)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {selectedTransaction.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 font-poppins">
                            Notes
                          </h4>
                          <p className="text-gray-700 font-poppins bg-gray-50 p-3 rounded-md">
                            {selectedTransaction.notes}
                          </p>
                        </div>
                      )}

                      {selectedTransaction.terms && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 font-poppins">
                            Terms
                          </h4>
                          <p className="text-gray-700 font-poppins bg-gray-50 p-3 rounded-md">
                            {selectedTransaction.terms}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                      <button
                        onClick={() => handlePrintInvoice(selectedTransaction)}
                        className="flex-1 bg-[#3A86FF] text-white px-4 py-2 rounded-md hover:bg-[#3A86FF]/90 transition-colors font-poppins flex items-center justify-center gap-2"
                        disabled={downloadingInvoice === selectedTransaction.id}
                      >
                        {downloadingInvoice === selectedTransaction.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Preparing...
                          </>
                        ) : (
                          <>
                            <Printer className="w-4 h-4" />
                            Print Invoice
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(selectedTransaction)}
                        className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-poppins flex items-center justify-center gap-2"
                        disabled={downloadingInvoice === selectedTransaction.id}
                      >
                        {downloadingInvoice === selectedTransaction.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Download
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <ClientBottomNavigation />
    </div>
  )
}
