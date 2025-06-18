"use client"

import type React from "react"

type Column = {
  header: string
  accessor: string
  cell?: (value: any, row: any) => React.ReactNode
  className?: string
}

type ResponsiveTableProps = {
  columns: Column[]
  data: any[]
  emptyMessage?: string
  keyField?: string
  onRowClick?: (row: any) => void
  rowClassName?: (row: any) => string
}

export function ResponsiveTable({
  columns,
  data,
  emptyMessage = "No data available",
  keyField = "id",
  onRowClick,
  rowClassName,
}: ResponsiveTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-center text-gray-500 font-poppins">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-hidden bg-white rounded-lg shadow-sm border border-gray-100">
      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 text-sm border-b border-gray-200">
              {columns.map((column, index) => (
                <th key={index} className={`px-6 py-3 font-medium font-poppins ${column.className || ""}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row[keyField]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 ${
                  onRowClick ? "cursor-pointer" : ""
                } ${rowClassName ? rowClassName(row) : ""}`}
              >
                {columns.map((column, index) => (
                  <td key={index} className={`px-6 py-4 ${column.className || ""}`}>
                    {column.cell ? column.cell(row[column.accessor], row) : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden">
        {data.map((row) => (
          <div
            key={row[keyField]}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 ${
              onRowClick ? "cursor-pointer" : ""
            } ${rowClassName ? rowClassName(row) : ""}`}
          >
            {columns.map((column, index) => (
              <div key={index} className="mb-2 last:mb-0">
                <div className="text-xs text-gray-500 font-poppins mb-1">{column.header}</div>
                <div className={`text-sm ${column.className || ""}`}>
                  {column.cell ? column.cell(row[column.accessor], row) : row[column.accessor]}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
