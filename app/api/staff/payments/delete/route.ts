import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { paymentId } = body

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "Payment ID is required" },
        { status: 400 }
      )
    }

    // Begin transaction
    await sql`BEGIN`

    try {
      // Get the payment to verify it exists
      const payment = await sql`
        SELECT id, staff_id FROM staff_payments WHERE id = ${paymentId}
      `

      if (!payment || payment.length === 0) {
        await sql`ROLLBACK`
        return NextResponse.json(
          { success: false, error: "Payment not found" },
          { status: 404 }
        )
      }

      // Delete associated ledger entry
      await sql`
        DELETE FROM ledger 
        WHERE reference_id = ${"STAFF-PAY-" + paymentId} 
        AND reference_type = 'staff_payment'
      `

      // Delete the payment
      await sql`DELETE FROM staff_payments WHERE id = ${paymentId}`

      // Commit transaction
      await sql`COMMIT`

      return NextResponse.json({
        success: true,
        message: "Payment deleted successfully",
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error deleting staff payment:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete payment" },
      { status: 500 }
    )
  }
}, ["admin"]) 