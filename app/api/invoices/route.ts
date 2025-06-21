import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"
import { generateInvoicePDF } from "@/lib/pdf-generator"

// GET method for clients to generate their own invoices
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Only clients can access their own invoices through GET
    if (user.role !== 'client') {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const transactionId = url.searchParams.get('transactionId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    if (action === 'generate-invoice' && transactionId) {
      return await generateClientInvoice(transactionId, user)
    } else if (action === 'generate-weekly-invoice' && startDate && endDate) {
      return await generateClientWeeklyInvoice(startDate, endDate, user)
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action or missing parameters" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error in client invoices API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}, ['client'])

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Admin, staff, and clients can generate invoices
    if (!['admin', 'staff', 'client'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case "generate-invoice":
        if (user.role === 'client') {
          return await generateClientInvoice(body.transactionId, user)
        } else {
          return await generateInvoice(body, user.userId)
        }
      
      case "generate-weekly-invoice":
        if (user.role === 'client') {
          return await generateClientWeeklyInvoice(body.startDate, body.endDate, user)
        } else {
          return await generateWeeklyInvoice(body, user.userId)
        }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error in invoices API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}, ['admin', 'staff', 'client'])

// Helper function for clients to generate their own invoices
async function generateClientInvoice(transactionId: string, user: any) {
  try {
    const clientId = user.client_id

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Client ID not found in session" },
        { status: 400 }
      )
    }

    // Get transaction details
    const transactionResult = await getClientTransactionById(transactionId, clientId)

    if (!transactionResult.success) {
      return NextResponse.json(
        { success: false, error: transactionResult.error || "Transaction not found" },
        { status: 404 }
      )
    }

    // Get client details
    const clients = await sql`
      SELECT 
        c.id,
        c.business_name,
        c.email,
        c.phone,
        c.street,
        c.city,
        c.state,
        c.zip
      FROM clients c
      WHERE c.id = ${clientId}
    `

    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }

    const client = clients[0]

    // Format client address
    const clientAddress = [
      client.street,
      client.city ? `${client.city}${client.state ? `, ${client.state}` : ""}` : "",
      client.zip,
    ]
      .filter(Boolean)
      .join("\n")

    const clientInfo = {
      name: client.business_name,
      email: client.email,
      phone: client.phone,
      address: clientAddress,
    }

    try {
      // Generate PDF
      const pdfBase64 = await generateInvoicePDF(transactionResult.transaction!, clientInfo)

      return NextResponse.json({
        success: true,
        pdfBase64,
        fileName: `Invoice_${transactionResult.transaction!.id}.pdf`,
      })
    } catch (pdfError: any) {
      console.error("Error generating PDF:", pdfError)
      return NextResponse.json(
        { success: false, error: `PDF generation failed: ${pdfError.message || String(pdfError)}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error generating client invoice:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate invoice" },
      { status: 500 }
    )
  }
}

// Helper function for clients to generate weekly invoices
async function generateClientWeeklyInvoice(startDate: string, endDate: string, user: any) {
  try {
    const clientId = user.client_id

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Client ID not found in session" },
        { status: 400 }
      )
    }

    // Get client details
    const clients = await sql`
      SELECT 
        c.id,
        c.business_name,
        c.email,
        c.phone,
        c.street,
        c.city,
        c.state,
        c.zip
      FROM clients c
      WHERE c.id = ${clientId}
    `

    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }

    const client = clients[0]

    // Format client address
    const clientAddress = [
      client.street,
      client.city ? `${client.city}${client.state ? `, ${client.state}` : ""}` : "",
      client.zip,
    ]
      .filter(Boolean)
      .join("\n")

    const clientInfo = {
      name: client.business_name,
      email: client.email,
      phone: client.phone,
      address: clientAddress,
    }

    // Get transactions for the date range with product information
    const transactions = await sql`
      SELECT 
        t.id,
        t.transaction_id as "transactionId",
        t.transaction_date as "date",
        t.due_date as "dueDate",
        t.total_amount as "amount",
        t.status,
        t.payment_method as "paymentMethod",
        t.reference_number as "referenceNumber",
        t.notes,
        COALESCE(
          (SELECT COALESCE(p.name, ti.description)
           FROM transaction_items ti 
           LEFT JOIN products p ON ti.product_id = p.id 
           WHERE ti.transaction_id = t.id 
           ORDER BY ti.id ASC
           LIMIT 1),
          'Service'
        ) as "productName"
      FROM transactions t
      WHERE t.client_id = ${clientId}
        AND t.transaction_date >= ${startDate}
        AND t.transaction_date <= ${endDate}
      ORDER BY t.transaction_date ASC
    `

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: "No transactions found for this date range" },
        { status: 404 }
      )
    }

    // Calculate total amount and payment information
    const totalAmount = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    let totalPaid = 0
    let hasPartialTransactions = false

    // Get payment information for partial transactions
    const lineItemsWithPayments = []
    for (const t of transactions) {
      let transactionPaid = 0
      
      if (t.status === 'paid') {
        transactionPaid = Number(t.amount)
        totalPaid += transactionPaid
      } else if (t.status === 'partial') {
        hasPartialTransactions = true
        
        // Get payment information for this transaction
        const payments = await sql`
          SELECT COALESCE(SUM(amount), 0) as total_paid 
          FROM transaction_payments 
          WHERE transaction_id = ${t.id}
        `
        
        transactionPaid = Number(payments[0]?.total_paid || 0)
        totalPaid += transactionPaid
      }

      lineItemsWithPayments.push({
        id: t.id.toString(),
        transactionId: t.transactionId,
        date: t.date
          ? new Date(t.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null,
        quantity: 1,
        unitPrice: Number(t.amount),
        taxRate: 0,
        total: Number(t.amount),
        description: t.productName || `Transaction ${t.transactionId}`,
        productName: t.productName || `Transaction ${t.transactionId}`,
        status: t.status || 'pending',
        paidAmount: transactionPaid,
        remainingAmount: Number(t.amount) - transactionPaid,
      })
    }

    const remainingAmount = totalAmount - totalPaid

    // Format date range for display
    const formattedStartDate = new Date(startDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })

    const formattedEndDate = new Date(endDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    // Determine overall status
    let weeklyStatus = "paid"
    if (remainingAmount > 0) {
      weeklyStatus = hasPartialTransactions ? "partial" : "pending"
    }

    // Create a weekly invoice object
    const weeklyInvoice = {
      id: `WEEK-${startDate}-${endDate}`,
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      dueDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      status: weeklyStatus,
      amount: totalAmount,
      description: `Weekly Invoice (${formattedStartDate} - ${formattedEndDate})`,
      referenceNumber: `WI-${new Date().getFullYear()}-${startDate.replace(/-/g, "")}`,
      lineItems: lineItemsWithPayments,
      notes: `Weekly summary of transactions from ${formattedStartDate} to ${formattedEndDate}`,
      terms: "Payment terms as per service agreement",
      // Add payment information for partial status
      paymentInfo: hasPartialTransactions || remainingAmount > 0 ? {
        totalPaid: totalPaid,
        remainingAmount: remainingAmount,
        transactionTotal: totalAmount
      } : null,
    }

    try {
      // Generate PDF
      const pdfBase64 = await generateInvoicePDF(weeklyInvoice, clientInfo)

      return NextResponse.json({
        success: true,
        pdfBase64,
        fileName: `Weekly_Invoice_${startDate}_${endDate}.pdf`,
      })
    } catch (pdfError: any) {
      console.error("Error generating weekly PDF:", pdfError)
      return NextResponse.json(
        { success: false, error: `PDF generation failed: ${pdfError.message || String(pdfError)}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error generating client weekly invoice:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate weekly invoice" },
      { status: 500 }
    )
  }
}

// Helper function to get client transaction by ID (moved from actions)
async function getClientTransactionById(transactionId: string, clientId: number) {
  try {
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
        return { success: false, error: "Transaction not found" }
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

      // Get payment information if transaction is partial or paid
      let paymentInfo = null
      if (transaction.status === 'partial' || transaction.status === 'paid') {
        const payments = await sql`
          SELECT 
            tp.id,
            tp.amount,
            tp.payment_date,
            tp.payment_method,
            tp.reference_number,
            tp.notes
          FROM transaction_payments tp
          WHERE tp.transaction_id = ${transaction.id}
          ORDER BY tp.payment_date DESC, tp.created_at DESC
        `

        if (payments && payments.length > 0) {
          const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)
          const remainingAmount = Number(transaction.amount) - totalPaid

          paymentInfo = {
            totalPaid: totalPaid,
            remainingAmount: remainingAmount,
            payments: payments.map((payment: any) => ({
              ...payment,
              amount: Number(payment.amount),
              payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split("T")[0] : null,
            }))
          }
        }
      }

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
        paymentInfo: paymentInfo,
      }

      return {
        success: true,
        transaction: formattedTransaction,
      }
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

    // Get payment information if transaction is partial or paid
    let paymentInfo = null
    if (transaction.status === 'partial' || transaction.status === 'paid') {
      const payments = await sql`
        SELECT 
          tp.id,
          tp.amount,
          tp.payment_date,
          tp.payment_method,
          tp.reference_number,
          tp.notes
        FROM transaction_payments tp
        WHERE tp.transaction_id = ${transaction.id}
        ORDER BY tp.payment_date DESC, tp.created_at DESC
      `

      if (payments && payments.length > 0) {
        const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)
        const remainingAmount = Number(transaction.amount) - totalPaid

        paymentInfo = {
          totalPaid: totalPaid,
          remainingAmount: remainingAmount,
          payments: payments.map((payment: any) => ({
            ...payment,
            amount: Number(payment.amount),
            payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split("T")[0] : null,
          }))
        }
      }
    }

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
      paymentInfo: paymentInfo,
    }

    return {
      success: true,
      transaction: formattedTransaction,
    }
  } catch (error) {
    console.error("Error fetching client transaction:", error)
    return { success: false, error: "Failed to fetch transaction" }
  }
}

async function generateInvoice(body: any, userId: number) {
  const { transactionId, clientId } = body

  if (!transactionId || !clientId) {
    return NextResponse.json(
      { success: false, error: "Transaction ID and Client ID are required" },
      { status: 400 }
    )
  }

  try {
    // Get transaction details
    const transactionResult = await getClientTransactionById(transactionId, clientId)

    if (!transactionResult.success) {
      return NextResponse.json(
        { success: false, error: transactionResult.error || "Transaction not found" },
        { status: 404 }
      )
    }

    // Get client details - ensure user has access to this client
    const clients = await sql`
      SELECT 
        c.id,
        c.business_name,
        c.email,
        c.phone,
        c.street,
        c.city,
        c.state,
        c.zip
      FROM clients c
      WHERE c.id = ${clientId} AND c.created_by = ${userId}
    `

    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }

    const client = clients[0]

    // Format client address
    const clientAddress = [
      client.street,
      client.city ? `${client.city}${client.state ? `, ${client.state}` : ""}` : "",
      client.zip,
    ]
      .filter(Boolean)
      .join("\n")

    const clientInfo = {
      name: client.business_name,
      email: client.email,
      phone: client.phone,
      address: clientAddress,
    }

    try {
      // Generate PDF
      const pdfBase64 = await generateInvoicePDF(transactionResult.transaction!, clientInfo)

      return NextResponse.json({
        success: true,
        pdfBase64,
        fileName: `Invoice_${transactionResult.transaction!.id}.pdf`,
      })
    } catch (pdfError: any) {
      console.error("Error generating PDF:", pdfError)
      return NextResponse.json(
        { success: false, error: `PDF generation failed: ${pdfError.message || String(pdfError)}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error generating invoice:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate invoice" },
      { status: 500 }
    )
  }
}

async function generateWeeklyInvoice(body: any, userId: number) {
  const { clientId, startDate, endDate } = body

  if (!clientId || !startDate || !endDate) {
    return NextResponse.json(
      { success: false, error: "Client ID, start date, and end date are required" },
      { status: 400 }
    )
  }

  try {
    // Get client details - ensure user has access to this client
    const clients = await sql`
      SELECT 
        c.id,
        c.business_name,
        c.email,
        c.phone,
        c.street,
        c.city,
        c.state,
        c.zip
      FROM clients c
      WHERE c.id = ${clientId} AND c.created_by = ${userId}
    `

    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }

    const client = clients[0]

    // Format client address
    const clientAddress = [
      client.street,
      client.city ? `${client.city}${client.state ? `, ${client.state}` : ""}` : "",
      client.zip,
    ]
      .filter(Boolean)
      .join("\n")

    const clientInfo = {
      name: client.business_name,
      email: client.email,
      phone: client.phone,
      address: clientAddress,
    }

    // Get transactions for the date range with product information
    const transactions = await sql`
      SELECT 
        t.id,
        t.transaction_id as "transactionId",
        t.transaction_date as "date",
        t.due_date as "dueDate",
        t.total_amount as "amount",
        t.status,
        t.payment_method as "paymentMethod",
        t.reference_number as "referenceNumber",
        t.notes,
        COALESCE(
          (SELECT COALESCE(p.name, ti.description)
           FROM transaction_items ti 
           LEFT JOIN products p ON ti.product_id = p.id 
           WHERE ti.transaction_id = t.id 
           ORDER BY ti.id ASC
           LIMIT 1),
          'Service'
        ) as "productName"
      FROM transactions t
      WHERE t.client_id = ${clientId}
        AND t.transaction_date >= ${startDate}
        AND t.transaction_date <= ${endDate}
        AND EXISTS (
          SELECT 1 FROM clients c 
          WHERE c.id = t.client_id AND c.created_by = ${userId}
        )
      ORDER BY t.transaction_date ASC
    `

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: "No transactions found for this date range" },
        { status: 404 }
      )
    }

    // Calculate total amount
    const totalAmount = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    // Format date range for display
    const formattedStartDate = new Date(startDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })

    const formattedEndDate = new Date(endDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    // Create a weekly invoice object
    const weeklyInvoice = {
      id: `WEEK-${startDate}-${endDate}`,
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      dueDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      status: "paid",
      amount: totalAmount,
      description: `Weekly Invoice (${formattedStartDate} - ${formattedEndDate})`,
      referenceNumber: `WI-${new Date().getFullYear()}-${startDate.replace(/-/g, "")}`,
      lineItems: transactions.map((t: any) => ({
        id: t.id.toString(),
        transactionId: t.transactionId,
        date: t.date
          ? new Date(t.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null,
        quantity: 1,
        unitPrice: Number(t.amount),
        taxRate: 0,
        total: Number(t.amount),
        description: t.productName || `Transaction ${t.transactionId}`,
        productName: t.productName || `Transaction ${t.transactionId}`,
        status: t.status || 'pending',
      })),
      notes: `Weekly summary of transactions from ${formattedStartDate} to ${formattedEndDate}`,
      terms: "Payment terms as per service agreement",
    }

    try {
      // Generate PDF
      const pdfBase64 = await generateInvoicePDF(weeklyInvoice, clientInfo)

      return NextResponse.json({
        success: true,
        pdfBase64,
        fileName: `Weekly_Invoice_${startDate}_${endDate}.pdf`,
      })
    } catch (pdfError: any) {
      console.error("Error generating weekly PDF:", pdfError)
      return NextResponse.json(
        { success: false, error: `PDF generation failed: ${pdfError.message || String(pdfError)}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error generating weekly invoice:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate weekly invoice" },
      { status: 500 }
    )
  }
} 