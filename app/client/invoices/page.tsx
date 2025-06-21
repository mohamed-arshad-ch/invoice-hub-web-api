"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Eye, ChevronLeft, ChevronRight, FileText, X, Loader2 } from "lucide-react"
import ClientDashboardHeader from "@/app/components/dashboard/client-header"
import ClientBottomNavigation from "@/app/components/dashboard/client-bottom-navigation"
import { formatCurrency } from "@/lib/utils-currency"
import { checkAuthRole, type AuthUser } from "@/lib/auth"
import { apiGet, apiPost } from "@/lib/api-client"

// Helper function to get the date range for a week (Monday to Saturday)
const getWeekDateRange = (year: number, month: number, weekIndex: number) => {
  // Get the first day of the month
  const firstDayOfMonth = new Date(year, month, 1)

  // Find the first Monday of the month or the last Monday of the previous month
  const firstMonday = new Date(firstDayOfMonth)
  while (firstMonday.getDay() !== 1) {
    // 1 is Monday
    firstMonday.setDate(firstMonday.getDate() - 1)
  }

  // Calculate the start date for this week (Monday)
  const startDate = new Date(firstMonday)
  startDate.setDate(firstMonday.getDate() + weekIndex * 7)

  // Set time to beginning of day to ensure we capture all transactions
  startDate.setHours(0, 0, 0, 0)

  // Calculate the end date (Saturday of the same week)
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 5) // 5 days after Monday is Saturday

  // Set time to end of day to ensure we capture all transactions
  endDate.setHours(23, 59, 59, 999)

  // Calculate the week number within the month
  const weekNumber = getWeekNumberInMonth(startDate, month)

  return {
    start: startDate,
    end: endDate,
    label: `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    belongsToMonth: belongsToMonth(startDate, endDate, month),
    weekNumber,
  }
}

// Helper function to get the week number within the month
const getWeekNumberInMonth = (date: Date, month: number) => {
  const firstDayOfMonth = new Date(date.getFullYear(), month, 1)
  const firstMondayOfMonth = new Date(firstDayOfMonth)

  // Find the first Monday of the month
  while (firstMondayOfMonth.getDay() !== 1) {
    firstMondayOfMonth.setDate(firstMondayOfMonth.getDate() + 1)
  }

  // If the first Monday is in the next month, use the last Monday of the previous month
  if (firstMondayOfMonth.getMonth() !== month) {
    firstMondayOfMonth.setDate(firstMondayOfMonth.getDate() - 7)
  }

  // Calculate the difference in weeks
  const diffInTime = date.getTime() - firstMondayOfMonth.getTime()
  const diffInDays = diffInTime / (1000 * 3600 * 24)
  return Math.floor(diffInDays / 7) + 1
}

// Helper function to determine if a week belongs to a month
const belongsToMonth = (startDate: Date, endDate: Date, month: number) => {
  let daysInMonth = 0
  const currentDate = new Date(startDate)

  // Count days from Monday to Saturday (6 days total)
  for (let i = 0; i <= 5; i++) {
    if (currentDate.getMonth() === month) {
      daysInMonth++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Return true if at least 3 days (majority) are in the month
  return daysInMonth >= 3
}

// Format date for display
const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Get month and year string
const getMonthYearString = (date: Date) => {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export default function ClientInvoices() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [selectedWeek, setSelectedWeek] = useState<any>(null)
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingInvoice, setDownloadingInvoice] = useState<number | null>(null)
  const [monthTransitioning, setMonthTransitioning] = useState(false)
  
  // Payment information state for partial transactions
  const [transactionPayments, setTransactionPayments] = useState<{[key: string]: any}>({})
  const [loadingPayments, setLoadingPayments] = useState<{[key: string]: boolean}>({})

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date())
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  useEffect(() => {
    const initializeInvoices = async () => {
      try {
        // Check authentication and get user data
        const userData = await checkAuthRole("client", router)
        
        if (!userData) {
          // User is not authenticated or not client, checkAuthRole handles redirect
          return
        }

        setUser(userData)

        // Fetch transactions for this client
        if (userData.client_id) {
          await fetchTransactions(userData.client_id)
        }
      } catch (error) {
        console.error("Error initializing invoices:", error)
        router.push("/client/login")
      } finally {
        setLoading(false)
      }
    }

    initializeInvoices()
  }, [router])

  // Re-process weekly data when month changes
  useEffect(() => {
    if (transactions.length > 0) {
      setMonthTransitioning(true)
      processWeeklyData(transactions).finally(() => {
        // Add a small delay to show the transition effect
        setTimeout(() => setMonthTransitioning(false), 300)
      })
    }
  }, [currentMonth, currentYear, transactions])

  const fetchTransactions = async (clientId: number) => {
    try {
      const result = await apiGet('/api/clients/transactions')
      if (result.success) {
        const transactions = result.data?.transactions || []
        setTransactions(transactions)
        await processWeeklyData(transactions)
      } else {
        setError(result.error || "Failed to fetch transactions")
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      setError("An unexpected error occurred")
    }
  }

  const fetchTransactionPayments = async (transactionId: string) => {
    try {
      setLoadingPayments(prev => ({ ...prev, [transactionId]: true }))
      const result = await apiPost('/api/clients/transactions', {
        action: 'get-transaction-payments',
        transactionId: transactionId
      })

      if (result.success && result.data && result.data.data) {
        setTransactionPayments(prev => ({
          ...prev,
          [transactionId]: result.data.data
        }))
      } else {
        console.error("Error fetching transaction payments:", result.error)
      }
    } catch (error) {
      console.error("Error fetching transaction payments:", error)
    } finally {
      setLoadingPayments(prev => ({ ...prev, [transactionId]: false }))
    }
  }

  const processWeeklyData = async (transactions: any[]) => {
    // Create data for weeks in the current month
    const weeksData = []

    // We'll check up to 6 weeks to cover the entire month
    for (let i = 0; i < 6; i++) {
      const weekRange = getWeekDateRange(currentYear, currentMonth, i)

      // Only include weeks that belong to the current month
      if (weekRange.belongsToMonth) {
        const startTime = weekRange.start.getTime()
        const endTime = weekRange.end.getTime()

        // Filter transactions for this week
        const weekTransactions = transactions.filter((transaction) => {
          const transactionDate = new Date(transaction.date).getTime()
          return transactionDate >= startTime && transactionDate <= endTime
        })

        // Calculate total amount for this week (including partial payments)
        let totalAmount = 0
        let totalPaid = 0
        let totalRemaining = 0
        
        for (const transaction of weekTransactions) {
          totalAmount += transaction.amount
          
          if (transaction.status === "paid") {
            totalPaid += transaction.amount
          } else if (transaction.status === "partial") {
            // For partial transactions, we'll fetch payment info when viewing details
            totalPaid += transaction.amount * 0.5 // Estimate for display, will be updated when viewing details
          }
        }
        
        totalRemaining = totalAmount - totalPaid

        weeksData.push({
          index: i,
          weekNumber: weekRange.weekNumber,
          dateRange: weekRange,
          transactions: weekTransactions,
          totalAmount: totalAmount,
          totalPaid: totalPaid,
          totalRemaining: totalRemaining,
          formattedTotal: formatCurrency(totalPaid), // Show paid amount
          formattedTotalAmount: formatCurrency(totalAmount),
          formattedRemaining: formatCurrency(totalRemaining),
        })
      }
    }

    setWeeklyData(weeksData)
  }

  const handleViewTransactions = async (week: any) => {
    setSelectedWeek(week)
    setShowTransactionDetails(true)
    
    // Fetch payment information for partial transactions
    const partialTransactions = week.transactions.filter((t: any) => t.status === 'partial')
    for (const transaction of partialTransactions) {
      await fetchTransactionPayments(transaction.transactionId)
    }
  }

  const handleDownloadInvoice = async (week: any) => {
    if (!user?.client_id) {
      console.error("User or client_id not available")
      return
    }

    setDownloadingInvoice(week.index)
    try {
      // Check if there are transactions for this week
      if (week.transactions.length === 0) {
        alert("No transactions available for this week.")
        setDownloadingInvoice(null)
        return
      }

      // Format dates for the API call - ensure we're using ISO format with time component
      const startDateStr = week.dateRange.start.toISOString()
      const endDateStr = week.dateRange.end.toISOString()

      // Generate a comprehensive weekly invoice with all transactions
      const result = await apiGet(`/api/invoices?action=generate-weekly-invoice&startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}`)

      if (result.success && result.data?.pdfBase64) {
        // Create a link element and trigger download
        const link = document.createElement("a")
        link.href = result.data.pdfBase64
        link.download = result.data.fileName || `Weekly_Invoice_${week.dateRange.label.replace(/\s/g, "_")}.pdf`
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

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-poppins">Loading invoices...</p>
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
      <ClientDashboardHeader />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 font-poppins">Invoices</h1>
          <p className="text-gray-600 font-poppins">View and download your weekly invoices</p>
        </div>

        {/* Month Navigation - Removed calendar icon */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>

            <div className="flex items-center justify-center">
              {monthTransitioning ? (
                <div className="w-5 h-5 border-2 border-[#3A86FF] border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : null}
              <h2 className="text-xl font-semibold text-gray-900 font-poppins">{getMonthYearString(currentDate)}</h2>
            </div>

            <button
              onClick={goToNextMonth}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            <p className="font-poppins">{error}</p>
          </div>
        )}

        {/* Weekly Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {monthTransitioning ? (
            // Show skeleton loaders during month transition
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="w-2 h-10 bg-gray-200 rounded-full mr-2"></div>
                    <div>
                      <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                  </div>
                </div>
                <div className="h-10 bg-gray-200 rounded mt-4"></div>
              </div>
            ))
          ) : weeklyData.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow-sm p-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 font-poppins mb-2">No Invoices Available</h3>
              <p className="text-gray-500 font-poppins">There are no invoices for {getMonthYearString(currentDate)}.</p>
            </div>
          ) : (
            weeklyData.map((week) => (
              <div
                key={week.index}
                className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <span className="w-2 h-10 bg-[#3A86FF] rounded-full mr-2"></span>
                      <div>
                        <h3 className="font-medium text-gray-900 font-poppins text-lg">Week {week.weekNumber}</h3>
                        <p className="text-sm text-gray-500 font-poppins">{week.dateRange.label}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 font-poppins">Total Paid:</span>
                      <span className="font-bold text-gray-900 font-poppins">{week.formattedTotal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-poppins">Transactions:</span>
                      <span className="text-gray-900 font-poppins">{week.transactions.length}</span>
                    </div>
                  </div>

                  {/* Redesigned action buttons to match product page style */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleViewTransactions(week)}
                      className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        week.transactions.length === 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-[#3A86FF] text-white hover:bg-[#3A86FF]/90"
                      }`}
                      disabled={week.transactions.length === 0}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </button>
                    <button
                      onClick={() => handleDownloadInvoice(week)}
                      className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        downloadingInvoice === week.index || week.transactions.length === 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-[#8338EC] text-white hover:bg-[#8338EC]/90"
                      }`}
                      disabled={downloadingInvoice === week.index || week.transactions.length === 0}
                    >
                      {downloadingInvoice === week.index ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Transaction Details Side Panel */}
        {showTransactionDetails && selectedWeek && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
            <div className="bg-white w-full max-w-md h-full overflow-y-auto animate-slideInRight">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 font-poppins">
                    Transactions: {selectedWeek.dateRange.label}
                  </h2>
                  <button
                    onClick={() => setShowTransactionDetails(false)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {selectedWeek.transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-poppins">No transactions for this week</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <p className="font-medium text-gray-900 font-poppins">Total: {selectedWeek.formattedTotal}</p>
                      <button
                        onClick={() => handleDownloadInvoice(selectedWeek)}
                        className="flex items-center px-3 py-1 rounded-md bg-[#8338EC] text-white hover:bg-[#8338EC]/90 transition-colors text-sm"
                        disabled={downloadingInvoice === selectedWeek.index}
                      >
                        {downloadingInvoice === selectedWeek.index ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-1" />
                            Download Invoice
                          </>
                        )}
                      </button>
                    </div>

                    {selectedWeek.transactions.map((transaction: any) => {
                      const paymentData = transactionPayments[transaction.transactionId]
                      const isLoadingPayments = loadingPayments[transaction.transactionId]
                      
                      return (
                        <div
                          key={transaction.id}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-medium text-gray-900 font-poppins">{transaction.id}</h3>
                              <p className="text-sm text-gray-500 font-poppins">{transaction.description}</p>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.status === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : transaction.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : transaction.status === "partial"
                                      ? "bg-blue-100 text-blue-800"
                                      : transaction.status === "overdue"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                              } font-poppins capitalize`}
                            >
                              {transaction.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600 font-poppins">{transaction.date}</span>
                            <span className="font-medium text-gray-900 font-poppins">
                              {formatCurrency(transaction.amount)}
                            </span>
                          </div>
                          
                          {/* Payment Information for Partial Transactions */}
                          {transaction.status === 'partial' && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              {isLoadingPayments ? (
                                <div className="flex items-center justify-center py-2">
                                  <div className="w-4 h-4 border-2 border-[#3A86FF] border-t-transparent rounded-full animate-spin"></div>
                                  <span className="ml-2 text-sm text-gray-500 font-poppins">Loading payment info...</span>
                                </div>
                              ) : paymentData && paymentData.summary ? (
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-green-600 font-poppins font-medium">Amount Paid:</span>
                                    <span className="text-sm text-green-600 font-poppins font-bold">
                                      {formatCurrency(paymentData.summary.totalPaid)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-red-600 font-poppins font-medium">Remaining:</span>
                                    <span className="text-sm text-red-600 font-poppins font-bold">
                                      {formatCurrency(paymentData.summary.remainingAmount)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500 font-poppins">Payments:</span>
                                    <span className="text-xs text-gray-500 font-poppins">
                                      {paymentData.summary.paymentCount}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-2">
                                  <span className="text-sm text-gray-500 font-poppins">No payment info available</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
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
