"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Plus, Share, FileText, User, Package, FileDown, Printer, Mail } from "lucide-react"
import { useRouter } from "next/navigation"

type ActionOption = {
  label: string
  icon: React.ReactNode
  action: () => void
}

type FloatingActionButtonProps = {
  type: "add" | "share"
  options: ActionOption[]
}

export function FloatingActionButton({ type, options }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="fixed bottom-24 right-6 z-40" ref={menuRef}>
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden w-48 mb-2 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="py-1">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  option.action()
                  setIsOpen(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {option.icon}
                <span className="ml-2 font-poppins">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg ${
          type === "add" ? "bg-[#3A86FF]" : "bg-[#8338EC]"
        } text-white hover:opacity-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          type === "add" ? "focus:ring-[#3A86FF]" : "focus:ring-[#8338EC]"
        }`}
        aria-label={type === "add" ? "Add new item" : "Share options"}
      >
        {type === "add" ? <Plus className="w-6 h-6" /> : <Share className="w-6 h-6" />}
      </button>
    </div>
  )
}

export function AddButton() {
  const router = useRouter()
  const pathname = router.pathname || window.location.pathname

  // Determine which options to show based on the current page
  const getOptions = () => {
    const basePath = pathname.split("/").filter(Boolean)[1] || ""

    const allOptions = [
      {
        label: "Add Client",
        icon: <User className="w-4 h-4" />,
        action: () => router.push("/admin/clients/add"),
      },
      {
        label: "Add Transaction",
        icon: <FileText className="w-4 h-4" />,
        action: () => router.push("/admin/transactions/create"),
      },
      {
        label: "Add Product",
        icon: <Package className="w-4 h-4" />,
        action: () => router.push("/admin/products/add"),
      },
      {
        label: "Add Staff",
        icon: <User className="w-4 h-4" />,
        action: () => router.push("/admin/staff/add"),
      },
    ]

    // Show all options for dashboard
    if (basePath === "dashboard" || !basePath) {
      return allOptions
    }

    // For specific pages, prioritize the relevant option but show others too
    const priorityMap: Record<string, number> = {
      clients: 0,
      transactions: 1,
      products: 2,
      staff: 3,
    }

    if (priorityMap[basePath] !== undefined) {
      const priorityOption = allOptions[priorityMap[basePath]]
      const otherOptions = allOptions.filter((_, index) => index !== priorityMap[basePath])
      return [priorityOption, ...otherOptions]
    }

    // Default to all options
    return allOptions
  }

  return <FloatingActionButton type="add" options={getOptions()} />
}

export function ShareButton() {
  const handleExportPDF = () => {
    console.log("Exporting to PDF...")
    // Implement actual PDF export functionality
  }

  const handlePrint = () => {
    window.print()
  }

  const handleEmail = () => {
    console.log("Preparing email...")
    // Implement email functionality
  }

  const options = [
    {
      label: "Export to PDF",
      icon: <FileDown className="w-4 h-4" />,
      action: handleExportPDF,
    },
    {
      label: "Print",
      icon: <Printer className="w-4 h-4" />,
      action: handlePrint,
    },
    {
      label: "Email",
      icon: <Mail className="w-4 h-4" />,
      action: handleEmail,
    },
  ]

  return <FloatingActionButton type="share" options={options} />
}
