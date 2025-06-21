import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

// Quick Transaction Template type
type QuickTransactionTemplate = {
  id: number
  name: string
  description?: string
  client_id: number
  product_id?: number
  quantity: number
  unit_price: number
  tax_rate: number
  payment_method: string
  notes?: string
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string
  client_name?: string
  product_name?: string
}

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can access quick transaction templates
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    // Get all active quick transaction templates for the user
    const templates = await sql`
      SELECT 
        qtt.*,
        c.business_name as client_name,
        p.name as product_name
      FROM quick_transaction_templates qtt
      LEFT JOIN clients c ON qtt.client_id = c.id
      LEFT JOIN products p ON qtt.product_id = p.id
      WHERE qtt.created_by = ${user.userId} AND qtt.is_active = true
      ORDER BY qtt.name ASC
    `

    const formattedTemplates = templates.map((template: any) => ({
      ...template,
      quantity: Number(template.quantity),
      unit_price: Number(template.unit_price),
      tax_rate: Number(template.tax_rate),
      created_at: template.created_at ? new Date(template.created_at).toISOString() : null,
      updated_at: template.updated_at ? new Date(template.updated_at).toISOString() : null,
    }))

    return NextResponse.json({
      success: true,
      templates: formattedTemplates,
    })
  } catch (error) {
    console.error("Error fetching quick transaction templates:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch quick transaction templates" },
      { status: 500 }
    )
  }
}, ['admin', 'staff'])

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can manage quick transaction templates
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
        return await createQuickTransactionTemplate(body, user.userId)
      
      case "update-template":
        return await updateQuickTransactionTemplate(body, user.userId)
      
      case "delete-template":
        return await deleteQuickTransactionTemplate(body, user.userId)
      
      case "execute-template":
        return await executeQuickTransaction(body, user.userId)

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error in quick transaction API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}, ['admin', 'staff'])

// Helper functions
async function createQuickTransactionTemplate(body: any, userId: number) {
  const {
    name,
    description,
    client_id,
    product_id,
    quantity = 1,
    unit_price,
    tax_rate = 0,
    payment_method = 'Bank Transfer',
    notes
  } = body

  // Validation
  if (!name || !client_id || !unit_price) {
    return NextResponse.json(
      { success: false, error: "Name, client ID, and unit price are required" },
      { status: 400 }
    )
  }

  // Verify client belongs to user
  const clientCheck = await sql`
    SELECT id FROM clients WHERE id = ${Number(client_id)} AND created_by = ${userId}
  `

  if (clientCheck.length === 0) {
    return NextResponse.json(
      { success: false, error: "Client not found or access denied" },
      { status: 403 }
    )
  }

  // Verify product belongs to user (if provided)
  if (product_id) {
    const productCheck = await sql`
      SELECT id FROM products WHERE id = ${Number(product_id)} AND created_by = ${userId}
    `

    if (productCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Product not found or access denied" },
        { status: 403 }
      )
    }
  }

  try {
    const result = await sql`
      INSERT INTO quick_transaction_templates (
        name,
        description,
        client_id,
        product_id,
        quantity,
        unit_price,
        tax_rate,
        payment_method,
        notes,
        created_by
      ) VALUES (
        ${name},
        ${description || null},
        ${Number(client_id)},
        ${product_id ? Number(product_id) : null},
        ${Number(quantity)},
        ${Number(unit_price)},
        ${Number(tax_rate)},
        ${payment_method},
        ${notes || null},
        ${userId}
      )
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      template_id: result[0].id,
      message: "Quick transaction template created successfully",
    })
  } catch (error) {
    console.error("Error creating quick transaction template:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create quick transaction template" },
      { status: 500 }
    )
  }
}

async function updateQuickTransactionTemplate(body: any, userId: number) {
  const {
    template_id,
    name,
    description,
    client_id,
    product_id,
    quantity,
    unit_price,
    tax_rate,
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
    SELECT id FROM quick_transaction_templates 
    WHERE id = ${Number(template_id)} AND created_by = ${userId}
  `

  if (templateCheck.length === 0) {
    return NextResponse.json(
      { success: false, error: "Template not found or access denied" },
      { status: 403 }
    )
  }

  try {
    await sql`
      UPDATE quick_transaction_templates SET
        name = ${name},
        description = ${description || null},
        client_id = ${Number(client_id)},
        product_id = ${product_id ? Number(product_id) : null},
        quantity = ${Number(quantity)},
        unit_price = ${Number(unit_price)},
        tax_rate = ${Number(tax_rate)},
        payment_method = ${payment_method},
        notes = ${notes || null},
        is_active = ${is_active !== undefined ? is_active : true},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${Number(template_id)}
    `

    return NextResponse.json({
      success: true,
      message: "Quick transaction template updated successfully",
    })
  } catch (error) {
    console.error("Error updating quick transaction template:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update quick transaction template" },
      { status: 500 }
    )
  }
}

async function deleteQuickTransactionTemplate(body: any, userId: number) {
  const { template_id } = body

  if (!template_id) {
    return NextResponse.json(
      { success: false, error: "Template ID is required" },
      { status: 400 }
    )
  }

  // Verify template belongs to user
  const templateCheck = await sql`
    SELECT id FROM quick_transaction_templates 
    WHERE id = ${Number(template_id)} AND created_by = ${userId}
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
      UPDATE quick_transaction_templates 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${Number(template_id)}
    `

    return NextResponse.json({
      success: true,
      message: "Quick transaction template deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting quick transaction template:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete quick transaction template" },
      { status: 500 }
    )
  }
}

async function executeQuickTransaction(body: any, userId: number) {
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
      qtt.*,
      c.business_name as client_name,
      p.name as product_name,
      p.description as product_description
    FROM quick_transaction_templates qtt
    LEFT JOIN clients c ON qtt.client_id = c.id
    LEFT JOIN products p ON qtt.product_id = p.id
    WHERE qtt.id = ${Number(template_id)} AND qtt.created_by = ${userId} AND qtt.is_active = true
  `

  if (templates.length === 0) {
    return NextResponse.json(
      { success: false, error: "Template not found or inactive" },
      { status: 404 }
    )
  }

  const template = templates[0]

  // Generate transaction ID
  const transactionId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  const today = new Date().toISOString().split('T')[0]
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now

  // Calculate amounts
  const quantity = Number(template.quantity)
  const unitPrice = Number(template.unit_price)
  const taxRate = Number(template.tax_rate)
  
  const subtotal = quantity * unitPrice
  const taxAmount = subtotal * (taxRate / 100)
  const totalAmount = subtotal + taxAmount

  await sql`BEGIN`

  try {
    // Create transaction
    const result = await sql`
      INSERT INTO transactions (
        transaction_id,
        client_id,
        transaction_date,
        due_date,
        notes,
        payment_method,
        status,
        subtotal,
        tax_amount,
        total_amount,
        created_by
      ) VALUES (
        ${transactionId},
        ${Number(template.client_id)},
        ${today},
        ${dueDate},
        ${template.notes || `Quick transaction from template: ${template.name}`},
        ${template.payment_method},
        'paid',
        ${subtotal},
        ${taxAmount},
        ${totalAmount},
        ${userId}
      )
      RETURNING id
    `

    const transactionDbId = result[0].id

    // Create transaction item
    await sql`
      INSERT INTO transaction_items (
        transaction_id,
        product_id,
        description,
        quantity,
        unit_price,
        tax_rate,
        total
      ) VALUES (
        ${transactionDbId},
        ${template.product_id ? Number(template.product_id) : null},
        ${template.product_name || template.description || 'Service'},
        ${Math.floor(quantity)},
        ${unitPrice},
        ${taxRate},
        ${subtotal}
      )
    `

    // Create ledger entry for income
    await sql`
      INSERT INTO ledger (
        entry_date,
        entry_type,
        amount,
        description,
        reference_id,
        reference_type,
        client_id,
        created_by
      ) VALUES (
        ${today},
        'income',
        ${totalAmount},
        ${"Quick Transaction " + transactionId + " - " + template.client_name},
        ${transactionId},
        'client_transaction',
        ${Number(template.client_id)},
        ${userId}
      )
    `

    // Update client total_spent
    await sql`
      UPDATE clients 
      SET total_spent = COALESCE(
        (
          SELECT SUM(tp.amount) 
          FROM transaction_payments tp
          JOIN transactions t ON tp.transaction_id = t.id
          WHERE t.client_id = ${Number(template.client_id)}
        ) + 
        (
          SELECT SUM(t.total_amount) 
          FROM transactions t 
          WHERE t.client_id = ${Number(template.client_id)} AND t.status = 'paid'
        ), 
        0
      )
      WHERE id = ${Number(template.client_id)}
    `

    await sql`COMMIT`

    return NextResponse.json({
      success: true,
      transaction_id: transactionId,
      message: "Quick transaction created successfully",
    })
  } catch (error) {
    await sql`ROLLBACK`
    throw error
  }
} 