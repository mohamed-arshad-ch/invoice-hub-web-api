import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

// GET method for clients to access their own transactions
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Only clients can access their own transactions through GET
    if (user.role !== 'client') {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    // Get client_id from user session
    const clientId = user.client_id

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Client ID not found in session" },
        { status: 400 }
      )
    }

    // Get transactions for the client
    const transactions = await sql`
      SELECT 
        t.id,
        t.transaction_id as "transactionId",
        t.transaction_date as "date",
        t.due_date as "dueDate",
        t.total_amount as "amount",
        t.status,
        COALESCE(
          (SELECT description FROM transaction_items WHERE transaction_id = t.id LIMIT 1),
          'Service'
        ) as "description",
        t.reference_number as "referenceNumber",
        t.notes,
        t.terms
      FROM transactions t
      WHERE t.client_id = ${clientId}
      ORDER BY t.transaction_date DESC
    `

    return NextResponse.json({
      success: true,
      transactions: transactions.map((t: any) => ({
        ...t,
        id: t.transactionId, // Use transactionId as the display ID
        date: t.date
          ? new Date(t.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null,
        dueDate: t.dueDate
          ? new Date(t.dueDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null,
        amount: Number(t.amount),
      })),
    })
  } catch (error) {
    console.error("Error fetching client transactions:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}, ['client'])

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case "get-transaction-details":
        return await getTransactionDetails(body, user)
      
      case "get-transactions-by-date-range":
        return await getTransactionsByDateRange(body, user)
        
      case "get-transaction-payments":
        return await getTransactionPayments(body, user)

      default:
        // Admin and staff can view client transactions (existing functionality)
        if (!['admin', 'staff'].includes(user.role)) {
          return NextResponse.json(
            { success: false, error: "Insufficient permissions" },
            { status: 403 }
          )
        }

        const { clientId } = body

        if (!clientId) {
          return NextResponse.json(
            { success: false, error: "Client ID is required" },
            { status: 400 }
          )
        }

        // Verify the client belongs to the current user
        const clientCheck = await sql`
          SELECT id FROM clients 
          WHERE id = ${clientId} AND created_by = ${user.userId}
        `

        if (!clientCheck || clientCheck.length === 0) {
          return NextResponse.json(
            { success: false, error: "Client not found" },
            { status: 404 }
          )
        }

        // Get transactions for the client
        const transactions = await sql`
          SELECT 
            t.id,
            t.transaction_id as "transactionId",
            t.transaction_date as "date",
            t.due_date as "dueDate",
            t.total_amount as "amount",
            t.status,
            COALESCE(
              (SELECT description FROM transaction_items WHERE transaction_id = t.id LIMIT 1),
              'Service'
            ) as "description",
            t.reference_number as "referenceNumber"
          FROM transactions t
          WHERE t.client_id = ${clientId}
          ORDER BY t.transaction_date DESC
        `

        return NextResponse.json({
          success: true,
          transactions: transactions.map((t: any) => ({
            ...t,
            date: t.date
              ? new Date(t.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : null,
            dueDate: t.dueDate
              ? new Date(t.dueDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : null,
            amount: Number(t.amount),
          })),
        })
    }
  } catch (error) {
    console.error("Error in client transactions API:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    )
  }
}, ['admin', 'staff', 'client'])

// Helper function to get transaction details
async function getTransactionDetails(body: any, user: any) {
  const { transactionId } = body

  if (!transactionId) {
    return NextResponse.json(
      { success: false, error: "Transaction ID is required" },
      { status: 400 }
    )
  }

  try {
    let clientId: number;

    if (user.role === 'client') {
      // Client can only access their own transactions
      clientId = user.client_id
      if (!clientId) {
        return NextResponse.json(
          { success: false, error: "Client ID not found in session" },
          { status: 400 }
        )
      }
    } else {
      // Admin/staff need to provide clientId
      clientId = body.clientId
      if (!clientId) {
        return NextResponse.json(
          { success: false, error: "Client ID is required" },
          { status: 400 }
        )
      }
    }

    // Get transaction details - use the transaction_id field for lookup
    const transactions = await sql`
      SELECT 
        t.id,
        t.transaction_id as "transactionId",
        t.transaction_date as "date",
        t.due_date as "dueDate",
        t.total_amount as "amount",
        t.status,
        t.reference_number as "referenceNumber",
        t.notes,
        t.terms,
        t.payment_method as "paymentMethod"
      FROM transactions t
      WHERE t.transaction_id = ${transactionId} AND t.client_id = ${clientId}
    `

    if (!transactions || transactions.length === 0) {
      // If we can't find by transaction_id, try looking up by the database ID
      const transactionsById = await sql`
        SELECT 
          t.id,
          t.transaction_id as "transactionId",
          t.transaction_date as "date",
          t.due_date as "dueDate",
          t.total_amount as "amount",
          t.status,
          t.reference_number as "referenceNumber",
          t.notes,
          t.terms,
          t.payment_method as "paymentMethod"
        FROM transactions t
        WHERE t.id = ${transactionId} AND t.client_id = ${clientId}
      `

      if (!transactionsById || transactionsById.length === 0) {
        return NextResponse.json(
          { success: false, error: "Transaction not found" },
          { status: 404 }
        )
      }

      const transaction = transactionsById[0]

      // Get transaction items
      const items = await sql`
        SELECT 
          ti.id,
          ti.description,
          ti.quantity,
          ti.unit_price as "unitPrice",
          ti.tax_rate as "taxRate",
          ti.total
        FROM transaction_items ti
        WHERE ti.transaction_id = ${transaction.id}
        ORDER BY ti.id ASC
      `

      // Format transaction data
      const formattedTransaction = {
        ...transaction,
        id: transaction.transactionId, // Use transactionId as the display ID
        date: transaction.date
          ? new Date(transaction.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null,
        dueDate: transaction.dueDate
          ? new Date(transaction.dueDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null,
        amount: Number(transaction.amount),
        description: items.length > 0 ? items[0].description : "Service",
        lineItems: items.map((item: any) => ({
          id: item.id.toString(),
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          total: Number(item.total),
        })),
      }

      return NextResponse.json({
        success: true,
        transaction: formattedTransaction,
      })
    }

    const transaction = transactions[0]

    // Get transaction items
    const items = await sql`
      SELECT 
        ti.id,
        ti.description,
        ti.quantity,
        ti.unit_price as "unitPrice",
        ti.tax_rate as "taxRate",
        ti.total
      FROM transaction_items ti
      WHERE ti.transaction_id = ${transaction.id}
      ORDER BY ti.id ASC
    `

    // Format transaction data
    const formattedTransaction = {
      ...transaction,
      id: transaction.transactionId, // Use transactionId as the display ID
      date: transaction.date
        ? new Date(transaction.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : null,
      dueDate: transaction.dueDate
        ? new Date(transaction.dueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : null,
      amount: Number(transaction.amount),
      description: items.length > 0 ? items[0].description : "Service",
      lineItems: items.map((item: any) => ({
        id: item.id.toString(),
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
        total: Number(item.total),
      })),
    }

    return NextResponse.json({
      success: true,
      transaction: formattedTransaction,
    })
  } catch (error) {
    console.error("Error fetching client transaction details:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch transaction details" },
      { status: 500 }
    )
  }
}

// Helper function to get transaction payments (for clients and admin/staff)
async function getTransactionPayments(body: any, user: any) {
  const { transactionId } = body

  if (!transactionId) {
    return NextResponse.json(
      { success: false, error: "Transaction ID is required" },
      { status: 400 }
    )
  }

  try {
    if (user.role === 'client') {
      // Client can only access their own transaction payments
      if (!user.client_id) {
        return NextResponse.json(
          { success: false, error: "Client ID not found in session" },
          { status: 400 }
        )
      }
    } else if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    // First, get the transaction to verify access and get its ID
    let transactionCheck;
    if (user.role === 'client') {
      transactionCheck = await sql`
        SELECT id, transaction_id, status, total_amount 
        FROM transactions t
        WHERE t.transaction_id = ${transactionId} AND t.client_id = ${user.client_id}
      `
    } else {
      transactionCheck = await sql`
        SELECT id, transaction_id, status, total_amount 
        FROM transactions t
        WHERE t.transaction_id = ${transactionId} AND t.created_by = ${user.userId}
      `
    }

    if (!transactionCheck || transactionCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      )
    }

    const transaction = transactionCheck[0]
    const numericTransactionId = transaction.id

    // Get all payments for this transaction
    const payments = await sql`
      SELECT 
        tp.id,
        tp.transaction_id,
        tp.amount,
        tp.payment_date,
        tp.payment_method,
        tp.reference_number,
        tp.notes,
        tp.created_at,
        tp.updated_at
      FROM transaction_payments tp
      WHERE tp.transaction_id = ${numericTransactionId}
      ORDER BY tp.payment_date DESC, tp.created_at DESC
    `

    // Calculate payment summary
    const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)
    const transactionAmount = Number(transaction.total_amount)
    const remainingAmount = transactionAmount - totalPaid

    return NextResponse.json({
      success: true,
      data: {
        payments: payments.map((payment: any) => ({
          ...payment,
          amount: Number(payment.amount),
          payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split("T")[0] : null,
          created_at: payment.created_at ? new Date(payment.created_at).toISOString() : null,
          updated_at: payment.updated_at ? new Date(payment.updated_at).toISOString() : null,
        })),
        summary: {
          totalPaid: totalPaid,
          remainingAmount: remainingAmount,
          transactionTotal: transactionAmount,
          paymentCount: payments.length
        }
      }
    })
  } catch (error) {
    console.error("Error fetching transaction payments:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch transaction payments" },
      { status: 500 }
    )
  }
}

// Helper function to get transactions by date range
async function getTransactionsByDateRange(body: any, user: any) {
  const { startDate, endDate } = body

  if (!startDate || !endDate) {
    return NextResponse.json(
      { success: false, error: "Start date and end date are required" },
      { status: 400 }
    )
  }

  try {
    let clientId: number;

    if (user.role === 'client') {
      // Client can only access their own transactions
      clientId = user.client_id
      if (!clientId) {
        return NextResponse.json(
          { success: false, error: "Client ID not found in session" },
          { status: 400 }
        )
      }
    } else {
      // Admin/staff need to provide clientId
      clientId = body.clientId
      if (!clientId) {
        return NextResponse.json(
          { success: false, error: "Client ID is required" },
          { status: 400 }
        )
      }
    }

    // Get transactions for the client within the date range
    const transactions = await sql`
      SELECT 
        t.id,
        t.transaction_id as "transactionId",
        t.transaction_date as "date",
        t.due_date as "dueDate",
        t.total_amount as "amount",
        t.status,
        COALESCE(
          (SELECT description FROM transaction_items WHERE transaction_id = t.id LIMIT 1),
          'Service'
        ) as "description",
        t.reference_number as "referenceNumber",
        t.notes,
        t.terms
      FROM transactions t
      WHERE t.client_id = ${clientId}
        AND t.transaction_date >= ${startDate}
        AND t.transaction_date <= ${endDate}
      ORDER BY t.transaction_date DESC
    `

    return NextResponse.json({
      success: true,
      transactions: transactions.map((t: any) => ({
        ...t,
        id: t.transactionId, // Use transactionId as the display ID
        date: t.date
          ? new Date(t.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null,
        dueDate: t.dueDate
          ? new Date(t.dueDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null,
        amount: Number(t.amount),
      })),
    })
  } catch (error) {
    console.error("Error fetching transactions by date range:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions by date range" },
      { status: 500 }
    )
  }
} 