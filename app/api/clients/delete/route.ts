import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin can delete clients
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Only administrators can delete clients" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Client ID is required" },
        { status: 400 }
      )
    }

    // First check if the client exists and belongs to the user
    const clientCheck = await sql`
      SELECT id FROM clients 
      WHERE id = ${id} AND created_by = ${user.userId}
    `

    if (clientCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found or you don't have permission to delete it" },
        { status: 404 }
      )
    }

    await sql`
      DELETE FROM clients
      WHERE id = ${id} AND created_by = ${user.userId}
    `

    return NextResponse.json({
      success: true,
      message: "Client deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete client" },
      { status: 500 }
    )
  }
}, ['admin']) 