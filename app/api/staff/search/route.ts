import { NextRequest, NextResponse } from "next/server"
import { searchStaff } from "@/lib/db-service-staff"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query } = body

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Search query is required" },
        { status: 400 }
      )
    }

    const staff = await searchStaff(query)
    
    return NextResponse.json({
      success: true,
      data: staff,
    })
  } catch (error) {
    console.error("Error searching staff:", error)
    return NextResponse.json(
      { success: false, error: "Failed to search staff" },
      { status: 500 }
    )
  }
} 