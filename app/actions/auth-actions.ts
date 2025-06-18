"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createUser, authenticateUser } from "@/lib/auth"
import { sql } from "@vercel/postgres"
import { verifyPassword, hashPassword } from "@/lib/password"

// Helper to set authentication cookie
function setAuthCookie(userId: number, role: string) {
  // In a production app, you would use a proper session management system
  // This is a simplified example using cookies
  const cookieStore = cookies()

  // Create a session object (in a real app, this would be more secure)
  const session = {
    userId,
    role,
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  }

  // Set the cookie
  cookieStore.set("auth_session", JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  })
}

export async function registerUser(formData: FormData) {
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const companyName = formData.get("companyName") as string
  const role = formData.get("role") as string

  // Server-side validation
  if (!firstName || !lastName || !email || !password || !companyName || !role) {
    return { success: false, error: "All fields are required" }
  }

  if (!["admin", "staff", "client"].includes(role)) {
    return { success: false, error: "Invalid role selected" }
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address" }
  }

  // Password validation
  const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/
  if (!passwordRegex.test(password)) {
    return {
      success: false,
      error: "Password must have at least 8 characters, 1 uppercase, 1 number, and 1 special character",
    }
  }

  // Create the user
  const result = await createUser({
    firstName,
    lastName,
    email,
    password,
    companyName,
    role,
  })

  if (result.success && result.user) {
    // Set authentication cookie
    setAuthCookie(result.user.id, result.user.role)

    // Return success with user data for client-side storage
    return {
      success: true,
      role: result.user.role,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        firstName,
        lastName,
        companyName,
      },
    }
  }

  return result
}

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  // Server-side validation
  if (!email || !password) {
    return { success: false, error: "Email and password are required" }
  }

  // Authenticate the user
  const result = await authenticateUser(email, password)

  if (result.success && result.user) {
    // Set authentication cookie
    setAuthCookie(result.user.id, result.user.role)

    // Return success with user data for client-side storage
    return {
      success: true,
      role: result.user.role,
      user: result.user,
    }
  }

  return result
}

export async function logoutUser() {
  const cookieStore = cookies()
  cookieStore.delete("auth_session")
  redirect("/")
}

export async function getAuthSession() {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get("auth_session")

  if (!sessionCookie) {
    return null
  }

  try {
    const session = JSON.parse(sessionCookie.value)

    // Check if session is expired
    if (session.expires < Date.now()) {
      cookieStore.delete("auth_session")
      return null
    }

    return session
  } catch (error) {
    return null
  }
}

export async function requireAuth(role?: string) {
  const session = await getAuthSession()

  if (!session) {
    redirect("/")
  }

  if (role && session.role !== role) {
    // Redirect to appropriate dashboard based on role
    switch (session.role) {
      case "admin":
        redirect("/admin/dashboard")
      case "staff":
        redirect("/staff/dashboard")
      case "client":
        redirect("/client/dashboard")
      default:
        redirect("/")
    }
  }

  return session
}

// Change password
export async function changePassword(data: { email: string; currentPassword: string; newPassword: string }) {
  try {
    // Find user by email
    const users = await sql`
      SELECT id, email, password_hash
      FROM users 
      WHERE email = ${data.email}
    `

    if (users.length === 0) {
      return { success: false, error: "User not found" }
    }

    const user = users[0]

    // Verify current password
    const passwordValid = await verifyPassword(data.currentPassword, user.password_hash)

    if (!passwordValid) {
      return { success: false, error: "Current password is incorrect" }
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(data.newPassword)

    // Update the password
    await sql`
      UPDATE users
      SET password_hash = ${newPasswordHash}
      WHERE id = ${user.id}
    `

    return { success: true, message: "Password updated successfully" }
  } catch (error) {
    console.error("Error changing password:", error)
    return { success: false, error: "Failed to change password" }
  }
}
