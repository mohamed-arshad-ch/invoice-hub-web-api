// Database service for CRUD operations with Neon PostgreSQL - Staff specific
import { neon } from "@neondatabase/serverless"

// Initialize Neon client
const sql = neon(
  "postgres://neondb_owner:npg_epBG9mqRuiV7@ep-jolly-brook-ab5fd13n-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require",
)

// Staff type definition
export type Staff = {
  id: number
  name: string
  email: string
  position: string
  join_date: string
  status: "active" | "inactive"
  avatar: string
  role: "admin" | "support" | "finance"
  payment_rate: number
}

// Staff Payment type definition
export type StaffPayment = {
  id: number
  staff_id: number
  amount: number
  date_paid: string
  notes: string
}

// Get all staff
export async function getAllStaff(): Promise<Staff[]> {
  try {
    const staff = await sql`
      SELECT 
        id, 
        name, 
        email, 
        position, 
        join_date, 
        status, 
        avatar, 
        role, 
        payment_rate
      FROM staff
      ORDER BY name ASC
    `
    return staff as Staff[]
  } catch (error) {
    console.error("Error fetching staff:", error)
    throw new Error("Failed to fetch staff")
  }
}

// Get staff by ID
export async function getStaffById(id: number): Promise<Staff | null> {
  try {
    const staff = await sql`
      SELECT 
        id, 
        name, 
        email, 
        position, 
        join_date, 
        status, 
        avatar, 
        role, 
        payment_rate
      FROM staff 
      WHERE id = ${id}
    `
    if (staff.length === 0) {
      return null
    }
    return staff[0] as Staff
  } catch (error) {
    console.error(`Error fetching staff with ID ${id}:`, error)
    throw new Error("Failed to fetch staff")
  }
}

// Create new staff
export async function createStaff(staffData: Omit<Staff, "id">): Promise<Staff> {
  try {
    const result = await sql`
      INSERT INTO staff (
        name, 
        email, 
        position, 
        join_date, 
        status, 
        avatar, 
        role, 
        payment_rate
      ) VALUES (
        ${staffData.name}, 
        ${staffData.email}, 
        ${staffData.position}, 
        ${staffData.join_date}, 
        ${staffData.status}, 
        ${staffData.avatar}, 
        ${staffData.role}, 
        ${staffData.payment_rate}
      )
      RETURNING 
        id, 
        name, 
        email, 
        position, 
        join_date, 
        status, 
        avatar, 
        role, 
        payment_rate
    `
    if (result.length === 0) {
      throw new Error("Failed to create staff")
    }
    return result[0] as Staff
  } catch (error) {
    console.error("Error creating staff:", error)
    throw error
  }
}

// Update staff
export async function updateStaff(id: number, staffData: Partial<Omit<Staff, "id">>): Promise<Staff | null> {
  try {
    const result = await sql`
      UPDATE staff SET
        name = ${staffData.name},
        email = ${staffData.email},
        position = ${staffData.position},
        join_date = ${staffData.join_date},
        status = ${staffData.status},
        avatar = ${staffData.avatar},
        role = ${staffData.role},
        payment_rate = ${staffData.payment_rate}
      WHERE id = ${id}
      RETURNING 
        id, 
        name, 
        email, 
        position, 
        join_date, 
        status, 
        avatar, 
        role, 
        payment_rate
    `
    if (result.length === 0) {
      return null
    }
    return result[0] as Staff
  } catch (error) {
    console.error(`Error updating staff with ID ${id}:`, error)
    throw new Error("Failed to update staff")
  }
}

// Delete staff
export async function deleteStaff(id: number): Promise<boolean> {
  try {
    const result = await sql`
      DELETE FROM staff 
      WHERE id = ${id}
      RETURNING id
    `
    return result.length > 0
  } catch (error) {
    console.error(`Error deleting staff with ID ${id}:`, error)
    throw new Error("Failed to delete staff")
  }
}

// Search staff
export async function searchStaff(query: string): Promise<Staff[]> {
  try {
    const staff = await sql`
      SELECT 
        id, 
        name, 
        email, 
        position, 
        join_date, 
        status, 
        avatar, 
        role, 
        payment_rate
      FROM staff 
      WHERE 
        name ILIKE ${"%" + query + "%"} OR email ILIKE ${"%" + query + "%"}
      ORDER BY name ASC
    `
    return staff as Staff[]
  } catch (error) {
    console.error("Error searching staff:", error)
    throw new Error("Failed to search staff")
  }
}

// Filter staff
export async function filterStaff(roleFilter: string, statusFilter: string): Promise<Staff[]> {
  try {
    let query = `
      SELECT 
        id, 
        name, 
        email, 
        position, 
        join_date, 
        status, 
        avatar, 
        role, 
        payment_rate
      FROM staff 
      WHERE 1=1
    `
    const params = []
    let paramIndex = 1

    if (roleFilter !== "all") {
      query += ` AND role = ${paramIndex}`
      params.push(roleFilter)
      paramIndex++
    }

    if (statusFilter !== "all") {
      query += ` AND status = ${paramIndex}`
      params.push(statusFilter)
      paramIndex++
    }

    query += " ORDER BY name ASC"

    const result = await sql.query(query, params)
    return result.rows as Staff[]
  } catch (error) {
    console.error("Error filtering staff:", error)
    throw new Error("Failed to filter staff")
  }
}

// Get staff payments
export async function getStaffPayments(staffId: number): Promise<StaffPayment[]> {
  try {
    const payments = await sql`
      SELECT 
        id, 
        staff_id, 
        amount, 
        date_paid, 
        notes
      FROM staff_payments
      WHERE staff_id = ${staffId}
      ORDER BY date_paid DESC
    `
    return payments as StaffPayment[]
  } catch (error) {
    console.error(`Error fetching payments for staff ID ${staffId}:`, error)
    throw new Error("Failed to fetch staff payments")
  }
}

// Get staff total paid
export async function getStaffTotalPaid(staffId: number): Promise<number> {
  try {
    const result = await sql`
      SELECT COALESCE(SUM(amount), 0) AS total_paid
      FROM staff_payments
      WHERE staff_id = ${staffId}
    `
    return result[0].total_paid as number
  } catch (error) {
    console.error(`Error calculating total paid for staff ID ${staffId}:`, error)
    throw new Error("Failed to calculate total paid")
  }
}

// Create staff payment
export async function createStaffPayment(paymentData: Omit<StaffPayment, "id">): Promise<StaffPayment> {
  try {
    const result = await sql`
      INSERT INTO staff_payments (
        staff_id, 
        amount, 
        date_paid, 
        notes
      ) VALUES (
        ${paymentData.staff_id}, 
        ${paymentData.amount}, 
        ${paymentData.date_paid}, 
        ${paymentData.notes}
      )
      RETURNING 
        id, 
        staff_id, 
        amount, 
        date_paid, 
        notes
    `
    if (result.length === 0) {
      throw new Error("Failed to create staff payment")
    }
    return result[0] as StaffPayment
  } catch (error) {
    console.error("Error creating staff payment:", error)
    throw error
  }
}

// Get staff payment statistics
export async function getStaffPaymentStats(staffId: number): Promise<{ month: string; total: number }[]> {
  try {
    const stats = await sql`
      SELECT 
        DATE_TRUNC('month', date_paid) AS month, 
        SUM(amount) AS total
      FROM staff_payments
      WHERE staff_id = ${staffId}
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `
    return stats.map((row: any) => ({
      month: new Date(row.month).toLocaleDateString("default", { month: "short", year: "numeric" }),
      total: row.total as number,
    }))
  } catch (error) {
    console.error(`Error fetching payment stats for staff ID ${staffId}:`, error)
    throw new Error("Failed to fetch payment statistics")
  }
}

// Get staff payment by ID
export async function getStaffPaymentById(paymentId: number): Promise<StaffPayment | null> {
  try {
    const payment = await sql`
      SELECT 
        id, 
        staff_id, 
        amount, 
        date_paid, 
        notes
      FROM staff_payments
      WHERE id = ${paymentId}
    `
    if (payment.length === 0) {
      return null
    }
    return payment[0] as StaffPayment
  } catch (error) {
    console.error(`Error fetching payment with ID ${paymentId}:`, error)
    throw new Error("Failed to fetch payment")
  }
}

// Update staff payment
export async function updateStaffPayment(paymentId: number, paymentData: Partial<Omit<StaffPayment, "id" | "staff_id">>): Promise<StaffPayment | null> {
  try {
    const result = await sql`
      UPDATE staff_payments SET
        amount = ${paymentData.amount},
        date_paid = ${paymentData.date_paid},
        notes = ${paymentData.notes}
      WHERE id = ${paymentId}
      RETURNING 
        id, 
        staff_id, 
        amount, 
        date_paid, 
        notes
    `
    if (result.length === 0) {
      return null
    }
    return result[0] as StaffPayment
  } catch (error) {
    console.error(`Error updating payment with ID ${paymentId}:`, error)
    throw new Error("Failed to update payment")
  }
}
