import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyPassword, hashPassword } from "@/lib/password"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, currentPassword, newPassword } = body

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      )
    }

    // Find user by email
    const users = await sql`
      SELECT id, email, password_hash
      FROM users 
      WHERE email = ${email}
    `

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    const user = users[0]

    // Verify current password
    const passwordValid = await verifyPassword(currentPassword, user.password_hash)

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 401 }
      )
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update the password
    await sql`
      UPDATE users
      SET password_hash = ${newPasswordHash}
      WHERE id = ${user.id}
    `

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    })
  } catch (error) {
    console.error("Error changing password:", error)
    return NextResponse.json(
      { success: false, error: "Failed to change password" },
      { status: 500 }
    )
  }
} 