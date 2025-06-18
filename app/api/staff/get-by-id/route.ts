import { NextRequest, NextResponse } from "next/server"
import { getStaffById } from "@/lib/db-service-staff"
import { withAuth } from "@/lib/auth-middleware"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Admin and staff can view staff members, staff can view their own data
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Staff ID is required" },
        { status: 400 }
      )
    }

    // If user is staff, they can only view their own data
    if (user.role === 'staff' && user.staff_id !== parseInt(id)) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    const staff = await getStaffById(id)
    
    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Staff member not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: staff,
    })
  } catch (error) {
    console.error("Error fetching staff member:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch staff member" },
      { status: 500 }
    )
  }
}, ['admin', 'staff']) 