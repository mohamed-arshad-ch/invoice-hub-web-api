import { NextRequest, NextResponse } from "next/server"
import { filterStaff } from "@/lib/db-service-staff"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roleFilter, statusFilter } = body

    const staff = await filterStaff(roleFilter || "", statusFilter || "")
    
    return NextResponse.json({
      success: true,
      data: staff,
    })
  } catch (error) {
    console.error("Error filtering staff:", error)
    return NextResponse.json(
      { success: false, error: "Failed to filter staff" },
      { status: 500 }
    )
  }
} 