import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Since JWT is stateless, we can't invalidate tokens server-side
    // The client should remove the token from localStorage/sessionStorage
    // In a production environment, you might want to maintain a blacklist of tokens
    
    return NextResponse.json({
      success: true,
      message: "Logged out successfully. Please remove token from client storage.",
    })
  } catch (error) {
    console.error("Error during logout:", error)
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    )
  }
} 