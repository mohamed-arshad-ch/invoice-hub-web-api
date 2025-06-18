import { NextRequest, NextResponse } from "next/server"
import { 
  getAllProducts, 
  createProduct, 
  searchProducts, 
  filterProducts 
} from "@/lib/db-service"
import { withAuth } from "@/lib/auth-middleware"

// GET all products
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can view products
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const products = await getAllProducts()
    return NextResponse.json({
      success: true,
      products,
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}, ['admin', 'staff'])

// POST create new product or perform other operations
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin and staff can manage products
    if (!['admin', 'staff'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case "create":
        // Only admin can create products
        if (user.role !== 'admin') {
          return NextResponse.json(
            { success: false, error: "Only administrators can create products" },
            { status: 403 }
          )
        }
        return await createNewProduct(body, user.userId)
      
      case "search":
        const { query } = body
        if (!query) {
          return NextResponse.json(
            { success: false, error: "Search query is required" },
            { status: 400 }
          )
        }
        try {
          const products = await searchProducts(query)
          return NextResponse.json({
            success: true,
            products,
          })
        } catch (error) {
          console.error("Error searching products:", error)
          return NextResponse.json(
            { success: false, error: "Failed to search products" },
            { status: 500 }
          )
        }

      case "filter":
        const { categoryFilter, statusFilter } = body
        try {
          const products = await filterProducts(categoryFilter || "all", statusFilter || "all")
          return NextResponse.json({
            success: true,
            products,
          })
        } catch (error) {
          console.error("Error filtering products:", error)
          return NextResponse.json(
            { success: false, error: "Failed to filter products" },
            { status: 500 }
          )
        }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error in products API:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}, ['admin', 'staff'])

async function createNewProduct(body: any, userId: number) {
  const { name, description, category, price, taxRate, status } = body

  // Validation
  if (!name || !description || !category || price === undefined) {
    return NextResponse.json(
      { success: false, error: "Name, description, category, and price are required" },
      { status: 400 }
    )
  }

  const parsedPrice = Number.parseFloat(price)
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return NextResponse.json(
      { success: false, error: "Invalid price" },
      { status: 400 }
    )
  }

  const parsedTaxRate = Number.parseFloat(taxRate || 0)
  if (isNaN(parsedTaxRate) || parsedTaxRate < 0) {
    return NextResponse.json(
      { success: false, error: "Invalid tax rate" },
      { status: 400 }
    )
  }

  const productData = {
    name,
    description,
    category,
    price: parsedPrice,
    taxRate: parsedTaxRate,
    status: status || "active",
  }

  try {
    const newProduct = await createProduct(productData, userId)
    return NextResponse.json({
      success: true,
      product: newProduct,
      message: "Product created successfully",
    })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    )
  }
} 