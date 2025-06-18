"use server"

import { sql } from "@/lib/db"
import { getAuthSession } from "./auth-actions"

// Types
export type ClientTransaction = {
  id: string
  transactionId: string
  date: string
  dueDate: string
  amount: number
  status: "draft" | "pending" | "paid" | "partial" | "overdue"
  description: string
  referenceNumber?: string
  notes?: string
  terms?: string
}

// Get transactions for a specific client
export async function getClientTransactions(clientId: number) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
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

    return {
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
    }
  } catch (error) {
    console.error("Error fetching client transactions:", error)
    return { success: false, error: "Failed to fetch transactions" }
  }
}

// Get a specific transaction by ID for a client
export async function getClientTransactionById(transactionId: string, clientId: number) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
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
      // This is a fallback in case the transactionId is actually the database ID
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

      const transactions = transactionsById
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

    return {
      success: true,
      transaction: formattedTransaction,
    }
  } catch (error) {
    console.error("Error fetching client transaction:", error)
    return { success: false, error: "Failed to fetch transaction" }
  }
}

// Get transactions for a specific client within a date range
export async function getClientTransactionsInDateRange(clientId: number, startDate: string, endDate: string) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
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

    return {
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
    }
  } catch (error) {
    console.error("Error fetching client transactions in date range:", error)
    return { success: false, error: "Failed to fetch transactions" }
  }
}
