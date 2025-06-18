import { NextRequest, NextResponse } from "next/server"
import { refreshToken, extractTokenFromHeader } from "@/lib/jwt"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No token provided" },
        { status: 400 }
      )
    }

    const newToken = refreshToken(token)

    if (!newToken) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      token: newToken,
      message: "Token refreshed successfully"
    })
  } catch (error) {
    console.error("Error refreshing token:", error)
    return NextResponse.json(
      { success: false, error: "Failed to refresh token" },
      { status: 500 }
    )
  }
} 