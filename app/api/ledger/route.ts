import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { withAuth } from "@/lib/auth-middleware"

// POST - Get ledger entries with filters
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can access ledger
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, year, month, clientId, staffId } = body

    switch (action) {
      case "get-entries":
        return await getLedgerEntries({ year, month, clientId, staffId, userId: user.userId })

      case "get-summary-by-month":
        if (!year) {
          return NextResponse.json(
            { success: false, error: "Year is required for monthly summary" },
            { status: 400 }
          )
        }
        return await getLedgerSummaryByMonth(year, user.userId)

      case "get-current-month-summary":
        return await getCurrentMonthSummary(user.userId)

      case "get-yearly-summary":
        return await getLedgerYearlySummary(user.userId)

      case "add-entry":
        const { entry_date, entry_type, amount, description, reference_id, reference_type, client_id, staff_id } = body
        
        if (!entry_date || !entry_type || !amount || !description) {
          return NextResponse.json(
            { success: false, error: "Entry date, type, amount, and description are required" },
            { status: 400 }
          )
        }

        return await addLedgerEntry({
          entry_date,
          entry_type,
          amount,
          description,
          reference_id: reference_id || null,
          reference_type: reference_type || null,
          client_id: client_id || null,
          staff_id: staff_id || null,
          created_by: user.userId,
        })

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error in ledger API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}, ['admin', 'staff'])

// Helper functions
async function getLedgerEntries({ year, month, clientId, staffId, userId }: any) {
  try {
    let queryText = `
      SELECT 
        l.*,
        c.business_name as client_name,
        s.name as staff_name
      FROM 
        ledger l
      LEFT JOIN 
        clients c ON l.client_id = c.id
      LEFT JOIN 
        staff s ON l.staff_id = s.id
      WHERE 
        l.created_by = $1
    `

    const params = [userId]
    let paramIndex = 2

    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM l.entry_date) = $${paramIndex}`
      params.push(year)
      paramIndex++
    }

    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM l.entry_date) = $${paramIndex}`
      params.push(month)
      paramIndex++
    }

    if (clientId) {
      queryText += ` AND l.client_id = $${paramIndex}`
      params.push(clientId)
      paramIndex++
    }

    if (staffId) {
      queryText += ` AND l.staff_id = $${paramIndex}`
      params.push(staffId)
      paramIndex++
    }

    queryText += ` ORDER BY l.entry_date DESC, l.created_at DESC`

    const result = await sql.query(queryText, params)

    const entries = result.map((entry: any) => ({
      ...entry,
      amount: Number(entry.amount),
      entry_date: entry.entry_date ? new Date(entry.entry_date).toISOString().split("T")[0] : null,
      created_at: entry.created_at ? new Date(entry.created_at).toISOString() : null,
      updated_at: entry.updated_at ? new Date(entry.updated_at).toISOString() : null,
    }))

    return NextResponse.json({
      success: true,
      entries,
    })
  } catch (error) {
    console.error("Error fetching ledger entries:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch ledger entries" },
      { status: 500 }
    )
  }
}

async function getLedgerSummaryByMonth(year: number, userId: number) {
  try {
    const summary = await sql`
      SELECT 
        EXTRACT(MONTH FROM entry_date)::integer as month,
        entry_type,
        SUM(amount) as total
      FROM 
        ledger
      WHERE 
        created_by = ${userId}
        AND EXTRACT(YEAR FROM entry_date) = ${year}
      GROUP BY 
        EXTRACT(MONTH FROM entry_date), entry_type
      ORDER BY 
        month ASC
    `

    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const formattedSummary = months.map((month) => {
      const incomeEntry = summary.find((s: any) => Number(s.month) === month && s.entry_type === "income")
      const expenseEntry = summary.find((s: any) => Number(s.month) === month && s.entry_type === "expense")

      return {
        month,
        income: incomeEntry ? Number(incomeEntry.total) : 0,
        expense: expenseEntry ? Number(expenseEntry.total) : 0,
        profit: (incomeEntry ? Number(incomeEntry.total) : 0) - (expenseEntry ? Number(expenseEntry.total) : 0),
      }
    })

    return NextResponse.json({
      success: true,
      summary: formattedSummary,
    })
  } catch (error) {
    console.error("Error fetching ledger summary:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch ledger summary" },
      { status: 500 }
    )
  }
}

async function getCurrentMonthSummary(userId: number) {
  try {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1

    const summary = await sql`
      SELECT 
        entry_type,
        SUM(amount) as total
      FROM 
        ledger
      WHERE 
        created_by = ${userId}
        AND EXTRACT(YEAR FROM entry_date) = ${currentYear}
        AND EXTRACT(MONTH FROM entry_date) = ${currentMonth}
      GROUP BY 
        entry_type
    `

    const income = summary.find((s: any) => s.entry_type === "income")
    const expense = summary.find((s: any) => s.entry_type === "expense")

    const totalIncome = income ? Number(income.total) : 0
    const totalExpense = expense ? Number(expense.total) : 0

    return NextResponse.json({
      success: true,
      summary: {
        income: totalIncome,
        expense: totalExpense,
        profit: totalIncome - totalExpense,
        month: currentMonth,
        year: currentYear,
      },
    })
  } catch (error) {
    console.error("Error fetching current month summary:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch current month summary" },
      { status: 500 }
    )
  }
}

async function getLedgerYearlySummary(userId: number) {
  try {
    const summary = await sql`
      SELECT 
        EXTRACT(YEAR FROM entry_date)::integer as year,
        entry_type,
        SUM(amount) as total
      FROM 
        ledger
      WHERE 
        created_by = ${userId}
      GROUP BY 
        EXTRACT(YEAR FROM entry_date), entry_type
      ORDER BY 
        year DESC
    `

    const years = [...new Set(summary.map((s: any) => Number(s.year)))]
    const formattedSummary = years.map((year) => {
      const incomeEntry = summary.find((s: any) => Number(s.year) === year && s.entry_type === "income")
      const expenseEntry = summary.find((s: any) => Number(s.year) === year && s.entry_type === "expense")

      return {
        year,
        income: incomeEntry ? Number(incomeEntry.total) : 0,
        expense: expenseEntry ? Number(expenseEntry.total) : 0,
        profit: (incomeEntry ? Number(incomeEntry.total) : 0) - (expenseEntry ? Number(expenseEntry.total) : 0),
      }
    })

    return NextResponse.json({
      success: true,
      summary: formattedSummary,
    })
  } catch (error) {
    console.error("Error fetching yearly summary:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch yearly summary" },
      { status: 500 }
    )
  }
}

async function addLedgerEntry(entryData: any) {
  try {
    const result = await sql`
      INSERT INTO ledger (
        entry_date,
        entry_type,
        amount,
        description,
        reference_id,
        reference_type,
        client_id,
        staff_id,
        created_by
      ) VALUES (
        ${entryData.entry_date},
        ${entryData.entry_type},
        ${entryData.amount},
        ${entryData.description},
        ${entryData.reference_id},
        ${entryData.reference_type},
        ${entryData.client_id},
        ${entryData.staff_id},
        ${entryData.created_by}
      )
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      message: "Ledger entry added successfully",
      id: result[0].id,
    })
  } catch (error) {
    console.error("Error adding ledger entry:", error)
    return NextResponse.json(
      { success: false, error: "Failed to add ledger entry" },
      { status: 500 }
    )
  }
} 