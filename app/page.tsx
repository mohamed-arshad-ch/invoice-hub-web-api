import Link from "next/link"
import { ArrowRight, ShieldCheck, Users, User, UserPlus } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-4 md:px-8 flex justify-center items-center border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#3A86FF] to-[#8338EC] flex items-center justify-center text-white font-bold text-xl">
            IH
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 font-poppins">InvoiceHub</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 font-poppins">Welcome to InvoiceHub</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto font-poppins">
              Comprehensive financial management for freelancers and businesses
            </p>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Admin Login Card */}
            <Link href="/admin/login" className="group">
              <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
                <div className="w-12 h-12 rounded-full bg-[#3A86FF]/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-[#3A86FF]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">Admin Portal</h3>
                <p className="text-gray-600 mb-4 flex-grow font-poppins">
                  Access administrative controls and manage your business operations
                </p>
                <div className="flex items-center text-[#3A86FF] font-medium">
                  <span className="font-poppins">Sign in as Admin</span>
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            {/* Staff Login Card */}
            <Link href="/staff/login" className="group">
              <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
                <div className="w-12 h-12 rounded-full bg-[#8338EC]/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-[#8338EC]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">Staff Portal</h3>
                <p className="text-gray-600 mb-4 flex-grow font-poppins">
                  Access your payments, manage profiles and collaborate with your team
                </p>
                <div className="flex items-center text-[#8338EC] font-medium">
                  <span className="font-poppins">Sign in as Staff</span>
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            {/* Client Login Card */}
            <Link href="/client/login" className="group">
              <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
                <div className="w-12 h-12 rounded-full bg-[#FF006E]/10 flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-[#FF006E]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">Client Portal</h3>
                <p className="text-gray-600 mb-4 flex-grow font-poppins">
                  Access your invoices, view transaction history and manage payments
                </p>
                <div className="flex items-center text-[#FF006E] font-medium">
                  <span className="font-poppins">Sign in as Client</span>
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            {/* Registration Card */}
            <Link href="/register" className="group">
              <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <UserPlus className="w-6 h-6 text-gray-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 font-poppins">Register</h3>
                <p className="text-gray-600 mb-4 flex-grow font-poppins">
                  Create a new account to start managing your finances with InvoiceHub
                </p>
                <div className="flex items-center text-gray-700 font-medium">
                  <span className="font-poppins">Create Account</span>
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-4 md:px-8 border-t border-gray-100 text-center text-gray-500 text-sm font-poppins">
        <p>© 2025 InvoiceHub. All rights reserved.</p>
      </footer>
    </div>
  )
}
