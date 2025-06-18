"use server"

import { sql } from "@/lib/db"
import { getAuthSession } from "./auth-actions"
import { formatProductFromDb } from "@/lib/db-service"
import { revalidatePath } from "next/cache"

// Types
export type TransactionItem = {
  id: string
  productId: string | number
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  total: number
}

export type Transaction = {
  id?: number
  transactionId: string
  clientId: string | number
  transactionDate: string
  dueDate: string
  referenceNumber?: string
  notes?: string
  terms?: string
  paymentMethod?: string
  status: "draft" | "pending" | "paid" | "partial" | "overdue"
  subtotal: number
  taxAmount: number
  totalAmount: number
  lineItems: TransactionItem[]
  clientName?: string
  createdAt?: string
  updatedAt?: string
}

// Fetch clients for the logged-in user
export async function getClientsForUser() {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    const clients = await sql`
      SELECT * FROM clients 
      WHERE created_by = ${session.userId}
      ORDER BY business_name ASC
    `

    return {
      success: true,
      clients: clients.map((client: any) => ({
        id: client.id,
        name: client.business_name,
        email: client.email,
        address: client.street
          ? `${client.street}, ${client.city || ""}, ${client.state || ""} ${client.zip || ""}`.trim()
          : "No address provided",
        contactPerson: client.contact_person,
        phone: client.phone,
      })),
    }
  } catch (error) {
    console.error("Error fetching clients:", error)
    return { success: false, error: "Failed to fetch clients" }
  }
}

// Fetch products for the logged-in user
export async function getProductsForUser() {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    const products = await sql`
      SELECT 
        id, 
        name, 
        description, 
        category, 
        price, 
        tax_rate as "taxRate", 
        status, 
        created_by, 
        created_at, 
        updated_at 
      FROM products 
      WHERE created_by = ${session.userId} AND status = 'active'
      ORDER BY name ASC
    `

    return {
      success: true,
      products: products.map(formatProductFromDb),
    }
  } catch (error) {
    console.error("Error fetching products:", error)
    return { success: false, error: "Failed to fetch products" }
  }
}

// Search products for the logged-in user
export async function searchProductsForUser(query: string) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    const products = await sql`
      SELECT 
        id, 
        name, 
        description, 
        category, 
        price, 
        tax_rate as "taxRate", 
        status, 
        created_by, 
        created_at, 
        updated_at 
      FROM products 
      WHERE 
        created_by = ${session.userId} 
        AND status = 'active'
        AND (
          name ILIKE ${"%" + query + "%"} 
          OR description ILIKE ${"%" + query + "%"}
        )
      ORDER BY name ASC
      LIMIT 10
    `

    return {
      success: true,
      products: products.map(formatProductFromDb),
    }
  } catch (error) {
    console.error("Error searching products:", error)
    return { success: false, error: "Failed to search products" }
  }
}

// This is a helper function to add a transaction to the ledger
export async function addTransactionToLedger(transaction: any) {
  try {
    const { addLedgerEntry } = await import("./ledger-actions")

    // Add the transaction to the ledger as income
    await addLedgerEntry({
      entry_date: transaction.transactionDate,
      entry_type: "income",
      amount: transaction.totalAmount,
      description: `Invoice ${transaction.transactionId} - ${transaction.clientName}`,
      reference_id: transaction.transactionId,
      reference_type: "client_transaction",
      client_id: transaction.clientId,
      staff_id: null,
    })

    return true
  } catch (error) {
    console.error("Error adding transaction to ledger:", error)
    return false
  }
}

// Create a new transaction
export async function createTransaction(transactionData: Omit<Transaction, "id" | "transactionId">) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    // Generate a unique transaction ID
    const transactionId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

    // Begin transaction
    await sql`BEGIN`

    // Insert transaction
    const result = await sql`
      INSERT INTO transactions (
        transaction_id,
        client_id,
        transaction_date,
        due_date,
        reference_number,
        notes,
        terms,
        payment_method,
        status,
        subtotal,
        tax_amount,
        total_amount,
        created_by
      ) VALUES (
        ${transactionId},
        ${transactionData.clientId},
        ${transactionData.transactionDate},
        ${transactionData.dueDate},
        ${transactionData.referenceNumber || null},
        ${transactionData.notes || null},
        ${transactionData.terms || null},
        ${transactionData.paymentMethod || null},
        ${transactionData.status},
        ${transactionData.subtotal},
        ${transactionData.taxAmount},
        ${transactionData.totalAmount},
        ${session.userId}
      )
      RETURNING id
    `

    if (!result || result.length === 0) {
      await sql`ROLLBACK`
      return { success: false, error: "Failed to create transaction" }
    }

    const transactionDbId = result[0].id

    // Insert transaction items
    for (const item of transactionData.lineItems) {
      await sql`
        INSERT INTO transaction_items (
          transaction_id,
          product_id,
          description,
          quantity,
          unit_price,
          tax_rate,
          total
        ) VALUES (
          ${transactionDbId},
          ${item.productId || null},
          ${item.description},
          ${item.quantity},
          ${item.unitPrice},
          ${item.taxRate},
          ${item.total}
        )
      `
    }

    // Commit transaction
    await sql`COMMIT`

    // Get client name for the ledger entry
    const clientResult = await sql`
      SELECT business_name FROM clients WHERE id = ${transactionData.clientId}
    `

    const clientName = clientResult.length > 0 ? clientResult[0].business_name : "Unknown Client"

    // Add to ledger
    const transactionWithId = {
      ...transactionData,
      transactionId,
      clientName,
    }

    await addTransactionToLedger(transactionWithId)

    return {
      success: true,
      transactionId,
      message: "Transaction created successfully",
    }
  } catch (error) {
    await sql`ROLLBACK`
    console.error("Error creating transaction:", error)
    return { success: false, error: "Failed to create transaction" }
  }
}

// Update an existing transaction
export async function updateTransaction(
  transactionId: string | number,
  transactionData: Omit<Transaction, "id" | "transactionId">,
) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    // Begin transaction
    await sql`BEGIN`

    // Get the transaction to verify ownership
    const existingTransaction = await sql`
      SELECT id FROM transactions 
      WHERE transaction_id = ${transactionId} AND created_by = ${session.userId}
    `

    if (!existingTransaction || existingTransaction.length === 0) {
      await sql`ROLLBACK`
      return { success: false, error: "Transaction not found or you don't have permission to update it" }
    }

    const transactionDbId = existingTransaction[0].id

    // Update transaction
    await sql`
      UPDATE transactions SET
        client_id = ${transactionData.clientId},
        transaction_date = ${transactionData.transactionDate},
        due_date = ${transactionData.dueDate},
        reference_number = ${transactionData.referenceNumber || null},
        notes = ${transactionData.notes || null},
        terms = ${transactionData.terms || null},
        payment_method = ${transactionData.paymentMethod || null},
        status = ${transactionData.status},
        subtotal = ${transactionData.subtotal},
        tax_amount = ${transactionData.taxAmount},
        total_amount = ${transactionData.totalAmount},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${transactionDbId}
    `

    // Delete existing transaction items
    await sql`DELETE FROM transaction_items WHERE transaction_id = ${transactionDbId}`

    // Insert updated transaction items
    for (const item of transactionData.lineItems) {
      await sql`
        INSERT INTO transaction_items (
          transaction_id,
          product_id,
          description,
          quantity,
          unit_price,
          tax_rate,
          total
        ) VALUES (
          ${transactionDbId},
          ${item.productId || null},
          ${item.description},
          ${item.quantity},
          ${item.unitPrice},
          ${item.taxRate},
          ${item.total}
        )
      `
    }

    // Commit transaction
    await sql`COMMIT`

    return {
      success: true,
      message: "Transaction updated successfully",
    }
  } catch (error) {
    await sql`ROLLBACK`
    console.error("Error updating transaction:", error)
    return { success: false, error: "Failed to update transaction" }
  }
}

// Get all transactions for the logged-in user
export async function getTransactionsForUser() {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    const transactions = await sql`
      SELECT 
        t.id,
        t.transaction_id as "transactionId",
        t.client_id as "clientId",
        c.business_name as "clientName",
        t.transaction_date as "transactionDate",
        t.due_date as "dueDate",
        t.reference_number as "referenceNumber",
        t.status,
        t.total_amount as "totalAmount",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt"
      FROM transactions t
      JOIN clients c ON t.client_id = c.id
      WHERE t.created_by = ${session.userId}
      ORDER BY t.created_at DESC
    `

    return {
      success: true,
      transactions: transactions.map((t: any) => ({
        ...t,
        transactionDate: t.transactionDate ? new Date(t.transactionDate).toISOString().split("T")[0] : null,
        dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : null,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
        updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
        totalAmount: Number.parseFloat(t.totalAmount),
      })),
    }
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return { success: false, error: "Failed to fetch transactions" }
  }
}

// Get transaction by ID
export async function getTransactionById(transactionId: string) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    // Get transaction details
    const transactions = await sql`
      SELECT 
        t.id,
        t.transaction_id as "transactionId",
        t.client_id as "clientId",
        c.business_name as "clientName",
        c.email as "clientEmail",
        c.contact_person as "clientContactPerson",
        c.phone as "clientPhone",
        c.street as "clientStreet",
        c.city as "clientCity",
        c.state as "clientState",
        c.zip as "clientZip",
        t.transaction_date as "transactionDate",
        t.due_date as "dueDate",
        t.reference_number as "referenceNumber",
        t.notes,
        t.terms,
        t.payment_method as "paymentMethod",
        t.status,
        t.subtotal,
        t.tax_amount as "taxAmount",
        t.total_amount as "totalAmount",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt"
      FROM transactions t
      JOIN clients c ON t.client_id = c.id
      WHERE t.transaction_id = ${transactionId} AND t.created_by = ${session.userId}
    `

    if (!transactions || transactions.length === 0) {
      return { success: false, error: "Transaction not found" }
    }

    const transaction = transactions[0]

    // Get transaction items
    const items = await sql`
      SELECT 
        ti.id,
        ti.product_id as "productId",
        p.name as "productName",
        ti.description,
        ti.quantity,
        ti.unit_price as "unitPrice",
        ti.tax_rate as "taxRate",
        ti.total
      FROM transaction_items ti
      LEFT JOIN products p ON ti.product_id = p.id
      WHERE ti.transaction_id = ${transaction.id}
      ORDER BY ti.id ASC
    `

    // Format transaction data
    const formattedTransaction = {
      ...transaction,
      transactionDate: transaction.transactionDate
        ? new Date(transaction.transactionDate).toISOString().split("T")[0]
        : null,
      dueDate: transaction.dueDate ? new Date(transaction.dueDate).toISOString().split("T")[0] : null,
      createdAt: transaction.createdAt ? new Date(transaction.createdAt).toISOString() : null,
      updatedAt: transaction.updatedAt ? new Date(transaction.updatedAt).toISOString() : null,
      subtotal: Number.parseFloat(transaction.subtotal),
      taxAmount: Number.parseFloat(transaction.taxAmount),
      totalAmount: Number.parseFloat(transaction.totalAmount),
      clientAddress: transaction.clientStreet
        ? `${transaction.clientStreet}, ${transaction.clientCity || ""}, ${transaction.clientState || ""} ${
            transaction.clientZip || ""
          }`.trim()
        : "No address provided",
      lineItems: items.map((item: any) => ({
        id: item.id.toString(),
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: Number.parseInt(item.quantity),
        unitPrice: Number.parseFloat(item.unitPrice),
        taxRate: Number.parseFloat(item.taxRate),
        total: Number.parseFloat(item.total),
      })),
    }

    return {
      success: true,
      transaction: formattedTransaction,
    }
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return { success: false, error: "Failed to fetch transaction" }
  }
}

// Delete transaction
export async function deleteTransaction(transactionId: string) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    // Begin transaction
    await sql`BEGIN`

    // Verify ownership
    const existingTransaction = await sql`
      SELECT id FROM transactions 
      WHERE transaction_id = ${transactionId} AND created_by = ${session.userId}
    `

    if (!existingTransaction || existingTransaction.length === 0) {
      await sql`ROLLBACK`
      return { success: false, error: "Transaction not found or you don't have permission to delete it" }
    }

    // Delete associated ledger entry
    await sql`
      DELETE FROM ledger 
      WHERE reference_id = ${transactionId} 
      AND reference_type = 'client_transaction'
      AND created_by = ${session.userId}
    `

    // Delete transaction (cascade will delete items)
    await sql`DELETE FROM transactions WHERE transaction_id = ${transactionId}`

    // Commit transaction
    await sql`COMMIT`

    // Revalidate paths
    revalidatePath("/admin/transactions")
    revalidatePath("/admin/ledger")

    return {
      success: true,
      message: "Transaction deleted successfully",
    }
  } catch (error) {
    await sql`ROLLBACK`
    console.error("Error deleting transaction:", error)
    return { success: false, error: "Failed to delete transaction" }
  }
}

// Filter transactions
export async function filterTransactions(filters: {
  status?: string
  clientId?: string
  startDate?: string
  endDate?: string
  searchQuery?: string
}) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    // Use the template literal approach instead of sql.unsafe
    const queryConditions = []
    queryConditions.push(`t.created_by = ${session.userId}`)

    if (filters.status && filters.status !== "all") {
      queryConditions.push(`t.status = '${filters.status}'`)
    }

    if (filters.clientId && filters.clientId !== "all") {
      queryConditions.push(`t.client_id = ${filters.clientId}`)
    }

    if (filters.startDate) {
      queryConditions.push(`t.transaction_date >= '${filters.startDate}'`)
    }

    if (filters.endDate) {
      queryConditions.push(`t.transaction_date <= '${filters.endDate}'`)
    }

    if (filters.searchQuery) {
      queryConditions.push(`(
        t.transaction_id ILIKE '%${filters.searchQuery}%' 
        OR c.business_name ILIKE '%${filters.searchQuery}%'
        OR t.reference_number ILIKE '%${filters.searchQuery}%'
      )`)
    }

    const whereClause = queryConditions.join(" AND ")

    // Use the template literal syntax which returns an array directly
    const result = await sql`
      SELECT 
        t.id,
        t.transaction_id as "transactionId",
        t.client_id as "clientId",
        c.business_name as "clientName",
        t.transaction_date as "transactionDate",
        t.due_date as "transactionDate",
        t.reference_number as "referenceNumber",
        t.status,
        t.total_amount as "totalAmount",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt"
      FROM transactions t
      JOIN clients c ON t.client_id = c.id
      WHERE ${sql.unsafe(whereClause)}
      ORDER BY t.created_at DESC
    `

    // Make sure we have a result before trying to map it
    if (!result || !Array.isArray(result)) {
      return { success: true, transactions: [] }
    }

    return {
      success: true,
      transactions: result.map((t: any) => ({
        ...t,
        transactionDate: t.transactionDate ? new Date(t.transactionDate).toISOString().split("T")[0] : null,
        dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : null,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
        updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
        totalAmount: Number.parseFloat(t.totalAmount),
      })),
    }
  } catch (error) {
    console.error("Error filtering transactions:", error)
    return { success: false, error: "Failed to filter transactions", transactions: [] }
  }
}
