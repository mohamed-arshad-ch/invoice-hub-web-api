import { NextRequest, NextResponse } from "next/server"
import { 
  getTotalRevenue, 
  getActiveClientCount, 
  getPendingInvoiceCount, 
  getTotalStaffCount 
} from "@/lib/db-service"
import { withAuth } from "@/lib/auth-middleware"

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Only allow admin and staff to access dashboard stats
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    // Get all dashboard statistics
    const [totalRevenue, activeClientCount, pendingInvoiceCount, totalStaffCount] = await Promise.all([
      getTotalRevenue(),
      getActiveClientCount(),
      getPendingInvoiceCount(),
      getTotalStaffCount(),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        activeClientCount,
        pendingInvoiceCount,
        totalStaffCount,
      },
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    )
  }
}, ['admin', 'staff']) // Only allow admin and staff roles 