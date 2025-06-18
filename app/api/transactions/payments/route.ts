import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

// Transaction Payment type
type TransactionPayment = {
  id: number
  transaction_id: number
  amount: number
  payment_date: string
  payment_method?: string
  reference_number?: string
  notes?: string
  created_by: number
  created_at: string
  updated_at: string
}

// GET/POST - Handle transaction payments
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can manage transaction payments
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, transactionId, paymentId } = body

    switch (action) {
      case "get-payments":
        return await getTransactionPayments(transactionId, user.userId)

      case "record-payment":
        return await recordTransactionPayment(body, user.userId)

      case "update-payment":
        return await updateTransactionPayment(paymentId, body, user.userId)

      case "delete-payment":
        return await deleteTransactionPayment(paymentId, user.userId)

      case "get-payment-summary":
        return await getPaymentSummary(transactionId, user.userId)

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error in transaction payments API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}, ['admin', 'staff'])

// Get all payments for a transaction
async function getTransactionPayments(transactionId: string, userId: number) {
  try {
    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      )
    }

    // First, get the numeric ID from the transaction_id string
    const transactionCheck = await sql`
      SELECT id, transaction_id, status, total_amount 
      FROM transactions 
      WHERE transaction_id = ${transactionId} AND created_by = ${userId}
    `

    if (!transactionCheck || transactionCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      )
    }

    const transaction = transactionCheck[0]
    const numericTransactionId = transaction.id

    // Get all payments for this transaction
    const payments = await sql`
      SELECT 
        tp.id,
        tp.transaction_id,
        tp.amount,
        tp.payment_date,
        tp.payment_method,
        tp.reference_number,
        tp.notes,
        tp.created_by,
        tp.created_at,
        tp.updated_at
      FROM transaction_payments tp
      WHERE tp.transaction_id = ${numericTransactionId}
      ORDER BY tp.payment_date DESC, tp.created_at DESC
    `

    // Calculate payment summary
    const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)
    const transactionAmount = Number(transactionCheck[0].total_amount)
    const remainingAmount = transactionAmount - totalPaid

    return NextResponse.json({
      success: true,
      data: {
        success: true,
        payments: payments.map((payment: any) => ({
          ...payment,
          amount: Number(payment.amount),
          payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split("T")[0] : null,
          created_at: payment.created_at ? new Date(payment.created_at).toISOString() : null,
          updated_at: payment.updated_at ? new Date(payment.updated_at).toISOString() : null,
        })),
        totalPaid: totalPaid,
        remainingAmount: remainingAmount,
        transactionTotal: transactionAmount
      }
    })
  } catch (error) {
    console.error("Error fetching transaction payments:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch transaction payments" },
      { status: 500 }
    )
  }
}

// Record a new payment for a transaction
async function recordTransactionPayment(body: any, userId: number) {
  try {
    const { transactionId, amount, paymentDate, paymentMethod, referenceNumber, notes } = body

    // Validation
    if (!transactionId || !amount) {
      return NextResponse.json(
        { success: false, error: "Transaction ID and amount are required" },
        { status: 400 }
      )
    }

    const parsedAmount = Number.parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payment amount" },
        { status: 400 }
      )
    }

    // Begin transaction
    await sql`BEGIN`

    try {
      // Verify transaction ownership and get details using transaction_id string
      const transactionCheck = await sql`
        SELECT 
          t.id, 
          t.transaction_id as "transactionId", 
          t.status, 
          t.total_amount,
          t.client_id,
          c.business_name as "clientName"
        FROM transactions t
        JOIN clients c ON t.client_id = c.id
        WHERE t.transaction_id = ${transactionId} AND t.created_by = ${userId}
      `

      if (!transactionCheck || transactionCheck.length === 0) {
        await sql`ROLLBACK`
        return NextResponse.json(
          { success: false, error: "Transaction not found" },
          { status: 404 }
        )
      }

      const transaction = transactionCheck[0]
      const numericTransactionId = transaction.id

      // Check if payment amount doesn't exceed remaining balance
      const existingPayments = await sql`
        SELECT COALESCE(SUM(amount), 0) as total_paid 
        FROM transaction_payments 
        WHERE transaction_id = ${numericTransactionId}
      `

      const totalPaid = Number(existingPayments[0].total_paid)
      const transactionAmount = Number(transaction.total_amount)
      const remainingAmount = transactionAmount - totalPaid

      if (parsedAmount > remainingAmount) {
        await sql`ROLLBACK`
        return NextResponse.json(
          { success: false, error: `Payment amount exceeds remaining balance of ₹${remainingAmount.toFixed(2)}` },
          { status: 400 }
        )
      }

      // Insert payment record
      const paymentResult = await sql`
        INSERT INTO transaction_payments (
          transaction_id,
          amount,
          payment_date,
          payment_method,
          reference_number,
          notes,
          created_by
        ) VALUES (
          ${numericTransactionId},
          ${parsedAmount},
          ${paymentDate || new Date().toISOString().split("T")[0]},
          ${paymentMethod || null},
          ${referenceNumber || null},
          ${notes || null},
          ${userId}
        )
        RETURNING id, amount, payment_date
      `

      const newPayment = paymentResult[0]

      // Add payment to ledger
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
          ${newPayment.payment_date}, 
          'income', 
          ${newPayment.amount}, 
          ${"Payment for Invoice " + transaction.transactionId + " - " + transaction.clientName}, 
          ${"TXN-PAY-" + newPayment.id}, 
          'transaction_payment', 
          ${transaction.client_id},
          ${userId}
        )
      `

      // Check if transaction should be marked as paid or partial
      const newTotalPaid = totalPaid + parsedAmount
      let newStatus = transaction.status

      if (newTotalPaid >= transactionAmount) {
        newStatus = "paid"
      } else if (newTotalPaid > 0 && transaction.status === "pending") {
        newStatus = "partial"
      }

            // Update transaction status if needed
      if (newStatus !== transaction.status) {
        await sql`
          UPDATE transactions 
          SET status = ${newStatus}, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ${numericTransactionId}
        `
      }

      await sql`COMMIT`

      return NextResponse.json({
        success: true,
        data: {
          success: true,
          payment: {
            ...newPayment,
            amount: Number(newPayment.amount),
            payment_date: new Date(newPayment.payment_date).toISOString().split("T")[0]
          },
          transaction_status: newStatus,
          total_paid: newTotalPaid,
          remaining_amount: transactionAmount - newTotalPaid,
          message: "Payment recorded successfully"
        }
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error recording transaction payment:", error)
    return NextResponse.json(
      { success: false, error: "Failed to record payment" },
      { status: 500 }
    )
  }
}

// Update an existing payment
async function updateTransactionPayment(paymentId: number, body: any, userId: number) {
  try {
    const { amount, paymentDate, paymentMethod, referenceNumber, notes } = body

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "Payment ID is required" },
        { status: 400 }
      )
    }

    const parsedAmount = Number.parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payment amount" },
        { status: 400 }
      )
    }

    await sql`BEGIN`

    try {
      // Get payment and verify ownership
      const paymentCheck = await sql`
        SELECT 
          tp.id,
          tp.transaction_id,
          tp.amount as old_amount,
          t.created_by,
          t.total_amount as transaction_amount
        FROM transaction_payments tp
        JOIN transactions t ON tp.transaction_id = t.id
        WHERE tp.id = ${paymentId} AND t.created_by = ${userId}
      `

      if (!paymentCheck || paymentCheck.length === 0) {
        await sql`ROLLBACK`
        return NextResponse.json(
          { success: false, error: "Payment not found" },
          { status: 404 }
        )
      }

      const payment = paymentCheck[0]
      const oldAmount = Number(payment.old_amount)
      const transactionAmount = Number(payment.transaction_amount)

      // Check if new amount doesn't exceed transaction total
      const otherPayments = await sql`
        SELECT COALESCE(SUM(amount), 0) as total_other_payments 
        FROM transaction_payments 
        WHERE transaction_id = ${payment.transaction_id} AND id != ${paymentId}
      `

      const totalOtherPayments = Number(otherPayments[0].total_other_payments)
      if (parsedAmount + totalOtherPayments > transactionAmount) {
        await sql`ROLLBACK`
        return NextResponse.json(
          { success: false, error: `Payment amount exceeds transaction total` },
          { status: 400 }
        )
      }

      // Update payment
      await sql`
        UPDATE transaction_payments SET
          amount = ${parsedAmount},
          payment_date = ${paymentDate || new Date().toISOString().split("T")[0]},
          payment_method = ${paymentMethod || null},
          reference_number = ${referenceNumber || null},
          notes = ${notes || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${paymentId}
      `

      // Update corresponding ledger entry
      await sql`
        UPDATE ledger SET
          amount = ${parsedAmount},
          entry_date = ${paymentDate || new Date().toISOString().split("T")[0]}
        WHERE reference_id = ${"TXN-PAY-" + paymentId} AND reference_type = 'transaction_payment'
      `

      await sql`COMMIT`

      return NextResponse.json({
        success: true,
        message: "Payment updated successfully"
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error updating transaction payment:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update payment" },
      { status: 500 }
    )
  }
}

// Delete a payment
async function deleteTransactionPayment(paymentId: number, userId: number) {
  try {
    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "Payment ID is required" },
        { status: 400 }
      )
    }

    await sql`BEGIN`

    try {
      // Verify payment ownership
      const paymentCheck = await sql`
        SELECT tp.id, tp.transaction_id, t.created_by
        FROM transaction_payments tp
        JOIN transactions t ON tp.transaction_id = t.id
        WHERE tp.id = ${paymentId} AND t.created_by = ${userId}
      `

      if (!paymentCheck || paymentCheck.length === 0) {
        await sql`ROLLBACK`
        return NextResponse.json(
          { success: false, error: "Payment not found" },
          { status: 404 }
        )
      }

      // Delete associated ledger entry
      await sql`
        DELETE FROM ledger 
        WHERE reference_id = ${"TXN-PAY-" + paymentId} 
        AND reference_type = 'transaction_payment'
      `

      // Delete payment
      await sql`DELETE FROM transaction_payments WHERE id = ${paymentId}`

      await sql`COMMIT`

      return NextResponse.json({
        success: true,
        message: "Payment deleted successfully"
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error deleting transaction payment:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete payment" },
      { status: 500 }
    )
  }
}

// Get payment summary for a transaction
async function getPaymentSummary(transactionId: string, userId: number) {
  try {
    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      )
    }

    // Get transaction details and payments using transaction_id string
    const result = await sql`
      SELECT 
        t.id,
        t.transaction_id as "transactionId",
        t.total_amount as "transactionAmount",
        t.status,
        COALESCE(SUM(tp.amount), 0) as "totalPaid",
        COUNT(tp.id) as "paymentCount"
      FROM transactions t
      LEFT JOIN transaction_payments tp ON t.id = tp.transaction_id
      WHERE t.transaction_id = ${transactionId} AND t.created_by = ${userId}
      GROUP BY t.id, t.transaction_id, t.total_amount, t.status
    `

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      )
    }

    const transaction = result[0]
    const transactionAmount = Number(transaction.transactionAmount)
    const totalPaid = Number(transaction.totalPaid)

    return NextResponse.json({
      success: true,
      data: {
        transaction_id: transaction.transactionId,
        transaction_amount: transactionAmount,
        total_paid: totalPaid,
        remaining_amount: transactionAmount - totalPaid,
        payment_count: Number(transaction.paymentCount),
        status: transaction.status,
        payment_percentage: transactionAmount > 0 ? Math.round((totalPaid / transactionAmount) * 100) : 0
      }
    })
  } catch (error) {
    console.error("Error fetching payment summary:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment summary" },
      { status: 500 }
    )
  }
} 