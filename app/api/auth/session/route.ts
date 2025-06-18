import { NextRequest, NextResponse } from "next/server"
import { authenticateToken } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateToken(request)

    if (!auth.success || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "No active session" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: auth.user,
    })
  } catch (error) {
    console.error("Error getting session:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get session" },
      { status: 500 }
    )
  }
} 