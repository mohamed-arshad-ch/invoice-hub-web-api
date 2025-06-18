"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

type ToastProps = {
  message: string
  type: "success" | "error" | "info"
  duration?: number
  onClose?: () => void
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onClose) onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  const bgColor = type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500"

  return (
    <div
      className={`fixed bottom-20 right-4 z-50 flex items-center ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg max-w-xs`}
    >
      <p className="flex-1 text-sm font-poppins">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false)
          if (onClose) onClose()
        }}
        className="ml-3 text-white hover:text-gray-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">{children}</div>
}
