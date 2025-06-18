import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyPassword } from "@/lib/password"
import { generateToken } from "@/lib/jwt"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Server-side validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Find user by email
    const users = await sql`
      SELECT id, email, password_hash, role, first_name, last_name, client_id, staff_id
      FROM users 
      WHERE email = ${email}
    `

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const user = users[0]

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash)

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      client_id: user.client_id,
      staff_id: user.staff_id,
    })

    // Return user data and token
    return NextResponse.json({
      success: true,
      token,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        client_id: user.client_id,
        staff_id: user.staff_id,
      },
    })
  } catch (error) {
    console.error("Error authenticating user:", error)
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    )
  }
} 