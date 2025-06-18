import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { hashPassword } from "@/lib/password"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { staffId } = body

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: "Staff ID is required" },
        { status: 400 }
      )
    }

    // Get staff details
    const staffResult = await sql`
      SELECT * FROM staff 
      WHERE id = ${staffId}
    `

    if (staffResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Staff member not found" },
        { status: 404 }
      )
    }

    const staff = staffResult[0]

    // Check if user already exists with this email
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${staff.email}
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

    // Create a new user with staff role
    const result = await sql`
      INSERT INTO users (
        first_name, 
        last_name, 
        email, 
        password_hash, 
        company_name, 
        staff_id,
        role
      )
      VALUES (
        ${staff.name.split(" ")[0] || "Staff"}, 
        ${staff.name.split(" ").slice(1).join(" ") || "Member"}, 
        ${staff.email}, 
        ${passwordHash}, 
        'InvoiceHub', 
        ${staffId},
        'staff'
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
    console.error("Error creating staff portal access:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create portal access" },
      { status: 500 }
    )
  }
} 