import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    icon: Icon,
    options = [],
    children,
    className = '',
    id,
    required = false,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      <div className="relative rounded-xl shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <select
          ref={ref}
          id={selectId}
          required={required}
          className={`w-full appearance-none bg-[#111827] text-gray-100 rounded-xl border text-sm transition-all duration-200 py-2.5 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-10 ${
            error
              ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50'
              : 'border-gray-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 hover:border-gray-600'
          } disabled:opacity-50 disabled:bg-gray-900 disabled:cursor-not-allowed outline-none cursor-pointer ${className}`}
          {...props}
        >
          {children ? (
            children
          ) : (
            options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-900 text-gray-100 py-1">
                {opt.label}
              </option>
            ))
          )}
        </select>

        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error ? (
        <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-gray-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Select;
