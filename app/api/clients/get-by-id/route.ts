import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can view client details
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
        { success: false, error: "Client ID is required" },
        { status: 400 }
      )
    }

    // Admin and staff can view clients they created
    const clients = await sql`
      SELECT * FROM clients 
      WHERE id = ${id} AND created_by = ${user.userId}
    `

    if (clients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      client: clients[0],
    })
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch client" },
      { status: 500 }
    )
  }
}, ['admin', 'staff']) 