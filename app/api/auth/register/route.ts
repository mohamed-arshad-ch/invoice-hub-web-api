import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { hashPassword } from "@/lib/password"
import { cookies } from "next/headers"

// Helper to set authentication cookie
function setAuthCookie(userId: number, role: string) {
  const cookieStore = cookies()
  const session = {
    userId,
    role,
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  }

  cookieStore.set("auth_session", JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, password, companyName, role } = body

    // Server-side validation
    if (!firstName || !lastName || !email || !password || !companyName || !role) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      )
    }

    if (!["admin", "staff", "client"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role selected" },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      )
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must have at least 8 characters, 1 uppercase, 1 number, and 1 special character",
        },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `

    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, error: "User with this email already exists" },
        { status: 409 }
      )
    }

    // Hash the password
    const passwordHash = await hashPassword(password)

    // Insert the new user
    const result = await sql`
      INSERT INTO users (first_name, last_name, email, password_hash, company_name, role)
      VALUES (${firstName}, ${lastName}, ${email}, ${passwordHash}, ${companyName}, ${role})
      RETURNING id, email, role
    `

    const user = result[0]

    // Set authentication cookie
    setAuthCookie(user.id, user.role)

    return NextResponse.json({
      success: true,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName,
        lastName,
        companyName,
      },
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    )
  }
} 