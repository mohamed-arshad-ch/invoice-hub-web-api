import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can delete transactions
    if (!['admin', 'staff'].includes(user.role)) {
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

    // Begin transaction
    await sql`BEGIN`

    try {
      // Verify ownership
      const existingTransaction = await sql`
        SELECT id FROM transactions 
        WHERE transaction_id = ${transactionId} AND created_by = ${user.userId}
      `

      if (!existingTransaction || existingTransaction.length === 0) {
        await sql`ROLLBACK`
        return NextResponse.json(
          { success: false, error: "Transaction not found or you don't have permission to delete it" },
          { status: 404 }
        )
      }

      // Delete associated ledger entry
      await sql`
        DELETE FROM ledger 
        WHERE reference_id = ${transactionId} 
        AND reference_type = 'client_transaction'
      `

      // Delete transaction (cascade will delete items)
      await sql`DELETE FROM transactions WHERE transaction_id = ${transactionId}`

      // Commit transaction
      await sql`COMMIT`

      return NextResponse.json({
        success: true,
        message: "Transaction deleted successfully",
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete transaction" },
      { status: 500 }
    )
  }
}, ['admin', 'staff']) 