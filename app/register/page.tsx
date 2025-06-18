"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User, Briefcase, Building, CheckCircle, Shield } from "lucide-react"
import { registerUser } from "../actions/auth-actions"

export default function Register() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    companyName: "",
    role: "",
  })

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    companyName: "",
    role: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [formSubmitted, setFormSubmitted] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        const user = JSON.parse(userData)
        switch (user.role) {
          case "admin":
            router.push("/admin/dashboard")
            break
          case "staff":
            router.push("/staff/dashboard")
            break
          case "client":
            router.push("/client/dashboard")
            break
        }
      } catch (e) {
        // Invalid stored data, clear it
        localStorage.removeItem("user")
      }
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }
  }

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role)
    setFormData({
      ...formData,
      role,
    })

    // Clear role error
    if (errors.role) {
      setErrors({
        ...errors,
        role: "",
      })
    }
  }

  const validateForm = () => {
    const newErrors = {
      firstName: formData.firstName ? "" : "First name is required",
      lastName: formData.lastName ? "" : "Last name is required",
      email: formData.email
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
          ? ""
          : "Please enter a valid email"
        : "Email is required",
      password: formData.password
        ? /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/.test(formData.password)
          ? ""
          : "Password must have at least 8 characters, 1 uppercase, 1 number, and 1 special character"
        : "Password is required",
      companyName: formData.companyName ? "" : "Company name is required",
      role: formData.role ? "" : "Please select a role",
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some((error) => error)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError("")

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setFormSubmitted(true)

    try {
      // Create FormData object for server action
      const formDataObj = new FormData()
      formDataObj.append("firstName", formData.firstName)
      formDataObj.append("lastName", formData.lastName)
      formDataObj.append("email", formData.email)
      formDataObj.append("password", formData.password)
      formDataObj.append("companyName", formData.companyName)
      formDataObj.append("role", formData.role)

      // Call server action
      const result = await registerUser(formDataObj)

      if (result.success) {
        // Store user data in localStorage
        if (result.user) {
          localStorage.setItem("user", JSON.stringify(result.user))
        }

        // Redirect based on role
        switch (result.role) {
          case "admin":
            router.push("/admin/dashboard")
            break
          case "staff":
            router.push("/staff/dashboard")
            break
          case "client":
            router.push("/client/dashboard")
            break
          default:
            router.push("/")
        }
      } else {
        setServerError(result.error || "Registration failed. Please try again.")
      }
    } catch (error) {
      setServerError("An unexpected error occurred. Please try again.")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-[#F8F9FA] to-transparent" />
      <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-tl from-[#8338EC]/5 to-transparent rounded-tl-full" />

      {/* Abstract Pattern */}
      <div className="absolute bottom-10 left-10 opacity-5">
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-10 h-10 border border-gray-300 rounded-md" />
          ))}
        </div>
      </div>

      {/* Registration Card */}
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.08)] p-8 relative z-10 my-8">
        {/* Back Button */}
        <Link href="/" className="absolute top-8 left-8 text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-[#3A86FF] to-[#8338EC] flex items-center justify-center text-white font-bold text-2xl mb-4">
            IH
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 font-poppins">InvoiceHub</h1>
          <h2 className="text-lg font-medium mt-2 font-poppins">Create Your Account</h2>
          <p className="text-[#6B7280] text-sm mt-1 font-poppins">
            Join InvoiceHub to streamline your financial management
          </p>
        </div>

        {/* Server Error Message */}
        {serverError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm font-poppins">
            {serverError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4 font-poppins">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="firstName" className="text-sm font-medium text-gray-700 font-poppins">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className={`block w-full px-3 py-2.5 border ${
                    errors.firstName ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins transition-colors duration-200`}
                  placeholder="John"
                />
                {errors.firstName && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.firstName}</p>}
              </div>
              <div className="space-y-1">
                <label htmlFor="lastName" className="text-sm font-medium text-gray-700 font-poppins">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className={`block w-full px-3 py-2.5 border ${
                    errors.lastName ? "border-red-500" : "border-gray-300"
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins transition-colors duration-200`}
                  placeholder="Doe"
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.lastName}</p>}
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4 font-poppins">Account Information</h3>
            <div className="space-y-4">
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
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`block w-full pl-10 pr-3 py-2.5 border ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins transition-colors duration-200`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.email}</p>}
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
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`block w-full pl-10 pr-10 py-2.5 border ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins transition-colors duration-200`}
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
                {errors.password ? (
                  <p className="mt-1 text-xs text-red-500 font-poppins">{errors.password}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500 font-poppins">
                    Must be at least 8 characters with 1 uppercase, 1 number, and 1 special character
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="companyName" className="text-sm font-medium text-gray-700 font-poppins">
                  Company Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={`block w-full pl-10 pr-3 py-2.5 border ${
                      errors.companyName ? "border-red-500" : "border-gray-300"
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#3A86FF] focus:border-[#3A86FF] text-sm font-poppins transition-colors duration-200`}
                    placeholder="Acme Inc."
                  />
                </div>
                {errors.companyName && <p className="mt-1 text-xs text-red-500 font-poppins">{errors.companyName}</p>}
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4 font-poppins">Select Your Role</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`relative border ${
                  selectedRole === "admin" ? "border-[#3A86FF] bg-[#3A86FF]/5" : "border-gray-200 hover:border-gray-300"
                } rounded-lg p-4 cursor-pointer transition-all duration-200 ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => !isSubmitting && handleRoleSelect("admin")}
              >
                <div className="flex items-start mb-2">
                  <div
                    className={`w-10 h-10 rounded-full ${
                      selectedRole === "admin" ? "bg-[#3A86FF]/20" : "bg-gray-100"
                    } flex items-center justify-center mr-3`}
                  >
                    <Shield className={`w-5 h-5 ${selectedRole === "admin" ? "text-[#3A86FF]" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 font-poppins">Admin</h4>
                    <p className="text-xs text-gray-500 font-poppins">Full system access</p>
                  </div>
                </div>
                {selectedRole === "admin" && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-5 h-5 text-[#3A86FF]" />
                  </div>
                )}
              </div>

              <div
                className={`relative border ${
                  selectedRole === "staff" ? "border-[#8338EC] bg-[#8338EC]/5" : "border-gray-200 hover:border-gray-300"
                } rounded-lg p-4 cursor-pointer transition-all duration-200 ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => !isSubmitting && handleRoleSelect("staff")}
              >
                <div className="flex items-start mb-2">
                  <div
                    className={`w-10 h-10 rounded-full ${
                      selectedRole === "staff" ? "bg-[#8338EC]/20" : "bg-gray-100"
                    } flex items-center justify-center mr-3`}
                  >
                    <Briefcase className={`w-5 h-5 ${selectedRole === "staff" ? "text-[#8338EC]" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 font-poppins">Staff</h4>
                    <p className="text-xs text-gray-500 font-poppins">Manage operations</p>
                  </div>
                </div>
                {selectedRole === "staff" && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-5 h-5 text-[#8338EC]" />
                  </div>
                )}
              </div>

              <div
                className={`relative border ${
                  selectedRole === "client"
                    ? "border-[#FF006E] bg-[#FF006E]/5"
                    : "border-gray-200 hover:border-gray-300"
                } rounded-lg p-4 cursor-pointer transition-all duration-200 ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => !isSubmitting && handleRoleSelect("client")}
              >
                <div className="flex items-start mb-2">
                  <div
                    className={`w-10 h-10 rounded-full ${
                      selectedRole === "client" ? "bg-[#FF006E]/20" : "bg-gray-100"
                    } flex items-center justify-center mr-3`}
                  >
                    <User className={`w-5 h-5 ${selectedRole === "client" ? "text-[#FF006E]" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 font-poppins">Client</h4>
                    <p className="text-xs text-gray-500 font-poppins">View invoices & pay</p>
                  </div>
                </div>
                {selectedRole === "client" && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-5 h-5 text-[#FF006E]" />
                  </div>
                )}
              </div>
            </div>
            {errors.role && <p className="mt-2 text-xs text-red-500 font-poppins">{errors.role}</p>}
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                disabled={isSubmitting}
                className="h-4 w-4 text-[#3A86FF] focus:ring-[#3A86FF] border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-poppins text-gray-700">
                I agree to the{" "}
                <Link href="#" className="text-[#3A86FF] hover:underline font-poppins">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-[#3A86FF] hover:underline font-poppins">
                  Privacy Policy
                </Link>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#3A86FF] hover:bg-[#3A86FF]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3A86FF] transition-colors duration-200 font-poppins ${
              isSubmitting ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* Already have account */}
        <p className="mt-6 text-sm text-center text-gray-600 font-poppins">
          Already have an account?{" "}
          <Link href="/" className="text-[#3A86FF] hover:underline font-medium font-poppins">
            Sign in
          </Link>
        </p>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-100 text-center text-xs text-gray-500 font-poppins">
          <p>© 2025 InvoiceHub. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
