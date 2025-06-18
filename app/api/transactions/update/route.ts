import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can update transactions
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Only administrators and staff can update transactions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      transactionId,
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

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      )
    }

    // Begin transaction
    await sql`BEGIN`

    try {
      // Get the transaction to verify ownership
      const existingTransaction = await sql`
        SELECT id FROM transactions 
        WHERE transaction_id = ${transactionId} AND created_by = ${user.userId}
      `

      if (!existingTransaction || existingTransaction.length === 0) {
        await sql`ROLLBACK`
        return NextResponse.json(
          { success: false, error: "Transaction not found or you don't have permission to update it" },
          { status: 404 }
        )
      }

      const transactionDbId = existingTransaction[0].id

      // Update transaction
      await sql`
        UPDATE transactions SET
          client_id = ${clientId},
          transaction_date = ${transactionDate},
          due_date = ${dueDate},
          reference_number = ${referenceNumber || null},
          notes = ${notes || null},
          terms = ${terms || null},
          payment_method = ${paymentMethod || null},
          status = ${status},
          subtotal = ${subtotal},
          tax_amount = ${taxAmount},
          total_amount = ${totalAmount},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${transactionDbId}
      `

      // Delete existing transaction items
      await sql`DELETE FROM transaction_items WHERE transaction_id = ${transactionDbId}`

      // Insert updated transaction items
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

      // Commit transaction
      await sql`COMMIT`

      return NextResponse.json({
        success: true,
        message: "Transaction updated successfully",
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update transaction" },
      { status: 500 }
    )
  }
}, ['admin', 'staff']) 