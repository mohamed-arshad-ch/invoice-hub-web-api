"use server"

import { sql } from "@/lib/db"
import { getAuthSession } from "./auth-actions"
import { revalidatePath } from "next/cache"

// Type definitions
export type LedgerEntry = {
  id: number
  entry_date: string
  entry_type: "income" | "expense"
  amount: number
  description: string
  reference_id: string
  reference_type: "client_transaction" | "staff_payment"
  client_id: number | null
  staff_id: number | null
  client_name?: string
  staff_name?: string
  created_at: string
  updated_at: string
}

// Get ledger entries with filters
export async function getLedgerEntries({
  year,
  month,
  clientId,
  staffId,
}: {
  year?: number
  month?: number | null
  clientId?: number | null
  staffId?: number | null
}) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    // Start building the query and params
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

    // Initialize params array with userId
    const params = [session.userId]
    let paramIndex = 2

    // Add year filter if provided
    if (year) {
      queryText += ` AND EXTRACT(YEAR FROM l.entry_date) = $${paramIndex}`
      params.push(year)
      paramIndex++
    }

    // Add month filter if provided
    if (month) {
      queryText += ` AND EXTRACT(MONTH FROM l.entry_date) = $${paramIndex}`
      params.push(month)
      paramIndex++
    }

    // Add client filter if provided
    if (clientId) {
      queryText += ` AND l.client_id = $${paramIndex}`
      params.push(clientId)
      paramIndex++
    }

    // Add staff filter if provided
    if (staffId) {
      queryText += ` AND l.staff_id = $${paramIndex}`
      params.push(staffId)
      paramIndex++
    }

    // Add order by clause
    queryText += ` ORDER BY l.entry_date DESC, l.created_at DESC`

    // Execute the query with the params array
    const result = await sql.query(queryText, params)

    // Check if result and result.rows exist before mapping
    if (!result || !result.rows) {
      return {
        success: true,
        entries: [],
      }
    }

    try {
      const entries = result.rows.map((entry: any) => ({
        ...entry,
        amount: Number(entry.amount),
        entry_date: entry.entry_date ? new Date(entry.entry_date).toISOString().split("T")[0] : null,
        created_at: entry.created_at ? new Date(entry.created_at).toISOString() : null,
        updated_at: entry.updated_at ? new Date(entry.updated_at).toISOString() : null,
      }))

      return {
        success: true,
        entries,
      }
    } catch (mappingError) {
      console.error("Error mapping ledger entries:", mappingError)
      return { success: false, error: "Failed to map ledger entries" }
    }
  } catch (error) {
    console.error("Error fetching ledger entries:", error)
    return { success: false, error: "Failed to fetch ledger entries" }
  }
}

// Get ledger summary by month for a specific year
export async function getLedgerSummaryByMonth(year: number) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    const summary = await sql`
      SELECT 
        EXTRACT(MONTH FROM entry_date)::integer as month,
        entry_type,
        SUM(amount) as total
      FROM 
        ledger
      WHERE 
        created_by = ${session.userId}
        AND EXTRACT(YEAR FROM entry_date) = ${year}
      GROUP BY 
        EXTRACT(MONTH FROM entry_date), entry_type
      ORDER BY 
        month ASC
    `

    // Format the summary data
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

    return { success: true, summary: formattedSummary }
  } catch (error) {
    console.error("Error fetching ledger summary:", error)
    return { success: false, error: "Failed to fetch ledger summary" }
  }
}

// Get current month summary and entries
export async function getCurrentMonthSummary() {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-indexed

    // Get summary totals
    const summary = await sql`
      SELECT 
        entry_type,
        SUM(amount) as total
      FROM 
        ledger
      WHERE 
        created_by = ${session.userId}
        AND EXTRACT(YEAR FROM entry_date) = ${currentYear}
        AND EXTRACT(MONTH FROM entry_date) = ${currentMonth}
      GROUP BY 
        entry_type
    `

    const incomeEntry = summary.find((s: any) => s.entry_type === "income")
    const expenseEntry = summary.find((s: any) => s.entry_type === "expense")

    const result = {
      income: incomeEntry ? Number(incomeEntry.total) : 0,
      expense: expenseEntry ? Number(expenseEntry.total) : 0,
      profit: (incomeEntry ? Number(incomeEntry.total) : 0) - (expenseEntry ? Number(expenseEntry.total) : 0),
    }

    // Get current month entries
    const entries = await sql`
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
        l.created_by = ${session.userId}
        AND EXTRACT(YEAR FROM l.entry_date) = ${currentYear}
        AND EXTRACT(MONTH FROM l.entry_date) = ${currentMonth}
      ORDER BY 
        l.entry_date DESC, l.created_at DESC
    `

    // Format entries
    const formattedEntries = entries.map((entry: any) => ({
      ...entry,
      amount: Number(entry.amount),
      entry_date: entry.entry_date ? new Date(entry.entry_date).toISOString().split("T")[0] : null,
      created_at: entry.created_at ? new Date(entry.created_at).toISOString() : null,
      updated_at: entry.updated_at ? new Date(entry.updated_at).toISOString() : null,
    }))

    return {
      success: true,
      summary: result,
      entries: formattedEntries,
    }
  } catch (error) {
    console.error("Error fetching current month summary:", error)
    return { success: false, error: "Failed to fetch current month summary" }
  }
}

// Get yearly summary for the last 5 years
export async function getLedgerYearlySummary() {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 4 // Last 5 years

    const summary = await sql`
      SELECT 
        EXTRACT(YEAR FROM entry_date)::integer as year,
        entry_type,
        SUM(amount) as total
      FROM 
        ledger
      WHERE 
        created_by = ${session.userId}
        AND EXTRACT(YEAR FROM entry_date) >= ${startYear}
      GROUP BY 
        EXTRACT(YEAR FROM entry_date), entry_type
      ORDER BY 
        year ASC
    `

    // Format the yearly summary
    const years = Array.from({ length: 5 }, (_, i) => startYear + i)
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

    return { success: true, summary: formattedSummary }
  } catch (error) {
    console.error("Error fetching yearly summary:", error)
    return { success: false, error: "Failed to fetch yearly summary" }
  }
}

// Add a ledger entry
export async function addLedgerEntry(entryData: Omit<LedgerEntry, "id" | "created_at" | "updated_at">) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

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
        ${session.userId}
      )
      RETURNING id
    `

    revalidatePath("/admin/ledger")

    return { success: true, entryId: result[0].id }
  } catch (error) {
    console.error("Error adding ledger entry:", error)
    return { success: false, error: "Failed to add ledger entry" }
  }
}

// Get clients and staff for filtering
export async function getFilterOptions() {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    // Get clients
    const clients = await sql`
      SELECT id, business_name as name
      FROM clients
      WHERE created_by = ${session.userId}
      ORDER BY business_name ASC
    `

    // Get staff
    const staff = await sql`
      SELECT id, name
      FROM staff
      ORDER BY name ASC
    `

    return {
      success: true,
      clients: clients,
      staff: staff,
    }
  } catch (error) {
    console.error("Error fetching filter options:", error)
    return { success: false, error: "Failed to fetch filter options" }
  }
}
