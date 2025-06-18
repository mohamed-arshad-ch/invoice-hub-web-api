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

    const clients = await sql`
      SELECT 
        c.*,
        COALESCE(SUM(t.total_amount), 0) as total_spent
      FROM 
        clients c
      LEFT JOIN 
        transactions t ON c.id = t.client_id AND t.status = 'paid'
      WHERE 
        c.created_by = ${user.userId}
      GROUP BY 
        c.id
      ORDER BY 
        c.business_name ASC
    `

    return NextResponse.json({
      success: true,
      clients: clients.map((client: any) => ({
        ...client,
        total_spent: Number(client.total_spent || 0),
        status: client.status === true,
      })),
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