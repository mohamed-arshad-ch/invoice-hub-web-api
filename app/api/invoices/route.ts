import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { getClientTransactionById } from "@/app/actions/client-transactions-actions"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can generate invoices
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case "generate-invoice":
        return await generateInvoice(body, user.userId)
      
      case "generate-weekly-invoice":
        return await generateWeeklyInvoice(body, user.userId)

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
}, ['admin', 'staff'])

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
          (SELECT p.name 
           FROM transaction_items ti 
           LEFT JOIN products p ON ti.product_id = p.id 
           WHERE ti.transaction_id = t.id 
           LIMIT 1),
          COALESCE(
            (SELECT ti.description 
             FROM transaction_items ti 
             WHERE ti.transaction_id = t.id 
             LIMIT 1),
            'Service'
          )
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
        date: t.date,
        quantity: 1,
        unitPrice: Number(t.amount),
        taxRate: 0,
        description: t.productName || "Service",
      })),
    }

    try {
      // Generate PDF for weekly invoice
      const pdfBase64 = await generateInvoicePDF(weeklyInvoice, clientInfo)

      return NextResponse.json({
        success: true,
        pdfBase64,
        fileName: `Weekly_Invoice_${startDate}_to_${endDate}.pdf`,
        weeklyInvoice,
      })
    } catch (pdfError: any) {
      console.error("Error generating weekly invoice PDF:", pdfError)
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