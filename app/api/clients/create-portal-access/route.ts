import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"
import { hashPassword } from "@/lib/password"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin can create portal access
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Only administrators can create portal access" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Client ID is required" },
        { status: 400 }
      )
    }

    // Get client details
    const clients = await sql`
      SELECT * FROM clients 
      WHERE id = ${clientId} AND created_by = ${user.userId}
    `

    if (clients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found or you don't have permission" },
        { status: 404 }
      )
    }

    const client = clients[0]

    // Check if user already exists with this email
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${client.email}
    `

    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 409 }
      )
    }

    // Use default password
    const password = "Mcodev@123"

    // Hash the password
    const passwordHash = await hashPassword(password)

    // Create a new user with client role
    const result = await sql`
      INSERT INTO users (
        first_name, 
        last_name, 
        email, 
        password_hash, 
        company_name, 
        client_id,
        role
      )
      VALUES (
        ${client.contact_person.split(" ")[0] || "Client"}, 
        ${client.contact_person.split(" ").slice(1).join(" ") || client.business_name}, 
        ${client.email}, 
        ${passwordHash}, 
        ${client.business_name}, 
        ${clientId},
        'client'
      )
      RETURNING id
    `

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to create user account" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Portal access activated successfully. The default password is 'Mcodev@123'. Please advise the user to change it upon first login.",
      password: password,
    })
  } catch (error) {
    console.error("Error creating client portal access:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create portal access" },
      { status: 500 }
    )
  }
}, ['admin']) 