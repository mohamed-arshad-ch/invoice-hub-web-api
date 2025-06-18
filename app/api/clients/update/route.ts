import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin can update clients
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Only administrators can update clients" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      id,
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Client ID is required" },
        { status: 400 }
      )
    }

    // First check if the client exists and belongs to the user
    const clientCheck = await sql`
      SELECT id FROM clients 
      WHERE id = ${id} AND created_by = ${user.userId}
    `

    if (clientCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found or you don't have permission to edit it" },
        { status: 404 }
      )
    }

    await sql`
      UPDATE clients SET
        business_name = ${businessName},
        contact_person = ${contactPerson},
        email = ${email},
        phone = ${phone},
        street = ${street || null},
        city = ${city || null},
        state = ${state || null},
        zip = ${zip || null},
        payment_schedule = ${paymentSchedule},
        payment_terms = ${paymentTerms},
        status = ${status},
        notes = ${notes || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND created_by = ${user.userId}
    `

    return NextResponse.json({
      success: true,
      message: "Client updated successfully",
    })
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update client" },
      { status: 500 }
    )
  }
}, ['admin']) 