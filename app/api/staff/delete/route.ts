import { NextRequest, NextResponse } from "next/server"
import { deleteStaff } from "@/lib/db-service-staff"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin can delete staff
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Only administrators can delete staff members" },
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

    // Begin transaction
    await sql`BEGIN`

    try {
      // Delete associated ledger entries
      await sql`
        DELETE FROM ledger 
        WHERE staff_id = ${id} 
        AND reference_type = 'staff_payment'
      `

      // Delete the staff member
      const result = await deleteStaff(id)

      if (!result) {
        await sql`ROLLBACK`
        return NextResponse.json(
          { success: false, error: "Staff member not found" },
          { status: 404 }
        )
      }

      // Commit transaction
      await sql`COMMIT`

      return NextResponse.json({
        success: true,
        message: "Staff member deleted successfully",
      })
    } catch (error) {
      await sql`ROLLBACK`
      throw error
    }
  } catch (error) {
    console.error("Error deleting staff member:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete staff member" },
      { status: 500 }
    )
  }
}, ['admin']) 