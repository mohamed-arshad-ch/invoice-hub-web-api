import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { withAuth } from "@/lib/auth-middleware"

// Initialize Neon client
const sql = neon(
  "postgres://neondb_owner:npg_epBG9mqRuiV7@ep-jolly-brook-ab5fd13n-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"
)

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can view client payments
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { clientId } = body

    // Validation
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Client ID is required" },
        { status: 400 }
      )
    }

    // Verify client exists and belongs to the user
    const clientCheck = await sql`
      SELECT id, business_name FROM clients 
      WHERE id = ${clientId} AND created_by = ${user.userId}
    `

    if (!clientCheck || clientCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }

    const client = clientCheck[0]

    // Get all payments for this client with transaction details
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
        tp.updated_at,
        t.transaction_id as "transactionId",
        t.total_amount as "transactionAmount",
        t.status as "transactionStatus",
        COALESCE(
          (SELECT description FROM transaction_items 
           WHERE transaction_id = t.id 
           ORDER BY id LIMIT 1), 
          'Payment'
        ) as "transactionDescription"
      FROM transaction_payments tp
      JOIN transactions t ON tp.transaction_id = t.id
      WHERE t.client_id = ${clientId} AND t.created_by = ${user.userId}
      ORDER BY tp.payment_date DESC, tp.created_at DESC
    `

    // Calculate payment summary
    const totalPayments = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0)
    const paymentCount = payments.length

    // Get payment method breakdown
    const paymentMethodBreakdown = payments.reduce((acc: any[], payment: any) => {
      const method = payment.payment_method || 'Unknown'
      const existing = acc.find(item => item.method === method)
      
      if (existing) {
        existing.count += 1
        existing.total += Number(payment.amount)
      } else {
        acc.push({
          method,
          count: 1,
          total: Number(payment.amount)
        })
      }
      
      return acc
    }, [])

    // Get date range
    const dates = payments.map(p => p.payment_date).filter(Boolean)
    const dateRange = dates.length > 0 ? {
      earliest: dates[dates.length - 1], // Last in DESC order
      latest: dates[0] // First in DESC order
    } : null

    // Format payments response
    const formattedPayments = payments.map((payment: any) => ({
      id: payment.id,
      transaction_id: payment.transaction_id,
      amount: Number(payment.amount),
      payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split("T")[0] : null,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      notes: payment.notes,
      created_by: payment.created_by,
      created_at: payment.created_at ? new Date(payment.created_at).toISOString() : null,
      updated_at: payment.updated_at ? new Date(payment.updated_at).toISOString() : null,
      transactionId: payment.transactionId,
      transactionDescription: payment.transactionDescription,
      transactionAmount: Number(payment.transactionAmount),
      transactionStatus: payment.transactionStatus
    }))

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        business_name: client.business_name
      },
      payments: formattedPayments,
      summary: {
        totalPayments: totalPayments,
        paymentCount: paymentCount,
        averagePayment: paymentCount > 0 ? totalPayments / paymentCount : 0,
        paymentMethods: paymentMethodBreakdown,
        dateRange: dateRange
      }
    })

  } catch (error) {
    console.error("Error fetching client payments:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch client payments" },
      { status: 500 }
    )
  }
}, ['admin', 'staff']) 