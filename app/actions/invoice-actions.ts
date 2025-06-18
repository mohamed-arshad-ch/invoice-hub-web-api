"use server"

import { sql } from "@/lib/db"
import { getAuthSession } from "./auth-actions"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { getClientTransactionById } from "./client-transactions-actions"

export async function generateInvoice(transactionId: string, clientId: number) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    // Get transaction details
    const transactionResult = await getClientTransactionById(transactionId, clientId)

    if (!transactionResult.success) {
      return { success: false, error: transactionResult.error || "Transaction not found" }
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
      return { success: false, error: "Client not found" }
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
      const pdfBase64 = await generateInvoicePDF(transactionResult.transaction, clientInfo)

      return {
        success: true,
        pdfBase64,
        fileName: `Invoice_${transactionResult.transaction.id}.pdf`,
      }
    } catch (pdfError: any) {
      console.error("Error generating PDF:", pdfError)
      return { success: false, error: `PDF generation failed: ${pdfError.message || String(pdfError)}` }
    }
  } catch (error) {
    console.error("Error generating invoice:", error)
    return { success: false, error: "Failed to generate invoice" }
  }
}

export async function generateWeeklyInvoice(clientId: number, startDate: string, endDate: string) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
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
      return { success: false, error: "Client not found" }
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
    // Join with transaction_items and products tables to get product names
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
      return { success: false, error: "No transactions found for this date range" }
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
        total: Number(t.amount),
        status: t.status,
        productName: t.productName || "Service", // Include product name
      })),
      notes: `This invoice includes all transactions from ${formattedStartDate} to ${formattedEndDate}.`,
    }

    try {
      // Generate PDF
      const pdfBase64 = await generateInvoicePDF(weeklyInvoice, clientInfo)

      return {
        success: true,
        pdfBase64,
        fileName: `Weekly_Invoice_${formattedStartDate.replace(/\s/g, "_")}_to_${formattedEndDate.replace(/\s/g, "_")}.pdf`,
      }
    } catch (pdfError: any) {
      console.error("Error generating PDF:", pdfError)
      return { success: false, error: `PDF generation failed: ${pdfError.message || String(pdfError)}` }
    }
  } catch (error) {
    console.error("Error generating weekly invoice:", error)
    return { success: false, error: "Failed to generate weekly invoice" }
  }
}
