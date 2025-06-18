import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

// Generate a unique client ID
function generateClientId() {
  const prefix = "CLT"
  const randomNum = Math.floor(1000 + Math.random() * 9000) // 4-digit number
  return `${prefix}-${randomNum}`
}

// GET all clients
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can view all clients
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    // First, get all clients
    const clients = await sql`
      SELECT * FROM clients 
      WHERE created_by = ${user.userId}
      ORDER BY business_name ASC
    `

    // Get transaction payments sum for each client
    const paymentSums = await sql`
      SELECT 
        t.client_id,
        COALESCE(SUM(tp.amount), 0) as payment_total
      FROM transaction_payments tp
      JOIN transactions t ON tp.transaction_id = t.id
      WHERE t.created_by = ${user.userId}
      GROUP BY t.client_id
    `

    // Get paid transactions sum for each client
    const paidTransactionSums = await sql`
      SELECT 
        client_id,
        COALESCE(SUM(total_amount), 0) as paid_total
      FROM transactions
      WHERE created_by = ${user.userId} AND status = 'paid'
      GROUP BY client_id
    `

    // Combine the results
    const clientsWithTotalSpent = clients.map((client: any) => {
      // Find payment sum for this client
      const paymentSum = paymentSums.find((p: any) => p.client_id === client.id)?.payment_total || 0
      
      // Find paid transaction sum for this client
      const paidSum = paidTransactionSums.find((p: any) => p.client_id === client.id)?.paid_total || 0
      
      // Calculate total spent
      const totalSpent = Number(paymentSum) + Number(paidSum)

      return {
        ...client,
        total_spent: totalSpent,
        status: client.status === true,
      }
    })

    return NextResponse.json({
      success: true,
      clients: clientsWithTotalSpent,
    })
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch clients" },
      { status: 500 }
    )
  }
}, ['admin', 'staff'])

// POST create new client
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin can create clients
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Only administrators can create clients" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      businessName,
      contactPerson,
      email,
      phone,
      street,
      city,
      state,
      zip,
      paymentSchedule,
      paymentTerms,
      status,
      notes,
    } = body

    // Validation
    if (!businessName || !contactPerson || !email || !phone) {
      return NextResponse.json(
        { success: false, error: "Business name, contact person, email, and phone are required" },
        { status: 400 }
      )
    }

    const clientId = generateClientId()

    const result = await sql`
      INSERT INTO clients (
        client_id, 
        business_name, 
        contact_person, 
        email, 
        phone, 
        street, 
        city, 
        state, 
        zip, 
        payment_schedule, 
        payment_terms, 
        status, 
        notes, 
        created_by
      )
      VALUES (
        ${clientId}, 
        ${businessName}, 
        ${contactPerson}, 
        ${email}, 
        ${phone}, 
        ${street || null}, 
        ${city || null}, 
        ${state || null}, 
        ${zip || null}, 
        ${paymentSchedule}, 
        ${paymentTerms}, 
        ${status}, 
        ${notes || null}, 
        ${user.userId}
      )
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      message: "Client created successfully",
      clientId: result[0].id,
    })
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create client" },
      { status: 500 }
    )
  }
}, ['admin']) 