import { NextRequest, NextResponse } from "next/server"
import { getAllStaff, createStaff } from "@/lib/db-service-staff"
import { withAuth } from "@/lib/auth-middleware"

// GET all staff
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can view staff
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const staff = await getAllStaff()
    return NextResponse.json({
      success: true,
      data: staff,
    })
  } catch (error) {
    console.error("Error fetching staff:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch staff" },
      { status: 500 }
    )
  }
}, ['admin', 'staff'])

// POST create new staff
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin can create staff
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Only administrators can create staff members" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, position, role, status, paymentRate, joinDate } = body

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

    // Generate avatar URL
    const avatar = `/placeholder.svg?height=200&width=200&query=${encodeURIComponent(name)}`

    const staffData = {
      name,
      email,
      position,
      join_date: joinDate || new Date().toISOString().split("T")[0],
      status: status as "active" | "inactive" || "active",
      avatar,
      role: role as "admin" | "support" | "finance" || "support",
      payment_rate: parsedPaymentRate,
    }

    const newStaff = await createStaff(staffData)
    
    return NextResponse.json({
      success: true,
      data: newStaff,
    })
  } catch (error) {
    console.error("Error creating staff:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create staff member" },
      { status: 500 }
    )
  }
}, ['admin']) 