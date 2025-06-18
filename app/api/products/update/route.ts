import { NextRequest, NextResponse } from "next/server"
import { updateProduct } from "@/lib/db-service"
import { withAuth } from "@/lib/auth-middleware"

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admin can update products
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Only administrators can update products" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, name, description, category, price, taxRate, status } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      )
    }

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

    const updatedProduct = await updateProduct(id, productData)
    
    if (!updatedProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: "Product updated successfully",
    })
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update product" },
      { status: 500 }
    )
  }
}, ['admin']) 