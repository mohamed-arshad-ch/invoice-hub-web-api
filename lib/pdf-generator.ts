import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// Company info for the invoice
const COMPANY_INFO = {
  name: "MCODEV Bytes",
  address: "Malappuram",
  city: "Kerala India 676504",
  phone: "+91 98472-74569",
  email: "mcodevbiz@gmail.com",
  website: "www.mcodevbytes.in",
  // Base64 logo could be added here
}

// Function to format date (remove time component)
const formatDateForInvoice = (dateString: string) => {
  if (!dateString) return "-"

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch (e) {
    return dateString
  }
}

// Function to generate a PDF invoice
export async function generateInvoicePDF(transaction: any, clientInfo: any) {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Set document properties
    doc.setProperties({
      title: `Invoice ${transaction.id}`,
      subject: "Invoice",
      author: COMPANY_INFO.name,
      keywords: "invoice, payment",
      creator: COMPANY_INFO.name,
    })

    // Add fonts
    doc.setFont("Poppins", "normal")

    // Define colors
    const primaryColor = "#3A86FF"
    const secondaryColor = "#8338EC"
    const textColor = "#333333"
    const lightGray = "#F8F9FA"

    // Set default text color
    doc.setTextColor(textColor)

    // Helper function to add text with specific styling
    const addText = (
      text: string,
      x: number,
      y: number,
      options: { fontSize?: number; fontStyle?: string; color?: string; align?: string } = {},
    ) => {
      const { fontSize = 10, fontStyle = "normal", color = textColor, align = "left" } = options
      doc.setFontSize(fontSize)
      doc.setFont("Poppins", fontStyle)
      doc.setTextColor(color)
      doc.text(text, x, y, { align } as any)
    }

    // Add company logo and info
    addText(COMPANY_INFO.name, 20, 20, { fontSize: 20, fontStyle: "bold", color: primaryColor })
    addText(COMPANY_INFO.address, 20, 27, { fontSize: 10 })
    addText(COMPANY_INFO.city, 20, 32, { fontSize: 10 })
    addText(COMPANY_INFO.phone, 20, 37, { fontSize: 10 })
    addText(COMPANY_INFO.email, 20, 42, { fontSize: 10 })
    addText(COMPANY_INFO.website, 20, 47, { fontSize: 10 })

    // Add invoice title and number
    const isWeeklyInvoice = transaction.id.toString().startsWith("WEEK-")
    const invoiceTitle = isWeeklyInvoice ? "WEEKLY INVOICE" : "INVOICE"

    addText(invoiceTitle, 190, 20, { fontSize: 20, fontStyle: "bold", color: primaryColor, align: "right" })
    addText(`#${transaction.id}`, 190, 27, { fontSize: 12, align: "right" })

    // Add status
    const statusColors: Record<string, string> = {
      paid: "#22c55e",
      pending: "#f59e0b",
      overdue: "#ef4444",
      draft: "#6b7280",
      partial: "#3b82f6",
    }
    const statusColor = statusColors[transaction.status] || textColor
    addText(`Status: ${transaction.status.toUpperCase()}`, 190, 34, {
      fontSize: 12,
      fontStyle: "bold",
      color: statusColor,
      align: "right",
    })

    // Add dates
    addText(`Date: ${transaction.date}`, 190, 42, { fontSize: 10, align: "right" })
    addText(`Due Date: ${transaction.dueDate}`, 190, 47, { fontSize: 10, align: "right" })

    // Add client info
    addText("Bill To:", 20, 60, { fontSize: 12, fontStyle: "bold" })
    addText(clientInfo.name, 20, 67, { fontSize: 10 })
    addText(clientInfo.email, 20, 72, { fontSize: 10 })
    if (clientInfo.phone) addText(clientInfo.phone, 20, 77, { fontSize: 10 })
    if (clientInfo.address) {
      const addressLines = clientInfo.address.split("\n")
      addressLines.forEach((line: string, index: number) => {
        addText(line, 20, 82 + index * 5, { fontSize: 10 })
      })
    }

    // Add reference number if available
    if (transaction.referenceNumber) {
      addText(`Reference: ${transaction.referenceNumber}`, 190, 60, { fontSize: 10, align: "right" })
    }

    // Add payment method if available
    if (transaction.paymentMethod) {
      addText(`Payment Method: ${transaction.paymentMethod}`, 190, 65, { fontSize: 10, align: "right" })
    }

    // Add line items table
    const startY = 100

    // Define table headers based on whether it's a weekly invoice or not
    let tableHeaders = []

    if (isWeeklyInvoice) {
      // Reintroduced Description column
      tableHeaders = [["Transaction ID", "Date", "Description", "Status", "Amount"]]
    } else {
      tableHeaders = [["Item", "Quantity", "Unit Price", "Tax", "Amount"]]
    }

    // Prepare table data
    let tableData = []

    if (isWeeklyInvoice && transaction.lineItems && transaction.lineItems.length > 0) {
      // For weekly invoices, show each transaction with the requested columns
      tableData = transaction.lineItems.map((item: any) => {
        const status = item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "-"
        let amount = `Rs. ${item.total}`
        
        // For partial transactions, show paid amount
        if (item.status === 'partial' && item.paidAmount !== undefined) {
          amount = `Rs. ${item.paidAmount} / Rs. ${item.total}`
        }
        
        return [
          item.transactionId || "-",
          formatDateForInvoice(item.date),
          item.productName || "Service", // Include product name in Description column
          status,
          amount,
        ]
      })
    } else if (transaction.lineItems && transaction.lineItems.length > 0) {
      // For regular invoices, use the standard format
      tableData = transaction.lineItems.map((item: any) => [
        item.description,
        item.quantity.toString(),
        `Rs. ${item.unitPrice}`,
        `${item.taxRate}%`,
        `Rs. ${item.total}`,
      ])
    } else {
      // Otherwise, just use the transaction description and total amount
      tableData = [[transaction.description, "1", `Rs. ${transaction.amount}`, "0%", `Rs. ${transaction.amount}`]]
    }

    // Add the table
    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY,
      theme: "grid",
      headStyles: {
        fillColor: [58, 134, 255], // primaryColor in RGB
        textColor: [255, 255, 255],
        fontStyle: "bold",
        font: "Poppins",
      },
      styles: {
        fontSize: 9,
        cellPadding: 5,
        font: "Poppins",
      },
      columnStyles: isWeeklyInvoice
        ? {
            0: { cellWidth: 40 }, // Transaction ID
            1: { cellWidth: 30 }, // Date
            2: { cellWidth: 50 }, // Description (Product Name)
            3: { cellWidth: 25, halign: "center" }, // Status
            4: { cellWidth: 40, halign: "right" }, // Amount
          }
        : {
            0: { cellWidth: 80 }, // Description column wider
            1: { halign: "center" }, // Quantity centered
            2: { halign: "right" }, // Unit price right-aligned
            3: { halign: "center" }, // Tax right-aligned
            4: { halign: "right" }, // Amount right-aligned
          },
    })

    // Get the final Y position after the table
    const finalY = (doc as any).lastAutoTable.finalY + 10

    // Add totals
    addText("Subtotal:", 150, finalY, { align: "right" })
    addText(`Rs. ${transaction.amount}`, 190, finalY, { align: "right" })

    // Add tax if we have line items with tax
    let totalTax = 0
    if (transaction.lineItems && transaction.lineItems.length > 0 && !isWeeklyInvoice) {
      transaction.lineItems.forEach((item: any) => {
        totalTax += (item.unitPrice * item.quantity * item.taxRate) / 100
      })
      if (totalTax > 0) {
        addText("Tax:", 150, finalY + 7, { align: "right" })
        addText(`${totalTax}`, 190, finalY + 7, { align: "right" })
      }
    }

    // Add total
    addText("Total:", 150, finalY + 15, { fontSize: 12, fontStyle: "bold", align: "right" })
    addText(`Rs. ${transaction.amount}`, 190, finalY + 15, {
      fontSize: 12,
      fontStyle: "bold",
      align: "right",
    })

    let currentY = finalY + 15

    // Add payment information for partial transactions
    if (transaction.status === "partial" && transaction.paymentInfo) {
      currentY += 10
      addText("Amount Paid:", 150, currentY, { fontSize: 11, fontStyle: "bold", align: "right", color: "#22c55e" })
      addText(`Rs. ${transaction.paymentInfo.totalPaid}`, 190, currentY, {
        fontSize: 11,
        fontStyle: "bold",
        align: "right",
        color: "#22c55e",
      })

      currentY += 7
      addText("Remaining Balance:", 150, currentY, { fontSize: 11, fontStyle: "bold", align: "right", color: "#ef4444" })
      addText(`Rs. ${transaction.paymentInfo.remainingAmount}`, 190, currentY, {
        fontSize: 11,
        fontStyle: "bold",
        align: "right",
        color: "#ef4444",
      })
    }

    // Add payment status
    currentY += 10
    if (transaction.status === "paid") {
      addText("PAID", 190, currentY, {
        fontSize: 16,
        fontStyle: "bold",
        color: statusColors.paid,
        align: "right",
      })
    } else if (transaction.status === "partial") {
      addText("PARTIALLY PAID", 190, currentY, {
        fontSize: 16,
        fontStyle: "bold",
        color: statusColors.partial,
        align: "right",
      })
    }

    // Add notes if available
    if (transaction.notes) {
      const notesY = finalY + 35
      addText("Notes:", 20, notesY, { fontSize: 11, fontStyle: "bold", font: "Poppins" })

      // Split notes into multiple lines if needed
      const maxWidth = 170 // Maximum width for notes text
      const lines = doc.splitTextToSize(transaction.notes, maxWidth)
      lines.forEach((line: string, index: number) => {
        addText(line, 20, notesY + 7 + index * 5, { fontSize: 10, font: "Poppins" })
      })
    }

    // Add footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)

      // Add page number
      addText(`Page ${i} of ${pageCount}`, 190, 287, { fontSize: 8, align: "right", font: "Poppins" })

      // Add footer text
      addText("Thank you for your business!", 105, 280, { fontSize: 10, align: "center", font: "Poppins" })
      addText(`Generated on ${new Date().toLocaleDateString()}`, 105, 285, {
        fontSize: 8,
        align: "center",
        font: "Poppins",
      })
    }

    // Return the PDF as base64 string
    return doc.output("datauristring")
  } catch (pdfError: any) {
    console.error("Error generating PDF content:", pdfError)
    throw new Error(`PDF content generation failed: ${pdfError.message || String(pdfError)}`)
  }
}
