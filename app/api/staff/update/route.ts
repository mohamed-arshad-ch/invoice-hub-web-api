import { NextRequest, NextResponse } from "next/server"
import { updateStaff } from "@/lib/db-service-staff"
import { withAuth } from "@/lib/auth-middleware"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin can update staff
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Only administrators can update staff members" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, name, email, position, role, status, paymentRate, joinDate } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Staff ID is required" },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!name || !email || !position || !paymentRate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const parsedPaymentRate = Number.parseFloat(paymentRate)
    if (isNaN(parsedPaymentRate) || parsedPaymentRate <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payment rate" },
        { status: 400 }
      )
    }

    const staffData = {
      name,
      email,
      position,
      join_date: joinDate,
      status: status as "active" | "inactive",
      role: role as "admin" | "support" | "finance",
      payment_rate: parsedPaymentRate,
    }

    const updatedStaff = await updateStaff(id, staffData)
    
    if (!updatedStaff) {
      return NextResponse.json(
        { success: false, error: "Staff member not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedStaff,
    })
  } catch (error) {
    console.error("Error updating staff member:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update staff member" },
      { status: 500 }
    )
  }
}, ['admin']) 