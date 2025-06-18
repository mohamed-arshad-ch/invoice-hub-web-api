"use client"
import { X, Copy, Check } from "lucide-react"
import { useState } from "react"

type CredentialsModalProps = {
  isOpen: boolean
  onClose: () => void
  username: string
  password: string
}

export function CredentialsModal({ isOpen, onClose, username, password }: CredentialsModalProps) {
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [usernameCopied, setUsernameCopied] = useState(false)

  if (!isOpen) return null

  const copyToClipboard = (text: string, type: "username" | "password") => {
    navigator.clipboard.writeText(text)
    if (type === "username") {
      setUsernameCopied(true)
      setTimeout(() => setUsernameCopied(false), 2000)
    } else {
      setPasswordCopied(true)
      setTimeout(() => setPasswordCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 font-poppins">Portal Access Credentials</h2>
            <button
              onClick={onClose}
              className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-gray-600 font-poppins mb-6">
            Please save these credentials. The password cannot be retrieved later.
          </p>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700 font-poppins">Username (Email)</label>
                <button
                  onClick={() => copyToClipboard(username, "username")}
                  className="text-[#3A86FF] hover:text-[#3A86FF]/80 transition-colors"
                >
                  {usernameCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center">
                <input
                  type="text"
                  value={username}
                  readOnly
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-poppins"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700 font-poppins">Temporary Password</label>
                <button
                  onClick={() => copyToClipboard(password, "password")}
                  className="text-[#3A86FF] hover:text-[#3A86FF]/80 transition-colors"
                >
                  {passwordCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center">
                <input
                  type="text"
                  value={password}
                  readOnly
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-poppins"
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full bg-[#3A86FF] text-white px-4 py-2 rounded-md hover:bg-[#3A86FF]/90 transition-colors font-poppins"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
