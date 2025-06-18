// Create a new file called loading.tsx in the app/admin/staff directory:
export default function Loading() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-[#3A86FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-4 text-gray-600 font-poppins">Loading staff data...</p>
    </div>
  )
}
