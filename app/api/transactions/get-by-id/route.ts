import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Admin and staff can view transactions, clients can view their own
    if (!['admin', 'staff', 'client'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      )
    }

    let transactions
    
    if (user.role === 'client') {
      // Client can only view their own transactions
      transactions = await sql`
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
        WHERE t.transaction_id = ${transactionId} AND c.id = ${user.client_id}
      `
    } else {
      // Admin and staff can view transactions they created
      transactions = await sql`
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
        WHERE t.transaction_id = ${transactionId} AND t.created_by = ${user.userId}
      `
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      )
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

    return NextResponse.json({
      success: true,
      transaction: formattedTransaction,
    })
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch transaction" },
      { status: 500 }
    )
  }
}, ['admin', 'staff', 'client']) 