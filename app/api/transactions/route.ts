import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

// GET all transactions for the logged-in user
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Admin and staff can view all transactions, clients can view their own
    let transactions
    
    if (user.role === 'client') {
      // Client can only see their own transactions
      transactions = await sql`
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
        WHERE c.id = ${user.client_id}
        ORDER BY t.created_at DESC
      `
    } else {
      // Admin and staff can see all transactions they created
      transactions = await sql`
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
        WHERE t.created_by = ${user.userId}
        ORDER BY t.created_at DESC
      `
    }

    return NextResponse.json({
      success: true,
      transactions: transactions.map((t: any) => ({
        ...t,
        transactionDate: t.transactionDate ? new Date(t.transactionDate).toISOString().split("T")[0] : null,
        dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : null,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
        updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
        totalAmount: Number.parseFloat(t.totalAmount),
      })),
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}, ['admin', 'staff', 'client'])

// POST create new transaction
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can create transactions
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      clientId,
      transactionDate,
      dueDate,
      referenceNumber,
      notes,
      terms,
      paymentMethod,
      status,
      subtotal,
      taxAmount,
      totalAmount,
      lineItems,
    } = body

    // Validation
    if (!clientId || !transactionDate || !dueDate || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client ID, transaction date, due date, and line items are required" },
        { status: 400 }
      )
    }

    // Verify the client belongs to the user
    const clientCheck = await sql`
      SELECT id FROM clients WHERE id = ${clientId} AND created_by = ${user.userId}
    `

    if (clientCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found or access denied" },
        { status: 403 }
      )
    }

    // Generate a unique transaction ID
    const transactionId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

    // Begin transaction
    await sql`BEGIN`

    try {
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
          ${clientId},
          ${transactionDate},
          ${dueDate},
          ${referenceNumber || null},
          ${notes || null},
          ${terms || null},
          ${paymentMethod || null},
          ${status || "draft"},
          ${subtotal || 0},
          ${taxAmount || 0},
          ${totalAmount || 0},
          ${user.userId}
        )
        RETURNING id
      `

      if (!result || result.length === 0) {
        await sql`ROLLBACK`
        return NextResponse.json(
          { success: false, error: "Failed to create transaction" },
          { status: 500 }
        )
      }

      const transactionDbId = result[0].id

      // Insert transaction items
      for (const item of lineItems) {
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
            ${item.taxRate || 0},
            ${item.total}
          )
        `
      }

      // Get client name for the ledger entry before committing
      const clientResult = await sql`
        SELECT business_name FROM clients WHERE id = ${clientId}
      `

      const clientName = clientResult.length > 0 ? clientResult[0].business_name : "Unknown Client"

      // Add to ledger only if status is paid (not pending)
      // Pending transactions should only add payments to ledger, not the full amount
      if (status && status === "paid") {
        await sql`
          INSERT INTO ledger (
            entry_date, 
            entry_type, 
            amount, 
            description, 
            reference_id, 
            reference_type, 
            client_id,
            created_by
          )
          VALUES (
            ${transactionDate}, 
            'income', 
            ${totalAmount}, 
            ${"Invoice " + transactionId + " - " + clientName}, 
            ${transactionId}, 
            'client_transaction', 
            ${clientId},
            ${user.userId}
          )
        `

        // Update client total_spent for paid transactions
        await sql`
          UPDATE clients 
          SET total_spent = COALESCE(
            (
              SELECT SUM(tp.amount) 
              FROM transaction_payments tp
              JOIN transactions t ON tp.transaction_id = t.id
              WHERE t.client_id = ${clientId}
            ) + 
            (
              SELECT SUM(t.total_amount) 
              FROM transactions t 
              WHERE t.client_id = ${clientId} AND t.status = 'paid'
            ), 
            0
          )
          WHERE id = ${clientId}
        `
      }

      // Commit transaction (includes both transaction and ledger entry)
      await sql`COMMIT`

      return NextResponse.json({
        success: true,
        transactionId,
        message: "Transaction created successfully",
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create transaction" },
      { status: 500 }
    )
  }
}, ['admin', 'staff']) 