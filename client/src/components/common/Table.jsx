import React from 'react';
import { Database } from 'lucide-react';

export function Table({
  columns = [],
  children,
  className = '',
  empty = false,
  emptyMessage = 'No records found',
  emptyIcon: EmptyIcon = Database,
}) {
  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-gray-700/70 bg-[#182234] shadow-lg ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          {columns.length > 0 && (
            <thead>
              <tr className="border-b border-gray-700/80 bg-[#111827]/70 text-gray-400 uppercase text-[11px] font-semibold tracking-wider">
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className={`py-3.5 px-4 first:pl-6 last:pr-6 whitespace-nowrap ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-800/80 text-gray-200">
            {empty ? (
              <tr>
                <td colSpan={columns.length || 10} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-gray-800/60 rounded-2xl border border-gray-700 text-gray-400">
                      <EmptyIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TableRow({ children, className = '', onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-gray-800/40 transition-colors duration-150 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '', align = 'left' }) {
  const aligns = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td
      className={`py-3.5 px-4 first:pl-6 last:pr-6 text-sm align-middle whitespace-nowrap ${
        aligns[align] || aligns.left
      } ${className}`}
    >
      {children}
    </td>
  );
}

export default Table;
