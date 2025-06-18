"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Briefcase, Eye, EyeOff, Lock, Mail } from "lucide-react"

export default function StaffLogin() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Check if user is already logged in
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch('/api/auth/session', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.user && data.user.role === "staff") {
            router.push("/staff/dashboard")
          }
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('auth_token')
        }
      } catch (error) {
        console.error('Token validation failed:', error)
        localStorage.removeItem('auth_token')
      }
    }
    
    checkToken()
  }, [router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const email = formData.get('email') as string
      const password = formData.get('password') as string

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        })
      })

      const result = await response.json()

      if (result.success) {
        // Check if the user is a staff member
        if (result.role !== "staff") {
          setError("You don't have permission to access the staff portal")
          return
        }

        // Store JWT token in localStorage
        localStorage.setItem('auth_token', result.token)

        // Redirect to staff dashboard
        router.push("/staff/dashboard")
      } else {
        setError(result.error || "Login failed. Please check your credentials.")
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#8338EC]/5 to-transparent" />

      {/* Abstract Staff Pattern */}
      <div className="absolute bottom-10 left-10 opacity-5">
        <div className="flex gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-8 h-20 border border-[#8338EC] rounded-md" />
          ))}
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-8 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-[#3A86FF] to-[#8338EC] flex items-center justify-center text-white font-bold text-2xl mb-4">
            IH
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 font-poppins">InvoiceHub</h1>
          <h2 className="text-lg font-medium mt-2 font-poppins">Staff Portal</h2>
          <p className="text-[#6B7280] text-sm mt-1 font-poppins">Access your payments and profile</p>
        </div>

        {/* Staff Badge */}
        <div className="absolute top-8 right-8">
          <div className="flex items-center justify-center bg-[#8338EC]/10 rounded-full p-2">
            <Briefcase className="w-5 h-5 text-[#8338EC]" />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm font-poppins">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-700 font-poppins">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#8338EC] focus:border-[#8338EC] text-sm font-poppins"
                placeholder="staff@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 font-poppins">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#8338EC] focus:border-[#8338EC] text-sm font-poppins"
                placeholder="••••••••"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                disabled={isSubmitting}
                className="h-4 w-4 text-[#8338EC] focus:ring-[#8338EC] border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 font-poppins">
                Keep me logged in
              </label>
            </div>
            <div className="text-sm">
              <Link href="#" className="font-medium text-[#8338EC] hover:text-[#8338EC]/80 font-poppins">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8338EC] hover:bg-[#8338EC]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8338EC] transition-colors duration-200 font-poppins ${
              isSubmitting ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Support Text */}
        <p className="mt-6 text-xs text-center text-gray-500 font-poppins">Need help? Contact support@invoicehub.com</p>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 font-poppins">
          <span>© 2025 InvoiceHub</span>
          <Link href="#" className="text-[#8338EC] hover:underline font-poppins">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  )
}
