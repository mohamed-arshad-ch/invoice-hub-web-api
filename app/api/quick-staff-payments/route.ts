import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

// Quick Staff Payment Template type
type QuickStaffPaymentTemplate = {
  id: number
  name: string
  description?: string
  staff_id: number
  amount: number
  payment_method: string
  notes?: string
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string
  staff_name?: string
}

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can access quick staff payment templates
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    // Get all active quick staff payment templates for the user
    const templates = await sql`
      SELECT 
        qspt.*,
        s.name as staff_name
      FROM quick_staff_payment_templates qspt
      LEFT JOIN staff s ON qspt.staff_id = s.id
      WHERE qspt.created_by = ${user.userId} AND qspt.is_active = true
      ORDER BY qspt.name ASC
    `

    const formattedTemplates = templates.map((template: any) => ({
      ...template,
      amount: Number(template.amount),
      created_at: template.created_at ? new Date(template.created_at).toISOString() : null,
      updated_at: template.updated_at ? new Date(template.updated_at).toISOString() : null,
    }))

    return NextResponse.json({
      success: true,
      templates: formattedTemplates,
    })
  } catch (error) {
    console.error("Error fetching quick staff payment templates:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch quick staff payment templates" },
      { status: 500 }
    )
  }
}, ['admin', 'staff'])

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can manage quick staff payment templates
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case "create-template":
        return await createQuickStaffPaymentTemplate(body, user.userId)
      
      case "update-template":
        return await updateQuickStaffPaymentTemplate(body, user.userId)
      
      case "delete-template":
        return await deleteQuickStaffPaymentTemplate(body, user.userId)
      
      case "execute-template":
        return await executeQuickStaffPayment(body, user.userId)

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error in quick staff payment API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}, ['admin', 'staff'])

// Helper functions
async function createQuickStaffPaymentTemplate(body: any, userId: number) {
  const {
    name,
    description,
    staff_id,
    amount,
    payment_method = 'Bank Transfer',
    notes
  } = body

  // Validation
  if (!name || !staff_id || !amount) {
    return NextResponse.json(
      { success: false, error: "Name, staff ID, and amount are required" },
      { status: 400 }
    )
  }

  // Verify staff exists
  const staffCheck = await sql`
    SELECT id FROM staff WHERE id = ${staff_id}
  `

  if (staffCheck.length === 0) {
    return NextResponse.json(
      { success: false, error: "Staff member not found" },
      { status: 404 }
    )
  }

  try {
    const result = await sql`
      INSERT INTO quick_staff_payment_templates (
        name,
        description,
        staff_id,
        amount,
        payment_method,
        notes,
        created_by
      ) VALUES (
        ${name},
        ${description || null},
        ${staff_id},
        ${amount},
        ${payment_method},
        ${notes || null},
        ${userId}
      )
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      template_id: result[0].id,
      message: "Quick staff payment template created successfully",
    })
  } catch (error) {
    console.error("Error creating quick staff payment template:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create quick staff payment template" },
      { status: 500 }
    )
  }
}

async function updateQuickStaffPaymentTemplate(body: any, userId: number) {
  const {
    template_id,
    name,
    description,
    staff_id,
    amount,
    payment_method,
    notes,
    is_active
  } = body

  if (!template_id) {
    return NextResponse.json(
      { success: false, error: "Template ID is required" },
      { status: 400 }
    )
  }

  // Verify template belongs to user
  const templateCheck = await sql`
    SELECT id FROM quick_staff_payment_templates 
    WHERE id = ${template_id} AND created_by = ${userId}
  `

  if (templateCheck.length === 0) {
    return NextResponse.json(
      { success: false, error: "Template not found or access denied" },
      { status: 403 }
    )
  }

  try {
    await sql`
      UPDATE quick_staff_payment_templates SET
        name = ${name},
        description = ${description || null},
        staff_id = ${staff_id},
        amount = ${amount},
        payment_method = ${payment_method},
        notes = ${notes || null},
        is_active = ${is_active !== undefined ? is_active : true},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${template_id}
    `

    return NextResponse.json({
      success: true,
      message: "Quick staff payment template updated successfully",
    })
  } catch (error) {
    console.error("Error updating quick staff payment template:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update quick staff payment template" },
      { status: 500 }
    )
  }
}

async function deleteQuickStaffPaymentTemplate(body: any, userId: number) {
  const { template_id } = body

  if (!template_id) {
    return NextResponse.json(
      { success: false, error: "Template ID is required" },
      { status: 400 }
    )
  }

  // Verify template belongs to user
  const templateCheck = await sql`
    SELECT id FROM quick_staff_payment_templates 
    WHERE id = ${template_id} AND created_by = ${userId}
  `

  if (templateCheck.length === 0) {
    return NextResponse.json(
      { success: false, error: "Template not found or access denied" },
      { status: 403 }
    )
  }

  try {
    // Soft delete by setting is_active to false
    await sql`
      UPDATE quick_staff_payment_templates 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${template_id}
    `

    return NextResponse.json({
      success: true,
      message: "Quick staff payment template deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting quick staff payment template:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete quick staff payment template" },
      { status: 500 }
    )
  }
}

async function executeQuickStaffPayment(body: any, userId: number) {
  const { template_id } = body

  if (!template_id) {
    return NextResponse.json(
      { success: false, error: "Template ID is required" },
      { status: 400 }
    )
  }

  // Get template details
  const templates = await sql`
    SELECT 
      qspt.*,
      s.name as staff_name
    FROM quick_staff_payment_templates qspt
    LEFT JOIN staff s ON qspt.staff_id = s.id
    WHERE qspt.id = ${template_id} AND qspt.created_by = ${userId} AND qspt.is_active = true
  `

  if (templates.length === 0) {
    return NextResponse.json(
      { success: false, error: "Template not found or inactive" },
      { status: 404 }
    )
  }

  const template = templates[0]
  const today = new Date().toISOString().split('T')[0]

  await sql`BEGIN`

  try {
    // Create staff payment
    const result = await sql`
      INSERT INTO staff_payments (
        staff_id,
        amount,
        date_paid,
        notes
      ) VALUES (
        ${template.staff_id},
        ${template.amount},
        ${today},
        ${template.notes || `Quick payment from template: ${template.name}`}
      )
      RETURNING id
    `

    const paymentId = result[0].id

    // Create ledger entry for expense
    await sql`
      INSERT INTO ledger (
        entry_date,
        entry_type,
        amount,
        description,
        reference_id,
        reference_type,
        staff_id,
        created_by
      ) VALUES (
        ${today},
        'expense',
        ${template.amount},
        ${"Quick Payment to " + template.staff_name},
        ${"STAFF-PAY-" + paymentId},
        'staff_payment',
        ${template.staff_id},
        ${userId}
      )
    `

    await sql`COMMIT`

    return NextResponse.json({
      success: true,
      payment_id: paymentId,
      message: "Quick staff payment created successfully",
    })
  } catch (error) {
    await sql`ROLLBACK`
    throw error
  }
} 