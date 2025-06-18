"use server"

import { revalidatePath } from "next/cache"
import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  searchStaff,
  filterStaff,
  getStaffPayments,
  getStaffTotalPaid,
  createStaffPayment,
  getStaffPaymentStats,
} from "@/lib/db-service-staff"
import { sql } from "@/lib/db"

// Get all staff
export async function getStaffList() {
  try {
    const staff = await getAllStaff()
    return { success: true, data: staff }
  } catch (error) {
    console.error("Error fetching staff:", error)
    return { success: false, error: "Failed to fetch staff" }
  }
}

// Get staff by ID
export async function getStaffMember(id: number) {
  try {
    const staff = await getStaffById(id)
    if (!staff) {
      return { success: false, error: "Staff member not found" }
    }
    return { success: true, data: staff }
  } catch (error) {
    console.error(`Error fetching staff with ID ${id}:`, error)
    return { success: false, error: "Failed to fetch staff member" }
  }
}

// Create new staff
export async function addStaffMember(formData: FormData) {
  try {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const position = formData.get("position") as string
    const role = formData.get("role") as string
    const status = formData.get("status") as string
    const paymentRateStr = formData.get("paymentRate") as string
    const joinDate = (formData.get("joinDate") as string) || new Date().toISOString().split("T")[0]

    // Validate required fields
    if (!name || !email || !position || !paymentRateStr) {
      return { success: false, error: "Missing required fields" }
    }

    const paymentRate = Number.parseFloat(paymentRateStr)
    if (isNaN(paymentRate) || paymentRate <= 0) {
      return { success: false, error: "Invalid payment rate" }
    }

    // Generate avatar URL
    const avatar = `/placeholder.svg?height=200&width=200&query=${encodeURIComponent(name)}`

    const staffData = {
      name,
      email,
      position,
      join_date: joinDate,
      status: status as "active" | "inactive",
      avatar,
      role: role as "admin" | "support" | "finance",
      payment_rate: paymentRate,
    }

    const newStaff = await createStaff(staffData)
    revalidatePath("/admin/staff")
    return { success: true, data: newStaff }
  } catch (error) {
    console.error("Error creating staff:", error)
    return { success: false, error: "Failed to create staff member" }
  }
}

// Update staff
export async function updateStaffMember(id: number, formData: FormData) {
  try {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const position = formData.get("position") as string
    const role = formData.get("role") as string
    const status = formData.get("status") as string
    const paymentRateStr = formData.get("paymentRate") as string
    const joinDate = formData.get("joinDate") as string

    // Validate required fields
    if (!name || !email || !position || !paymentRateStr) {
      return { success: false, error: "Missing required fields" }
    }

    const paymentRate = Number.parseFloat(paymentRateStr)
    if (isNaN(paymentRate) || paymentRate <= 0) {
      return { success: false, error: "Invalid payment rate" }
    }

    const staffData = {
      name,
      email,
      position,
      join_date: joinDate,
      status: status as "active" | "inactive",
      role: role as "admin" | "support" | "finance",
      payment_rate: paymentRate,
    }

    const updatedStaff = await updateStaff(id, staffData)
    if (!updatedStaff) {
      return { success: false, error: "Staff member not found" }
    }

    revalidatePath("/admin/staff")
    revalidatePath(`/admin/staff/edit/${id}`)
    return { success: true, data: updatedStaff }
  } catch (error) {
    console.error(`Error updating staff with ID ${id}:`, error)
    return { success: false, error: "Failed to update staff member" }
  }
}

// Delete staff
export async function deleteStaffMember(id: number) {
  try {
    // Begin transaction
    await sql`BEGIN`

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
      return { success: false, error: "Staff member not found" }
    }

    // Commit transaction
    await sql`COMMIT`

    // Revalidate paths
    revalidatePath("/admin/staff")
    revalidatePath("/admin/ledger")

    return { success: true }
  } catch (error) {
    await sql`ROLLBACK`
    console.error(`Error deleting staff with ID ${id}:`, error)
    return { success: false, error: "Failed to delete staff member" }
  }
}

// Search staff
export async function searchStaffMembers(query: string) {
  try {
    const staff = await searchStaff(query)
    return { success: true, data: staff }
  } catch (error) {
    console.error("Error searching staff:", error)
    return { success: false, error: "Failed to search staff" }
  }
}

// Filter staff
export async function filterStaffMembers(roleFilter: string, statusFilter: string) {
  try {
    const staff = await filterStaff(roleFilter, statusFilter)
    return { success: true, data: staff }
  } catch (error) {
    console.error("Error filtering staff:", error)
    return { success: false, error: "Failed to filter staff" }
  }
}

// Get staff payments
export async function getStaffPaymentsList(staffId: number) {
  try {
    const payments = await getStaffPayments(staffId)
    return { success: true, data: payments }
  } catch (error) {
    console.error(`Error fetching payments for staff ID ${staffId}:`, error)
    return { success: false, error: "Failed to fetch staff payments" }
  }
}

// Get staff total paid
export async function getStaffTotalPaidAmount(staffId: number) {
  try {
    const totalPaid = await getStaffTotalPaid(staffId)
    // Ensure we're returning a valid number
    return {
      success: true,
      data: typeof totalPaid === "number" ? totalPaid : 0,
    }
  } catch (error) {
    console.error(`Error calculating total paid for staff ID ${staffId}:`, error)
    return { success: false, error: "Failed to calculate total paid", data: 0 }
  }
}

// Add this function to the existing file
// This is a helper function to add a staff payment to the ledger
export async function addStaffPaymentToLedger(payment: any, staffName: string) {
  try {
    const { addLedgerEntry } = await import("./ledger-actions")

    // Add the payment to the ledger as expense
    await addLedgerEntry({
      entry_date: payment.date_paid,
      entry_type: "expense",
      amount: payment.amount,
      description: `Payment to ${staffName}`,
      reference_id: `STAFF-PAY-${payment.id}`,
      reference_type: "staff_payment",
      client_id: null,
      staff_id: payment.staff_id,
    })

    return true
  } catch (error) {
    console.error("Error adding staff payment to ledger:", error)
    return false
  }
}

// Delete staff payment
export async function deleteStaffPayment(paymentId: number) {
  try {
    // Begin transaction
    await sql`BEGIN`

    // Get the payment to verify it exists
    const payment = await sql`
      SELECT id, staff_id FROM staff_payments WHERE id = ${paymentId}
    `

    if (!payment || payment.length === 0) {
      await sql`ROLLBACK`
      return { success: false, error: "Payment not found" }
    }

    // Delete associated ledger entry
    await sql`
      DELETE FROM ledger 
      WHERE reference_id = ${"STAFF-PAY-" + paymentId} 
      AND reference_type = 'staff_payment'
    `

    // Delete the payment
    await sql`DELETE FROM staff_payments WHERE id = ${paymentId}`

    // Commit transaction
    await sql`COMMIT`

    // Revalidate paths
    revalidatePath(`/admin/staff/payments/${payment[0].staff_id}`)
    revalidatePath("/admin/ledger")

    return { success: true, message: "Payment deleted successfully" }
  } catch (error) {
    await sql`ROLLBACK`
    console.error(`Error deleting payment with ID ${paymentId}:`, error)
    return { success: false, error: "Failed to delete payment" }
  }
}

// Modify the recordStaffPayment function to add the payment to the ledger
export async function recordStaffPayment(formData: FormData) {
  try {
    const staffId = Number.parseInt(formData.get("staffId") as string)
    const amountStr = formData.get("amount") as string
    const datePaid = (formData.get("datePaid") as string) || new Date().toISOString().split("T")[0]
    const notes = (formData.get("notes") as string) || ""

    // Validate required fields
    if (!staffId || !amountStr) {
      return { success: false, error: "Missing required fields" }
    }

    const amount = Number.parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Invalid amount" }
    }

    const paymentData = {
      staff_id: staffId,
      amount,
      date_paid: datePaid,
      notes,
    }

    const newPayment = await createStaffPayment(paymentData)

    // Get staff name for the ledger entry
    const staffResult = await sql`
      SELECT name FROM staff WHERE id = ${staffId}
    `

    const staffName = staffResult.length > 0 ? staffResult[0].name : "Unknown Staff"

    // Add to ledger
    await addStaffPaymentToLedger(newPayment, staffName)

    revalidatePath(`/admin/staff/payments/${staffId}`)
    return { success: true, data: newPayment }
  } catch (error) {
    console.error("Error creating staff payment:", error)
    return { success: false, error: "Failed to record staff payment" }
  }
}

// Get staff payment statistics
export async function getStaffPaymentStatistics(staffId: number) {
  try {
    const stats = await getStaffPaymentStats(staffId)
    return { success: true, data: stats }
  } catch (error) {
    console.error(`Error fetching payment stats for staff ID ${staffId}:`, error)
    return { success: false, error: "Failed to fetch payment statistics" }
  }
}

// Generate a random username
function generateUsername(email: string) {
  return email.split("@")[0] + Math.floor(100 + Math.random() * 900) // Append random number
}

// Create staff portal access
export async function createStaffPortalAccess(staffId: number) {
  try {
    // Get staff details
    const staffResult = await sql`
     SELECT * FROM staff 
     WHERE id = ${staffId}
   `

    if (staffResult.length === 0) {
      return { success: false, error: "Staff member not found" }
    }

    const staff = staffResult[0]

    // Check if user already exists with this email
    const existingUser = await sql`
     SELECT id FROM users WHERE email = ${staff.email}
   `

    if (existingUser.length > 0) {
      return { success: false, error: "A user with this email already exists" }
    }

    // Generate a random password
    // const password = generatePassword()
    const password = "Mcodev@123"

    // Hash the password
    const { hashPassword } = await import("@/lib/auth")
    const passwordHash = await hashPassword(password)

    // Create a new user with staff role
    const result = await sql`
     INSERT INTO users (
       first_name, 
       last_name, 
       email, 
       password_hash, 
       company_name, 
       staff_id,
       role
     )
     VALUES (
       ${staff.name.split(" ")[0] || "Staff"}, 
       ${staff.name.split(" ").slice(1).join(" ") || "Member"}, 
       ${staff.email}, 
       ${passwordHash}, 
       'InvoiceHub', 
       ${staffId},
       'staff'
     )
     RETURNING id
   `

    if (!result || result.length === 0) {
      return { success: false, error: "Failed to create user account" }
    }

    return {
      success: true,
      message:
        "Portal access activated successfully. The default password is 'Mcodev@123'. Please advise the user to change it upon first login.",
      password: password, // Return the generated password to display to admin
    }
  } catch (error) {
    console.error("Error creating staff portal access:", error)
    return { success: false, error: "Failed to create portal access" }
  }
}

function generatePassword() {
  const length = 10
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""

  // Ensure at least one uppercase, one lowercase, one number, and one special character
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]
  password += "0123456789"[Math.floor(Math.random() * 10)]
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)]

  // Fill the rest of the password
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("")
}

export { getStaffTotalPaid }
