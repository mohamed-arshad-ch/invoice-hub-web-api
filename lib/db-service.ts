// Database service for CRUD operations with Neon PostgreSQL
import { neon } from "@neondatabase/serverless"

// Initialize Neon client
const sql = neon(
  "postgres://neondb_owner:npg_epBG9mqRuiV7@ep-jolly-brook-ab5fd13n-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require",
)

// Product type definition
export type Product = {
  id: number
  name: string
  description: string
  category: "service" | "product" | "subscription"
  price: number
  taxRate: number
  status: "active" | "inactive"
  created_by: number
  created_at: string
  updated_at: string
}

export async function getTotalRevenue(): Promise<number> {
  try {
    const result = await sql`
      SELECT COALESCE(SUM(total_amount), 0) AS total FROM transactions WHERE status = 'paid'
    `
    return result[0].total as number
  } catch (error) {
    console.error("Error fetching total revenue:", error)
    return 0
  }
}

export async function getActiveClientCount(): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) AS count FROM clients WHERE status = true
    `
    return result[0].count as number
  } catch (error) {
    console.error("Error fetching active client count:", error)
    return 0
  }
}

export async function getPendingInvoiceCount(): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) AS count FROM transactions WHERE status = 'pending'
    `
    return result[0].count as number
  } catch (error) {
    console.error("Error fetching pending invoice count:", error)
    return 0
  }
}

export async function getTotalStaffCount(): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) AS count FROM staff WHERE status = 'active'
    `
    return result[0].count as number
  } catch (error) {
    console.error("Error fetching total staff count:", error)
    return 0
  }
}

// Get all products
export async function getAllProducts(): Promise<Product[]> {
  try {
    const products = await sql`
      SELECT 
        id, 
        name, 
        description, 
        category, 
        price, 
        tax_rate as "taxRate", 
        status, 
        created_by, 
        created_at, 
        updated_at 
      FROM products
      ORDER BY name ASC
    `
    return products.map(formatProductFromDb)
  } catch (error) {
    console.error("Error fetching products:", error)
    throw new Error("Failed to fetch products")
  }
}

// Get product by ID
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const products = await sql`
      SELECT 
        id, 
        name, 
        description, 
        category, 
        price, 
        tax_rate as "taxRate", 
        status, 
        created_by, 
        created_at, 
        updated_at 
      FROM products 
      WHERE id = ${id}
    `
    if (products.length === 0) {
      return null
    }
    return formatProductFromDb(products[0])
  } catch (error) {
    console.error(`Error fetching product with ID ${id}:`, error)
    throw new Error("Failed to fetch product")
  }
}

// Create new product
export async function createProduct(productData: any, userId: number): Promise<Product> {
  try {
    const result = await sql`
      INSERT INTO products (
        name, 
        description, 
        category, 
        price, 
        tax_rate, 
        status,
        created_by
      ) VALUES (
        ${productData.name}, 
        ${productData.description}, 
        ${productData.category}, 
        ${productData.price}, 
        ${productData.taxRate}, 
        ${productData.status},
        ${userId}
      )
      RETURNING 
        id, 
        name, 
        description, 
        category, 
        price, 
        tax_rate as "taxRate", 
        status, 
        created_by, 
        created_at, 
        updated_at
    `
    if (result.length === 0) {
      throw new Error("Failed to create product")
    }
    return formatProductFromDb(result[0])
  } catch (error) {
    console.error("Error creating product:", error)
    throw error
  }
}

// Update product
export async function updateProduct(id: string, productData: any): Promise<Product | null> {
  try {
    const result = await sql`
      UPDATE products SET
        name = ${productData.name},
        description = ${productData.description},
        category = ${productData.category},
        price = ${productData.price},
        tax_rate = ${productData.taxRate},
        status = ${productData.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING 
        id, 
        name, 
        description, 
        category, 
        price, 
        tax_rate as "taxRate", 
        status, 
        created_by, 
        created_at, 
        updated_at
    `
    if (result.length === 0) {
      return null
    }
    return formatProductFromDb(result[0])
  } catch (error) {
    console.error(`Error updating product with ID ${id}:`, error)
    throw new Error("Failed to update product")
  }
}

// Delete product
export async function deleteProduct(id: string | number): Promise<boolean> {
  try {
    const result = await sql`
      DELETE FROM products 
      WHERE id = ${id}
      RETURNING id
    `
    return result.length > 0
  } catch (error) {
    console.error(`Error deleting product with ID ${id}:`, error)
    throw new Error("Failed to delete product")
  }
}

// Search products
export async function searchProducts(query: string): Promise<Product[]> {
  try {
    const products = await sql`
      SELECT 
        id, 
        name, 
        description, 
        category, 
        price, 
        tax_rate as "taxRate", 
        status, 
        created_by, 
        created_at, 
        updated_at 
      FROM products 
      WHERE 
        name ILIKE ${"%" + query + "%"} OR description ILIKE ${"%" + query + "%"}
      ORDER BY name ASC
    `
    return products.map(formatProductFromDb)
  } catch (error) {
    console.error("Error searching products:", error)
    throw new Error("Failed to search products")
  }
}

// Filter products
export async function filterProducts(categoryFilter: string, statusFilter: string): Promise<Product[]> {
  try {
    let query = `
      SELECT 
        id, 
        name, 
        description, 
        category, 
        price, 
        tax_rate as "taxRate", 
        status, 
        created_by, 
        created_at, 
        updated_at 
      FROM products 
      WHERE 1=1
    `
    const params = []
    let paramIndex = 1

    if (categoryFilter !== "all") {
      query += ` AND category = $${paramIndex}`
      params.push(categoryFilter)
      paramIndex++
    }

    if (statusFilter !== "all") {
      query += ` AND status = $${paramIndex}`
      params.push(statusFilter)
      paramIndex++
    }

    query += " ORDER BY name ASC"

    const result = await sql.query(query, params)
    return result.rows.map(formatProductFromDb)
  } catch (error) {
    console.error("Error filtering products:", error)
    throw new Error("Failed to filter products")
  }
}

export function formatProductFromDb(product: any): Product {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: Number(product.price),
    taxRate: Number(product.taxRate),
    status: product.status,
    created_by: product.created_by,
    created_at: product.created_at,
    updated_at: product.updated_at,
  }
}

export { sql }
