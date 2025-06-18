import { NextRequest, NextResponse } from "next/server"
import { 
  getStaffPayments, 
  createStaffPayment, 
  getStaffTotalPaid,
  getStaffPaymentStats,
  getStaffPaymentById,
  updateStaffPayment
} from "@/lib/db-service-staff"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

// GET staff payments by ID
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { staffId, action, paymentId } = body

    switch (action) {
      case "get-payments":
        if (!staffId) {
          return NextResponse.json(
            { success: false, error: "Staff ID is required" },
            { status: 400 }
          )
        }
        try {
          const payments = await getStaffPayments(staffId)
          return NextResponse.json({
            success: true,
            data: payments,
          })
        } catch (error) {
          console.error(`Error fetching payments for staff ID ${staffId}:`, error)
          return NextResponse.json(
            { success: false, error: "Failed to fetch staff payments" },
            { status: 500 }
          )
        }

      case "get-payment-by-id":
        if (!paymentId) {
          return NextResponse.json(
            { success: false, error: "Payment ID is required" },
            { status: 400 }
          )
        }
        try {
          const payment = await getStaffPaymentById(paymentId)
          if (!payment) {
            return NextResponse.json(
              { success: false, error: "Payment not found" },
              { status: 404 }
            )
          }
          return NextResponse.json({
            success: true,
            data: payment,
          })
        } catch (error) {
          console.error(`Error fetching payment with ID ${paymentId}:`, error)
          return NextResponse.json(
            { success: false, error: "Failed to fetch payment" },
            { status: 500 }
          )
        }

      case "get-total-paid":
        if (!staffId) {
          return NextResponse.json(
            { success: false, error: "Staff ID is required" },
            { status: 400 }
          )
        }
        try {
          const totalPaid = await getStaffTotalPaid(staffId)
          return NextResponse.json({
            success: true,
            data: typeof totalPaid === "number" ? totalPaid : 0,
          })
        } catch (error) {
          console.error(`Error calculating total paid for staff ID ${staffId}:`, error)
          return NextResponse.json(
            { success: false, error: "Failed to calculate total paid", data: 0 },
            { status: 500 }
          )
        }

      case "get-stats":
        if (!staffId) {
          return NextResponse.json(
            { success: false, error: "Staff ID is required" },
            { status: 400 }
          )
        }
        try {
          const stats = await getStaffPaymentStats(staffId)
          return NextResponse.json({
            success: true,
            data: stats,
          })
        } catch (error) {
          console.error(`Error fetching payment stats for staff ID ${staffId}:`, error)
          return NextResponse.json(
            { success: false, error: "Failed to fetch payment statistics" },
            { status: 500 }
          )
        }

      case "record-payment":
        if (!staffId) {
          return NextResponse.json(
            { success: false, error: "Staff ID is required" },
            { status: 400 }
          )
        }
        try {
          const { amount, datePaid, notes } = body

          // Validate required fields
          if (!amount) {
            return NextResponse.json(
              { success: false, error: "Amount is required" },
              { status: 400 }
            )
          }

          const parsedAmount = Number.parseFloat(amount)
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json(
              { success: false, error: "Invalid amount" },
              { status: 400 }
            )
          }

          const paymentData = {
            staff_id: staffId,
            amount: parsedAmount,
            date_paid: datePaid || new Date().toISOString().split("T")[0],
            notes: notes || "",
          }

          const newPayment = await createStaffPayment(paymentData)

          // Get staff name for the ledger entry
          const staffResult = await sql`
            SELECT name FROM staff WHERE id = ${staffId}
          `

          const staffName = staffResult.length > 0 ? staffResult[0].name : "Unknown Staff"

          // Add to ledger
          await addStaffPaymentToLedger(newPayment, staffName)

          return NextResponse.json({
            success: true,
            data: newPayment,
          })
        } catch (error) {
          console.error("Error creating staff payment:", error)
          return NextResponse.json(
            { success: false, error: "Failed to record staff payment" },
            { status: 500 }
          )
        }

      case "update-payment":
        if (!paymentId) {
          return NextResponse.json(
            { success: false, error: "Payment ID is required" },
            { status: 400 }
          )
        }
        try {
          const { amount, datePaid, notes } = body

          // Validate required fields
          if (!amount) {
            return NextResponse.json(
              { success: false, error: "Amount is required" },
              { status: 400 }
            )
          }

          const parsedAmount = Number.parseFloat(amount)
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json(
              { success: false, error: "Invalid amount" },
              { status: 400 }
            )
          }

          const paymentData = {
            amount: parsedAmount,
            date_paid: datePaid,
            notes: notes || "",
          }

          const updatedPayment = await updateStaffPayment(paymentId, paymentData)
          
          if (!updatedPayment) {
            return NextResponse.json(
              { success: false, error: "Payment not found" },
              { status: 404 }
            )
          }

          return NextResponse.json({
            success: true,
            data: updatedPayment,
          })
        } catch (error) {
          console.error("Error updating staff payment:", error)
          return NextResponse.json(
            { success: false, error: "Failed to update staff payment" },
            { status: 500 }
          )
        }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error in staff payments API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}, ["admin"])

// Helper function to add staff payment to ledger
async function addStaffPaymentToLedger(payment: any, staffName: string) {
  try {
    // Add the payment to the ledger as expense
    await sql`
      INSERT INTO ledger (
        entry_date, 
        entry_type, 
        amount, 
        description, 
        reference_id, 
        reference_type, 
        staff_id
      )
      VALUES (
        ${payment.date_paid}, 
        'expense', 
        ${payment.amount}, 
        ${"Payment to " + staffName}, 
        ${"STAFF-PAY-" + payment.id}, 
        'staff_payment', 
        ${payment.staff_id}
      )
    `

    return true
  } catch (error) {
    console.error("Error adding staff payment to ledger:", error)
    return false
  }
} 