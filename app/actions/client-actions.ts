"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAuthSession } from "./auth-actions"

// Type definitions
export type Client = {
  id: number
  client_id: string
  business_name: string
  contact_person: string
  email: string
  phone: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  payment_schedule: string
  payment_terms: string
  status: boolean
  notes: string | null
  total_spent: number
  last_payment: string | null
  upcoming_payment: string | null
  joined_date: string
  created_by: number
  created_at: string
  updated_at: string
}

export type ClientFormData = {
  businessName: string
  contactPerson: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zip: string
  paymentSchedule: string
  paymentTerms: string
  status: boolean
  notes: string
}

// Generate a unique client ID
function generateClientId() {
  const prefix = "CLT"
  const randomNum = Math.floor(1000 + Math.random() * 9000) // 4-digit number
  return `${prefix}-${randomNum}`
}

// Get all clients for the logged-in user
// Add a function to get the total paid amount for each client
// This should be added to the getClients function to include the total_spent field

// Update the getClients function to include transaction totals
// Find the getClients function and modify the SQL query to include the total amount

export async function getClients() {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    const clients = await sql`
      SELECT 
        c.*,
        COALESCE(SUM(t.total_amount), 0) as total_spent
      FROM 
        clients c
      LEFT JOIN 
        transactions t ON c.id = t.client_id AND t.status = 'paid'
      WHERE 
        c.created_by = ${session.userId}
      GROUP BY 
        c.id
      ORDER BY 
        c.business_name ASC
    `

    return {
      success: true,
      clients: clients.map((client: any) => ({
        ...client,
        total_spent: Number(client.total_spent || 0),
        status: client.status === true,
      })),
    }
  } catch (error) {
    console.error("Error fetching clients:", error)
    return { success: false, error: "Failed to fetch clients" }
  }
}

// Get a single client by ID
export async function getClientById(id: number) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    const clients = await sql`
     SELECT * FROM clients 
     WHERE id = ${id} AND created_by = ${session.userId}
   `

    if (clients.length === 0) {
      return { success: false, error: "Client not found" }
    }

    return { success: true, client: clients[0] }
  } catch (error) {
    console.error("Error fetching client:", error)
    return { success: false, error: "Failed to fetch client" }
  }
}

// Create a new client
export async function createClient(formData: ClientFormData) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    const clientId = generateClientId()
    const {
      businessName,
      contactPerson,
      email,
      phone,
      street,
      city,
      state,
      zip,
      paymentSchedule,
      paymentTerms,
      status,
      notes,
    } = formData

    const result = await sql`
     INSERT INTO clients (
       client_id, 
       business_name, 
       contact_person, 
       email, 
       phone, 
       street, 
       city, 
       state, 
       zip, 
       payment_schedule, 
       payment_terms, 
       status, 
       notes, 
       created_by
     )
     VALUES (
       ${clientId}, 
       ${businessName}, 
       ${contactPerson}, 
       ${email}, 
       ${phone}, 
       ${street || null}, 
       ${city || null}, 
       ${state || null}, 
       ${zip || null}, 
       ${paymentSchedule}, 
       ${paymentTerms}, 
       ${status}, 
       ${notes || null}, 
       ${session.userId}
     )
     RETURNING id
   `

    revalidatePath("/admin/clients")

    return {
      success: true,
      message: "Client created successfully",
      clientId: result[0].id,
    }
  } catch (error) {
    console.error("Error creating client:", error)
    return { success: false, error: "Failed to create client" }
  }
}

// Update an existing client
export async function updateClient(id: number, formData: ClientFormData) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    // First check if the client exists and belongs to the user
    const clientCheck = await sql`
     SELECT id FROM clients 
     WHERE id = ${id} AND created_by = ${session.userId}
   `

    if (clientCheck.length === 0) {
      return { success: false, error: "Client not found or you don't have permission to edit it" }
    }

    const {
      businessName,
      contactPerson,
      email,
      phone,
      street,
      city,
      state,
      zip,
      paymentSchedule,
      paymentTerms,
      status,
      notes,
    } = formData

    await sql`
     UPDATE clients SET
       business_name = ${businessName},
       contact_person = ${contactPerson},
       email = ${email},
       phone = ${phone},
       street = ${street || null},
       city = ${city || null},
       state = ${state || null},
       zip = ${zip || null},
       payment_schedule = ${paymentSchedule},
       payment_terms = ${paymentTerms},
       status = ${status},
       notes = ${notes || null},
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ${id} AND created_by = ${session.userId}
   `

    revalidatePath("/admin/clients")

    return { success: true, message: "Client updated successfully" }
  } catch (error) {
    console.error("Error updating client:", error)
    return { success: false, error: "Failed to update client" }
  }
}

// Delete a client
export async function deleteClient(id: number) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    // First check if the client exists and belongs to the user
    const clientCheck = await sql`
     SELECT id FROM clients 
     WHERE id = ${id} AND created_by = ${session.userId}
   `

    if (clientCheck.length === 0) {
      return { success: false, error: "Client not found or you don't have permission to delete it" }
    }

    await sql`
     DELETE FROM clients
     WHERE id = ${id} AND created_by = ${session.userId}
   `

    revalidatePath("/admin/clients")

    return { success: true, message: "Client deleted successfully" }
  } catch (error) {
    console.error("Error deleting client:", error)
    return { success: false, error: "Failed to delete client" }
  }
}

// Add this function to the existing client-actions.ts file

// Generate a random password
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

// Create client portal access
export async function createClientPortalAccess(clientId: number) {
  try {
    const session = await getAuthSession()

    if (!session) {
      return { success: false, error: "Authentication required" }
    }

    // Get client details
    const clients = await sql`
     SELECT * FROM clients 
     WHERE id = ${clientId} AND created_by = ${session.userId}
   `

    if (clients.length === 0) {
      return { success: false, error: "Client not found or you don't have permission" }
    }

    const client = clients[0]

    // Check if user already exists with this email
    const existingUser = await sql`
     SELECT id FROM users WHERE email = ${client.email}
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

    // Create a new user with client role
    const result = await sql`
     INSERT INTO users (
       first_name, 
       last_name, 
       email, 
       password_hash, 
       company_name, 
       client_id,
       role
     )
     VALUES (
       ${client.contact_person.split(" ")[0] || "Client"}, 
       ${client.contact_person.split(" ").slice(1).join(" ") || client.business_name}, 
       ${client.email}, 
       ${passwordHash}, 
       ${client.business_name}, 
       ${clientId},
       'client'
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
    console.error("Error creating client portal access:", error)
    return { success: false, error: "Failed to create portal access" }
  }
}
